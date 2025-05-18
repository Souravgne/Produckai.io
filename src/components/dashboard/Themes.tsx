import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  Loader2,
  Sparkles,
  Users,
  DollarSign,
  BarChart2,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Theme {
  id: string;
  name: string;
  description: string;
  priority_score: number;
  status: 'active' | 'archived';
  is_auto_generated: boolean;
  created_at: string;
}

interface ThemeMetrics {
  totalMentions: number;
  totalAcv: number;
  uniqueCustomers: number;
}

const priorityScoreToLabel = (score: number) => {
  if (score >= 80) return 'High';
  if (score >= 60) return 'Medium';
  return 'Low';
};

const priorityScoreToColor = (score: number) => {
  if (score >= 80) return 'bg-red-50 text-red-700';
  if (score >= 60) return 'bg-yellow-50 text-yellow-700';
  return 'bg-green-50 text-green-700';
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
};

export default function Themes() {
  const navigate = useNavigate();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTheme, setNewTheme] = useState({
    name: '',
    description: '',
    priority_score: 0,
  });
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [themeMetrics, setThemeMetrics] = useState<
    Record<string, ThemeMetrics>
  >({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user's session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user) throw new Error('No user found');

      // Load themes
      const { data: themesData, error: themesError } = await supabase
        .from('themes')
        .select('*')
        .order('priority_score', { ascending: false })
        .order('created_at', { ascending: false });

      if (themesError) throw themesError;
      setThemes(themesData || []);

      // Load theme metrics
      const metrics: Record<string, ThemeMetrics> = {};

      // Get insights and customer data for each theme
      const { data: insightData, error: insightError } = await supabase.from(
        'insight_themes'
      ).select(`
          theme_id,
          insight:insights (
            id,
            insight_customers (
              customer_id,
              acv_impact
            )
          )
        `);

      if (insightError) throw insightError;

      console.log(insightData);

      // Calculate metrics for each theme
      insightData?.forEach(({ theme_id, insight }) => {
        if (!insight) return;

        if (!metrics[theme_id]) {
          metrics[theme_id] = {
            totalMentions: 0,
            uniqueCustomers: new Set<string>(),
            totalAcv: 0,
          };
        }

        const metric = metrics[theme_id];

        metric.totalMentions += 1;

        insight.insight_customers?.forEach((customer: any) => {
          if (customer?.customer_id) {
            metric.uniqueCustomers.add(customer.customer_id);
            metric.totalAcv += customer.acv_impact || 0;
          }
        });
      });

      // After accumulating everything, **convert uniqueCustomers Set to a number**
      const finalMetrics: Record<string, ThemeMetrics> = {};
      for (const themeId in metrics) {
        finalMetrics[themeId] = {
          totalMentions: metrics[themeId].totalMentions,
          uniqueCustomers: metrics[themeId].uniqueCustomers.size,// Set size
          totalAcv: metrics[themeId].totalAcv,
        };
      }

      setThemeMetrics(finalMetrics);
    } catch (error) {
      console.error('Error loading data:', error);
      setError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTheme = async () => {
    if (!newTheme.name.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user) throw new Error('No user found');

      const { error: insertError } = await supabase.from('themes').insert([
        {
          name: newTheme.name.trim(),
          description: newTheme.description.trim(),
          priority_score: newTheme.priority_score,
          status: 'active',
          is_auto_generated: false,
          created_by: session.user.id,
        },
      ]);

      if (insertError) throw insertError;

      setNewTheme({
        name: '',
        description: '',
        priority_score: 0,
      });
      setIsCreating(false);
      await loadData();
    } catch (error) {
      console.error('Error creating theme:', error);
      setError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTheme = async () => {
    if (!editingTheme || !editingTheme.name.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('themes')
        .update({
          name: editingTheme.name.trim(),
          description: editingTheme.description.trim(),
          priority_score: editingTheme.priority_score,
        })
        .eq('id', editingTheme.id);

      if (error) throw error;

      setEditingTheme(null);
      await loadData();
    } catch (error) {
      console.error('Error updating theme:', error);
      setError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTheme = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this theme?')) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.from('themes').delete().eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting theme:', error);
      setError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleViewThemeInsights = (themeId: string) => {
    navigate(`/dashboard/insights?theme=${themeId}`);
  };

  if (loading && themes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Themes</h1>
          <p className="mt-1 text-gray-600">
            Discover and manage feedback themes across your products. Themes are
            automatically generated from insights and can be manually created.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Theme
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {isCreating && (
        <div className="mb-6 bg-white p-6 rounded-xl border border-blue-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            New Theme
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newTheme.name}
                onChange={(e) =>
                  setNewTheme({ ...newTheme, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Performance Issues, Feature Requests"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newTheme.description}
                onChange={(e) =>
                  setNewTheme({ ...newTheme, description: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief description of this theme"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority Score (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={newTheme.priority_score}
                onChange={(e) =>
                  setNewTheme({
                    ...newTheme,
                    priority_score: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setNewTheme({ name: '', description: '', priority_score: 0 });
                  setIsCreating(false);
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTheme}
                disabled={!newTheme.name.trim() || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {themes.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">
              No themes found. Themes will be automatically generated as
              insights are added, or you can create them manually.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {themes.map((theme) => (
              <div
                key={theme.id}
                className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleViewThemeInsights(theme.id)}
              >
                {editingTheme?.id === theme.id ? (
                  <div
                    className="space-y-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={editingTheme.name}
                        onChange={(e) =>
                          setEditingTheme({
                            ...editingTheme,
                            name: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={editingTheme.description}
                        onChange={(e) =>
                          setEditingTheme({
                            ...editingTheme,
                            description: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority Score (0-100)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editingTheme.priority_score}
                        onChange={(e) =>
                          setEditingTheme({
                            ...editingTheme,
                            priority_score: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setEditingTheme(null)}
                        className="px-4 py-2 text-gray-700 hover:text-gray-900"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdateTheme}
                        disabled={!editingTheme.name.trim() || loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          {theme.name}
                          {theme.is_auto_generated && (
                            <Sparkles className="w-4 h-4 text-blue-500" />
                          )}
                        </h3>
                        <div className="flex gap-2">
                          <span
                            className={`px-2 py-1 text-sm rounded ${priorityScoreToColor(
                              theme.priority_score
                            )}`}
                          >
                            {priorityScoreToLabel(theme.priority_score)}{' '}
                            Priority
                          </span>
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTheme(theme);
                          }}
                          className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTheme(theme.id);
                          }}
                          className="p-2 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {theme.description && (
                      <p className="mt-2 text-gray-600 mb-4">
                        {theme.description}
                      </p>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-purple-700 mb-1">
                          <MessageSquare className="w-5 h-5" />
                          <span className="font-medium">Total Mentions</span>
                        </div>
                        <div className="text-2xl font-bold text-purple-900">
                          {themeMetrics[theme.id]?.totalMentions || 0}
                        </div>
                      </div>

                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-green-700 mb-1">
                          <DollarSign className="w-5 h-5" />
                          <span className="font-medium">ACV Impact</span>
                        </div>
                        <div className="text-2xl font-bold text-green-900">
                          {formatCurrency(
                            themeMetrics[theme.id]?.totalAcv || 0
                          )}
                        </div>
                      </div>

                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-blue-700 mb-1">
                          <Users className="w-5 h-5" />
                          <span className="font-medium">Customers</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-900">
                          {themeMetrics[theme.id]?.uniqueCustomers || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
