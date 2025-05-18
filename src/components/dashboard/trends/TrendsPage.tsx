import React, { useState, useEffect } from 'react';
import {
  Loader2,
  AlertCircle,
  Filter,
  Calendar,
  Users,
  DollarSign,
  Tag,
  Layers,
  MessageSquare,
  X,
  ChevronDown,
  ChevronUp,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Trend {
  id: string;
  name: string;
  overallTrend: 'up' | 'down' | 'flat';
  wowTrend: number; // week over week percentage
  momTrend: number; // month over month percentage
  totalAcvImpact: number;
  uniqueCustomers: number;
}

interface FilterState {
  dateRange: 'all' | '7d' | '30d' | '90d';
  customerSegment: 'all' | 'smb' | 'enterprise';
  source: 'all' | 'slack' | 'hubspot' | 'document';
  themeCategory: string;
  minPriorityScore: number;
}

const TrendIcon = ({
  direction,
  percentage,
}: {
  direction: 'up' | 'down' | 'flat';
  percentage?: number;
}) => {
  if (direction === 'up') {
    return (
      <div className="flex items-center text-green-600">
        <TrendingUp className="w-5 h-5 mr-1" />
        {percentage && <span>+{percentage.toFixed(1)}%</span>}
      </div>
    );
  }
  if (direction === 'down') {
    return (
      <div className="flex items-center text-red-600">
        <TrendingDown className="w-5 h-5 mr-1" />
        {percentage && <span>-{Math.abs(percentage).toFixed(1)}%</span>}
      </div>
    );
  }
  return (
    <div className="flex items-center text-gray-600">
      <Minus className="w-5 h-5 mr-1" />
      {percentage && <span>0%</span>}
    </div>
  );
};

function FilterBar({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}) {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap gap-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-gray-400" />
        <select
          value={filters.dateRange}
          onChange={(e) =>
            onChange({
              ...filters,
              dateRange: e.target.value as FilterState['dateRange'],
            })
          }
          className="border-0 bg-transparent focus:ring-0 text-sm"
        >
          <option value="all">All Time</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-gray-400" />
        <select
          value={filters.customerSegment}
          onChange={(e) =>
            onChange({
              ...filters,
              customerSegment: e.target.value as FilterState['customerSegment'],
            })
          }
          className="border-0 bg-transparent focus:ring-0 text-sm"
        >
          <option value="all">All Segments</option>
          <option value="smb">SMB</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-gray-400" />
        <select
          value={filters.source}
          onChange={(e) =>
            onChange({
              ...filters,
              source: e.target.value as FilterState['source'],
            })
          }
          className="border-0 bg-transparent focus:ring-0 text-sm"
        >
          <option value="all">All Sources</option>
          <option value="slack">Slack</option>
          <option value="hubspot">HubSpot</option>
          <option value="document">Documents</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <BarChart2 className="w-5 h-5 text-gray-400" />
        <select
          value={filters.themeCategory}
          onChange={(e) =>
            onChange({
              ...filters,
              themeCategory: e.target.value,
            })
          }
          className="border-0 bg-transparent focus:ring-0 text-sm"
        >
          <option value="all">All Categories</option>
          <option value="feature">Feature Requests</option>
          <option value="bug">Bug Reports</option>
          <option value="ux">User Experience</option>
          <option value="performance">Performance</option>
        </select>
      </div>
    </div>
  );
}

export default function TrendsPage() {
  const [trendType, setTrendType] = useState<'themes' | 'insights'>('themes');
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'all',
    customerSegment: 'all',
    source: 'all',
    themeCategory: 'all',
    minPriorityScore: 0,
  });

  useEffect(() => {
    loadTrends();
  }, [filters, trendType]);

  const loadTrends = async () => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      if (trendType === 'themes') {
        // Get themes with their insights and customer impacts
        const { data: themesData, error: themesError } = await supabase
          .from('themes')
          .select(
            `
            id,
            name,
            insight_themes (
              insight:insights (
                id,
                created_at,
                insight_customers (
                  customer_id,
                  acv_impact
                )
              )
            )
          `
          )
          .order('created_at', { ascending: false });

        if (themesError) throw themesError;

        // Process themes data to calculate trends
        const processedTrends =
          themesData?.map((theme) => {
            const insights = theme.insight_themes
              .filter((it) => it.insight)
              .map((it) => it.insight);

            const totalInsights = insights.length;
            const recentInsights = insights.filter(
              (i) => new Date(i.created_at) >= oneWeekAgo
            ).length;
            const monthInsights = insights.filter(
              (i) => new Date(i.created_at) >= oneMonthAgo
            ).length;

            // Calculate week-over-week trend
            const wowTrend =
              totalInsights > 0
                ? (recentInsights / totalInsights - 0.25) * 100
                : 0;

            // Calculate month-over-month trend
            const momTrend =
              totalInsights > 0
                ? (monthInsights / totalInsights - 0.5) * 100
                : 0;

            // Calculate overall trend
            let overallTrend: 'up' | 'down' | 'flat' = 'flat';
            if (wowTrend > 5) overallTrend = 'up';
            else if (wowTrend < -5) overallTrend = 'down';

            // Calculate customer impact
            const customers = new Set<string>();
            let totalAcv = 0;

            insights.forEach((insight) => {
              insight.insight_customers?.forEach((customer: any) => {
                customers.add(customer.customer_id);
                totalAcv += customer.acv_impact || 0;
              });
            });

            return {
              id: theme.id,
              name: theme.name,
              overallTrend,
              wowTrend,
              momTrend,
              totalAcvImpact: totalAcv,
              uniqueCustomers: customers.size,
            };
          }) || [];

        setTrends(processedTrends);
      } else {
        // Get insights with their customer impacts
        const { data: insightsData, error: insightsError } = await supabase
          .from('insights')
          .select(
            `
            id,
            content,
            created_at,
            insight_customers (
              customer_id,
              acv_impact
            ),
            insight_themes (
              theme:themes (
                name
              )
            )
          `
          )
          .order('created_at', { ascending: false });

        if (insightsError) throw insightsError;

        // Process insights data to calculate trends
        const processedTrends =
          insightsData?.map((insight) => {
            // Get the first theme name for the insight (if any)
            const name =
              insight.content.length > 50
                ? insight.content.substring(0, 50) + '...'
                : insight.content;

            // Calculate customer impact
            const customers = new Set<string>();
            let totalAcv = 0;

            insight.insight_customers?.forEach((customer: any) => {
              customers.add(customer.customer_id);
              totalAcv += customer.acv_impact || 0;
            });

            // Calculate trends based on creation date
            const createdAt = new Date(insight.created_at);
            const isRecent = createdAt >= oneWeekAgo;
            const isThisMonth = createdAt >= oneMonthAgo;

            // Simple trend calculation for individual insights
            const wowTrend = isRecent ? 100 : -100;
            const momTrend = isThisMonth ? 100 : -100;

            // Overall trend based on recency
            const overallTrend: 'up' | 'down' | 'flat' = isRecent
              ? 'up'
              : isThisMonth
              ? 'flat'
              : 'down';

            return {
              id: insight.id,
              name,
              overallTrend,
              wowTrend,
              momTrend,
              totalAcvImpact: totalAcv,
              uniqueCustomers: customers.size,
            };
          }) || [];

        setTrends(processedTrends);
      }
    } catch (error) {
      console.error('Error loading trends:', error);
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

  const getColumnTitle = () => (trendType === 'themes' ? 'Theme' : 'Insight');

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col gap-8">
        {/* Header section */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Trends Analysis
          </h1>
          <p className="mt-1 text-gray-600">
            Track and analyze customer feedback trends over time.
          </p>
        </div>

        {/* Filters */}
        <FilterBar filters={filters} onChange={setFilters} />

        {/* Trends Analysis Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Trends Analysis</h2>
            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={trendType}
                onChange={(e) => {
                  setTrendType(e.target.value as 'themes' | 'insights');
                }}
                className="border-0 bg-transparent focus:ring-0 text-sm"
              >
                <option value="themes">Themes</option>
                <option value="insights">Insights</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-red-700">{error}</div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : trends.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-600">
                No trends data available. This could be because there isn't
                enough historical data yet.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {getColumnTitle()}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Overall Trend
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      WoW Trend
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      MoM Trend
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Total ACV Impact
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Unique Customers
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {trends.map((trend) => (
                    <tr key={trend.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {trend.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <TrendIcon direction={trend.overallTrend} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <TrendIcon
                          direction={
                            trend.wowTrend > 0
                              ? 'up'
                              : trend.wowTrend < 0
                              ? 'down'
                              : 'flat'
                          }
                          percentage={trend.wowTrend}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <TrendIcon
                          direction={
                            trend.momTrend > 0
                              ? 'up'
                              : trend.momTrend < 0
                              ? 'down'
                              : 'flat'
                          }
                          percentage={trend.momTrend}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatCurrency(trend.totalAcvImpact)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {trend.uniqueCustomers}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}