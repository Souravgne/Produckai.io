import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { InsightData } from './InsightCard';
import InsightsList from './InsightsList';
import ThemeInsights from './ThemeInsights';
import ShareInsightModal from '../pods/ShareInsightModal';
import { toast } from 'sonner';
import InsightCard from './InsightCard';

interface FilterState {
  themes: string[];
  dateRange: 'all' | '7d' | '30d' | '90d';
  companies: string[];
  acvRange: [number, number] | null;
  products: string[];
  segments: string[];
  sources: string[];
  sentiment: ('positive' | 'negative' | 'neutral')[];
  priority: ('high' | 'medium' | 'low')[];
  status: ('new' | 'read' | 'in_review' | 'planned')[];
  tags: string[];
}

export default function InsightsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const themeId = searchParams.get('theme');
  const statusParam = searchParams.get('status');
  const [themeName, setThemeName] = useState<string>();
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [themes, setThemes] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInsightId, setSelectedInsightId] = useState<string>();
  const [showFilters, setShowFilters] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>(
    []
  );
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [segments, setSegments] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [insightToShare, setInsightToShare] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'acv' | 'frequency'>('acv');

  // Default filter state
  const [filters, setFilters] = useState<FilterState>({
    themes: [],
    dateRange: 'all',
    companies: [],
    acvRange: null,
    products: [],
    segments: [],
    sources: [],
    sentiment: [],
    priority: [],
    status: [],
    tags: [],
  });

  useEffect(() => {
    loadThemes();
    loadFilterOptions();
    
    // Apply status filter from URL parameter
    if (statusParam) {
      setFilters(prev => ({
        ...prev,
        status: [statusParam as 'new' | 'read' | 'in_review' | 'planned']
      }));
    }
    
    if (themeId) {
      loadThemeName();
    } else {
      loadInsights();
    }
  }, [themeId, statusParam]);

  const loadFilterOptions = async () => {
    try {
      // Load unique companies from insight_customers
      const { data: customersData } = await supabase
        .from('insight_customers')
        .select('customer_id, customer_name')
        .order('customer_name');

      if (customersData) {
        const uniqueCompanies = Array.from(
          new Map(
            customersData.map((item) => [
              item.customer_id,
              { id: item.customer_id, name: item.customer_name },
            ])
          )
        ).map(([_, value]) => value);
        setCompanies(uniqueCompanies);
      }

      // Load company data from HubSpot integration if available
      const { data: companyData } = await supabase
        .from('company_data')
        .select('hubspot_id, name')
        .order('name');

      if (companyData && companyData.length > 0) {
        const hubspotCompanies = companyData.map((company) => ({
          id: company.hubspot_id,
          name: company.name,
        }));

        // Merge with existing companies, avoiding duplicates
        const allCompanies = [...uniqueCompanies];
        hubspotCompanies.forEach((company) => {
          if (!allCompanies.some((c) => c.id === company.id)) {
            allCompanies.push(company);
          }
        });

        setCompanies(allCompanies);
      }

      // Load unique tags from pod_insights
      const { data: tagsData } = await supabase
        .from('pod_insights')
        .select('tags');

      if (tagsData) {
        const allTags = tagsData
          .filter((item) => item.tags && Array.isArray(item.tags))
          .flatMap((item) => item.tags);

        const uniqueTags = [...new Set(allTags)];
        setTags(uniqueTags);
      }

      // For demo purposes, we'll add some sample products and segments
      setProducts([
        { id: 'core', name: 'Core Platform' },
        { id: 'mobile', name: 'Mobile App' },
        { id: 'analytics', name: 'Analytics Dashboard' },
        { id: 'api', name: 'API Services' },
      ]);

      setSegments([
        { id: 'enterprise', name: 'Enterprise' },
        { id: 'mid-market', name: 'Mid-Market' },
        { id: 'smb', name: 'SMB' },
        { id: 'startup', name: 'Startup' },
      ]);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const loadThemes = async () => {
    try {
      const { data, error } = await supabase
        .from('themes')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setThemes(data || []);
    } catch (error) {
      console.error('Error loading themes:', error);
    }
  };

  const loadThemeName = async () => {
    try {
      const { data, error } = await supabase
        .from('themes')
        .select('name')
        .eq('id', themeId)
        .single();

      if (error) throw error;
      setThemeName(data.name);
    } catch (error) {
      console.error('Error loading theme:', error);
      setError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadInsights = async () => {
    try {
      setLoading(true);
      setError(null);

      // Step 1: Fetch basic insights
      let insightsQuery = supabase
        .from('insights')
        .select('id, content, source, sentiment, status, created_at');

      // Apply theme filter (client-side only for now)
      // Apply date range filter
      if (filters.dateRange !== 'all') {
        const now = new Date();
        let startDate;

        switch (filters.dateRange) {
          case '7d':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case '30d':
            startDate = new Date(now.setDate(now.getDate() - 30));
            break;
          case '90d':
            startDate = new Date(now.setDate(now.getDate() - 90));
            break;
        }

        if (startDate) {
          insightsQuery = insightsQuery.gte(
            'created_at',
            startDate.toISOString()
          );
        }
      }

      // Apply source filter
      if (filters.sources.length > 0) {
        insightsQuery = insightsQuery.in('source', filters.sources);
      }

      // Apply sentiment filter
      if (filters.sentiment.length > 0) {
        insightsQuery = insightsQuery.in('sentiment', filters.sentiment);
      }

      // Apply status filter
      if (filters.status.length > 0) {
        insightsQuery = insightsQuery.in('status', filters.status);
      }

      const { data: insightsData, error: insightsError } = await insightsQuery;
      if (insightsError) throw insightsError;

      // Step 2: Fetch customers related to insights
      const { data: customersData, error: customersError } = await supabase
        .from('insight_customers')
        .select('insight_id, customer_id, customer_name, acv_impact');

      if (customersError) throw customersError;

      // Step 3: Fetch themes related to insights
      const { data: themesData, error: themesError } = await supabase
        .from('insight_themes')
        .select('insight_id, theme_id, themes(id, name)');

      if (themesError) throw themesError;

      // Step 4: Map customers by insight_id
      const customerMap = new Map();
      for (const customer of customersData || []) {
        if (!customerMap.has(customer.insight_id)) {
          customerMap.set(customer.insight_id, []);
        }
        customerMap.get(customer.insight_id).push(customer);
      }

      // Step 5: Map themes by insight_id
      const themeMap = new Map();
      for (const item of themesData || []) {
        if (!themeMap.has(item.insight_id)) {
          themeMap.set(item.insight_id, []);
        }
        themeMap.get(item.insight_id).push({
          id: item.themes.id,
          name: item.themes.name,
        });
      }

      // Step 6: Process and filter insights
      let filteredData = (insightsData || []).map((insight) => ({
        ...insight,
        customers: customerMap.get(insight.id) || [],
        themes: themeMap.get(insight.id) || [],
      }));

      // Filter by companies
      if (filters.companies.length > 0) {
        filteredData = filteredData.filter((insight) =>
          insight.customers.some((customer) =>
            filters.companies.includes(customer.customer_id)
          )
        );
      }

      // Filter by ACV range
      if (
        filters.acvRange &&
        filters.acvRange[0] !== 0 &&
        filters.acvRange[1] !== 0
      ) {
        filteredData = filteredData.filter((insight) => {
          const totalAcv = insight.customers.reduce(
            (sum, customer) => sum + (customer.acv_impact || 0),
            0
          );
          return (
            totalAcv >= filters.acvRange[0] && totalAcv <= filters.acvRange[1]
          );
        });
      }

      // Load important insights from local storage
      const storedImportantInsights = localStorage.getItem('importantInsights');
      const importantInsightIds = storedImportantInsights 
        ? JSON.parse(storedImportantInsights) 
        : [];

      const processedInsights = filteredData.map((insight) => ({
        id: insight.id,
        content: insight.content,
        source: insight.source,
        sentiment: insight.sentiment,
        status: insight.status || 'new', // Default to 'new' if status is not set
        created_at: insight.created_at,
        customers: insight.customers,
        sources: [
          {
            type: insight.source,
            content: insight.content
          },
        ],
        themes: insight.themes,
        isImportant: importantInsightIds.includes(insight.id),
      }));

      setInsights(processedInsights);
    } catch (error) {
      console.error('Error loading insights:', error);
      setError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!themeId) {
      loadInsights();
    }
  }, [filters]);

  // Check for URL parameters on component mount
  useEffect(() => {
    if (statusParam && !themeId) {
      // Set the status filter based on URL parameter
      setFilters(prev => ({
        ...prev,
        status: [statusParam as 'new' | 'read' | 'in_review' | 'planned']
      }));
    }
  }, []);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    
    // Update URL if status filter changes
    if (newFilters.status !== undefined) {
      const newParams = new URLSearchParams(searchParams);
      if (newFilters.status.length === 1) {
        newParams.set('status', newFilters.status[0]);
      } else {
        newParams.delete('status');
      }
      setSearchParams(newParams);
    }
  };

  const clearFilters = () => {
    setFilters({
      themes: [],
      dateRange: 'all',
      companies: [],
      acvRange: null,
      products: [],
      segments: [],
      sources: [],
      sentiment: [],
      priority: [],
      status: [],
      tags: [],
    });
    
    // Clear status from URL
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('status');
    setSearchParams(newParams);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.themes.length) count++;
    if (filters.dateRange !== 'all') count++;
    if (filters.companies.length) count++;
    if (filters.acvRange) count++;
    if (filters.products.length) count++;
    if (filters.segments.length) count++;
    if (filters.sources.length) count++;
    if (filters.sentiment.length) count++;
    if (filters.priority.length) count++;
    if (filters.status.length) count++;
    if (filters.tags.length) count++;
    return count;
  };

  const handleMarkImportant = async (insightId: string) => {
    // Update the insights list
    const updatedInsights = insights.map(insight => {
      if (insight.id === insightId) {
        const newIsImportant = !insight.isImportant;
        
        // Update status to 'in_review' if marked as important
        const newStatus = newIsImportant ? 'in_review' : insight.status;
        
        return { 
          ...insight, 
          isImportant: newIsImportant,
          status: newStatus
        };
      }
      return insight;
    });
    
    setInsights(updatedInsights);
    
    // Save to local storage
    const importantIds = updatedInsights
      .filter(insight => insight.isImportant)
      .map(insight => insight.id);
    
    localStorage.setItem('importantInsights', JSON.stringify(importantIds));
    
    // Update status in database if marked as important
    const insight = insights.find(i => i.id === insightId);
    if (insight) {
      if (!insight.isImportant) {
        // Marking as important - update status to 'in_review'
        await supabase
          .from('insights')
          .update({ status: 'in_review' })
          .eq('id', insightId);
        
        toast.success('Insight marked as important and status updated to In Review');
      } else {
        toast.info('Insight removed from important');
      }
    }
  };

  const handleShareWithPod = async (insightId: string) => {
    // Update status to 'in_review' when adding to workspace
    await supabase
      .from('insights')
      .update({ status: 'in_review' })
      .eq('id', insightId);
    
    // Update local state
    setInsights(insights.map(insight => 
      insight.id === insightId 
        ? { ...insight, status: 'in_review' } 
        : insight
    ));
    
    setInsightToShare(insightId);
    setShowShareModal(true);
  };

  const handleInsightClick = async (insight: InsightData) => {
    // Update status to 'read' if it's currently 'new'
    if (insight.status === 'new') {
      // Update in database
      await supabase
        .from('insights')
        .update({ status: 'read' })
        .eq('id', insight.id);
      
      // Update in local state
      setInsights(insights.map(i => 
        i.id === insight.id 
          ? { ...i, status: 'read' } 
          : i
      ));
    }
    
    setSelectedInsightId(
      insight.id === selectedInsightId ? undefined : insight.id
    );
  };

  // Sort insights based on selected criteria
  const sortInsights = (insightsToSort: InsightData[]) => {
    return [...insightsToSort].sort((a, b) => {
      if (sortBy === 'acv') {
        // Sort by ACV impact (descending)
        const acvA = a.customers.reduce((sum, customer) => sum + (customer.acv_impact || 0), 0);
        const acvB = b.customers.reduce((sum, customer) => sum + (customer.acv_impact || 0), 0);
        return acvB - acvA;
      } else {
        // Sort by frequency (number of customers, descending)
        return b.customers.length - a.customers.length;
      }
    });
  };

  if (themeId && themeName) {
    return (
      <ThemeInsights
        themeId={themeId}
        themeName={themeName}
        onBack={() => {
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('theme');
          window.history.pushState({}, '', `?${newParams.toString()}`);
          loadInsights();
        }}
      />
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
        <p className="text-gray-600">
          View and analyze customer feedback and feature requests.
        </p>
      </div>

      <div className="mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <h3 className="font-medium text-gray-900">Filters</h3>
              {getActiveFiltersCount() > 0 && (
                <span className="bg-teal-100 text-teal-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {getActiveFiltersCount()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'acv' | 'frequency')}
                  className="border border-gray-300 rounded-md text-sm p-1"
                >
                  <option value="acv">ACV Impact</option>
                  <option value="frequency">Customer Frequency</option>
                </select>
              </div>
              
              {getActiveFiltersCount() > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-sm text-teal-600 hover:text-teal-800 flex items-center gap-1"
              >
                {showFilters ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Hide Filters
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show Filters
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Basic filters always visible */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
              <Layers className="w-5 h-5 text-gray-400" />
              <select
                value={filters.themes.length === 1 ? filters.themes[0] : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  handleFilterChange({
                    themes: value ? [value] : [],
                  });
                }}
                className="border-0 bg-transparent focus:ring-0 text-sm"
              >
                <option value="">All Themes</option>
                {themes.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <select
                value={filters.dateRange}
                onChange={(e) =>
                  handleFilterChange({
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

            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
              <MessageSquare className="w-5 h-5 text-gray-400" />
              <select
                value={filters.sources.length === 1 ? filters.sources[0] : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  handleFilterChange({
                    sources: value ? [value] : [],
                  });
                }}
                className="border-0 bg-transparent focus:ring-0 text-sm"
              >
                <option value="">All Sources</option>
                <option value="slack">Slack</option>
                <option value="hubspot">HubSpot</option>
                <option value="document">Documents</option>
                <option value="zoom">Zoom</option>
                <option value="csv">CSV Upload</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
              <BarChart2 className="w-5 h-5 text-gray-400" />
              <select
                value={filters.status.length === 1 ? filters.status[0] : ''}
                onChange={(e) => {
                  const value = e.target.value as 'new' | 'read' | 'in_review' | 'planned' | '';
                  handleFilterChange({
                    status: value ? [value] : [],
                  });
                }}
                className="border-0 bg-transparent focus:ring-0 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="new">New</option>
                <option value="read">Read</option>
                <option value="in_review">In Review</option>
                <option value="planned">Planned</option>
              </select>
            </div>
          </div>

          {/* Advanced filters (collapsible) */}
          {showFilters && (
            <div className="border-t border-gray-200 pt-4 space-y-6">
              {/* Customer & Business Impact Filters */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Customer & Business Impact
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Companies
                    </label>
                    <select
                      multiple
                      value={filters.companies}
                      onChange={(e) => {
                        const selectedOptions = Array.from(
                          e.target.selectedOptions,
                          (option) => option.value
                        );
                        handleFilterChange({ companies: selectedOptions });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                      size={3}
                    >
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ACV Impact Range
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.acvRange ? filters.acvRange[0] : ''}
                        onChange={(e) => {
                          const min = parseInt(e.target.value) || 0;
                          const max = filters.acvRange
                            ? filters.acvRange[1]
                            : 1000000;
                          handleFilterChange({ acvRange: [min, max] });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                      />
                      <span>to</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.acvRange ? filters.acvRange[1] : ''}
                        onChange={(e) => {
                          const max = parseInt(e.target.value) || 0;
                          const min = filters.acvRange
                            ? filters.acvRange[0]
                            : 0;
                          handleFilterChange({ acvRange: [min, max] });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Segments
                    </label>
                    <select
                      multiple
                      value={filters.segments}
                      onChange={(e) => {
                        const selectedOptions = Array.from(
                          e.target.selectedOptions,
                          (option) => option.value
                        );
                        handleFilterChange({ segments: selectedOptions });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                      size={3}
                    >
                      {segments.map((segment) => (
                        <option key={segment.id} value={segment.id}>
                          {segment.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Feedback Attributes Filters */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Feedback Attributes
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Products
                    </label>
                    <select
                      multiple
                      value={filters.products}
                      onChange={(e) => {
                        const selectedOptions = Array.from(
                          e.target.selectedOptions,
                          (option) => option.value
                        );
                        handleFilterChange({ products: selectedOptions });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                      size={3}
                    >
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sentiment
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="sentiment-positive"
                          checked={filters.sentiment.includes('positive')}
                          onChange={(e) => {
                            const newSentiment = e.target.checked
                              ? [...filters.sentiment, 'positive']
                              : filters.sentiment.filter(
                                  (s) => s !== 'positive'
                                );
                            handleFilterChange({ sentiment: newSentiment });
                          }}
                          className="h-4 w-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                        />
                        <label
                          htmlFor="sentiment-positive"
                          className="ml-2 text-sm text-gray-700"
                        >
                          Positive
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="sentiment-neutral"
                          checked={filters.sentiment.includes('neutral')}
                          onChange={(e) => {
                            const newSentiment = e.target.checked
                              ? [...filters.sentiment, 'neutral']
                              : filters.sentiment.filter(
                                  (s) => s !== 'neutral'
                                );
                            handleFilterChange({ sentiment: newSentiment });
                          }}
                          className="h-4 w-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                        />
                        <label
                          htmlFor="sentiment-neutral"
                          className="ml-2 text-sm text-gray-700"
                        >
                          Neutral
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="sentiment-negative"
                          checked={filters.sentiment.includes('negative')}
                          onChange={(e) => {
                            const newSentiment = e.target.checked
                              ? [...filters.sentiment, 'negative']
                              : filters.sentiment.filter(
                                  (s) => s !== 'negative'
                                );
                            handleFilterChange({ sentiment: newSentiment });
                          }}
                          className="h-4 w-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                        />
                        <label
                          htmlFor="sentiment-negative"
                          className="ml-2 text-sm text-gray-700"
                        >
                          Negative
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags
                    </label>
                    <select
                      multiple
                      value={filters.tags}
                      onChange={(e) => {
                        const selectedOptions = Array.from(
                          e.target.selectedOptions,
                          (option) => option.value
                        );
                        handleFilterChange({ tags: selectedOptions });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                      size={3}
                    >
                      {tags.map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Status & Priority Filters */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Status & Priority
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="priority-high"
                          checked={filters.priority.includes('high')}
                          onChange={(e) => {
                            const newPriority = e.target.checked
                              ? [...filters.priority, 'high']
                              : filters.priority.filter((p) => p !== 'high');
                            handleFilterChange({ priority: newPriority });
                          }}
                          className="h-4 w-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                        />
                        <label
                          htmlFor="priority-high"
                          className="ml-2 text-sm text-gray-700"
                        >
                          High
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="priority-medium"
                          checked={filters.priority.includes('medium')}
                          onChange={(e) => {
                            const newPriority = e.target.checked
                              ? [...filters.priority, 'medium']
                              : filters.priority.filter((p) => p !== 'medium');
                            handleFilterChange({ priority: newPriority });
                          }}
                          className="h-4 w-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                        />
                        <label
                          htmlFor="priority-medium"
                          className="ml-2 text-sm text-gray-700"
                        >
                          Medium
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="priority-low"
                          checked={filters.priority.includes('low')}
                          onChange={(e) => {
                            const newPriority = e.target.checked
                              ? [...filters.priority, 'low']
                              : filters.priority.filter((p) => p !== 'low');
                            handleFilterChange({ priority: newPriority });
                          }}
                          className="h-4 w-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                        />
                        <label
                          htmlFor="priority-low"
                          className="ml-2 text-sm text-gray-700"
                        >
                          Low
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="status-new"
                          checked={filters.status.includes('new')}
                          onChange={(e) => {
                            const newStatus = e.target.checked
                              ? [...filters.status, 'new']
                              : filters.status.filter((s) => s !== 'new');
                            handleFilterChange({ status: newStatus });
                          }}
                          className="h-4 w-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                        />
                        <label
                          htmlFor="status-new"
                          className="ml-2 text-sm text-gray-700"
                        >
                          New
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="status-read"
                          checked={filters.status.includes('read')}
                          onChange={(e) => {
                            const newStatus = e.target.checked
                              ? [...filters.status, 'read']
                              : filters.status.filter((s) => s !== 'read');
                            handleFilterChange({ status: newStatus });
                          }}
                          className="h-4 w-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                        />
                        <label
                          htmlFor="status-read"
                          className="ml-2 text-sm text-gray-700"
                        >
                          Read
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="status-in-review"
                          checked={filters.status.includes('in_review')}
                          onChange={(e) => {
                            const newStatus = e.target.checked
                              ? [...filters.status, 'in_review']
                              : filters.status.filter((s) => s !== 'in_review');
                            handleFilterChange({ status: newStatus });
                          }}
                          className="h-4 w-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                        />
                        <label
                          htmlFor="status-in-review"
                          className="ml-2 text-sm text-gray-700"
                        >
                          In Review
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="status-planned"
                          checked={filters.status.includes('planned')}
                          onChange={(e) => {
                            const newStatus = e.target.checked
                              ? [...filters.status, 'planned']
                              : filters.status.filter((s) => s !== 'planned');
                            handleFilterChange({ status: newStatus });
                          }}
                          className="h-4 w-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                        />
                        <label
                          htmlFor="status-planned"
                          className="ml-2 text-sm text-gray-700"
                        >
                          Planned
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Filters */}
              {getActiveFiltersCount() > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Active Filters
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {filters.themes.length > 0 &&
                      themes
                        .filter((t) => filters.themes.includes(t.id))
                        .map((theme) => (
                          <div
                            key={theme.id}
                            className="bg-teal-100 text-teal-800 text-xs font-medium px-2.5 py-1 rounded-full flex items-center"
                          >
                            <span>Theme: {theme.name}</span>
                            <button
                              onClick={() =>
                                handleFilterChange({
                                  themes: filters.themes.filter(
                                    (id) => id !== theme.id
                                  ),
                                })
                              }
                              className="ml-1 text-teal-600 hover:text-teal-800"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}

                    {filters.dateRange !== 'all' && (
                      <div className="bg-teal-100 text-teal-800 text-xs font-medium px-2.5 py-1 rounded-full flex items-center">
                        <span>
                          Date:{' '}
                          {filters.dateRange === '7d'
                            ? 'Last 7 Days'
                            : filters.dateRange === '30d'
                            ? 'Last 30 Days'
                            : 'Last 90 Days'}
                        </span>
                        <button
                          onClick={() =>
                            handleFilterChange({ dateRange: 'all' })
                          }
                          className="ml-1 text-teal-600 hover:text-teal-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {filters.companies.length > 0 &&
                      companies
                        .filter((c) => filters.companies.includes(c.id))
                        .map((company) => (
                          <div
                            key={company.id}
                            className="bg-teal-100 text-teal-800 text-xs font-medium px-2.5 py-1 rounded-full flex items-center"
                          >
                            <span>Company: {company.name}</span>
                            <button
                              onClick={() =>
                                handleFilterChange({
                                  companies: filters.companies.filter(
                                    (id) => id !== company.id
                                  ),
                                })
                              }
                              className="ml-1 text-teal-600 hover:text-teal-800"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}

                    {filters.acvRange && (
                      <div className="bg-teal-100 text-teal-800 text-xs font-medium px-2.5 py-1 rounded-full flex items-center">
                        <span>
                          ACV: ${filters.acvRange[0]} - ${filters.acvRange[1]}
                        </span>
                        <button
                          onClick={() => handleFilterChange({ acvRange: null })}
                          className="ml-1 text-teal-600 hover:text-teal-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {filters.sources.length > 0 &&
                      filters.sources.map((source) => (
                        <div
                          key={source}
                          className="bg-teal-100 text-teal-800 text-xs font-medium px-2.5 py-1 rounded-full flex items-center"
                        >
                          <span>Source: {source}</span>
                          <button
                            onClick={() =>
                              handleFilterChange({
                                sources: filters.sources.filter(
                                  (s) => s !== source
                                ),
                              })
                            }
                            className="ml-1 text-teal-600 hover:text-teal-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                    {filters.sentiment.length > 0 &&
                      filters.sentiment.map((sentiment) => (
                        <div
                          key={sentiment}
                          className="bg-teal-100 text-teal-800 text-xs font-medium px-2.5 py-1 rounded-full flex items-center"
                        >
                          <span>Sentiment: {sentiment}</span>
                          <button
                            onClick={() =>
                              handleFilterChange({
                                sentiment: filters.sentiment.filter(
                                  (s) => s !== sentiment
                                ),
                              })
                            }
                            className="ml-1 text-teal-600 hover:text-teal-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                    {filters.status.length > 0 &&
                      filters.status.map((status) => (
                        <div
                          key={status}
                          className="bg-teal-100 text-teal-800 text-xs font-medium px-2.5 py-1 rounded-full flex items-center"
                        >
                          <span>Status: {status.replace('_', ' ')}</span>
                          <button
                            onClick={() =>
                              handleFilterChange({
                                status: filters.status.filter(
                                  (s) => s !== status
                                ),
                              })
                            }
                            className="ml-1 text-teal-600 hover:text-teal-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                    {/* Add more active filter chips as needed */}
                  </div>
                </div>
              )}
            </div>
          )}
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
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        </div>
      ) : insights.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-600">
            No insights found. Create new insights from your feedback sources.
          </p>
        </div>
      ) : (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">All Insights</h2>
          <InsightsList
            insights={sortInsights(insights)}
            onInsightClick={handleInsightClick}
            selectedInsightId={selectedInsightId}
            onMarkImportant={handleMarkImportant}
            onShareWithPod={handleShareWithPod}
          />
        </div>
      )}

      {showShareModal && insightToShare && (
        <ShareInsightModal
          podId=""
          insightId={insightToShare}
          onClose={() => {
            setShowShareModal(false);
            setInsightToShare(null);
          }}
          onShare={() => {
            setShowShareModal(false);
            setInsightToShare(null);
            toast.success('Insight added to workspace successfully');
          }}
        />
      )}
    </div>
  );
}