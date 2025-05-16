import React, { useState, useEffect } from 'react';
import {
  ArrowUpRight,
  Users,
  MessageSquare,
  Layers,
  Filter,
  Calendar,
  BarChart2,
  TrendingUp,
  Loader2,
  AlertCircle,
  Flag,
  ChevronRight,
  CheckCircle,
  Clock,
  ClipboardList,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import EmptyDashboard from './EmptyDashboard';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ElementType;
  onClick?: () => void;
}

interface DashboardMetrics {
  totalInsights: number;
  newInsightsThisWeek: number;
  totalThemes: number;
  themesWeekOverWeek: number;
  totalCustomers: number;
  totalAcvImpact: number;
  statusBreakdown: {
    new: number;
    read: number;
    in_review: number;
    planned: number;
  };
}

interface FilterState {
  dateRange: 'all' | '7d' | '30d' | '90d';
  customerSegment: 'all' | 'smb' | 'enterprise';
  source: 'all' | 'slack' | 'hubspot' | 'document';
  themeCategory: string;
  minPriorityScore: number;
}

interface ImportantInsight {
  id: string;
  content: string;
  source: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  status: 'new' | 'read' | 'in_review' | 'planned';
  created_at: string;
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  onClick,
}: StatCardProps) {
  return (
    <div
      className={`bg-white p-6 rounded-xl border border-gray-200 transition-all ${
        onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-md' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <Icon className="w-8 h-8 text-blue-600" />
        {change && (
          <span className="text-sm font-medium text-green-600 flex items-center">
            {change}
            <ArrowUpRight className="w-4 h-4 ml-1" />
          </span>
        )}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mt-4">{value}</h3>
      <p className="mt-1 text-sm text-gray-600">{title}</p>
    </div>
  );
}

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
    </div>
  );
}

export default function DashboardHome() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalInsights: 0,
    newInsightsThisWeek: 0,
    totalThemes: 0,
    themesWeekOverWeek: 0,
    totalCustomers: 0,
    totalAcvImpact: 0,
    statusBreakdown: {
      new: 0,
      read: 0,
      in_review: 0,
      planned: 0,
    },
  });
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'all',
    customerSegment: 'all',
    source: 'all',
    themeCategory: 'all',
    minPriorityScore: 0,
  });
  const [importantInsights, setImportantInsights] = useState<ImportantInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    loadDashboardMetrics();
    loadImportantInsights();
  }, [filters]);

  const loadDashboardMetrics = async () => {
    try {
      // Get total insights
      const { data: insights, error: insightsError } = await supabase
        .from('insights')
        .select('id, created_at, status');

      if (insightsError) throw insightsError;

      // Check if there's any data
      if (!insights || insights.length === 0) {
        setHasData(false);
        setLoading(false);
        return;
      }

      setHasData(true);

      // Get new insights this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const newInsights =
        insights?.filter((i) => new Date(i.created_at) > oneWeekAgo) || [];

      // Get themes
      const { data: themes, error: themesError } = await supabase
        .from('themes')
        .select('id, created_at');

      if (themesError) throw themesError;

      // Get unique customers and ACV impact
      const { data: customers, error: customersError } = await supabase
        .from('insight_customers')
        .select('customer_id, acv_impact', { count: 'exact', head: false });

      if (customersError) throw customersError;

      // Calculate unique customers and total ACV
      const uniqueCustomers = new Set(customers?.map((c) => c.customer_id));
      const totalAcv =
        customers?.reduce((sum, c) => sum + (c.acv_impact || 0), 0) || 0;

      // Calculate status breakdown
      const statusBreakdown = {
        new: insights?.filter(i => i.status === 'new').length || 0,
        read: insights?.filter(i => i.status === 'read').length || 0,
        in_review: insights?.filter(i => i.status === 'in_review').length || 0,
        planned: insights?.filter(i => i.status === 'planned').length || 0,
      };

      setMetrics({
        totalInsights: insights?.length || 0,
        newInsightsThisWeek: newInsights.length,
        totalThemes: themes?.length || 0,
        themesWeekOverWeek: Math.round(((themes?.length || 0) / 100) * 15), // Example calculation
        totalCustomers: uniqueCustomers.size,
        totalAcvImpact: totalAcv,
        statusBreakdown,
      });
    } catch (error) {
      console.error('Error loading dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadImportantInsights = async () => {
    try {
      // Get important insights from local storage
      const storedImportantInsights = localStorage.getItem('importantInsights');
      if (!storedImportantInsights) {
        setImportantInsights([]);
        return;
      }

      const importantIds = JSON.parse(storedImportantInsights);
      if (!importantIds.length) {
        setImportantInsights([]);
        return;
      }

      // Fetch the actual insights from Supabase
      const { data, error } = await supabase
        .from('insights')
        .select('id, content, source, sentiment, status, created_at')
        .in('id', importantIds);

      if (error) throw error;
      setImportantInsights(data || []);
    } catch (error) {
      console.error('Error loading important insights:', error);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'read':
        return 'bg-gray-50 border-gray-200 text-gray-700';
      case 'in_review':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'planned':
        return 'bg-green-50 border-green-200 text-green-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <MessageSquare className="w-5 h-5" />;
      case 'read':
        return <CheckCircle className="w-5 h-5" />;
      case 'in_review':
        return <Clock className="w-5 h-5" />;
      case 'planned':
        return <ClipboardList className="w-5 h-5" />;
      default:
        return <MessageSquare className="w-5 h-5" />;
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'in_review':
        return 'In Review';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const calculatePercentage = (count: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!hasData) {
    return <EmptyDashboard />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col gap-8">
        {/* Welcome section */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Your Product Feedback Overview
          </h1>
          <p className="mt-1 text-gray-600">
            Track and analyze customer feedback across your product areas.
          </p>
        </div>

        {/* Filters */}
        <FilterBar filters={filters} onChange={setFilters} />

        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Voice of Customer"
            value={metrics.totalInsights}
            change="+12.5%"
            icon={MessageSquare}
            onClick={() => navigate('/dashboard/insights')}
          />
          <StatCard
            title="Themes Identified"
            value={metrics.totalThemes}
            change={`+${metrics.themesWeekOverWeek}%`}
            icon={Layers}
            onClick={() => navigate('/dashboard/themes')}
          />
          <StatCard
            title="Customer Impact"
            value={formatCurrency(metrics.totalAcvImpact)}
            icon={Users}
          />
          <StatCard
            title="New This Week"
            value={metrics.newInsightsThisWeek}
            icon={TrendingUp}
            onClick={() => navigate('/dashboard/trends')}
          />
        </div>

        {/* Insights by Status Section */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Insights by Status</h2>
            <button 
              onClick={() => navigate('/dashboard/insights')}
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
            >
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* New Insights */}
            <div className={`p-4 rounded-lg border ${getStatusColor('new')}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon('new')}
                  <h3 className="font-medium">New</h3>
                </div>
                <span className="text-lg font-bold">{metrics.statusBreakdown.new}</span>
              </div>
              <div className="w-full bg-blue-100 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${calculatePercentage(metrics.statusBreakdown.new, metrics.totalInsights)}%` }}
                ></div>
              </div>
              <div className="mt-2 text-sm">
                {calculatePercentage(metrics.statusBreakdown.new, metrics.totalInsights)}% of total
              </div>
              <button 
                onClick={() => navigate('/dashboard/insights?status=new')}
                className="mt-2 text-sm text-blue-700 hover:text-blue-900 flex items-center"
              >
                View insights
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>

            {/* Read Insights */}
            <div className={`p-4 rounded-lg border ${getStatusColor('read')}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon('read')}
                  <h3 className="font-medium">Read</h3>
                </div>
                <span className="text-lg font-bold">{metrics.statusBreakdown.read}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div 
                  className="bg-gray-600 h-2.5 rounded-full" 
                  style={{ width: `${calculatePercentage(metrics.statusBreakdown.read, metrics.totalInsights)}%` }}
                ></div>
              </div>
              <div className="mt-2 text-sm">
                {calculatePercentage(metrics.statusBreakdown.read, metrics.totalInsights)}% of total
              </div>
              <button 
                onClick={() => navigate('/dashboard/insights?status=read')}
                className="mt-2 text-sm text-gray-700 hover:text-gray-900 flex items-center"
              >
                View insights
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>

            {/* In Review Insights */}
            <div className={`p-4 rounded-lg border ${getStatusColor('in_review')}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon('in_review')}
                  <h3 className="font-medium">In Review</h3>
                </div>
                <span className="text-lg font-bold">{metrics.statusBreakdown.in_review}</span>
              </div>
              <div className="w-full bg-yellow-100 rounded-full h-2.5">
                <div 
                  className="bg-yellow-600 h-2.5 rounded-full" 
                  style={{ width: `${calculatePercentage(metrics.statusBreakdown.in_review, metrics.totalInsights)}%` }}
                ></div>
              </div>
              <div className="mt-2 text-sm">
                {calculatePercentage(metrics.statusBreakdown.in_review, metrics.totalInsights)}% of total
              </div>
              <button 
                onClick={() => navigate('/dashboard/insights?status=in_review')}
                className="mt-2 text-sm text-yellow-700 hover:text-yellow-900 flex items-center"
              >
                View insights
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>

            {/* Planned Insights */}
            <div className={`p-4 rounded-lg border ${getStatusColor('planned')}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon('planned')}
                  <h3 className="font-medium">Planned</h3>
                </div>
                <span className="text-lg font-bold">{metrics.statusBreakdown.planned}</span>
              </div>
              <div className="w-full bg-green-100 rounded-full h-2.5">
                <div 
                  className="bg-green-600 h-2.5 rounded-full" 
                  style={{ width: `${calculatePercentage(metrics.statusBreakdown.planned, metrics.totalInsights)}%` }}
                ></div>
              </div>
              <div className="mt-2 text-sm">
                {calculatePercentage(metrics.statusBreakdown.planned, metrics.totalInsights)}% of total
              </div>
              <button 
                onClick={() => navigate('/dashboard/insights?status=planned')}
                className="mt-2 text-sm text-green-700 hover:text-green-900 flex items-center"
              >
                View insights
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <button
            onClick={() => navigate('/dashboard/insights')}
            className="p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-3"
          >
            <Filter className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">Filter Insights</span>
          </button>

          <button
            onClick={() => navigate('/dashboard/themes')}
            className="p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors flex items-center gap-3"
          >
            <Layers className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-purple-900">View Themes</span>
          </button>

          <button
            onClick={() => navigate('/dashboard/data-sources')}
            className="p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors flex items-center gap-3"
          >
            <Filter className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-900">Add Data Source</span>
          </button>

          <button
            onClick={() => navigate('/dashboard/pods')}
            className="p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors flex items-center gap-3"
          >
            <Users className="w-5 h-5 text-orange-600" />
            <span className="font-medium text-orange-900">
              Manage Workspaces
            </span>
          </button>
        </div>

        {/* Important Insights Section */}
        {importantInsights.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <Flag className="w-5 h-5 text-amber-600" />
              <h2 className="text-xl font-semibold text-gray-900">Important Insights</h2>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {importantInsights.map((insight) => (
                <div 
                  key={`important-${insight.id}`} 
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate('/dashboard/insights')}
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
                      {typeof insight.sentiment === 'string'
                        ? insight.sentiment.charAt(0).toUpperCase() +
                          insight.sentiment.slice(1)
                        : 'Unknown'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(insight.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {insight.source}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      insight.status === 'new' ? 'bg-blue-50 text-blue-700' :
                      insight.status === 'read' ? 'bg-gray-50 text-gray-700' :
                      insight.status === 'in_review' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-green-50 text-green-700'
                    }`}>
                      {getStatusName(insight.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900">{insight.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}