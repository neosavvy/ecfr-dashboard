import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.ts'
import { useNavigate } from 'react-router-dom';

interface Agency {
  id: number;
  name: string;
  short_name: string;
  display_name: string;
  sortable_name: string;
  slug: string;
  metrics: {
    word_count: number;
    paragraph_count: number;
    sentence_count: number;
    section_count: number;
    readability_score: number;
    language_complexity_score: number;
    simplicity_score: number;
    year: number;
  } | null;
}

type MetricKey = 'word_count' | 'paragraph_count' | 'sentence_count' | 'section_count' | 
                'readability_score' | 'language_complexity_score' | 'simplicity_score';

interface MetricOption {
  key: MetricKey;
  label: string;
  format: (value: number) => string;
}

export function AgenciesGrid() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('word_count');
  const navigate = useNavigate();

  const metricOptions: MetricOption[] = [
    { key: 'word_count', label: 'Word Count', format: (value) => value.toLocaleString() },
    { key: 'paragraph_count', label: 'Paragraph Count', format: (value) => value.toLocaleString() },
    { key: 'sentence_count', label: 'Sentence Count', format: (value) => value.toLocaleString() },
    { key: 'section_count', label: 'Section Count', format: (value) => value.toLocaleString() },
    { key: 'readability_score', label: 'Readability Score', format: (value) => value.toFixed(2) },
    { key: 'language_complexity_score', label: 'Language Complexity', format: (value) => value.toFixed(2) },
    { key: 'simplicity_score', label: 'Simplicity Score', format: (value) => value.toFixed(2) },
  ];

  useEffect(() => {
    async function fetchAgencies() {
      try {
        setLoading(true);
        
        // Fetch agencies
        const { data: agenciesData, error: agenciesError } = await supabase
          .from('agencies')
          .select('id, name, short_name, display_name, sortable_name, slug');
        
        if (agenciesError) {
          throw agenciesError;
        }
        
        // Fetch latest metrics for each agency (not limited to current year)
        const { data: metricsData, error: metricsError } = await supabase
          .from('agency_regulation_document_historical_metrics')
          .select('agency_id, word_count, paragraph_count, sentence_count, section_count, readability_score, language_complexity_score, simplicity_score, metrics_date')
          .order('metrics_date', { ascending: false });
        
        if (metricsError) {
          console.warn('Error fetching metrics:', metricsError);
        }
        
        // Create a map of agency_id to latest metrics and year
        const metricsMap = new Map<number, {
          word_count: number;
          paragraph_count: number;
          sentence_count: number;
          section_count: number;
          readability_score: number;
          language_complexity_score: number;
          simplicity_score: number;
          year: number;
        }>();
        
        if (metricsData) {
          metricsData.forEach(metric => {
            const metricYear = new Date(metric.metrics_date).getFullYear();
            if (!metricsMap.has(metric.agency_id)) {
              metricsMap.set(metric.agency_id, { 
                word_count: metric.word_count,
                paragraph_count: metric.paragraph_count,
                sentence_count: metric.sentence_count,
                section_count: metric.section_count,
                readability_score: metric.readability_score,
                language_complexity_score: metric.language_complexity_score,
                simplicity_score: metric.simplicity_score,
                year: metricYear
              });
            }
          });
        }
        
        // Combine agency data with metrics
        const agenciesWithMetrics = agenciesData?.map(agency => ({
          ...agency,
          metrics: metricsMap.get(agency.id) || null
        })) || [];
        
        setAgencies(agenciesWithMetrics);
      } catch (error: any) {
        console.error('Error fetching agencies:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAgencies();
  }, []);

  // Sort agencies based on the selected metric
  const sortedAgencies = [...agencies].sort((a, b) => {
    const aValue = a.metrics?.[selectedMetric] || 0;
    const bValue = b.metrics?.[selectedMetric] || 0;
    return bValue - aValue; // Sort highest to lowest
  });

  const handleCardClick = (agencyId: number) => {
    navigate(`/agencies/${agencyId}`);
  };

  const handleMetricChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMetric(e.target.value as MetricKey);
  };

  if (loading) {
    return <div className="flex justify-center items-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
    </div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-400 bg-[#2a1c24] rounded-md">Error: {error}</div>;
  }

  // Find the selected metric option
  const selectedMetricOption = metricOptions.find(option => option.key === selectedMetric);

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-white mb-4 md:mb-0">Federal Agencies</h1>
        
        <div className="flex items-center">
          <label htmlFor="metric-select" className="text-gray-300 mr-3 whitespace-nowrap">Sort by:</label>
          <select
            id="metric-select"
            value={selectedMetric}
            onChange={handleMetricChange}
            className="bg-[#232939] text-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 min-w-[200px]"
          >
            {metricOptions.map(option => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {agencies.length === 0 ? (
        <div className="p-4 text-center text-gray-400 bg-[#1e2538] rounded-md">
          No agencies found
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedAgencies.map((agency) => (
            <div 
              key={agency.id} 
              className="bg-[#1e2538] rounded-lg shadow-md overflow-hidden hover:bg-[#252c40] transition-colors cursor-pointer" 
              onClick={() => handleCardClick(agency.id)}
            >
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-4">
                <div className="flex items-center">
                  <div className="bg-blue-700 rounded-full p-2 mr-3">
                    <span className="text-xl font-bold text-white">{agency.short_name?.charAt(0) || agency.name.charAt(0)}</span>
                  </div>
                  <h2 className="text-lg font-semibold text-white truncate">
                    {agency.display_name || agency.name}
                  </h2>
                </div>
              </div>
              
              <div className="p-4">
                <div className="mb-2">
                  <p className="text-xs text-gray-400">Agency Name</p>
                  <p className="text-sm text-gray-200 truncate">{agency.display_name || agency.name}</p>
                </div>
                
                {agency.short_name && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-400">Short Name</p>
                    <p className="text-sm text-gray-200">{agency.short_name}</p>
                  </div>
                )}
                
                <div>
                  <p className="text-xs text-gray-400">
                    {selectedMetricOption?.label} {agency.metrics?.year ? `(${agency.metrics.year})` : ''}
                  </p>
                  <p className="text-lg font-bold text-white">
                    {agency.metrics && agency.metrics[selectedMetric] !== undefined
                      ? selectedMetricOption?.format(agency.metrics[selectedMetric])
                      : 'No data'
                    }
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AgenciesGrid; 