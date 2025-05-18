import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, AlertCircle, Loader2, Users, MessageSquare, Share2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Pod {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
  _pod_members_count?: number;
  _pod_insights_count?: number;
}

export default function ProductAreas() {
  const navigate = useNavigate();
  const [pods, setPods] = useState<Pod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingPod, setIsCreatingPod] = useState(false);
  const [newPod, setNewPod] = useState({ 
    name: '', 
    description: ''
  });

  useEffect(() => {
    loadPods();
  }, []);

  const loadPods = async () => {
    try {
      // Get pods with counts of members and insights
      const { data, error } = await supabase
        .from('pods')
        .select(`
          *,
          pod_members!pod_members_pod_id_fkey (count),
          pod_insights!pod_insights_pod_id_fkey (count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Process the data to include counts
      const processedPods = data?.map(pod => ({
        ...pod,
        _pod_members_count: pod.pod_members?.[0]?.count || 0,
        _pod_insights_count: pod.pod_insights?.[0]?.count || 0
      })) || [];
      
      setPods(processedPods);
      setLoading(false);
    } catch (error) {
      console.error('Error loading pods:', error);
      setError('Failed to load workspaces');
      setLoading(false);
    }
  };

  const handleCreatePod = async () => {
    if (!newPod.name.trim()) return;

    try {
      setLoading(true);
      setError(null);

      // Get the current user's ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      // Create the pod
      const { data: pod, error: podError } = await supabase
        .from('pods')
        .insert({
          name: newPod.name.trim(),
          description: newPod.description.trim(),
          created_by: user.id
        })
        .select()
        .single();

      if (podError) throw podError;

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('pod_members')
        .insert({
          pod_id: pod.id,
          user_id: user.id,
          role: 'owner'
        });

      if (memberError) throw memberError;

      setNewPod({ name: '', description: '' });
      setIsCreatingPod(false);
      await loadPods();
    } catch (error) {
      console.error('Error creating pod:', error);
      setError(error instanceof Error ? error.message : 'Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPod = (podId: string) => {
    navigate(`/dashboard/pods?pod=${podId}`);
  };

  if (loading && pods.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workspaces</h1>
          <p className="mt-1 text-gray-600">
            Manage your collaborative workspaces for your teams.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsCreatingPod(true)}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2"
          >
            <Users className="w-5 h-5" />
            Create Workspace
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {isCreatingPod && (
        <div className="mb-6 bg-white p-6 rounded-xl border border-purple-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">New Workspace</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newPod.name}
                onChange={(e) => setNewPod({ ...newPod, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="e.g., Mobile Team, Web Platform"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newPod.description}
                onChange={(e) => setNewPod({ ...newPod, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="What does this workspace focus on?"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setNewPod({ name: '', description: '' });
                  setIsCreatingPod(false);
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePod}
                disabled={!newPod.name.trim() || loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Workspace'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workspaces Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">All Workspaces</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pods.length === 0 ? (
            <div className="col-span-full p-8 text-center bg-white rounded-xl border border-gray-200">
              <p className="text-gray-600">No workspaces found. Create one to get started!</p>
            </div>
          ) : (
            pods.map(pod => (
              <div 
                key={pod.id}
                className="bg-white p-6 rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => handleViewPod(pod.id)}
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{pod.name}</h3>
                {pod.description && (
                  <p className="text-gray-600 mb-4 line-clamp-2">{pod.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {pod._pod_members_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      {pod._pod_insights_count}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewPod(pod.id);
                    }}
                    className="text-purple-600 hover:text-purple-800"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}