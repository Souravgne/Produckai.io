import React from 'react';
import { InsightData } from './InsightCard';
import InsightCard from './InsightCard';

interface InsightsListProps {
  insights: InsightData[];
  onInsightClick: (insight: InsightData) => void;
  selectedInsightId?: string;
  onMarkImportant: (insightId: string) => void;
  onShareWithPod: (insightId: string) => void;
}

export default function InsightsList({ 
  insights, 
  onInsightClick, 
  selectedInsightId,
  onMarkImportant,
  onShareWithPod
}: InsightsListProps) {
  return (
    <div className="space-y-4">
      {insights.map((insight) => (
        <InsightCard
          key={insight.id}
          insight={insight}
          onClick={() => onInsightClick(insight)}
          expanded={insight.id === selectedInsightId}
          onMarkImportant={onMarkImportant}
          onShareWithPod={onShareWithPod}
        />
      ))}
    </div>
  );
}