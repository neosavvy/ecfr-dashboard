import { MetricInfo, MetricType } from '../types';
import { BarChart as ChartBar } from 'lucide-react';

// Calculate the width once, outside the component
const LONGEST_METRIC_NAME_WIDTH = 280; // Width that fits "Revision Authors" comfortably

interface MetricSelectorProps {
  metrics: MetricInfo[];
  selectedMetric: MetricType;
  onMetricSelect: (metric: MetricType) => void;
}

export function MetricSelector({ metrics, selectedMetric, onMetricSelect }: MetricSelectorProps) {
  const selectedMetricInfo = metrics.find(m => m.id === selectedMetric);

  return (
    <div className="flex-1 sm:flex-none" style={{ width: LONGEST_METRIC_NAME_WIDTH }}>
      <label htmlFor="metric-select" className="block text-sm font-medium text-gray-300 mb-2">
        Select Metric
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <ChartBar className="h-5 w-5 text-gray-400" />
        </div>
        <select
          id="metric-select"
          className="block w-full pl-10 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg
                     text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none
                     cursor-pointer hover:bg-gray-700 transition-colors"
          value={selectedMetric}
          onChange={(e) => onMetricSelect(e.target.value as MetricType)}
        >
          {metrics.map((metric) => (
            <option key={metric.id} value={metric.id}>
              {metric.name}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {selectedMetricInfo && (
        <p className="mt-2 text-sm text-gray-400 hidden sm:block">
          {selectedMetricInfo.description}
        </p>
      )}
    </div>
  );
}