import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Star,
  Share2,
  ListPlus,
  DollarSign,
  MessageSquare,
  Users,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import InsightCard, { InsightData } from './InsightCard';

interface ThemeInsightsProps {
  themeId: string;
  themeName: string;
  onBack: () => void;
}

interface ThemeMetrics {
  totalMentions: number;
  acvImpact: number;
  priorityScore: number;
  insights: InsightData[];
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

export default function ThemeInsights({
  themeId,
  themeName,
  onBack,
}: ThemeInsightsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ThemeMetrics>({
    totalMentions: 0,
    acvImpact: 0,
    priorityScore: 0,
    insights: [],
  });

  useEffect(() => {
    if (!themeId) {
      console.warn('⛔ themeId is undefined, skipping loadThemeMetrics');
      return;
    }

    console.log('🚀 useEffect triggered for themeId:', themeId);
    loadThemeMetrics();
  }, [themeId]);

  const loadThemeMetrics = async () => {
    if (!themeId || themeId === 'undefined') {
      console.warn('⛔ Skipping loadThemeMetrics, themeId is:', themeId);
      return;
    }

    console.log('🚨 Inside loadThemeMetrics with themeId:', themeId);
    try {
      setLoading(true);
      setError(null);

      // Step 1: Get theme details (priority score)
      const { data: theme, error: themeError } = await supabase
        .from('themes')
        .select('priority_score')
        .eq('id', themeId)
        .single();

      console.log('🎯 theme data:', theme, '🛑 error:', themeError);

      if (themeError) {
        if (themeError.code === 'PGRST116') {
          setError(`Theme with ID ${themeId} not found`);
          setLoading(false);
          return;
        }
        throw themeError;
      }

      // Step 2: Get all insight IDs linked to this theme
      const { data: insightThemeLinks, error: linkError } = await supabase
        .from('insight_themes')
        .select(
          `
        insight:insights (
          id,
          content,
          source,
          sentiment,
          created_at,
          insight_customers (
            customer_id,
            customer_name,
            acv_impact
          )
        )
      `
        )
        .eq('theme_id', themeId);

      console.log('🔗 insightThemeLinks:', insightThemeLinks);
      console.log('🚨 linkError:', linkError);

      if (linkError) throw linkError;

      if (!insightThemeLinks || insightThemeLinks.length === 0) {
        setMetrics({
          totalMentions: 0,
          acvImpact: 0,
          priorityScore: theme?.priority_score || 0,
          insights: [],
        });
        return;
      }

      const processedInsights = insightThemeLinks.map(({ insight }) => ({
        id: insight.id,
        content: insight.content,
        source: insight.source,
        sentiment: insight.sentiment,
        created_at: insight.created_at,
        customers: insight.insight_customers || [],
        sources: [{
          type: insight.source,
          content: insight.content
        }],
        themes: [{ id: themeId, name: themeName }]
      }));

      // Step 5: Metrics
      const totalAcv = processedInsights.reduce(
        (sum, insight) =>
          sum +
          insight.customers.reduce(
            (acc, customer) => acc + (customer.acv_impact || 0),
            0
          ),
        0
      );

      setMetrics({
        totalMentions: processedInsights.length,
        acvImpact: totalAcv,
        priorityScore: theme?.priority_score || 0,
        insights: processedInsights,
      });
    } catch (error) {
      console.error('❌ Error loading theme metrics:', error);
      setError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  };

  const handleTagCritical = async () => {
    try {
      const { error } = await supabase
        .from('themes')
        .update({ priority_score: 100 })
        .eq('id', themeId);

      if (error) throw error;
      loadThemeMetrics();
    } catch (error) {
      console.error('Error updating theme priority:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to update theme priority'
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{themeName}</h2>
          <p className="text-gray-600">
            {metrics.insights.length} insights found under this theme
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {/* Theme Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <MessageSquare className="w-5 h-5" />
            <span className="font-medium">Total Mentions</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {metrics.totalMentions}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <DollarSign className="w-5 h-5" />
            <span className="font-medium">ACV Impact</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(metrics.acvImpact)}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Star className="w-5 h-5" />
            <span className="font-medium">Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-gray-900">
              {metrics.priorityScore}
            </div>
            <span
              className={`px-2 py-1 text-sm rounded ${priorityScoreToColor(
                metrics.priorityScore
              )}`}
            >
              {priorityScoreToLabel(metrics.priorityScore)}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={handleTagCritical}
          className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
        >
          <Star className="w-5 h-5" />
          Tag as Critical
        </button>

        <button
          onClick={() => {
            /* TODO: Implement share functionality */
          }}
          className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
        >
          <Share2 className="w-5 h-5" />
          Share with Workspace
        </button>

        <button
          onClick={() => {
            /* TODO: Implement backlog functionality */
          }}
          className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-2"
        >
          <ListPlus className="w-5 h-5" />
          Add to Backlog
        </button>
      </div>

      {/* Insights List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          All Insights
        </h3>
        <div className="space-y-4">
          {metrics.insights.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-600">No insights found for this theme.</p>
            </div>
          ) : (
            metrics.insights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                expanded={false}
                onTagCritical={() => {
                  /* TODO */
                }}
                onShareWithPod={() => {
                  /* TODO */
                }}
                onAddToBacklog={() => {
                  /* TODO */
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
