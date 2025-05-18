import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Database, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle, 
  Slack, 
  Video, 
  Mail, 
  FileSpreadsheet,
  ExternalLink
} from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { supabase } from '../../lib/supabase';

interface DataSource {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  selected: boolean;
  path: string;
}

export default function DataSourcesStep() {
  const navigate = useNavigate();
  const { completeStep, skipOnboarding } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [dataSources, setDataSources] = useState<DataSource[]>([
    {
      id: 'slack',
      name: 'Slack',
      icon: Slack,
      description: 'Connect to Slack channels to capture customer feedback shared by your team',
      selected: false,
      path: '/dashboard/data-sources/integrations'
    },
    {
      id: 'zoom',
      name: 'Zoom',
      icon: Video,
      description: 'Analyze customer calls and meetings for valuable feedback',
      selected: false,
      path: '/dashboard/data-sources/integrations'
    },
    {
      id: 'hubspot',
      name: 'HubSpot',
      icon: Mail,
      description: 'Import customer tickets and feedback from your HubSpot account',
      selected: false,
      path: '/dashboard/data-sources/integrations'
    },
    {
      id: 'csv',
      name: 'CSV Upload',
      icon: FileSpreadsheet,
      description: 'Upload CSV files with customer feedback data',
      selected: false,
      path: '/dashboard/data-sources/manual'
    }
  ]);

  const handleDataSourceClick = async (source: DataSource) => {
    // Mark this step as complete
    try {
      await completeStep('data_sources');
      
      // Store the selected integration in localStorage to use after onboarding
      localStorage.setItem('selected_integration', source.id);
      
      // Set a flag to indicate we're coming from onboarding
      sessionStorage.setItem('from_onboarding', 'true');
      
      // Store the redirect path
      localStorage.setItem('integration_redirect_path', source.path);
      
      // Complete onboarding and redirect to dashboard
      await skipOnboarding();
      
      // Navigate to dashboard, the redirect will happen in DashboardLayout
      navigate('/dashboard');
    } catch (error) {
      console.error('Error handling data source click:', error);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Create feedback source entries for selected sources
      const selectedSources = dataSources.filter(source => source.selected);
      
      if (selectedSources.length > 0) {
        const { error } = await supabase
          .from('feedback_sources')
          .insert(
            selectedSources.map(source => ({
              user_id: user.id,
              source_type: source.id === 'csv' ? 'document' : source.id,
              is_active: true,
            }))
          );

        if (error) throw error;
      }

      await completeStep('data_sources');
      
      // Complete onboarding and redirect to dashboard
      await skipOnboarding();
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving data sources:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#00A4B8] text-white flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
          <span className="font-medium text-[#00A4B8]">Profile</span>
        </div>
        <div className="h-1 w-16 bg-[#00A4B8] rounded-full"></div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#00A4B8] text-white flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
          <span className="font-medium text-[#00A4B8]">Product</span>
        </div>
        <div className="h-1 w-16 bg-[#00A4B8] rounded-full"></div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#00A4B8] text-white flex items-center justify-center">
            3
          </div>
          <span className="font-medium text-[#00A4B8]">Data Sources</span>
        </div>
      </div>

      <div className="text-center mb-10">
        <Database className="w-16 h-16 text-[#00A4B8] mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Connect your feedback sources
        </h1>
        <p className="text-lg text-gray-600">
          Import customer feedback from your existing tools to start gathering insights.
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {dataSources.map((source) => (
          <div 
            key={source.id}
            className="bg-white p-6 rounded-xl border-2 border-gray-200 hover:border-[#00A4B8]/50 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-gray-100 rounded-lg">
                <source.icon className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{source.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{source.description}</p>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => handleDataSourceClick(source)}
                className="px-4 py-2 bg-[#00A4B8] text-white rounded-lg hover:bg-[#008a9a] transition-colors flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Configure Now
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => navigate('/onboarding/product-themes')}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        
        <button
          onClick={handleFinish}
          disabled={loading}
          className="px-6 py-3 bg-[#00A4B8] text-white rounded-lg text-lg font-semibold hover:bg-[#008a9a] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? 'Saving...' : 'Finish Setup'}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}