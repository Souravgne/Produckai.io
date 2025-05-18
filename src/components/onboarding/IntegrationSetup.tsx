import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plug, ArrowRight, Slack, MessageSquare, FileText, Upload, ExternalLink } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { supabase } from '../../lib/supabase';

interface IntegrationOption {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  path: string;
}

const integrations: IntegrationOption[] = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Connect to your Slack workspace to capture customer feedback from designated channels',
    icon: Slack,
    path: '/dashboard/data-sources/integrations'
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Import customer feedback and feature requests from HubSpot tickets',
    icon: MessageSquare,
    path: '/dashboard/data-sources/integrations'
  },
  {
    id: 'document',
    name: 'Documents',
    description: 'Upload and analyze customer interview notes, surveys, and other documents',
    icon: Upload,
    path: '/dashboard/data-sources/manual'
  },
];

export default function IntegrationSetup() {
  const navigate = useNavigate();
  const { completeStep } = useOnboarding();
  const [selectedIntegrations, setSelectedIntegrations] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const toggleIntegration = (integrationId: string) => {
    setSelectedIntegrations(prev => {
      const next = new Set(prev);
      if (next.has(integrationId)) {
        next.delete(integrationId);
      } else {
        next.add(integrationId);
      }
      return next;
    });
  };

  const handleContinue = async () => {
    setLoading(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Create feedback source entries for selected integrations
      if (selectedIntegrations.size > 0) {
        const { error } = await supabase
          .from('feedback_sources')
          .insert(
            Array.from(selectedIntegrations).map(sourceType => ({
              user_id: userId,
              source_type: sourceType,
              is_active: true,
            }))
          );

        if (error) throw error;
      }

      await completeStep('integrations');
      navigate('/onboarding/pod-setup');
    } catch (error) {
      console.error('Error saving integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    await completeStep('integrations');
    navigate('/onboarding/pod-setup');
  };

  const handleSetupLater = async (path: string) => {
    // Mark this step as complete but remember the user's selection
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      // Store the user's preference to redirect them after onboarding
      localStorage.setItem('integration_redirect_path', path);
      // Set a flag to indicate we're coming from onboarding
      sessionStorage.setItem('from_onboarding', 'true');
      
      await completeStep('integrations');
      navigate('/onboarding/pod-setup');
    } catch (error) {
      console.error('Error in setup later:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-12">
        <Plug className="w-16 h-16 text-blue-600 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Connect Your Data Sources
        </h1>
        <p className="text-lg text-gray-600">
          Import customer feedback from your existing tools to start gathering insights.
        </p>
      </div>

      <div className="space-y-6 mb-8">
        {integrations.map((integration) => (
          <div key={integration.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start gap-4 mb-4">
              <integration.icon className="w-8 h-8 text-blue-600 flex-shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-gray-900">
                  {integration.name}
                </div>
                <p className="text-sm text-gray-600 mt-1">{integration.description}</p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => toggleIntegration(integration.id)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedIntegrations.has(integration.id)
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {selectedIntegrations.has(integration.id) ? 'Selected' : 'Select'}
              </button>
              
              <button
                onClick={() => handleSetupLater(integration.path)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Configure Now
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          onClick={handleContinue}
          disabled={loading}
          className="w-full max-w-md px-8 py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 transition-all transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-3"
        >
          {loading ? 'Saving...' : 'Continue'}
          <ArrowRight className="w-5 h-5" />
        </button>

        <button
          onClick={handleSkip}
          disabled={loading}
          className="text-gray-500 hover:text-gray-900 font-medium transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}