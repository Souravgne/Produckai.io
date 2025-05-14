import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Plug,
  Slack,
  Mail,
  Video,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'sonner';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: 'connected' | 'disconnected';
  isPopular: boolean;
  lastSynced?: string;
}

export default function IntegrationsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    loadIntegrationStatus();

    // Check for query parameters from OAuth callback
    const params = new URLSearchParams(location.search);
    const integration = params.get('integration');
    const status = params.get('status');
    const message = params.get('message');

    if (integration && status) {
      if (status === 'success') {
        setStatusMessage({
          type: 'success',
          message: `Successfully connected to ${integration}!`,
        });
      } else if (status === 'error') {
        setStatusMessage({
          type: 'error',
          message: message || `Failed to connect to ${integration}.`,
        });
      }

      // Clean up the URL
      navigate('/dashboard/data-sources/integrations', { replace: true });
    }

    // Check if we should highlight a specific integration from onboarding
    const highlightIntegration = sessionStorage.getItem('highlight_integration');
    if (highlightIntegration) {
      // Highlight the integration (could add a visual effect or auto-click)
      setTimeout(() => {
        const element = document.getElementById(`integration-${highlightIntegration}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlight-integration');
          
          // Remove highlight after a few seconds
          setTimeout(() => {
            element.classList.remove('highlight-integration');
          }, 3000);
        }
      }, 500);
      
      // Clean up
      sessionStorage.removeItem('highlight_integration');
    }
  }, [location, navigate]);

  const loadIntegrationStatus = async () => {
    try {
      const { data: integrationSettings, error } = await supabase
        .from('integration_settings')
        .select('*');

      if (error) throw error;

      const defaultIntegrations: Integration[] = [
        {
          id: 'slack',
          name: 'Slack',
          description:
            'Connect to Slack channels to capture customer feedback shared by your team',
          icon: Slack,
          status: 'disconnected',
          isPopular: true,
        },
        {
          id: 'hubspot',
          name: 'HubSpot',
          description:
            'Import customer tickets and feedback from your HubSpot account',
          icon: Mail,
          status: 'disconnected',
          isPopular: true,
        },
        {
          id: 'zoom',
          name: 'Zoom',
          description:
            'Analyze customer calls and meetings for valuable feedback',
          icon: Video,
          status: 'disconnected',
          isPopular: true,
        },
        {
          id: 'ms-teams',
          name: 'Microsoft Teams',
          description:
            'Capture feedback from team discussions and customer meetings',
          icon: MessageSquare,
          status: 'disconnected',
          isPopular: false,
        },
      ];

      // Update status based on database records
      if (integrationSettings) {
        const updatedIntegrations = defaultIntegrations.map((integration) => {
          const setting = integrationSettings.find(
            (s) => s.integration_type === integration.id
          );
          if (setting) {
            return {
              ...integration,
              status: 'connected',
              lastSynced: setting.additional_settings?.last_synced || null,
            };
          }
          return integration;
        });

        setIntegrations(updatedIntegrations);
      } else {
        setIntegrations(defaultIntegrations);
      }
    } catch (error) {
      console.error('Error loading integration status:', error);
      setStatusMessage({
        type: 'error',
        message: 'Failed to load integration status',
      });
    }
  };

  const handleConnect = async (integrationId: string) => {
    setConnecting(integrationId);
    setStatusMessage(null);
  
    try {
      if (integrationId === 'hubspot' || integrationId === 'slack') {
        const {
          data: { session },
        } = await supabase.auth.getSession();
  
        if (!session) {
          throw new Error('User not authenticated');
        }
  
        const apiUrl = `${
          import.meta.env.VITE_SUPABASE_URL
        }/functions/v1/${integrationId}-auth-init`;
  
        const response = await fetch(apiUrl, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || `Failed to initialize ${integrationId} OAuth`
          );
        }
  
        const { url } = await response.json();
  
        if (!url) {
          throw new Error('No authorization URL received');
        }
  
        // Redirect to the provider's OAuth authorization page
        window.location.href = url;
        return;
      }
  
      // Simulate connection for other integrations
      await new Promise((resolve) => setTimeout(resolve, 2000));
  
      const {
        data: { session },
      } = await supabase.auth.getSession();
  
      if (session) {
        const { error } = await supabase.from('integration_settings').upsert({
          user_id: session.user.id,
          integration_type: integrationId,
          additional_settings: {
            status: 'connected',
            last_connected: new Date().toISOString(),
          },
        });
  
        if (error) {
          console.error('Error saving integration:', error);
          throw error;
        }
      }
  
      setStatusMessage({
        type: 'success',
        message: `Successfully connected to ${integrationId}!`,
      });
      
      toast.success(`Successfully connected to ${integrationId}!`);
  
      await loadIntegrationStatus();
    } catch (error) {
      console.error(`Error connecting to ${integrationId}:`, error);
      setStatusMessage({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : `Failed to connect to ${integrationId}`,
      });
      
      toast.error(`Failed to connect to ${integrationId}`);
    } finally {
      setConnecting(null);
    }
  };  

  const handleDisconnect = async (integrationId: string) => {
    setDisconnecting(integrationId);
    setStatusMessage(null);

    try {
      // Get the current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('User not authenticated');
      }

      // Delete the integration settings from the database
      const { error } = await supabase
        .from('integration_settings')
        .delete()
        .eq('user_id', session.user.id)
        .eq('integration_type', integrationId);

      if (error) {
        throw error;
      }

      // Show success message
      setStatusMessage({
        type: 'success',
        message: `Successfully disconnected from ${integrationId}`,
      });
      
      toast.success(`Successfully disconnected from ${integrationId}`);

      // Refresh integration status
      await loadIntegrationStatus();
    } catch (error) {
      console.error(`Error disconnecting from ${integrationId}:`, error);
      setStatusMessage({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : `Failed to disconnect from ${integrationId}`,
      });
      
      toast.error(`Failed to disconnect from ${integrationId}`);
    } finally {
      setDisconnecting(null);
    }
  };

  const handleSyncData = async (integrationId: string) => {
    setSyncing(integrationId);
    setStatusMessage(null);

    try {
      if (integrationId === 'hubspot') {
        // Get the current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error('User not authenticated');
        }

        // Call the Supabase Edge Function to fetch companies
        const apiUrl = `${
          import.meta.env.VITE_SUPABASE_URL
        }/functions/v1/hubspot-fetch-companies`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || 'Failed to sync data from HubSpot'
          );
        }

        const result = await response.json();

        if (result.error) {
          throw new Error(result.message || 'Failed to sync data from HubSpot');
        }

        // Update last synced timestamp
        const { error } = await supabase
          .from('integration_settings')
          .update({
            additional_settings: {
              last_synced: new Date().toISOString(),
            },
          })
          .eq('integration_type', integrationId);

        if (error) {
          console.error('Error updating last synced timestamp:', error);
        }

        setStatusMessage({
          type: 'success',
          message:
            result.message || `Successfully synced data from ${integrationId}`,
        });
        
        toast.success(`Successfully synced data from ${integrationId}`);

        // Refresh integration status
        await loadIntegrationStatus();
      } else {
        // For other integrations, simulate sync
        await new Promise((resolve) => setTimeout(resolve, 2000));

        setStatusMessage({
          type: 'success',
          message: `Successfully synced data from ${integrationId}`,
        });
        
        toast.success(`Successfully synced data from ${integrationId}`);
      }
    } catch (error) {
      console.error(`Error syncing data from ${integrationId}:`, error);
      setStatusMessage({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : `Failed to sync data from ${integrationId}`,
      });
      
      toast.error(`Failed to sync data from ${integrationId}`);
    } finally {
      setSyncing(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-gray-600">
            Connect to business apps to import customer feedback
          </p>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
            statusMessage.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <div>{statusMessage.message}</div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl border border-gray-200 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Popular Integrations
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {integrations
            .filter((i) => i.isPopular)
            .map((integration) => (
              <div
                key={integration.id}
                id={`integration-${integration.id}`}
                className="border border-gray-200 rounded-lg p-6 hover:border-purple-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <integration.icon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {integration.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {integration.description}
                    </p>

                    {integration.status === 'connected' &&
                      integration.lastSynced && (
                        <p className="text-xs text-gray-500 mt-1">
                          Last synced: {formatDate(integration.lastSynced)}
                        </p>
                      )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {integration.status === 'connected' ? (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Connected
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Not connected
                      </span>
                    )}
                  </div>

                  {integration.status === 'connected' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSyncData(integration.id)}
                        disabled={
                          syncing === integration.id ||
                          disconnecting === integration.id
                        }
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-70 flex items-center gap-2"
                      >
                        {syncing === integration.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            Sync Data
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDisconnect(integration.id)}
                        disabled={
                          disconnecting === integration.id ||
                          syncing === integration.id
                        }
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-70 flex items-center gap-2"
                      >
                        {disconnecting === integration.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Disconnecting...
                          </>
                        ) : (
                          <>
                            <LogOut className="w-4 h-4" />
                            Disconnect
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(integration.id)}
                      disabled={connecting === integration.id}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-70 flex items-center gap-2"
                    >
                      {connecting === integration.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Plug className="w-4 h-4" />
                          Connect
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          All Integrations
        </h2>

        <div className="space-y-4">
          {integrations
            .filter((i) => !i.isPopular)
            .map((integration) => (
              <div
                key={integration.id}
                id={`integration-${integration.id}`}
                className="border border-gray-200 rounded-lg p-4 hover:border-purple-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <integration.icon className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {integration.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {integration.description}
                      </p>

                      {integration.status === 'connected' &&
                        integration.lastSynced && (
                          <p className="text-xs text-gray-500">
                            Last synced: {formatDate(integration.lastSynced)}
                          </p>
                        )}
                    </div>
                  </div>

                  {integration.status === 'connected' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSyncData(integration.id)}
                        disabled={
                          syncing === integration.id ||
                          disconnecting === integration.id
                        }
                        className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-70 flex items-center gap-1.5 text-sm"
                      >
                        {syncing === integration.id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3 h-3" />
                            Sync Data
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDisconnect(integration.id)}
                        disabled={
                          disconnecting === integration.id ||
                          syncing === integration.id
                        }
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-70 flex items-center gap-1.5 text-sm"
                      >
                        {disconnecting === integration.id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Disconnecting...
                          </>
                        ) : (
                          <>
                            <LogOut className="w-3 h-3" />
                            Disconnect
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(integration.id)}
                      disabled={connecting === integration.id}
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-70 flex items-center gap-1.5 text-sm"
                    >
                      {connecting === integration.id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Plug className="w-3 h-3" />
                          Connect
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="mt-8 bg-blue-50 p-6 rounded-xl border border-blue-100">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <ExternalLink className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900">
              Need a custom integration?
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              We can build custom integrations for your specific tools and
              workflows. Contact our support team to discuss your requirements.
            </p>
            <button className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}