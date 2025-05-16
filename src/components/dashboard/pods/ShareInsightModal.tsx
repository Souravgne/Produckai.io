import React, { useState, useEffect } from 'react';
import { X, Search, Share2, Loader2, Tag, Plus, Users, MessageSquare } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import Select from 'react-select';
import { toast } from 'sonner';

interface ShareInsightModalProps {
  podId: string;
  insightId: string;
  onClose: () => void;
  onShare: () => void;
}

interface TagOption {
  value: string;
  label: string;
}

interface Pod {
  id: string;
  name: string;
  description: string;
}

interface Insight {
  id: string;
  content: string;
  source: string;
  sentiment: string;
  status: string;
}

export default function ShareInsightModal({ 
  podId, 
  insightId, 
  onClose, 
  onShare 
}: ShareInsightModalProps) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [selectedTags, setSelectedTags] = useState<TagOption[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [pods, setPods] = useState<Pod[]>([]);
  const [selectedPod, setSelectedPod] = useState<string>(podId);
  const [showCreatePod, setShowCreatePod] = useState(false);
  const [newPod, setNewPod] = useState({ name: '', description: '' });
  const [insightDetails, setInsightDetails] = useState<any>(null);
  const [loadingInsight, setLoadingInsight] = useState(true);
  const [availableInsights, setAvailableInsights] = useState<Insight[]>([]);
  const [selectedInsightId, setSelectedInsightId] = useState<string>(insightId);
  const [searchQuery, setSearchQuery] = useState('');
  const [importantInsights, setImportantInsights] = useState<string[]>([]);

  // Load existing tags, pods, and insight details when modal opens
  useEffect(() => {
    loadExistingTags();
    loadPods();
    loadAvailableInsights();
    loadImportantInsights();
    if (insightId) {
      setSelectedInsightId(insightId);
      loadInsightDetails(insightId);
    }
  }, [insightId]);

  const loadImportantInsights = () => {
    const storedImportantInsights = localStorage.getItem('importantInsights');
    if (storedImportantInsights) {
      setImportantInsights(JSON.parse(storedImportantInsights));
    }
  };

  const loadExistingTags = async () => {
    try {
      // Get all existing tags from pod_insights
      const { data, error } = await supabase
        .from('pod_insights')
        .select('tags')
        .not('tags', 'is', null);

      if (error) throw error;

      // Extract unique tags from all pod insights
      const allTags = new Set<string>();
      data?.forEach(item => {
        if (item.tags && Array.isArray(item.tags)) {
          item.tags.forEach((tag: string) => allTags.add(tag));
        }
      });

      // Convert to tag options
      const tagOptions: TagOption[] = Array.from(allTags).map(tag => ({
        value: tag,
        label: tag
      }));

      setTags(tagOptions);
    } catch (error) {
      console.error('Error loading existing tags:', error);
    }
  };

  const loadPods = async () => {
    try {
      const { data, error } = await supabase
        .from('pods')
        .select('id, name, description')
        .order('name');

      if (error) throw error;
      setPods(data || []);
      
      // Set the first pod as selected if no podId was provided
      if (!podId && data && data.length > 0) {
        setSelectedPod(data[0].id);
      }
    } catch (error) {
      console.error('Error loading pods:', error);
    }
  };

  const loadAvailableInsights = async () => {
    try {
      const { data, error } = await supabase
        .from('insights')
        .select('id, content, source, sentiment, status')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAvailableInsights(data || []);
    } catch (error) {
      console.error('Error loading available insights:', error);
    }
  };

  const loadInsightDetails = async (id: string) => {
    try {
      setLoadingInsight(true);
      const { data, error } = await supabase
        .from('insights')
        .select('content, source, sentiment, status')
        .eq('id', id)
        .single();

      if (error) throw error;
      setInsightDetails(data);
    } catch (error) {
      console.error('Error loading insight details:', error);
    } finally {
      setLoadingInsight(false);
    }
  };

  const handleAddTag = () => {
    if (!customTag.trim()) return;
    
    const newTag = {
      value: customTag.trim(),
      label: customTag.trim()
    };
    
    // Check if tag already exists
    if (!selectedTags.some(tag => tag.value === newTag.value)) {
      setSelectedTags([...selectedTags, newTag]);
      
      // Add to available tags if it's new
      if (!tags.some(tag => tag.value === newTag.value)) {
        setTags([...tags, newTag]);
      }
    }
    
    setCustomTag('');
  };

  const handleCreatePod = async () => {
    if (!newPod.name.trim()) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
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

      // Update pods list and select the new pod
      setPods([...pods, pod]);
      setSelectedPod(pod.id);
      setShowCreatePod(false);
      setNewPod({ name: '', description: '' });
      toast.success('New workspace created');
    } catch (error) {
      console.error('Error creating pod:', error);
      toast.error('Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!selectedPod || !selectedInsightId) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Extract tag values for storage
      const tagValues = selectedTags.map(tag => tag.value);

      // Update insight status to 'in_review'
      await supabase
        .from('insights')
        .update({ status: 'in_review' })
        .eq('id', selectedInsightId);

      // Share the insight to the selected pod
      const { error } = await supabase
        .from('pod_insights')
        .insert({
          pod_id: selectedPod,
          insight_id: selectedInsightId,
          shared_by: user.id,
          note: note.trim(),
          tags: tagValues
        });

      if (error) throw error;

      // If the insight is marked as important, ensure it stays that way
      if (importantInsights.includes(selectedInsightId)) {
        // No need to update localStorage as it's already there
      }

      toast.success('Insight added to workspace successfully');
      onShare();
    } catch (error) {
      console.error('Error sharing insight:', error);
      toast.error('Failed to add insight to workspace');
    } finally {
      setLoading(false);
    }
  };

  const filteredInsights = searchQuery
    ? availableInsights.filter(insight => 
        insight.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableInsights;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Add Insight to Workspace</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Workspace
            </label>
            
            {pods.length === 0 ? (
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-600 mb-2">No workspaces found</p>
                <button
                  onClick={() => setShowCreatePod(true)}
                  className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
                >
                  Create Workspace
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <select
                  value={selectedPod}
                  onChange={(e) => setSelectedPod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  {pods.map((pod) => (
                    <option key={pod.id} value={pod.id}>
                      {pod.name}
                    </option>
                  ))}
                </select>
                
                <button
                  onClick={() => setShowCreatePod(true)}
                  className="text-teal-600 hover:text-teal-800 text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Create New Workspace
                </button>
              </div>
            )}
            
            {showCreatePod && (
              <div className="mt-4 p-4 border border-teal-100 rounded-lg bg-teal-50">
                <h3 className="font-medium text-teal-900 mb-3">Create New Workspace</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Workspace Name
                    </label>
                    <input
                      type="text"
                      value={newPod.name}
                      onChange={(e) => setNewPod({ ...newPod, name: e.target.value })}
                      placeholder="e.g., Product Team, Mobile Squad"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={newPod.description}
                      onChange={(e) => setNewPod({ ...newPod, description: e.target.value })}
                      placeholder="What does this workspace focus on?"
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowCreatePod(false);
                        setNewPod({ name: '', description: '' });
                      }}
                      className="px-3 py-1.5 text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreatePod}
                      disabled={!newPod.name.trim() || loading}
                      className="px-3 py-1.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Users className="w-4 h-4" />
                          Create Workspace
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Select Insight Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Insight
            </label>
            
            <div className="relative mb-3">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search insights..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {filteredInsights.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No insights found
                </div>
              ) : (
                filteredInsights.map(insight => (
                  <div 
                    key={insight.id}
                    className={`p-3 cursor-pointer hover:bg-gray-50 ${selectedInsightId === insight.id ? 'bg-teal-50 border-l-4 border-teal-500' : ''}`}
                    onClick={() => {
                      setSelectedInsightId(insight.id);
                      loadInsightDetails(insight.id);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 text-xs rounded ${
                          insight.sentiment === 'positive'
                            ? 'bg-green-50 text-green-700'
                            : insight.sentiment === 'negative'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-gray-50 text-gray-700'
                        }`}
                      >
                        {insight.sentiment.charAt(0).toUpperCase() + insight.sentiment.slice(1)}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {insight.source}
                      </span>
                      {insight.status && (
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          insight.status === 'new' ? 'bg-blue-50 text-blue-700' :
                          insight.status === 'read' ? 'bg-gray-50 text-gray-700' :
                          insight.status === 'in_review' ? 'bg-yellow-50 text-yellow-700' :
                          'bg-green-50 text-green-700'
                        }`}>
                          {insight.status === 'in_review' ? 'In Review' : 
                           insight.status.charAt(0).toUpperCase() + insight.status.slice(1)}
                        </span>
                      )}
                      {importantInsights.includes(insight.id) && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Flag className="w-3 h-3" />
                          Important
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-900 line-clamp-2">{insight.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Tags
            </label>
            <div className="space-y-3">
              <Select
                isMulti
                options={tags}
                value={selectedTags}
                onChange={(selected) => setSelectedTags(selected as TagOption[])}
                placeholder="Select or create tags..."
                className="basic-multi-select"
                classNamePrefix="select"
              />
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder="Add a new tag..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <button
                  onClick={handleAddTag}
                  disabled={!customTag.trim()}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Tag className="w-4 h-4" />
                  Add
                </button>
              </div>
              
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedTags.map(tag => (
                    <span 
                      key={tag.value} 
                      className="px-2 py-1 bg-teal-50 text-teal-700 rounded-md text-sm flex items-center gap-1"
                    >
                      <Tag className="w-3 h-3" />
                      {tag.label}
                      <button
                        onClick={() => setSelectedTags(selectedTags.filter(t => t.value !== tag.value))}
                        className="ml-1 text-teal-500 hover:text-teal-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add a Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add context or highlight key points..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleShare}
              disabled={!selectedPod || !selectedInsightId || loading}
              className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5" />
                  Add to Workspace
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}