import React, { useState, useEffect } from 'react';
import { 
  GitPullRequest, 
  ArrowUp, 
  MessageSquare, 
  Plus, 
  X, 
  Check, 
  Calendar, 
  ArrowUpRight, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  status: 'requested' | 'planned' | 'in_progress' | 'completed' | 'rejected';
  votes: number;
  created_at: string;
  created_by?: string;
  user_voted?: boolean;
  comments_count?: number;
}

export default function RoadmapPage() {
  const { user } = useAuth();
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([
    {
      id: 'csv-support',
      title: 'CSV Support for Insight Generation',
      description: 'Import customer feedback data from CSV files to generate insights and identify themes automatically.',
      status: 'completed',
      votes: 45,
      created_at: '2025-01-14T00:00:00Z',
      user_voted: false,
      comments_count: 0
    },
    {
      id: 'hubspot-integration',
      title: 'HubSpot Integration',
      description: 'Connect with HubSpot to import customer feedback and support tickets for analysis.',
      status: 'completed',
      votes: 38,
      created_at: '2025-01-19T00:00:00Z',
      user_voted: false,
      comments_count: 0
    },
    {
      id: 'zoom-integration',
      title: 'Zoom Integration',
      description: 'Analyze customer calls and meetings from Zoom for valuable feedback insights.',
      status: 'in_progress',
      votes: 52,
      created_at: '2025-02-09T00:00:00Z',
      user_voted: false,
      comments_count: 0
    },
    {
      id: 'workspace-collaboration',
      title: 'Workspace Collaboration',
      description: 'Collaborate with team members in shared workspaces to analyze and act on customer feedback.',
      status: 'completed',
      votes: 63,
      created_at: '2025-01-05T00:00:00Z',
      user_voted: false,
      comments_count: 0
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [activeSort, setActiveSort] = useState<string>('votes');
  const [showCommentForm, setShowCommentForm] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Load feature requests from database on component mount
  useEffect(() => {
    const fetchFeatureRequests = async () => {
      try {
        setLoading(true);
        
        // Fetch feature requests
        const { data: features, error: featuresError } = await supabase
          .from('feature_requests')
          .select('*')
          .order('votes', { ascending: false });
          
        if (featuresError) throw featuresError;
        
        // If user is logged in, fetch their votes
        let userVotes: Record<string, boolean> = {};
        if (user) {
          const { data: votes, error: votesError } = await supabase
            .from('user_votes')
            .select('feature_id')
            .eq('user_id', user.id);
            
          if (votesError) throw votesError;
          
          userVotes = (votes || []).reduce((acc, vote) => {
            acc[vote.feature_id] = true;
            return acc;
          }, {} as Record<string, boolean>);
        }
        
        // Fetch comment counts
        const { data: comments, error: commentsError } = await supabase
          .from('comments')
          .select('feature_id, count')
          .select('feature_id')
          .order('created_at', { ascending: false });
          
        if (commentsError) throw commentsError;
        
        // Count comments per feature
        const commentCounts = (comments || []).reduce((acc, comment) => {
          acc[comment.feature_id] = (acc[comment.feature_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        // Combine all data
        const processedFeatures = (features || []).map(feature => ({
          ...feature,
          user_voted: !!userVotes[feature.id],
          comments_count: commentCounts[feature.id] || 0
        }));
        
        setFeatureRequests(processedFeatures);
      } catch (error) {
        console.error('Error fetching feature requests:', error);
        setError('Failed to load feature requests. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    // Only fetch from database if we're in a production environment
    // For demo purposes, we'll use the static data
    // fetchFeatureRequests();
  }, [user]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRequest.title.trim() || !newRequest.description.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (!user) {
      toast.error('You must be logged in to submit a feature request');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from('feature_requests')
        .insert({
          title: newRequest.title.trim(),
          description: newRequest.description.trim(),
          status: 'requested',
          votes: 1,
          created_by: user.id
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Add the user's vote
      await supabase
        .from('user_votes')
        .insert({
          feature_id: data.id,
          user_id: user.id
        });
      
      toast.success('Feature request submitted successfully!');
      setNewRequest({ title: '', description: '' });
      setShowRequestForm(false);
      
      // Add the new feature to the local state
      setFeatureRequests(prev => [
        ...prev, 
        {
          ...data,
          user_voted: true,
          comments_count: 0
        }
      ]);
    } catch (error) {
      console.error('Error submitting feature request:', error);
      toast.error('Failed to submit feature request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (featureId: string, currentVotes: number, userVoted: boolean) => {
    if (!user) {
      toast.error('You must be logged in to vote');
      return;
    }
    
    try {
      // Calculate new vote count
      const newVotes = userVoted ? currentVotes - 1 : currentVotes + 1;
      
      // Update local state immediately for better UX
      setFeatureRequests(prev => 
        prev.map(feature => 
          feature.id === featureId 
            ? { 
                ...feature, 
                votes: newVotes,
                user_voted: !userVoted 
              } 
            : feature
        )
      );
      
      if (userVoted) {
        // Remove vote
        const { error: deleteError } = await supabase
          .from('user_votes')
          .delete()
          .eq('feature_id', featureId)
          .eq('user_id', user.id);
          
        if (deleteError) throw deleteError;
      } else {
        // Add vote
        const { error: insertError } = await supabase
          .from('user_votes')
          .insert({
            feature_id: featureId,
            user_id: user.id
          });
          
        if (insertError) throw insertError;
      }
      
      // Update feature vote count
      const { error: updateError } = await supabase
        .from('feature_requests')
        .update({ votes: newVotes })
        .eq('id', featureId);
        
      if (updateError) throw updateError;
      
    } catch (error) {
      console.error('Error voting for feature:', error);
      toast.error('Failed to register your vote. Please try again.');
      
      // Revert the local state change if there was an error
      setFeatureRequests(prev => 
        prev.map(feature => 
          feature.id === featureId 
            ? { 
                ...feature, 
                votes: currentVotes,
                user_voted: userVoted 
              } 
            : feature
        )
      );
    }
  };

  const handleAddComment = async (featureId: string) => {
    if (!user) {
      toast.error('You must be logged in to comment');
      return;
    }
    
    if (!comment.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }
    
    setSubmittingComment(true);
    
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          feature_id: featureId,
          user_id: user.id,
          content: comment.trim()
        });
        
      if (error) throw error;
      
      toast.success('Comment added successfully!');
      setComment('');
      setShowCommentForm(null);
      
      // Update comment count in local state
      setFeatureRequests(prev => 
        prev.map(feature => 
          feature.id === featureId 
            ? { 
                ...feature, 
                comments_count: (feature.comments_count || 0) + 1
              } 
            : feature
        )
      );
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'requested':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Requested</span>;
      case 'planned':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Planned</span>;
      case 'in_progress':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">In Progress</span>;
      case 'completed':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Completed</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Not Planned</span>;
      default:
        return null;
    }
  };

  // Filter features based on active filter
  const filteredFeatures = activeFilter === 'all' 
    ? featureRequests 
    : featureRequests.filter(feature => feature.status === activeFilter);
  
  // Sort features based on active sort
  const sortedFeatures = [...filteredFeatures].sort((a, b) => {
    if (activeSort === 'votes') {
      return b.votes - a.votes;
    } else {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Product Roadmap</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Help shape the future of ProduckAI by voting on features or suggesting new ones. We build in public and prioritize based on your feedback.
          </p>
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                activeFilter === 'all' 
                  ? 'bg-[#00A0C1] text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter('requested')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                activeFilter === 'requested' 
                  ? 'bg-gray-700 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Requested
            </button>
            <button
              onClick={() => setActiveFilter('planned')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                activeFilter === 'planned' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Planned
            </button>
            <button
              onClick={() => setActiveFilter('in_progress')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                activeFilter === 'in_progress' 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setActiveFilter('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                activeFilter === 'completed' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Completed
            </button>
          </div>
          
          <div className="flex gap-4">
            <div className="relative inline-block">
              <select
                value={activeSort}
                onChange={(e) => setActiveSort(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg py-2 pl-4 pr-10 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00A0C1]"
              >
                <option value="votes">Most Votes</option>
                <option value="recent">Most Recent</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
            
            <button
              onClick={() => setShowRequestForm(true)}
              className="px-4 py-2 bg-[#00A0C1] text-white rounded-lg hover:bg-[#008a9a] transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Request Feature
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-10 h-10 text-[#00A0C1] animate-spin" />
          </div>
        ) : sortedFeatures.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <GitPullRequest className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No feature requests yet</h3>
            <p className="text-gray-600 mb-6">Be the first to suggest a feature for our product roadmap.</p>
            <button
              onClick={() => setShowRequestForm(true)}
              className="px-6 py-3 bg-[#00A0C1] text-white rounded-lg hover:bg-[#008a9a] transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Request a Feature
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedFeatures.map((feature) => (
              <div key={feature.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(feature.status)}
                      <span className="text-xs text-gray-500">
                        {new Date(feature.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleVote(feature.id, feature.votes, feature.user_voted || false)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${
                        feature.user_voted
                          ? 'bg-[#00A0C1] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <ArrowUp className="w-4 h-4" />
                      {feature.votes}
                    </button>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 mb-4">{feature.description}</p>
                  
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => setShowCommentForm(showCommentForm === feature.id ? null : feature.id)}
                      className="text-gray-500 hover:text-gray-700 flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-sm">{feature.comments_count || 0} Comments</span>
                    </button>
                    
                    {feature.status === 'in_progress' && (
                      <span className="text-xs text-blue-600 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Coming soon
                      </span>
                    )}
                    
                    {feature.status === 'completed' && (
                      <a href="#" className="text-xs text-green-600 flex items-center gap-1">
                        <ArrowUpRight className="w-4 h-4" />
                        See it live
                      </a>
                    )}
                  </div>
                  
                  {showCommentForm === feature.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Add your comment..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A0C1] focus:border-transparent text-sm"
                        rows={3}
                      ></textarea>
                      <div className="flex justify-end mt-2 gap-2">
                        <button
                          onClick={() => {
                            setShowCommentForm(null);
                            setComment('');
                          }}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleAddComment(feature.id)}
                          disabled={submittingComment || !comment.trim()}
                          className="px-3 py-1.5 bg-[#00A0C1] text-white rounded-lg hover:bg-[#008a9a] transition-colors disabled:opacity-50 text-sm flex items-center gap-1.5"
                        >
                          {submittingComment ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Submit
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feature Request Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Request a Feature</h2>
              <button
                onClick={() => setShowRequestForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitRequest}>
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Feature Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={newRequest.title}
                  onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A0C1] focus:border-transparent"
                  placeholder="E.g., Dark Mode Support"
                  required
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A0C1] focus:border-transparent"
                  placeholder="Describe the feature and why it would be valuable..."
                  rows={4}
                  required
                ></textarea>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRequestForm(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newRequest.title.trim() || !newRequest.description.trim()}
                  className="px-4 py-2 bg-[#00A0C1] text-white rounded-lg hover:bg-[#008a9a] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Submit Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}