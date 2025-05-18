import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Users,
  Loader2,
  AlertCircle,
  Pencil,
  Trash2,
  ExternalLink,
  MessageSquare,
  Calendar,
  Tag,
  Layers,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import ShareInsightModal from './ShareInsightModal';
import PodComments from './PodComments';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import WorkspaceDetail from './WorkspaceDetail';
import { toast } from 'sonner';

interface Pod {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
  _pod_members_count?: number;
  _pod_insights_count?: number;
}

interface PodMember {
  id: string;
  pod_id: string;
  user_id: string;
  role: 'owner' | 'member' | 'viewer';
  user_profiles_view?: {
    full_name: string | null;
    role: string;
    department: string;
  };
}

interface PodInsight {
  id: string;
  pod_id: string;
  insight_id: string;
  shared_by: string;
  note: string;
  created_at: string;
  tags?: string[];
  insights?: {
    content: string;
    source: string;
    sentiment: string;
  };
  user_profiles_view?: {
    full_name: string | null;
    role: string;
    department: string;
  };
  pod_comments?: Array<{
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    user_profiles_view?: {
      full_name: string | null;
      role: string;
      department: string;
    };
  }>;
}

interface PodInvitation {
  id: string;
  email: string;
  role: 'member' | 'viewer';
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

interface Theme {
  id: string;
  name: string;
  description: string;
  priority_score: number;
}

interface Insight {
  id: string;
  content: string;
  source: string;
  sentiment: string;
}

export default function PodsPage() {
  const [searchParams] = useSearchParams();
  const podIdParam = searchParams.get('pod');

  const [pods, setPods] = useState<Pod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newPod, setNewPod] = useState({ name: '', description: '' });
  const [editingPod, setEditingPod] = useState<Pod | null>(null);
  const [selectedPod, setSelectedPod] = useState<Pod | null>(null);
  const [podMembers, setPodMembers] = useState<PodMember[]>([]);
  const [podInsights, setPodInsights] = useState<PodInsight[]>([]);
  const [podInvitations, setPodInvitations] = useState<PodInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'viewer'>('member');
  const [showShareInsightModal, setShowShareInsightModal] = useState(false);
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(
    null
  );
  const [themes, setThemes] = useState<Theme[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectedInsights, setSelectedInsights] = useState<string[]>([]);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [podMemberCounts, setPodMemberCounts] = useState<Record<string, number>>({});
  const [podInsightCounts, setPodInsightCounts] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  useEffect(() => {
    loadPods();
    loadThemesAndInsights();
  }, []);

  useEffect(() => {
    if (podIdParam && pods.length > 0) {
      const pod = pods.find((p) => p.id === podIdParam);
      if (pod) {
        setSelectedPod(pod);
      }
    }
  }, [podIdParam, pods]);

  useEffect(() => {
    if (selectedPod) {
      loadPodDetails(selectedPod.id);
    }
  }, [selectedPod]);

  useEffect(() => {
    if (pods.length > 0) {
      loadPodCounts();
    }
  }, [pods]);

  const loadPods = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get pods
      const { data, error } = await supabase
        .from('pods')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPods(data || []);
    } catch (error) {
      console.error('Error loading pods:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to load workspaces'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadPodCounts = async () => {
    try {
      // Get all pod members to count them properly
      const { data: allMembers, error: allMembersError } = await supabase
        .from('pod_members')
        .select('pod_id');

      if (allMembersError) throw allMembersError;

      const memberCountMap: Record<string, number> = {};
      allMembers?.forEach(item => {
        if (item.pod_id) {
          memberCountMap[item.pod_id] = (memberCountMap[item.pod_id] || 0) + 1;
        }
      });
      
      setPodMemberCounts(memberCountMap);

      // Get insight counts for all pods
      const { data: insightCounts, error: insightError } = await supabase
        .from('pod_insights')
        .select('pod_id');

      if (insightError) throw insightError;

      const insightCountMap: Record<string, number> = {};
      insightCounts?.forEach(item => {
        if (item.pod_id) {
          insightCountMap[item.pod_id] = (insightCountMap[item.pod_id] || 0) + 1;
        }
      });
      
      setPodInsightCounts(insightCountMap);

    } catch (error) {
      console.error('Error loading pod counts:', error);
    }
  };

  const loadThemesAndInsights = async () => {
    try {
      // Load themes
      const { data: themesData, error: themesError } = await supabase
        .from('themes')
        .select('id, name, description, priority_score')
        .order('name');

      if (themesError) throw themesError;
      setThemes(themesData || []);

      // Load insights
      const { data: insightsData, error: insightsError } = await supabase
        .from('insights')
        .select('id, content, source, sentiment')
        .order('created_at', { ascending: false })
        .limit(20);

      if (insightsError) throw insightsError;
      setInsights(insightsData || []);
    } catch (error) {
      console.error('Error loading themes and insights:', error);
    }
  };

  const loadPodDetails = async (podId: string) => {
    try {
      // Load pod members with user profiles
      const { data: members, error: membersError } = await supabase
        .from('pod_members')
        .select(`
          id,
          pod_id,
          user_id,
          role,
          user_profiles_view (
            full_name,
            role,
            department
          )
        `)
        .eq('pod_id', podId);

      if (membersError) {
        console.error('Error loading pod members:', membersError);
        throw membersError;
      }

      setPodMembers(members || []);

      // Load pod insights with comments
      const { data: insights, error: insightsError } = await supabase
        .from('pod_insights')
        .select(`
          id,
          pod_id,
          insight_id,
          shared_by,
          note,
          tags,
          created_at,
          insights (
            content,
            source,
            sentiment
          ),
          user_profiles_view (
            full_name,
            role,
            department
          ),
          pod_comments (
            id,
            content,
            created_at,
            user_id,
            user_profiles_view (
              full_name,
              role,
              department
            )
          )
        `)
        .eq('pod_id', podId)
        .order('created_at', { ascending: false });

      if (insightsError) {
        console.error('Error loading pod insights:', insightsError);
        throw insightsError;
      }

      setPodInsights(insights || []);

      // Load pending invitations
      const { data: invitations, error: invitationsError } = await supabase
        .from('pod_invitations')
        .select('*')
        .eq('pod_id', podId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (invitationsError) throw invitationsError;
      setPodInvitations(invitations || []);
    } catch (error) {
      console.error('Error loading pod details:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to load workspace details'
      );
    }
  };

  const handleCreatePod = async () => {
    if (!newPod.name.trim()) return;

    try {
      setLoading(true);
      setError(null);

      // Get the current user's ID
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      // Create the pod
      const { data: pod, error: podError } = await supabase
        .from('pods')
        .insert({
          name: newPod.name.trim(),
          description: newPod.description.trim(),
          created_by: user.id,
        })
        .select()
        .single();

      if (podError) throw podError;

      // Add creator as owner
      const { error: memberError } = await supabase.from('pod_members').insert({
        pod_id: pod.id,
        user_id: user.id,
        role: 'owner',
      });

      if (memberError) throw memberError;

      // Add selected themes' insights to the pod
      if (selectedThemes.length > 0) {
        // Get all insights related to the selected themes
        const { data: themeInsights, error: themeInsightsError } =
          await supabase
            .from('insight_themes')
            .select('insight_id')
            .in('theme_id', selectedThemes);

        if (themeInsightsError) throw themeInsightsError;

        if (themeInsights && themeInsights.length > 0) {
          const insightIds = themeInsights.map((ti) => ti.insight_id);

          // Add these insights to the pod
          const podInsightsToAdd = insightIds.map((insightId) => ({
            pod_id: pod.id,
            insight_id: insightId,
            shared_by: user.id,
          }));

          const { error: addInsightsError } = await supabase
            .from('pod_insights')
            .insert(podInsightsToAdd);

          if (addInsightsError) throw addInsightsError;
        }
      }

      // Add individually selected insights to the pod
      if (selectedInsights.length > 0) {
        const podInsightsToAdd = selectedInsights.map((insightId) => ({
          pod_id: pod.id,
          insight_id: insightId,
          shared_by: user.id,
        }));

        const { error: addInsightsError } = await supabase
          .from('pod_insights')
          .insert(podInsightsToAdd);

        if (addInsightsError) throw addInsightsError;
      }

      setNewPod({ name: '', description: '' });
      setSelectedThemes([]);
      setSelectedInsights([]);
      setIsCreating(false);
      await loadPods();
    } catch (error) {
      console.error('Error creating workspace:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to create workspace'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePod = async () => {
    if (!editingPod || !editingPod.name.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('pods')
        .update({
          name: editingPod.name.trim(),
          description: editingPod.description.trim(),
        })
        .eq('id', editingPod.id);

      if (error) throw error;

      setEditingPod(null);
      await loadPods();
      if (selectedPod?.id === editingPod.id) {
        setSelectedPod({
          ...selectedPod,
          name: editingPod.name.trim(),
          description: editingPod.description.trim(),
        });
      }
    } catch (error) {
      console.error('Error updating pod:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to update workspace'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePod = async (id: string) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this workspace? This action cannot be undone.'
      )
    )
      return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.from('pods').delete().eq('id', id);

      if (error) throw error;

      if (selectedPod?.id === id) {
        setSelectedPod(null);
      }
      await loadPods();
    } catch (error) {
      console.error('Error deleting pod:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to delete workspace'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (podId: string) => {
    if (!inviteEmail.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      // Create new invitation
      const { error: insertError } = await supabase
        .from('pod_invitations')
        .insert({
          pod_id: podId,
          email: inviteEmail.trim(),
          role: inviteRole,
          invited_by: user.id,
        });

      if (insertError) {
        if (insertError.message.includes('violates check constraint')) {
          throw new Error('Invalid role. Please select either "member" or "viewer".');
        }
        throw insertError;
      }

      setInviteEmail('');
      setInviteRole('member');
      toast.success(`Invitation sent to ${inviteEmail.trim()}`);
      await loadPodDetails(podId);
    } catch (error) {
      console.error('Error inviting member:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to send invitation'
      );
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleCommentAdded = (podInsightId: string) => {
    if (selectedPod) {
      loadPodDetails(selectedPod.id);
    }
  };

  const renderTags = (tags?: string[]) => {
    if (!tags || tags.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {tags.map((tag, index) => (
          <span
            key={index}
            className="px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded-md text-xs flex items-center gap-1"
          >
            <Tag className="w-3 h-3" />
            {tag}
          </span>
        ))}
      </div>
    );
  };

  const handleThemeSelection = (themeId: string) => {
    setSelectedThemes((prev) => {
      if (prev.includes(themeId)) {
        return prev.filter((id) => id !== themeId);
      } else {
        return [...prev, themeId];
      }
    });
  };

  const handleInsightSelection = (insightId: string) => {
    setSelectedInsights((prev) => {
      if (prev.includes(insightId)) {
        return prev.filter((id) => id !== insightId);
      } else {
        return [...prev, insightId];
      }
    });
  };

  const handleExportToJira = async () => {
    const podInsight = podInsights[0]; // You can enhance this to allow user selection
    if (!podInsight) return alert('No insight to export');

    const theme = selectedPod?.name || 'Untitled Workspace';

    const note = podInsight?.note || '';
    const commentList = Array.isArray(podInsight?.pod_comments)
      ? podInsight.pod_comments.map((c) => `- ${c.content}`).join('\n')
      : 'No comments available.';

    const discussion = `Insight:\n${
      podInsight.insights?.content || 'No insight'
    }\n\nNote:\n${note}\n\nComments:\n${commentList}`;

    try {
      const sessionRes = await supabase.auth.getSession();
      const access_token = sessionRes.data.session?.access_token;
      if (!access_token) throw new Error('User not authenticated');

      const SUPABASE_URL =
        import.meta.env.VITE_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL;

      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/create-jira-story`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${access_token}`,
          },
          body: JSON.stringify({ theme, discussion }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error('Error creating Jira story:', data);
        toast.error(`Failed: ${data.error?.message || 'Unknown error'}`);
      } else {
        toast.success(`Jira Story Created: ${data.issue.key}`);
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      toast.error('An unexpected error occurred while exporting the insight.');
    }
  };

  const handleExportToLinear = async () => {
    // Placeholder for Linear export functionality
    toast.info('Export to Linear coming soon!');
  };

  const handleExport = (podInsightId: string) => {
    // Show export options modal or dropdown
    const exportOptions = document.getElementById(`export-options-${podInsightId}`);
    if (exportOptions) {
      exportOptions.classList.toggle('hidden');
    }
  };

  const handleViewWorkspace = (podId: string) => {
    navigate(`/dashboard/pods/${podId}`);
  };

  if (loading && pods.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  // If we're viewing a specific workspace, render the WorkspaceDetail component
  if (podIdParam) {
    return <WorkspaceDetail podId={podIdParam} />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workspaces</h1>
          <p className="mt-1 text-gray-600">
            Create and manage collaborative spaces for your team.
          </p>
        </div>
        <button
          onClick={() => setShowCreateWorkspaceModal(true)}
          className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Workspace
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-red-700">{error}</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pods.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-white rounded-xl border border-gray-200">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Workspaces Yet
            </h3>
            <p className="text-gray-600 mb-4">
              Create your first workspace to start collaborating with your team.
            </p>
            <button
              onClick={() => setShowCreateWorkspaceModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Workspace
            </button>
          </div>
        ) : (
          pods.map(pod => (
            <div 
              key={pod.id}
              className="bg-white p-6 rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer"
              onClick={() => handleViewWorkspace(pod.id)}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{pod.name}</h3>
              {pod.description && (
                <p className="text-gray-600 mb-4 line-clamp-2">{pod.description}</p>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {podMemberCounts[pod.id] || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    {podInsightCounts[pod.id] || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(pod.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPod(pod);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePod(pod.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {editingPod && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Edit Workspace
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editingPod.name}
                  onChange={(e) =>
                    setEditingPod({ ...editingPod, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editingPod.description || ''}
                  onChange={(e) =>
                    setEditingPod({
                      ...editingPod,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setEditingPod(null)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdatePod}
                  disabled={!editingPod.name.trim() || loading}
                  className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showShareInsightModal && selectedPod && (
        <ShareInsightModal
          podId={selectedPod.id}
          insightId=""
          onClose={() => setShowShareInsightModal(false)}
          onShare={() => {
            setShowShareInsightModal(false);
            loadPodDetails(selectedPod.id);
          }}
        />
      )}

      {showCreateWorkspaceModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateWorkspaceModal(false)}
          onWorkspaceCreated={() => {
            setShowCreateWorkspaceModal(false);
            loadPods();
          }}
        />
      )}
    </div>
  );
}