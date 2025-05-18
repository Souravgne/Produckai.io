import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Upload, Plug, ArrowRight, FileSpreadsheet, MessageSquare, Video, Slack, Mail } from 'lucide-react';

export default function DataSourcesPage() {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Data Sources</h1>
        <p className="mt-1 text-gray-600">
          Connect to your customer feedback sources to gather insights and analyze Voice of Customer data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Manual Upload Section */}
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Manual Upload</h2>
                <p className="text-gray-600 mt-1">Upload CSV files with customer feedback</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900">CSV Template</h3>
                <p className="text-sm text-gray-600">
                  Upload customer feedback using our standardized template with fields for customer name, email, company, ACV value, and feedback.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900">Batch Processing</h3>
                <p className="text-sm text-gray-600">
                  Upload multiple files at once to process large volumes of feedback efficiently.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleNavigate('/dashboard/data-sources/manual')}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            Upload Feedback Data
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Integrations Section */}
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <Plug className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Integrations</h2>
                <p className="text-gray-600 mt-1">Connect to business apps to import feedback</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <Slack className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900">Slack</h3>
                <p className="text-sm text-gray-600">
                  Connect to Slack channels to capture customer feedback shared by your team.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900">HubSpot</h3>
                <p className="text-sm text-gray-600">
                  Import customer tickets and feedback from your HubSpot account.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Video className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900">Zoom & MS Teams</h3>
                <p className="text-sm text-gray-600">
                  Analyze customer calls and meetings for valuable feedback.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleNavigate('/dashboard/data-sources/integrations')}
            className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
          >
            Connect Integrations
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 text-center text-gray-500">
            <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>No recent data source activity.</p>
            <p className="text-sm mt-1">Connect a data source to start gathering customer feedback.</p>
          </div>
        </div>
      </div>
    </div>
  );
}