import React, { useState, useEffect } from 'react';
import { Users, DollarSign, ExternalLink, Tag, Flag, Share2, ImportIcon as ExportIcon } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Customer {
  customer_id: string;
  customer_name: string;
  acv_impact: number;
}

interface Source {
  type: string;
  url?: string;
  content: string;
}

interface Theme {
  id: string;
  name: string;
}

export interface InsightData {
  id: string;
  content: string;
  source: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  status: 'new' | 'read' | 'in_review' | 'planned';
  created_at: string;
  customers: Customer[];
  sources: Source[];
  themes: Theme[];
  isImportant?: boolean;
}

interface InsightCardProps {
  insight: InsightData;
  onClick?: () => void;
  expanded?: boolean;
  onMarkImportant?: (insightId: string) => void;
  onShareWithPod?: (insightId: string) => void;
  onExport?: (insightId: string) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
};

export default function InsightCard({
  insight,
  onClick,
  expanded = false,
  onMarkImportant,
  onShareWithPod,
  onExport
}: InsightCardProps) {
  const totalACV = insight.customers.reduce(
    (sum, customer) => sum + customer.acv_impact,
    0
  );

  // Get status badge color and text
  const getStatusBadge = () => {
    switch (insight.status) {
      case 'new':
        return <span className="px-2 py-1 text-xs font-medium rounded bg-blue-50 text-blue-700">New</span>;
      case 'read':
        return <span className="px-2 py-1 text-xs font-medium rounded bg-gray-50 text-gray-700">Read</span>;
      case 'in_review':
        return <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-50 text-yellow-700">In Review</span>;
      case 'planned':
        return <span className="px-2 py-1 text-xs font-medium rounded bg-green-50 text-green-700">Planned</span>;
      default:
        return null;
    }
  };

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 overflow-hidden transition-all ${
        expanded ? '' : 'hover:border-blue-300 cursor-pointer'
      }`}
      onClick={() => !expanded && onClick?.()}
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-2 py-1 text-sm rounded ${
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
              <span className="text-sm text-gray-500">
                {new Date(insight.created_at).toLocaleDateString()}
              </span>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {insight.source}
              </span>
              {insight.isImportant && (
                <span className="text-sm text-amber-600 bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1">
                  <Flag className="w-3 h-3" />
                  Important
                </span>
              )}
              {getStatusBadge()}
            </div>
            <p className="text-gray-900 font-medium">{insight.content}</p>

            {insight.themes.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <Tag className="w-4 h-4 text-gray-400" />
                <div className="flex flex-wrap gap-2">
                  {insight.themes.map((theme) => (
                    <span
                      key={theme.id}
                      className="px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded"
                    >
                      {theme.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="flex items-center gap-2 text-gray-600">
            <Users className="w-5 h-5" />
            <div>
              <div className="text-lg font-semibold">
                {insight.customers.length}
              </div>
              <div className="text-sm">Customers</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-gray-600">
            <DollarSign className="w-5 h-5" />
            <div>
              <div className="text-lg font-semibold">
                {formatCurrency(totalACV)}
              </div>
              <div className="text-sm">ACV Impact</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkImportant?.(insight.id);
            }}
            className={`px-3 py-1.5 rounded hover:bg-amber-100 transition-colors flex items-center gap-1.5 text-sm ${
              insight.isImportant
                ? 'bg-amber-100 text-amber-700'
                : 'bg-amber-50 text-amber-700'
            }`}
            title={insight.isImportant ? "Remove from important" : "Mark as important"}
          >
            <Flag className="w-4 h-4" />
            {insight.isImportant ? 'Important' : 'Mark Important'}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onShareWithPod?.(insight.id);
            }}
            className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors flex items-center gap-1.5 text-sm"
            title="Add to workspace"
          >
            <Share2 className="w-4 h-4" />
            Add to Workspace
          </button>
          
          {onExport && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExport?.(insight.id);
              }}
              className="px-3 py-1.5 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition-colors flex items-center gap-1.5 text-sm"
              title="Export insight"
            >
              <ExternalLink className="w-4 h-4" />
              Export
            </button>
          )}
        </div>

        {expanded && (
          <div className="mt-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Context
              </h3>
              <div className="space-y-3">
                {insight.sources.map((source, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {source.type}
                      </span>
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Source
                        </a>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm whitespace-pre-wrap">
                      {source.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Customers
              </h3>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        ACV Impact
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {insight.customers.map((customer) => (
                      <tr key={customer.customer_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {customer.customer_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {formatCurrency(customer.acv_impact)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}