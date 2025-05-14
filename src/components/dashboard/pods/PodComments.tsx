import React, { useState } from 'react';
import { Send, Loader2, Trash2, Tag, User } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'sonner';

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

interface PodInsight {
  id: string;
  tags?: string[];
}

interface PodCommentsProps {
  podInsightId: string;
  comments: Comment[];
  onCommentAdded: () => void;
  podInsight?: PodInsight;
}

export default function PodComments({ podInsightId, comments, onCommentAdded, podInsight }: PodCommentsProps) {
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [mentionedTags, setMentionedTags] = useState<string[]>([]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('pod_comments')
        .insert({
          pod_insight_id: podInsightId,
          user_id: user.id,
          content: newComment.trim()
        });

      if (error) throw error;

      setNewComment('');
      toast.success('Comment added');
      onCommentAdded();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setLoading(false);
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
      onCommentAdded();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  // Parse comment content to highlight tags
  const renderCommentWithTags = (content: string, availableTags: string[] = []) => {
    if (!availableTags || availableTags.length === 0) return content;

    // Create a regex pattern to match any of the tags
    const tagPattern = new RegExp(`#(${availableTags.join('|')})`, 'g');
    
    // Split the content by tag matches
    const parts = content.split(tagPattern);
    
    if (parts.length <= 1) return content;
    
    return parts.map((part, index) => {
      // Check if this part is a tag (every odd index after a split on matches)
      if (index % 2 === 1 && availableTags.includes(part)) {
        return (
          <span key={index} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md inline-flex items-center gap-1">
            <Tag className="w-3 h-3" />
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Handle input change and detect tag mentions
  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewComment(value);
    
    // Extract tags from input (words starting with #)
    const tagMatches = value.match(/#(\w+)/g);
    if (tagMatches) {
      const extractedTags = tagMatches.map(tag => tag.substring(1));
      setMentionedTags(extractedTags);
    } else {
      setMentionedTags([]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-medium flex-shrink-0">
              {comment.user_profiles_view?.full_name?.[0] || 'U'}
            </div>
            <div className="flex-1">
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
              <p className="text-gray-600">
                {podInsight?.tags ? renderCommentWithTags(comment.content, podInsight.tags) : comment.content}
              </p>
              <div className="mt-1 text-xs text-gray-500">
                {new Date(comment.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {podInsight?.tags && podInsight.tags.length > 0 && (
        <div className="p-2 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">Available tags:</div>
          <div className="flex flex-wrap gap-1">
            {podInsight.tags.map((tag, index) => (
              <span 
                key={index}
                className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs cursor-pointer hover:bg-blue-100"
                onClick={() => setNewComment(prev => `${prev} #${tag} `)}
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleAddComment} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={handleCommentChange}
          placeholder="Add a comment... Use #tag to reference tags"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={!newComment.trim() || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>

      {mentionedTags.length > 0 && (
        <div className="text-xs text-gray-500">
          Mentioned tags: {mentionedTags.map(tag => `#${tag}`).join(', ')}
        </div>
      )}
    </div>
  );
}