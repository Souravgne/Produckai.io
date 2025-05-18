import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  ArrowRight,
  BarChart2,
  MessageSquare,
  Users,
  Layers,
  Upload,
  Plug,
  FileSpreadsheet,
} from 'lucide-react';

export default function EmptyDashboard() {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto">
      {/* Welcome Section */}
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to ProduckAI
        </h1>
        <p className="text-gray-600 mb-6">
          Your AI-powered product manager assistant is ready to help you gather, analyze, and act on customer feedback.
        </p>
        
        <div className="flex items-center gap-2 mb-6">
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#00A0C1] rounded-full" style={{ width: '25%' }}></div>
          </div>
          <span className="text-sm font-medium text-gray-500 whitespace-nowrap">Setup Progress: 25%</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-green-800">Profile Setup</h3>
              <p className="text-xs text-green-700">Completed</p>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-yellow-800">Data Sources</h3>
              <p className="text-xs text-yellow-700">Needs attention</p>
            </div>
          </div>
          
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-gray-800">Themes</h3>
              <p className="text-xs text-gray-700">Not started</p>
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps Section */}
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Next Steps: Connect Your Data Sources
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="border border-gray-200 hover:border-[#00A0C1] rounded-lg p-6 transition-all">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Manual Upload</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Upload CSV files with customer feedback data
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 mb-4">
              <FileSpreadsheet className="w-5 h-5 text-blue-600 mt-0.5" />
              <p className="text-sm text-gray-600">
                Upload customer feedback using our standardized template with fields for customer name, email, company, ACV value, and feedback.
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard/data-sources/manual')}
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              Upload Feedback
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="border border-gray-200 hover:border-[#00A0C1] rounded-lg p-6 transition-all">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <Plug className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Integrations</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Connect to business apps to import feedback
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-purple-50 rounded">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14.5 10C13.67 10 13 9.33 13 8.5V3.5C13 2.67 13.67 2 14.5 2C15.33 2 16 2.67 16 3.5V8.5C16 9.33 15.33 10 14.5 10Z" fill="#4A154B"/>
                    <path d="M20.5 10H19V8.5C19 7.67 19.67 7 20.5 7C21.33 7 22 7.67 22 8.5C22 9.33 21.33 10 20.5 10Z" fill="#4A154B"/>
                    <path d="M9.5 14C10.33 14 11 14.67 11 15.5V20.5C11 21.33 10.33 22 9.5 22C8.67 22 8 21.33 8 20.5V15.5C8 14.67 8.67 14 9.5 14Z" fill="#4A154B"/>
                    <path d="M3.5 14H5V15.5C5 16.33 4.33 17 3.5 17C2.67 17 2 16.33 2 15.5C2 14.67 2.67 14 3.5 14Z" fill="#4A154B"/>
                    <path d="M14 9.5C14 10.33 13.33 11 12.5 11H7.5C6.67 11 6 10.33 6 9.5C6 8.67 6.67 8 7.5 8H12.5C13.33 8 14 8.67 14 9.5Z" fill="#4A154B"/>
                    <path d="M7.5 5H9V3.5C9 2.67 8.33 2 7.5 2C6.67 2 6 2.67 6 3.5C6 4.33 6.67 5 7.5 5Z" fill="#4A154B"/>
                    <path d="M10 14.5C10 13.67 10.67 13 11.5 13H16.5C17.33 13 18 13.67 18 14.5C18 15.33 17.33 16 16.5 16H11.5C10.67 16 10 15.33 10 14.5Z" fill="#4A154B"/>
                    <path d="M16.5 19H15V20.5C15 21.33 15.67 22 16.5 22C17.33 22 18 21.33 18 20.5C18 19.67 17.33 19 16.5 19Z" fill="#4A154B"/>
                  </svg>
                </div>
                <span className="text-sm text-gray-700">Connect to Slack</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1 bg-orange-50 rounded">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0.84 12C0.84 5.373 6.213 0 12.84 0C19.467 0 24.84 5.373 24.84 12C24.84 18.627 19.467 24 12.84 24C6.213 24 0.84 18.627 0.84 12Z" fill="#FF7A59"/>
                    <path d="M10.54 6C9.435 6 8.54 6.895 8.54 8C8.54 9.105 9.435 10 10.54 10C11.645 10 12.54 9.105 12.54 8C12.54 6.895 11.645 6 10.54 6Z" fill="white"/>
                    <path d="M15.14 10C14.035 10 13.14 10.895 13.14 12C13.14 13.105 14.035 14 15.14 14C16.245 14 17.14 13.105 17.14 12C17.14 10.895 16.245 10 15.14 10Z" fill="white"/>
                    <path d="M10.54 14C9.435 14 8.54 14.895 8.54 16C8.54 17.105 9.435 18 10.54 18C11.645 18 12.54 17.105 12.54 16C12.54 14.895 11.645 14 10.54 14Z" fill="white"/>
                    <path d="M10.54 10V14" stroke="white" strokeWidth="2"/>
                    <path d="M13.14 12H8.54" stroke="white" strokeWidth="2"/>
                    <path d="M15.14 14V18" stroke="white" strokeWidth="2"/>
                  </svg>
                </div>
                <span className="text-sm text-gray-700">Connect to HubSpot</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard/data-sources/integrations')}
              className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              Connect Integrations
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-2">
            Need help getting started? Check out our documentation or contact support.
          </p>
          <button className="text-[#00A0C1] hover:text-[#008a9a] text-sm font-medium">
            View Documentation
          </button>
        </div>
      </div>

      {/* Placeholder Metrics Section */}
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          What You'll See After Adding Data
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-gray-50 border border-gray-100 p-6 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <MessageSquare className="w-6 h-6 text-gray-400" />
              <span className="text-sm text-gray-400">Example</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-400">0</h3>
            <p className="text-sm text-gray-500">Voice of Customer</p>
          </div>
          
          <div className="bg-gray-50 border border-gray-100 p-6 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <Layers className="w-6 h-6 text-gray-400" />
              <span className="text-sm text-gray-400">Example</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-400">0</h3>
            <p className="text-sm text-gray-500">Themes Identified</p>
          </div>
          
          <div className="bg-gray-50 border border-gray-100 p-6 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-6 h-6 text-gray-400" />
              <span className="text-sm text-gray-400">Example</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-400">$0</h3>
            <p className="text-sm text-gray-500">Customer Impact</p>
          </div>
          
          <div className="bg-gray-50 border border-gray-100 p-6 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <BarChart2 className="w-6 h-6 text-gray-400" />
              <span className="text-sm text-gray-400">Example</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-400">0</h3>
            <p className="text-sm text-gray-500">Insights by Status</p>
          </div>
        </div>
        
        <div className="bg-gray-50 border border-gray-100 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-400">Insights by Status</h3>
            <span className="text-sm text-gray-400">Example</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-gray-400" />
                  <h4 className="font-medium text-gray-400">New</h4>
                </div>
                <span className="text-lg font-bold text-gray-400">0</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-gray-300 h-2.5 rounded-full w-0"></div>
              </div>
              <div className="mt-2 text-sm text-gray-400">
                0% of total
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-gray-400" />
                  <h4 className="font-medium text-gray-400">Read</h4>
                </div>
                <span className="text-lg font-bold text-gray-400">0</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-gray-300 h-2.5 rounded-full w-0"></div>
              </div>
              <div className="mt-2 text-sm text-gray-400">
                0% of total
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-gray-400" />
                  <h4 className="font-medium text-gray-400">In Review</h4>
                </div>
                <span className="text-lg font-bold text-gray-400">0</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-gray-300 h-2.5 rounded-full w-0"></div>
              </div>
              <div className="mt-2 text-sm text-gray-400">
                0% of total
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-gray-400" />
                  <h4 className="font-medium text-gray-400">Planned</h4>
                </div>
                <span className="text-lg font-bold text-gray-400">0</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-gray-300 h-2.5 rounded-full w-0"></div>
              </div>
              <div className="mt-2 text-sm text-gray-400">
                0% of total
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}