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
    combined_readability_score: number;
    flesch_reading_ease: number;
    smog_index_score: number;
    automated_readability_score: number;
    year: number;
  } | null;
}

type MetricKey = 'word_count' | 'paragraph_count' | 'sentence_count' | 'section_count' | 
                'combined_readability_score' | 'flesch_reading_ease' | 'smog_index_score' | 
                'automated_readability_score';

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

// Update the MetricDisplay component to handle readability scores
function MetricDisplay({ 
  label, 
  value, 
  year, 
  isReadabilityMetric = false 
}: { 
  label: string; 
  value: number | null; 
  year?: number;
  isReadabilityMetric?: boolean;
}) {
  const animatedValue = useCountUp(value || 0);
  
  if (isReadabilityMetric) {
    const { text: interpretation } = getReadabilityInterpretation(value || 0);
    return (
      <div>
        <div className="flex justify-between items-baseline">
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-xs text-gray-500">{interpretation}</p>
        </div>
        <p className="text-lg font-bold text-white">
          {value ? value.toFixed(1) : 'No data'}
        </p>
      </div>
    );
  }
  
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

// Add helper function for readability interpretation
function getReadabilityInterpretation(score: number): { text: string; color: string } {
  if (score >= 90) return { text: 'Very easy to read', color: '#10B981' };
  if (score >= 70) return { text: 'Easy to read', color: '#3B82F6' };
  if (score >= 50) return { text: 'Fairly difficult', color: '#F59E0B' };
  if (score >= 30) return { text: 'Difficult', color: '#EF4444' };
  return { text: 'Very difficult', color: '#991B1B' };
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
    { key: 'sentence_count', label: 'Sentence Count', format: (value) => value.toLocaleString() },
    { key: 'paragraph_count', label: 'Paragraph Count', format: (value) => value.toLocaleString() },
    { key: 'combined_readability_score', label: 'Combined Readability', format: (value) => value.toFixed(1) },
    { key: 'flesch_reading_ease', label: 'Flesch Reading Ease', format: (value) => value.toFixed(1) }
  ];

  useEffect(() => {
    async function fetchAgencies() {
      try {
        setLoading(true);
        
        const { data: agenciesData, error: agenciesError } = await supabase
          .from('agencies')
          .select('id, name, short_name, display_name, sortable_name, slug');
        
        if (agenciesError) throw agenciesError;
        
        const { data: metricsData, error: metricsError } = await supabase
          .from('agency_regulation_document_historical_metrics')
          .select('agency_id, word_count, paragraph_count, sentence_count, combined_readability_score, flesch_reading_ease, smog_index_score, automated_readability_score, metrics_date');
        
        if (metricsError) {
          console.warn('Error fetching metrics:', metricsError);
        }
        
        // Create a map of agency_id to metrics
        const metricsMap = new Map();
        
        if (metricsData) {
          const sortedMetrics = metricsData.sort((a, b) => 
            new Date(b.metrics_date).getTime() - new Date(a.metrics_date).getTime()
          );

          sortedMetrics.forEach(metric => {
            const metricYear = new Date(metric.metrics_date).getFullYear();
            if (!metricsMap.has(metric.agency_id)) {
              metricsMap.set(metric.agency_id, {
                word_count: 0,
                paragraph_count: 0,
                sentence_count: 0,
                combined_readability_score: 0,
                flesch_reading_ease: 0,
                smog_index_score: 0,
                automated_readability_score: 0,
                count: 0,
                year: metricYear
              });
            }
            
            const existingMetrics = metricsMap.get(metric.agency_id);
            existingMetrics.word_count += metric.word_count || 0;
            existingMetrics.paragraph_count += metric.paragraph_count || 0;
            existingMetrics.sentence_count += metric.sentence_count || 0;
            
            // For readability scores, we'll calculate averages
            existingMetrics.combined_readability_score += metric.combined_readability_score || 0;
            existingMetrics.flesch_reading_ease += metric.flesch_reading_ease || 0;
            existingMetrics.smog_index_score += metric.smog_index_score || 0;
            existingMetrics.automated_readability_score += metric.automated_readability_score || 0;
            existingMetrics.count += 1;
          });

          // Calculate averages for readability scores
          metricsMap.forEach(metrics => {
            if (metrics.count > 0) {
              metrics.combined_readability_score /= metrics.count;
              metrics.flesch_reading_ease /= metrics.count;
              metrics.smog_index_score /= metrics.count;
              metrics.automated_readability_score /= metrics.count;
            }
          });
        }
        
        const agenciesWithMetrics = agenciesData?.map(agency => ({
          ...agency,
          metrics: metricsMap.get(agency.id) || null
        })) || [];
        
        setAgencies(agenciesWithMetrics as Agency[]);
      } catch (error: any) {
        console.error('Error fetching agencies:', error);
        setError(error.message);
      } finally {
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
                    label="Total Sentence Count"
                    value={agency.metrics?.sentence_count ?? null}
                  />
                  
                  <MetricDisplay 
                    label="Total Paragraph Count"
                    value={agency.metrics?.paragraph_count ?? null}
                  />

                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <MetricDisplay 
                      label="Combined Readability"
                      value={agency.metrics?.combined_readability_score ?? null}
                      isReadabilityMetric={true}
                    />
                    
                    <div className="mt-2">
                      <MetricDisplay 
                        label="Flesch Reading Ease"
                        value={agency.metrics?.flesch_reading_ease ?? null}
                        isReadabilityMetric={true}
                      />
                    </div>
                  </div>
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