import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Filter,
  SortDesc,
  LayoutGrid,
  Users,
  Plus,
  MessageSquare,
  DollarSign,
  Flag,
  Share2,
  ListPlus,
  Sparkles,
  Tag,
  Loader2,
  AlertCircle,
  X,
  ExternalLink,
  Send,
  Trash2,
  Bookmark,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'sonner';
import AISummaryModal from './AISummaryModal';

interface WorkspaceDetailProps {
  podId?: string;
}

interface Pod {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
}

interface PodMember {
  id: string;
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
  insight_id: string;
  note: string;
  tags: string[];
  created_at: string;
  shared_by: string;
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

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_profiles_view?: {
    full_name: string | null;
    role: string;
    department: string;
  };
}

export default function WorkspaceDetail({ podId }: WorkspaceDetailProps) {
  const params = useParams();
  const navigate = useNavigate();
  const id = podId || params.id;
  
  const [pod, setPod] = useState<Pod | null>(null);
  const [members, setMembers] = useState<PodMember[]>([]);
  const [insights, setInsights] = useState<PodInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showCommentPanel, setShowCommentPanel] = useState(false);
  const [currentInsight, setCurrentInsight] = useState<PodInsight | null>(null);
  const [showExportOptions, setShowExportOptions] = useState<string | null>(null);
  const [exportingToJira, setExportingToJira] = useState(false);
  const [importantInsights, setImportantInsights] = useState<string[]>([]);
  const [showAISummary, setShowAISummary] = useState(false);

  useEffect(() => {
    if (id) {
      loadWorkspaceData(id);
      loadImportantInsights();
    }
  }, [id]);

  const loadImportantInsights = () => {
    const storedImportantInsights = localStorage.getItem('importantInsights');
    if (storedImportantInsights) {
      setImportantInsights(JSON.parse(storedImportantInsights));
    }
  };

  const loadWorkspaceData = async (podId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Load pod details
      const { data: podData, error: podError } = await supabase
        .from('pods')
        .select('*')
        .eq('id', podId)
        .single();

      if (podError) throw podError;
      setPod(podData);

      // Load pod members with user profiles
      const { data: membersData, error: membersError } = await supabase
        .from('pod_members')
        .select(`
          id,
          user_id,
          role,
          user_profiles_view (
            full_name,
            role,
            department
          )
        `)
        .eq('pod_id', podId);

      if (membersError) throw membersError;
      setMembers(membersData || []);

      // Load pod insights with comments
      const { data: insightsData, error: insightsError } = await supabase
        .from('pod_insights')
        .select(`
          id,
          insight_id,
          note,
          tags,
          created_at,
          shared_by,
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

      if (insightsError) throw insightsError;
      setInsights(insightsData || []);
    } catch (error) {
      console.error('Error loading workspace data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load workspace data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (insightId: string) => {
    if (!newComment.trim()) return;
    
    try {
      setSubmittingComment(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('pod_comments')
        .insert({
          pod_insight_id: insightId,
          user_id: user.id,
          content: newComment.trim()
        });
        
      if (error) throw error;
      
      setNewComment('');
      toast.success('Comment added successfully');
      
      // Reload the insights to get the new comment
      if (id) {
        loadWorkspaceData(id);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('pod_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      toast.success('Comment deleted');
      
      // Reload the insights to update the comments
      if (id) {
        loadWorkspaceData(id);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const handleBack = () => {
    navigate('/dashboard/pods');
  };

  const handleOpenCommentPanel = (insight: PodInsight) => {
    setCurrentInsight(insight);
    setShowCommentPanel(true);
  };

  const handleCloseCommentPanel = () => {
    setShowCommentPanel(false);
    setCurrentInsight(null);
  };

  const handleExportToJira = async (insightId: string) => {
    setExportingToJira(true);
    setShowExportOptions(null);
    
    try {
      const insight = insights.find(i => i.id === insightId);
      if (!insight) {
        throw new Error('Insight not found');
      }

      const theme = pod.name;
      const content = insight.insights?.content || '';
      const note = insight.note || '';
      const commentList = Array.isArray(insight.pod_comments)
        ? insight.pod_comments.map((c) => `- ${c.content}`).join('\n')
        : 'No comments available.';

      const discussion = `Insight:\n${content}\n\nNote:\n${note}\n\nComments:\n${commentList}`;

      const sessionRes = await supabase.auth.getSession();
      const access_token = sessionRes.data.session?.access_token;
      if (!access_token) throw new Error('User not authenticated');

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

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
    } finally {
      setExportingToJira(false);
    }
  };

  const handleToggleImportant = (insightId: string) => {
    const updatedImportantInsights = [...importantInsights];
    
    if (updatedImportantInsights.includes(insightId)) {
      // Remove from important
      const index = updatedImportantInsights.indexOf(insightId);
      updatedImportantInsights.splice(index, 1);
      toast.info('Removed from important insights');
    } else {
      // Add to important
      updatedImportantInsights.push(insightId);
      toast.success('Added to important insights');
    }
    
    setImportantInsights(updatedImportantInsights);
    localStorage.setItem('importantInsights', JSON.stringify(updatedImportantInsights));
  };

  const filteredInsights = insights.filter(insight => {
    if (!searchQuery) return true;
    
    const content = insight.insights?.content || '';
    const note = insight.note || '';
    const tags = insight.tags || [];
    
    return (
      content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const getSentimentClass = (sentiment?: string) => {
    if (!sentiment) return 'bg-gray-50 text-gray-700';
    
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return 'bg-green-50 text-green-700';
      case 'negative':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-blue-50 text-blue-700';
    }
  };

  const getSourceIcon = (source?: string) => {
    if (!source) return <MessageSquare className="w-5 h-5" />;
    
    switch (source.toLowerCase()) {
      case 'slack':
        return (
          <div className="bg-purple-100 p-2 rounded-lg">
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
        );
      case 'hubspot':
        return (
          <div className="bg-orange-100 p-2 rounded-lg">
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
        );
      case 'survey':
      case 'document':
        return (
          <div className="bg-green-100 p-2 rounded-lg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#15803D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 2V8H20" stroke="#15803D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 13H8" stroke="#15803D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 17H8" stroke="#15803D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 9H9H8" stroke="#15803D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        );
      case 'interview':
        return (
          <div className="bg-yellow-100 p-2 rounded-lg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15C15.3137 15 18 12.3137 18 9C18 5.68629 15.3137 3 12 3C8.68629 3 6 5.68629 6 9C6 12.3137 8.68629 15 12 15Z" stroke="#CA8A04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 15V21" stroke="#CA8A04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 18H15" stroke="#CA8A04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        );
      default:
        return <MessageSquare className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-red-800">Error loading workspace</h3>
          <p className="text-red-700">{error}</p>
          <button 
            onClick={handleBack}
            className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (!pod) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-yellow-800">Workspace not found</h3>
          <p className="text-yellow-700">The workspace you're looking for doesn't exist or you don't have access to it.</p>
          <button 
            onClick={handleBack}
            className="mt-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
          >
            Go back to workspaces
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={handleBack}
            className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{pod.name}</h1>
        </div>
        
        {pod.description && (
          <p className="text-gray-600 ml-9">{pod.description}</p>
        )}
        
        <div className="flex items-center justify-between mt-4 ml-9">
          <div className="flex -space-x-2">
            {members.slice(0, 5).map((member, index) => (
              <div 
                key={member.id} 
                className="w-8 h-8 rounded-full bg-teal-100 border-2 border-white flex items-center justify-center text-teal-600 text-xs font-medium overflow-hidden"
                title={member.user_profiles_view?.full_name || `User ${index + 1}`}
              >
                {member.user_profiles_view?.full_name?.[0] || 'U'}
              </div>
            ))}
            {members.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-gray-600 text-xs font-medium">
                +{members.length - 5}
              </div>
            )}
            <button className="w-8 h-8 rounded-full bg-teal-50 border-2 border-white flex items-center justify-center text-teal-600 hover:bg-teal-100 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => setShowAISummary(true)}
              className="px-4 py-2 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              AI Assistant
            </button>
          </div>
        </div>
      </div>
      
      {/* Search and Filter Bar */}
      <div className="mb-6 flex gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search insights, customers, or themes..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          Filter
        </button>
        <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
          <SortDesc className="w-5 h-5 text-gray-500" />
          Sort
        </button>
        <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-gray-500" />
          Group By
        </button>
      </div>
      
      {/* Insights Section */}
      <div className={`${showCommentPanel ? 'grid grid-cols-3 gap-6' : ''}`}>
        <div className={`${showCommentPanel ? 'col-span-2' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Customer Insights ({filteredInsights.length})
            </h2>
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleDateString()}
            </div>
          </div>
          
          {filteredInsights.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-600">No insights found. Try adjusting your search or add new insights.</p>
              <button className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                Share an Insight
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInsights.map((insight) => (
                <div 
                  key={insight.id} 
                  className={`bg-white rounded-xl border ${selectedInsightId === insight.id ? 'border-teal-300 shadow-md' : 'border-gray-200'} overflow-hidden transition-all`}
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex-shrink-0">
                        {getSourceIcon(insight.insights?.source)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {importantInsights.includes(insight.id) && (
                            <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                              Important
                            </span>
                          )}
                          <span className="text-sm text-gray-500">
                            {new Date(insight.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <p className="text-gray-900 font-medium mb-3">
                          {insight.insights?.content}
                        </p>
                        
                        {insight.note && (
                          <p className="text-gray-600 text-sm mb-3">
                            {insight.note}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                          {insight.insights?.source && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg">
                              {insight.insights.source}
                            </span>
                          )}
                          
                          {insight.insights?.sentiment && (
                            <span className={`px-2 py-1 text-xs font-medium rounded-lg ${getSentimentClass(insight.insights.sentiment)}`}>
                              {insight.insights.sentiment}
                            </span>
                          )}
                          
                          {/* Example ACV value */}
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            $25,000 ACV
                          </span>
                          
                          {/* Tags */}
                          {insight.tags && insight.tags.map((tag, index) => (
                            <span key={index} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-lg flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              {tag}
                            </span>
                          ))}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex -space-x-2">
                            <div className="w-6 h-6 rounded-full bg-teal-100 border-2 border-white flex items-center justify-center text-teal-600 text-xs font-medium">
                              {insight.user_profiles_view?.full_name?.[0] || 'U'}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => handleOpenCommentPanel(insight)}
                              className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
                            >
                              <MessageSquare className="w-4 h-4" />
                              <span className="text-xs">{insight.pod_comments?.length || 0}</span>
                            </button>
                
                            
                            <button 
                              onClick={() => handleToggleImportant(insight.id)}
                              className={`${importantInsights.includes(insight.id) ? 'text-amber-600' : 'text-gray-500 hover:text-amber-600'}`}
                            >
                              <Flag className="w-4 h-4" />
                            </button>
                            
                            <button className="text-gray-500 hover:text-teal-600">
                              <Bookmark className="w-4 h-4" />
                            </button>
                            
                            <div className="relative">
                              <button 
                                onClick={() => setShowExportOptions(showExportOptions === insight.id ? null : insight.id)}
                                className="text-gray-500 hover:text-purple-600"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>
                              
                              {showExportOptions === insight.id && (
                                <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg overflow-hidden z-20">
                                  <div className="py-1">
                                    <button
                                      onClick={() => handleExportToJira(insight.id)}
                                      disabled={exportingToJira}
                                      className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center gap-2"
                                    >
                                      {exportingToJira ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <img src="https://wac-cdn.atlassian.com/assets/img/favicons/jira/favicon-32x32.png" alt="Jira" className="w-4 h-4" />
                                      )}
                                      Export to Jira
                                    </button>
                                    <button
                                      className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center gap-2"
                                    >
                                      <img src="https://asset.brandfetch.io/idFdo8ulhr/idzj70KEsX.png" alt="Linear" className="w-4 h-4" />
                                      Export to Linear
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Comments Panel */}
        {showCommentPanel && currentInsight && (
          <div className="col-span-1 bg-white rounded-xl border border-gray-200 overflow-hidden h-fit sticky top-20">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Comments</h3>
              <button 
                onClick={handleCloseCommentPanel}
                className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-1">Insight</div>
                <p className="text-gray-900">{currentInsight.insights?.content}</p>
              </div>
              
              <div className="border-t border-gray-100 pt-4">
                <div className="text-sm font-medium text-gray-700 mb-3">Discussion</div>
                
                {currentInsight.pod_comments && currentInsight.pod_comments.length > 0 ? (
                  <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto">
                    {currentInsight.pod_comments.map((comment) => (
                      <div key={comment.id} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 text-xs font-medium flex-shrink-0">
                          {comment.user_profiles_view?.full_name?.[0] || 'U'}
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900">
                              {comment.user_profiles_view?.full_name || 'Unknown User'}
                            </span>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-gray-700 text-sm">{comment.content}</p>
                          <div className="mt-1 text-xs text-gray-500">
                            {new Date(comment.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-lg mb-4">
                    <p className="text-gray-500">No comments yet</p>
                    <p className="text-sm text-gray-400">Be the first to comment</p>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment(currentInsight.id);
                      }
                    }}
                  />
                  <button
                    onClick={() => handleAddComment(currentInsight.id)}
                    disabled={!newComment.trim() || submittingComment}
                    className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                  >
                    {submittingComment ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Summary Modal */}
      {showAISummary && pod && (
        <AISummaryModal 
          podId={pod.id} 
          podName={pod.name}
          onClose={() => setShowAISummary(false)} 
        />
      )}
    </div>
  );
}