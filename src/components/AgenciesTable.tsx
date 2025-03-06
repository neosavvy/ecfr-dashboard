import { useState, useEffect, useRef } from 'react';
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

// Custom hook for counting animation
function useCountUp(endValue: number, duration: number = 1000) {
  const [count, setCount] = useState(0);
  const countRef = useRef<number>(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    const startTime = Date.now();
    const startValue = countRef.current;

    const updateCount = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuad = (t: number) => t * (2 - t);
      const easedProgress = easeOutQuad(progress);
      
      const currentCount = Math.floor(startValue + (endValue - startValue) * easedProgress);
      setCount(currentCount);
      countRef.current = currentCount;

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(updateCount);
      } else {
        setCount(endValue);
      }
    };

    frameRef.current = requestAnimationFrame(updateCount);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [endValue, duration]);

  return count;
}

// Separate component for animated metric display
function MetricDisplay({ label, value, year }: { label: string; value: number | null; year?: number }) {
  const animatedValue = useCountUp(value || 0);
  
  return (
    <div>
      <p className="text-xs text-gray-400">
        {label} {year ? `(through ${year})` : ''}
      </p>
      <p className="text-lg font-bold text-white">
        {value ? animatedValue.toLocaleString() : 'No data'}
      </p>
    </div>
  );
}

export function AgenciesGrid() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('word_count');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const metricOptions: MetricOption[] = [
    { key: 'word_count', label: 'Word Count', format: (value) => value.toLocaleString() },
    { key: 'paragraph_count', label: 'Paragraph Count', format: (value) => value.toLocaleString() },
    { key: 'sentence_count', label: 'Sentence Count', format: (value) => value.toLocaleString() },
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
        
        // Fetch ALL metrics for each agency
        const { data: metricsData, error: metricsError } = await supabase
          .from('agency_regulation_document_historical_metrics')
          .select('agency_id, word_count, paragraph_count, sentence_count, metrics_date');
        
        if (metricsError) {
          console.warn('Error fetching metrics:', metricsError);
        }
        
        // Create a map of agency_id to summed metrics
        const metricsMap = new Map<number, {
          word_count: number;
          paragraph_count: number;
          sentence_count: number;
          year: number;  // We'll keep the latest year for reference
        }>();
        
        if (metricsData) {
          // First, sort by date to ensure we get the latest year
          const sortedMetrics = metricsData.sort((a, b) => 
            new Date(b.metrics_date).getTime() - new Date(a.metrics_date).getTime()
          );

          sortedMetrics.forEach(metric => {
            const metricYear = new Date(metric.metrics_date).getFullYear();
            if (!metricsMap.has(metric.agency_id)) {
              // Initialize new agency metrics
              metricsMap.set(metric.agency_id, {
                word_count: 0,
                paragraph_count: 0,
                sentence_count: 0,
                year: metricYear  // This will be the latest year since we sorted
              });
            }
            
            // Get existing metrics and add current metrics
            const existingMetrics = metricsMap.get(metric.agency_id)!;
            existingMetrics.word_count += metric.word_count;
            existingMetrics.paragraph_count += metric.paragraph_count;
            existingMetrics.sentence_count += metric.sentence_count;
          });
        }
        
        // Combine agency data with summed metrics
        const agenciesWithMetrics = agenciesData?.map(agency => ({
          ...agency,
          metrics: metricsMap.get(agency.id) || null
        })) || [];
        console.log('Agencies with summed metrics:', agenciesWithMetrics);
        setAgencies(agenciesWithMetrics as Agency[]);
      } catch (error: any) {
        console.error('Error fetching agencies:', error);
        setError(error.message);
      } finally {
        setLoading(false);
        setLoading(false);
      }
    }

    fetchAgencies();
  }, []);

  // Filter agencies based on search query
  const filteredAgencies = agencies.filter(agency => {
    const searchTerms = searchQuery.toLowerCase().split(' ');
    const agencyName = (agency.display_name || agency.name).toLowerCase();
    const shortName = (agency.short_name || '').toLowerCase();
    
    return searchTerms.every(term => 
      agencyName.includes(term) || shortName.includes(term)
    );
  });

  // Sort filtered agencies based on the selected metric
  const sortedAgencies = [...filteredAgencies].sort((a, b) => {
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-white">Federal Agencies</h1>
        
        <div className="flex flex-col md:flex-row gap-4 md:items-center">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search agencies..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="bg-[#232939] text-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 pl-10 min-w-[250px]"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Metric Selector */}
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
      </div>
      
      {sortedAgencies.length === 0 ? (
        <div className="p-4 text-center text-gray-400 bg-[#1e2538] rounded-md">
          {searchQuery ? 'No agencies found matching your search' : 'No agencies found'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedAgencies.map((agency) => (
            <div 
              key={agency.id} 
              className="bg-[#1e2538] rounded-lg shadow-md overflow-hidden hover:bg-[#252c40] transition-colors cursor-pointer" 
              onClick={() => handleCardClick(agency.id)}
            >
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-6 h-[104px] flex items-center">
                <div className="flex items-start w-full gap-3">
                  <div className="bg-blue-700 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-bold text-white">{agency.short_name?.charAt(0) || agency.name.charAt(0)}</span>
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-center">
                    <h2 className="text-lg font-semibold text-white leading-tight line-clamp-2">
                      {agency.display_name || agency.name}
                    </h2>
                    {agency.short_name && (
                      <p className="text-sm text-blue-200 mt-1 truncate">
                        {agency.short_name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                <div className="space-y-2">
                  <MetricDisplay 
                    label="Total Word Count"
                    value={agency.metrics?.word_count ?? null}
                    year={agency.metrics?.year}
                  />
                  
                  <MetricDisplay 
                    label="Total Paragraph Count"
                    value={agency.metrics?.paragraph_count ?? null}
                  />
                  
                  <MetricDisplay 
                    label="Total Sentence Count"
                    value={agency.metrics?.sentence_count ?? null}
                  />
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