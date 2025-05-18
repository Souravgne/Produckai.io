import React, { useState, useEffect } from 'react';
import { X, Users, Plus, Loader2, Search, Tag, Layers, MessageSquare } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'sonner';

interface CreateWorkspaceModalProps {
  onClose: () => void;
  onWorkspaceCreated: () => void;
}

interface Theme {
  id: string;
  name: string;
  description: string;
}

interface Insight {
  id: string;
  content: string;
  source: string;
  sentiment: string;
}

interface Collaborator {
  email: string;
  role: 'viewer' | 'member';
}

export default function CreateWorkspaceModal({ onClose, onWorkspaceCreated }: CreateWorkspaceModalProps) {
  const [workspace, setWorkspace] = useState({
    name: '',
    description: '',
    enableAi: true
  });
  
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [selectedInsights, setSelectedInsights] = useState<string[]>([]);
  const [filteredInsights, setFilteredInsights] = useState<Insight[]>([]);
  const [insightSearchQuery, setInsightSearchQuery] = useState('');
  
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [newCollaborator, setNewCollaborator] = useState({
    email: '',
    role: 'member' as 'viewer' | 'member'
  });
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  useEffect(() => {
    loadThemesAndInsights();
  }, []);

  useEffect(() => {
    if (selectedThemes.length > 0) {
      loadInsightsByThemes();
    } else {
      setFilteredInsights(insights);
    }
  }, [selectedThemes, insights]);

  useEffect(() => {
    if (insightSearchQuery) {
      const filtered = insights.filter(insight => 
        insight.content.toLowerCase().includes(insightSearchQuery.toLowerCase())
      );
      setFilteredInsights(filtered);
    } else {
      if (selectedThemes.length > 0) {
        loadInsightsByThemes();
      } else {
        setFilteredInsights(insights);
      }
    }
  }, [insightSearchQuery]);

  const loadThemesAndInsights = async () => {
    setLoadingData(true);
    try {
      const { data: themesData, error: themesError } = await supabase
        .from('themes')
        .select('id, name, description')
        .order('name');

      if (themesError) throw themesError;
      setThemes(themesData || []);

      const { data: insightsData, error: insightsError } = await supabase
        .from('insights')
        .select('id, content, source, sentiment')
        .order('created_at', { ascending: false })
        .limit(20);

      if (insightsError) throw insightsError;
      setInsights(insightsData || []);
      setFilteredInsights(insightsData || []);
    } catch (error) {
      console.error('Error loading themes and insights:', error);
      toast.error('Failed to load themes and insights');
    } finally {
      setLoadingData(false);
    }
  };

  const loadInsightsByThemes = async () => {
    if (selectedThemes.length === 0) {
      setFilteredInsights(insights);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('insight_themes')
        .select(`
          insight_id,
          insights (
            id,
            content,
            source,
            sentiment
          )
        `)
        .in('theme_id', selectedThemes);

      if (error) throw error;

      if (data) {
        const filteredInsights = data
          .filter(item => item.insights)
          .map(item => item.insights);
        
        const uniqueInsights = Array.from(
          new Map(filteredInsights.map(item => [item.id, item])).values()
        );
        
        setFilteredInsights(uniqueInsights);
      }
    } catch (error) {
      console.error('Error loading insights by themes:', error);
    }
  };

  const handleThemeToggle = (themeId: string) => {
    setSelectedThemes(prev => 
      prev.includes(themeId)
        ? prev.filter(id => id !== themeId)
        : [...prev, themeId]
    );
  };

  const handleInsightToggle = (insightId: string) => {
    setSelectedInsights(prev => 
      prev.includes(insightId)
        ? prev.filter(id => id !== insightId)
        : [...prev, insightId]
    );
  };

  const handleAddCollaborator = () => {
    if (!newCollaborator.email.trim() || !newCollaborator.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    if (collaborators.some(c => c.email === newCollaborator.email.trim())) {
      toast.error('This collaborator has already been added');
      return;
    }
    
    const role = newCollaborator.role === 'member' ? 'member' : 'viewer';
    
    setCollaborators([...collaborators, {
      email: newCollaborator.email.trim(),
      role
    }]);
    
    setNewCollaborator({
      email: '',
      role: 'member'
    });
  };

  const handleRemoveCollaborator = (email: string) => {
    setCollaborators(collaborators.filter(c => c.email !== email));
  };

  const handleCreateWorkspace = async () => {
    if (!workspace.name.trim()) {
      toast.error('Workspace name is required');
      return;
    }
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: pod, error: podError } = await supabase
        .from('pods')
        .insert({
          name: workspace.name.trim(),
          description: workspace.description.trim(),
          created_by: user.id
        })
        .select()
        .single();

      if (podError) throw podError;

      const { error: memberError } = await supabase
        .from('pod_members')
        .insert({
          pod_id: pod.id,
          user_id: user.id,
          role: 'owner'
        });

      if (memberError) throw memberError;

      if (collaborators.length > 0) {
        const invitations = collaborators.map(collaborator => ({
          pod_id: pod.id,
          email: collaborator.email,
          role: collaborator.role,
          invited_by: user.id
        }));

        const { error: invitationError } = await supabase
          .from('pod_invitations')
          .insert(invitations);

        if (invitationError) {
          console.error('Error adding invitations:', invitationError);
          toast.error('Failed to send some invitations');
        }
      }

      if (selectedInsights.length > 0) {
        const podInsights = selectedInsights.map(insightId => ({
          pod_id: pod.id,
          insight_id: insightId,
          shared_by: user.id
        }));

        const { error: insightsError } = await supabase
          .from('pod_insights')
          .insert(podInsights);

        if (insightsError) {
          console.error('Error adding insights:', insightsError);
          toast.error('Failed to add some insights');
        }
      }

      if (selectedThemes.length > 0 && selectedInsights.length === 0) {
        const { data: themeInsights, error: themeInsightsError } = await supabase
          .from('insight_themes')
          .select('insight_id')
          .in('theme_id', selectedThemes)
          .limit(20);

        if (themeInsightsError) {
          console.error('Error fetching theme insights:', themeInsightsError);
        } else if (themeInsights && themeInsights.length > 0) {
          const uniqueInsightIds = Array.from(
            new Set(themeInsights.map(item => item.insight_id))
          );

          const podInsights = uniqueInsightIds.map(insightId => ({
            pod_id: pod.id,
            insight_id: insightId,
            shared_by: user.id
          }));

          const { error: insightsError } = await supabase
            .from('pod_insights')
            .insert(podInsights);

          if (insightsError) {
            console.error('Error adding theme insights:', insightsError);
            toast.error('Failed to add some theme insights');
          }
        }
      }

      toast.success('Workspace created successfully!');
      onWorkspaceCreated();
    } catch (error) {
      console.error('Error creating workspace:', error);
      toast.error('Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleCreateWorkspace();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workspace Name*
              </label>
              <input
                type="text"
                value={workspace.name}
                onChange={(e) => setWorkspace({ ...workspace, name: e.target.value })}
                placeholder="e.g., Onboarding UX, Filtering Experience"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={workspace.description}
                onChange={(e) => setWorkspace({ ...workspace, description: e.target.value })}
                placeholder="Describe the focus of this Workspace — e.g., why it's important, what pain point it addresses, or what kind of feedback you're tracking."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enable-ai"
                checked={workspace.enableAi}
                onChange={(e) => setWorkspace({ ...workspace, enableAi: e.target.checked })}
                className="h-4 w-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
              />
              <label htmlFor="enable-ai" className="ml-2 text-sm text-gray-700">
                Enable AI summaries for this workspace
              </label>
            </div>
            <p className="text-xs text-gray-500 ml-6">
              Automatically summarize insights and suggest prioritization.
            </p>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Themes (Optional)
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Selecting themes will automatically include related insights in your workspace.
              </p>
              
              {loadingData ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                </div>
              ) : themes.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No themes available</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2">
                  {themes.map((theme) => (
                    <div
                      key={theme.id}
                      onClick={() => handleThemeToggle(theme.id)}
                      className={`p-3 border rounded-lg cursor-pointer flex items-center gap-2 ${
                        selectedThemes.includes(theme.id)
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-200 hover:border-teal-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border ${
                          selectedThemes.includes(theme.id)
                            ? 'border-teal-500 bg-teal-500'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedThemes.includes(theme.id) && (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{theme.name}</p>
                        {theme.description && (
                          <p className="text-xs text-gray-500 truncate">{theme.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Individual Insights (Optional)
              </label>
              
              <div className="relative mb-3">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={insightSearchQuery}
                  onChange={(e) => setInsightSearchQuery(e.target.value)}
                  placeholder="Search insights..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              
              {loadingData ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                </div>
              ) : filteredInsights.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No insights available</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto p-2">
                  {filteredInsights.map((insight) => (
                    <div
                      key={insight.id}
                      onClick={() => handleInsightToggle(insight.id)}
                      className={`p-3 border rounded-lg cursor-pointer ${
                        selectedInsights.includes(insight.id)
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className={`w-4 h-4 rounded-full border ${
                            selectedInsights.includes(insight.id)
                              ? 'border-purple-500 bg-purple-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {selectedInsights.includes(insight.id) && (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-white"></div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <span
                            className={`px-1.5 py-0.5 rounded ${
                              insight.sentiment === 'positive'
                                ? 'bg-green-50 text-green-700'
                                : insight.sentiment === 'negative'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-gray-50 text-gray-700'
                            }`}
                          >
                            {insight.sentiment.charAt(0).toUpperCase() + insight.sentiment.slice(1)}
                          </span>
                          <span className="text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {insight.source}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-900 line-clamp-2">{insight.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="text-sm text-gray-600">
              {selectedThemes.length > 0 && (
                <p className="flex items-center gap-1">
                  <Layers className="w-4 h-4 text-teal-600" />
                  {selectedThemes.length} theme(s) selected
                </p>
              )}
              {selectedInsights.length > 0 && (
                <p className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                  {selectedInsights.length} insight(s) selected
                </p>
              )}
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invite Collaborators (Optional)
              </label>
              
              <div className="flex gap-2 mb-3">
                <input
                  type="email"
                  value={newCollaborator.email}
                  onChange={(e) => setNewCollaborator({ ...newCollaborator, email: e.target.value })}
                  placeholder="Email address"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <select
                  value={newCollaborator.role}
                  onChange={(e) => setNewCollaborator({ 
                    ...newCollaborator, 
                    role: e.target.value as 'viewer' | 'member'
                  })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  onClick={handleAddCollaborator}
                  disabled={!newCollaborator.email.trim() || !newCollaborator.email.includes('@')}
                  className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              <div className="text-xs text-gray-500 mb-4">
                <p><strong>Viewer:</strong> Can view insights and discussions</p>
                <p><strong>Member:</strong> Can view, comment, and share insights</p>
              </div>
              
              {collaborators.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {collaborators.map((collaborator, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{collaborator.email}</p>
                        <p className="text-xs text-gray-500 capitalize">{collaborator.role}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveCollaborator(collaborator.email)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No collaborators added yet</p>
                </div>
              )}
            </div>
            
            <div className="bg-teal-50 p-4 rounded-lg">
              <h3 className="font-medium text-teal-900 mb-1">Workspace Summary</h3>
              <p className="text-sm text-teal-800 mb-2">
                <strong>Name:</strong> {workspace.name}
              </p>
              {workspace.description && (
                <p className="text-sm text-teal-800 mb-2">
                  <strong>Description:</strong> {workspace.description}
                </p>
              )}
              <p className="text-sm text-teal-800 mb-2">
                <strong>AI Summaries:</strong> {workspace.enableAi ? 'Enabled' : 'Disabled'}
              </p>
              <p className="text-sm text-teal-800 mb-2">
                <strong>Selected Themes:</strong> {selectedThemes.length}
              </p>
              <p className="text-sm text-teal-800 mb-2">
                <strong>Selected Insights:</strong> {selectedInsights.length}
              </p>
              <p className="text-sm text-teal-800">
                <strong>Collaborators:</strong> {collaborators.length}
              </p>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Create New Workspace</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 h-2 bg-gray-200 rounded-full">
              <div 
                className="h-2 bg-teal-500 rounded-full" 
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
            <span className="ml-4 text-sm text-gray-600">
              Step {currentStep} of {totalSteps}
            </span>
          </div>
          
          {renderStepContent()}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between">
          {currentStep > 1 ? (
            <button
              onClick={prevStep}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
          )}
          
          <button
            onClick={nextStep}
            disabled={currentStep === 1 && !workspace.name.trim() || loading}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {currentStep === totalSteps ? 'Creating...' : 'Saving...'}
              </>
            ) : (
              currentStep === totalSteps ? 'Create Workspace' : 'Next'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}