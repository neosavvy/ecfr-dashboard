import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.ts';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface AgencyMetrics {
  agency_id: number;
  agency_name?: string;
  word_count: number;
  paragraph_count: number;
  sentence_count: number;
  readability_score: number;
  language_complexity_score: number;
  simplicity_score: number;
}

export function AgencyMetricsChart() {
  const [metrics, setMetrics] = useState<AgencyMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>('readability_score');

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        
        // First get the agencies to have their names
        const { data: agencies, error: agenciesError } = await supabase
          .from('agencies')
          .select('id, name');
        
        if (agenciesError) throw agenciesError;
        
        // Get the latest metrics for each agency
        const { data, error } = await supabase
          .from('agency_regulation_document_historical_metrics')
          .select('agency_id, word_count, paragraph_count, sentence_count, readability_score, language_complexity_score, simplicity_score')
          .order('metrics_date', { ascending: false });
        
        if (error) throw error;
        
        // Process data to get the latest metrics per agency and add agency names
        const agencyMap = new Map(agencies?.map(a => [a.id, a.name]) || []);
        const latestMetricsPerAgency = new Map<number, AgencyMetrics>();
        
        data?.forEach(metric => {
          if (!latestMetricsPerAgency.has(metric.agency_id)) {
            latestMetricsPerAgency.set(metric.agency_id, {
              ...metric,
              agency_name: agencyMap.get(metric.agency_id) || `Agency ${metric.agency_id}`
            });
          }
        });
        
        setMetrics(Array.from(latestMetricsPerAgency.values()));
      } catch (error: any) {
        console.error('Error fetching metrics:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  const metricOptions = [
    { value: 'word_count', label: 'Word Count' },
    { value: 'paragraph_count', label: 'Paragraph Count' },
    { value: 'sentence_count', label: 'Sentence Count' },
    { value: 'readability_score', label: 'Readability Score' },
    { value: 'language_complexity_score', label: 'Language Complexity' },
    { value: 'simplicity_score', label: 'Simplicity Score' },
  ];

  const chartData = {
    labels: metrics.map(m => m.agency_name),
    datasets: [
      {
        label: metricOptions.find(m => m.value === selectedMetric)?.label || selectedMetric,
        data: metrics.map(m => m[selectedMetric as keyof AgencyMetrics] as number),
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        borderColor: 'rgb(53, 162, 235)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#e5e7eb', // text-gray-200
        },
      },
      title: {
        display: true,
        text: 'Agency Document Metrics',
        color: '#e5e7eb', // text-gray-200
      },
      tooltip: {
        backgroundColor: '#1e2538',
        titleColor: '#e5e7eb',
        bodyColor: '#e5e7eb',
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#9ca3af', // text-gray-400
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.2)', // text-gray-600 with opacity
        },
      },
      y: {
        ticks: {
          color: '#9ca3af', // text-gray-400
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.2)', // text-gray-600 with opacity
        },
      },
    },
  };

  if (loading) {
    return <div className="flex justify-center items-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
    </div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-400 bg-[#2a1c24] rounded-md">Error: {error}</div>;
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <label htmlFor="metric-select" className="block text-sm font-medium text-gray-300 mb-2">
          Select Metric:
        </label>
        <select
          id="metric-select"
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
          className="bg-[#232939] text-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
        >
          {metricOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      
      <div className="h-80">
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}

export default AgencyMetricsChart; 