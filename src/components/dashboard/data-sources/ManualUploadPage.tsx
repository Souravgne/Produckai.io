import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const uuidv4 = () => crypto.randomUUID();

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  progress: number;
}

export default function ManualUploadPage() {
  const navigate = useNavigate();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    const newFiles = Array.from(files)
      .filter((file) => file.type === 'text/csv')
      .map((file) => ({
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size,
        status: 'uploading' as const,
        progress: 0,
      }));

    if (newFiles.length === 0) {
      alert('Please upload CSV files only.');
      return;
    }

    setUploadedFiles((prev) => [...prev, ...newFiles]);

    // Simulate file upload and processing
    setIsUploading(true);
    newFiles.forEach((file) => {
      simulateFileUpload(file.id);
    });
  };

  const simulateFileUpload = (fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setUploadedFiles((prev) =>
        prev.map((file) =>
          file.id === fileId
            ? { ...file, progress: Math.min(progress, 100) }
            : file
        )
      );

      if (progress >= 100) {
        clearInterval(interval);

        // Simulate processing
        setUploadedFiles((prev) =>
          prev.map((file) =>
            file.id === fileId ? { ...file, status: 'processing' } : file
          )
        );

        // Simulate completion after processing
        setTimeout(() => {
          setUploadedFiles((prev) =>
            prev.map((file) =>
              file.id === fileId
                ? {
                    ...file,
                    status: Math.random() > 0.9 ? 'error' : 'completed',
                    error:
                      Math.random() > 0.9
                        ? 'Invalid CSV format or missing required columns'
                        : undefined,
                  }
                : file
            )
          );

          // Check if all files are done
          setTimeout(() => {
            const allDone = uploadedFiles.every(
              (file) => file.status === 'completed' || file.status === 'error'
            );
            if (allDone) {
              setIsUploading(false);
            }
          }, 500);
        }, 1500);
      }
    }, 100);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const downloadTemplate = () => {
    // Create CSV content
    const csvContent = [
      'Customer Name,Email,Company,ACV Value,Feedback',
      'John Doe,john@example.com,Acme Inc,50000,"The new dashboard is great but loading times could be improved"',
      'Jane Smith,jane@company.com,Tech Corp,75000,"We need better export options for reports"',
      'Bob Johnson,bob@enterprise.com,Enterprise Ltd,120000,"Mobile app crashes frequently when processing large datasets"',
    ].join('\n');

    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer_feedback_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  async function processCsvData(
    fileId: string,
    fileName: string,
    fileData: any[]
  ) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Unable to get user');
      toast.error('User authentication failed.');
      return;
    }

    const tenantId = user.id;
    const insertedIds: string[] = [];

    for (let i = 0; i < fileData.length; i++) {
      const row = fileData[i];
      const rawText = `Customer: ${row['Customer Name']}, Email: ${row.Email}, Company: ${row['Company Name']}, ACV: ${row['ACV Value']}, Feedback: ${row.Feedback}`;

      const rawAcv = row['ACV Value'];
      const cleanAcv = rawAcv
        ? parseFloat(rawAcv.toString().replace(/,/g, ''))
        : null;

      const { data: insertResult, error } = await supabase
        .from('csv_uploads')
        .insert({
          id: uuidv4(),
          tenant_id: tenantId,
          file_name: fileName,
          row_index: i + 1,
          customer_name: row['Customer Name'],
          email: row.Email,
          company: row['Company Name'],
          acv_value: cleanAcv,
          feedback: row.Feedback,
          content_raw: rawText,
          received_at: new Date().toISOString(),
          metadata: row,
        })
        .select('id')
        .single();

      if (error) {
        console.error(`Insert failed for row ${i + 1}:`, error.message);
        toast.error(`Insert failed for row ${i + 1}`);
      } else if (insertResult?.id) {
        insertedIds.push(insertResult.id);
      }
    }

    // 👇 Trigger the LLM function with all inserted IDs
    if (insertedIds.length > 0) {
      const { error: triggerError } = await supabase.functions.invoke(
        'prepare_llm_request',
        {
          body: {
            tenant_id: tenantId,
            upload_ids: insertedIds,
            source: 'manual-upload',
          },
        }
      );

      if (triggerError) {
        console.error(
          'Failed to trigger prepare_llm_request:',
          triggerError.message
        );
        toast.error('Failed to trigger LLM processing.');
      } else {
        console.log('✅ prepare_llm_request triggered for IDs:', insertedIds);
        toast.success('LLM processing started successfully.');
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/dashboard/data-sources')}
          className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Manual Data Upload
          </h1>
          <p className="text-gray-600">
            Upload CSV files with customer feedback data
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              CSV Template
            </h2>
            <p className="text-gray-600 mt-1">
              Download our template to ensure your data is formatted correctly
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Download Template
          </button>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Required CSV Format</h3>
            <p className="text-sm text-blue-700 mt-1">
              Your CSV file must include these columns:{' '}
              <span className="font-semibold">
                Customer Name, Email, Company, ACV Value, Feedback
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Upload Files
        </h2>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-gray-700 font-medium mb-2">
            Drag and drop CSV files here
          </p>
          <p className="text-gray-500 text-sm mb-4">or</p>
          <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer inline-flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Select CSV Files
            <input
              type="file"
              accept=".csv"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Uploaded Files
          </h2>

          <div className="space-y-4">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">
                      {file.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.status === 'uploading' && (
                      <span className="text-sm text-blue-600 flex items-center gap-1">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading
                      </span>
                    )}
                    {file.status === 'processing' && (
                      <span className="text-sm text-amber-600 flex items-center gap-1">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing
                      </span>
                    )}
                    {file.status === 'completed' && (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Completed
                      </span>
                    )}
                    {file.status === 'error' && (
                      <span className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Error
                      </span>
                    )}
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {file.status === 'uploading' && (
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${file.progress}%` }}
                    ></div>
                  </div>
                )}

                {file.status === 'error' && file.error && (
                  <div className="mt-2 text-sm text-red-600">{file.error}</div>
                )}

                <div className="mt-2 text-xs text-gray-500">
                  {(file.size / 1024).toFixed(2)} KB
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              disabled={isUploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              onClick={async () => {
                for (const file of uploadedFiles) {
                  if (file.status === 'completed') {
                    const input = document.querySelector(
                      'input[type="file"]'
                    ) as HTMLInputElement;
                    const fileObj = input?.files?.[0];

                    if (!fileObj) {
                      console.warn('No file object found');
                      continue;
                    }

                    const text = await fileObj.text();
                    const lines = text.trim().split('\n');
                    const headers = lines[0].split(',');

                    const rows = lines.slice(1).map((line) => {
                      const values = line.split(',');
                      const row: any = {};
                      headers.forEach((key, i) => {
                        row[key.trim()] = values[i]?.trim();
                      });
                      return row;
                    });

                    await processCsvData(file.id, file.name, rows); // 👈 this must be inside async
                  }
                }
              }}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                'Process All Files'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
