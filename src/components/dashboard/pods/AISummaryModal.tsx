import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, Download, Copy, AlertCircle, BarChart2, TrendingUp, TrendingDown, DollarSign, MessageSquare, Users } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'sonner';

interface AISummaryModalProps {
  podId: string;
  podName: string;
  onClose: () => void;
}

interface SummaryData {
  executiveSummary: string;
  keyPainPoints: Array<{
    title: string;
    description: string;
    impact: string;
  }>;
  themeAnalysis: Array<{
    theme: string;
    percentage: number;
    trend: 'up' | 'down' | 'flat';
    description: string;
  }>;
  customerImpact: {
    totalAcv: number;
    topCustomers: Array<{
      name: string;
      acvImpact: number;
    }>;
  };
  recommendations: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  generatedAt: string;
}

export default function AISummaryModal({ podId, podName, onClose }: AISummaryModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'themes' | 'customers' | 'recommendations'>('summary');

  useEffect(() => {
    generateSummary();
  }, [podId]);

  const generateSummary = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would call a Supabase Edge Function
      // For now, we'll simulate the API call with a timeout and mock data
      
      // Fetch insights for this pod
      const { data: podInsights, error: insightsError } = await supabase
        .from('pod_insights')
        .select(`
          id,
          insight_id,
          note,
          tags,
          insights (
            content,
            source,
            sentiment
          ),
          pod_comments (
            content
          )
        `)
        .eq('pod_id', podId);
        
      if (insightsError) throw insightsError;
      
      // In a real implementation, we would send this data to an LLM
      // For now, we'll simulate the response
      setTimeout(() => {
        const mockSummary: SummaryData = {
          executiveSummary: `This workspace contains ${podInsights?.length || 0} insights across multiple themes. The feedback is predominantly focused on user experience issues and integration challenges. There's significant customer impact with several enterprise customers expressing concerns about API limitations and data synchronization.`,
          keyPainPoints: [
            {
              title: "API Rate Limits",
              description: "Enterprise customers are experiencing limitations with the current API rate limits, affecting their ability to scale operations.",
              impact: "High impact affecting 3 enterprise customers with a total of $250,000 in ACV."
            },
            {
              title: "Data Synchronization Issues",
              description: "Customers report inconsistent data synchronization between the platform and third-party tools.",
              impact: "Medium impact affecting 5 customers with a total of $175,000 in ACV."
            },
            {
              title: "User Interface Navigation",
              description: "Users find it difficult to navigate between modules, particularly when working with large datasets.",
              impact: "Low impact affecting 2 customers with a total of $60,000 in ACV."
            }
          ],
          themeAnalysis: [
            {
              theme: "Integration Issues",
              percentage: 40,
              trend: "up",
              description: "Integration-related feedback has increased by 15% in the last 30 days."
            },
            {
              theme: "User Experience",
              percentage: 30,
              trend: "flat",
              description: "User experience feedback has remained consistent over time."
            },
            {
              theme: "Data Accuracy",
              percentage: 20,
              trend: "down",
              description: "Data accuracy issues have decreased by 10% since recent improvements."
            },
            {
              theme: "Feature Requests",
              percentage: 10,
              trend: "up",
              description: "Feature requests are gradually increasing, particularly for reporting capabilities."
            }
          ],
          customerImpact: {
            totalAcv: 485000,
            topCustomers: [
              {
                name: "Global Enterprise Corp",
                acvImpact: 250000
              },
              {
                name: "Tech Innovators Inc",
                acvImpact: 180000
              },
              {
                name: "Digital Solutions Ltd",
                acvImpact: 55000
              }
            ]
          },
          recommendations: [
            {
              title: "Increase API Rate Limits",
              description: "Consider implementing tiered API rate limits based on customer plan to address enterprise needs.",
              priority: "high"
            },
            {
              title: "Improve Data Sync Reliability",
              description: "Investigate and resolve the root causes of data synchronization issues, particularly with Salesforce integration.",
              priority: "high"
            },
            {
              title: "Enhance Navigation UX",
              description: "Simplify the navigation between modules and consider implementing breadcrumbs for better orientation.",
              priority: "medium"
            },
            {
              title: "Add Bulk Import Feature",
              description: "Develop a bulk import feature for contacts to address customer feedback about manual data entry.",
              priority: "low"
            }
          ],
          generatedAt: new Date().toISOString()
        };
        
        setSummary(mockSummary);
        setLoading(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error generating summary:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate summary');
      setLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!summary) return;
    
    const text = `
# AI Summary for ${podName}

## Executive Summary
${summary.executiveSummary}

## Key Pain Points
${summary.keyPainPoints.map(point => `- **${point.title}**: ${point.description} (${point.impact})`).join('\n')}

## Theme Analysis
${summary.themeAnalysis.map(theme => `- **${theme.theme}** (${theme.percentage}%): ${theme.description}`).join('\n')}

## Customer Impact
Total ACV Impact: $${summary.customerImpact.totalAcv.toLocaleString()}
Top Customers:
${summary.customerImpact.topCustomers.map(customer => `- ${customer.name}: $${customer.acvImpact.toLocaleString()}`).join('\n')}

## Recommendations
${summary.recommendations.map(rec => `- **[${rec.priority.toUpperCase()}]** ${rec.title}: ${rec.description}`).join('\n')}

Generated on ${new Date(summary.generatedAt).toLocaleString()}
    `;
    
    navigator.clipboard.writeText(text);
    toast.success('Summary copied to clipboard');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 text-red-700';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700';
      case 'low':
        return 'bg-green-50 text-green-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'flat') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'flat':
        return <div className="w-4 h-0.5 bg-gray-400" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">AI Workspace Summary</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600">Analyzing workspace insights...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
            </div>
          ) : error ? (
            <div className="p-6 flex flex-col items-center">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 w-full max-w-md">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-800">Error generating summary</h3>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
              <button
                onClick={generateSummary}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : summary ? (
            <div className="p-6">
              {/* Tabs */}
              <div className="flex border-b border-gray-200 mb-6">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-4 py-2 font-medium text-sm ${
                    activeTab === 'summary'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setActiveTab('themes')}
                  className={`px-4 py-2 font-medium text-sm ${
                    activeTab === 'themes'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Theme Analysis
                </button>
                <button
                  onClick={() => setActiveTab('customers')}
                  className={`px-4 py-2 font-medium text-sm ${
                    activeTab === 'customers'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Customer Impact
                </button>
                <button
                  onClick={() => setActiveTab('recommendations')}
                  className={`px-4 py-2 font-medium text-sm ${
                    activeTab === 'recommendations'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Recommendations
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'summary' && (
                <div>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-blue-900 mb-2">Executive Summary</h3>
                    <p className="text-blue-800">{summary.executiveSummary}</p>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-4">Key Pain Points</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {summary.keyPainPoints.map((point, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <h4 className="font-medium text-gray-900 mb-2">{point.title}</h4>
                        <p className="text-gray-600 text-sm mb-3">{point.description}</p>
                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                          <span className="font-medium">Impact:</span> {point.impact}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <MessageSquare className="w-5 h-5" />
                        <span className="font-medium">Total Insights</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {summary.keyPainPoints.length}
                      </div>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <Users className="w-5 h-5" />
                        <span className="font-medium">Customers Impacted</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {summary.customerImpact.topCustomers.length}
                      </div>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <DollarSign className="w-5 h-5" />
                        <span className="font-medium">Total ACV Impact</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(summary.customerImpact.totalAcv)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'themes' && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Theme Analysis</h3>
                  <div className="space-y-4 mb-6">
                    {summary.themeAnalysis.map((theme, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{theme.theme}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{theme.percentage}%</span>
                            {getTrendIcon(theme.trend)}
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full" 
                            style={{ width: `${theme.percentage}%` }}
                          ></div>
                        </div>
                        <p className="text-gray-600 text-sm">{theme.description}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <h4 className="font-medium text-gray-900 mb-3">Theme Distribution</h4>
                    <div className="h-64 flex items-end justify-around gap-2 mb-4">
                      {summary.themeAnalysis.map((theme, index) => (
                        <div key={index} className="flex flex-col items-center">
                          <div 
                            className="w-16 bg-blue-600 rounded-t-lg" 
                            style={{ 
                              height: `${theme.percentage * 2}px`,
                              opacity: 0.6 + (index * 0.1)
                            }}
                          ></div>
                          <div className="text-xs text-gray-500 mt-2 w-20 text-center">
                            {theme.theme}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'customers' && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Customer Impact</h3>
                  
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Total ACV Impact</h4>
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {formatCurrency(summary.customerImpact.totalAcv)}
                    </div>
                    <p className="text-sm text-gray-600">
                      Total annual contract value potentially affected by the issues in this workspace.
                    </p>
                  </div>
                  
                  <h4 className="font-medium text-gray-900 mb-3">Top Impacted Customers</h4>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ACV Impact
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            % of Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {summary.customerImpact.topCustomers.map((customer, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="text-sm text-gray-900">{formatCurrency(customer.acvImpact)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="text-sm text-gray-900">
                                {Math.round((customer.acvImpact / summary.customerImpact.totalAcv) * 100)}%
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'recommendations' && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Recommendations</h3>
                  
                  <div className="space-y-4">
                    {summary.recommendations.map((rec, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{rec.title}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-lg ${getPriorityBadgeClass(rec.priority)}`}>
                            {rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)} Priority
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm">{rec.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {summary && !loading && !error && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            <div className="text-xs text-gray-500">
              Generated on {new Date(summary.generatedAt).toLocaleString()}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyToClipboard}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors flex items-center gap-1.5 text-sm"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
              <button
                onClick={generateSummary}
                className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-sm"
              >
                <Sparkles className="w-4 h-4" />
                Regenerate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}