import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.ts';
import { Line } from 'react-chartjs-2';
import { Footer } from '../components/Footer';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface Agency {
  id: number;
  name: string;
  short_name: string;
  display_name: string;
  description: string | null;
  children: any[];
  cfr_references: Array<{title: number, chapter: string}>;
  slug: string;
  sortable_name: string;
}

interface AgencyMetric {
  id: number;
  agency_id: number;
  metrics_date: string;
  word_count: number;
  paragraph_count: number;
  sentence_count: number;
  section_count: number;
  language_complexity_score: number;
  readability_score: number;
  simplicity_score: number;
  average_sentence_length?: number;
  average_word_length?: number;
}

interface AggregatedMetric {
  year: number;
  word_count: number;
  paragraph_count: number;
  sentence_count: number;
  section_count: number;
  language_complexity_score: number;
  readability_score: number;
  simplicity_score: number;
}

const AgencyDetailPage: React.FC = () => {
  const { agencyId } = useParams<{ agencyId: string }>();
  const [agency, setAgency] = useState<Agency | null>(null);
  const [latestMetrics, setLatestMetrics] = useState<AgencyMetric | null>(null);
  const [historicalMetrics, setHistoricalMetrics] = useState<AgencyMetric[]>([]);
  const [aggregatedMetrics, setAggregatedMetrics] = useState<AggregatedMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAgencyData() {
      if (!agencyId) {
        setError("No agency ID provided");
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Fetch agency details
        const { data: agencyData, error: agencyError } = await supabase
          .from('agencies')
          .select('*')
          .eq('id', parseInt(agencyId as string, 10))
          .single();
        
        if (agencyError) {
          throw agencyError;
        }
        
        setAgency(agencyData);
        
        // Fetch latest metrics for this agency
        const { data: metricsData, error: metricsError } = await supabase
          .from('agency_regulation_document_historical_metrics')
          .select('*')
          .eq('agency_id', parseInt(agencyId as string, 10))
          .order('metrics_date', { ascending: false })
          .limit(1);
        
        if (metricsError) {
          console.warn('Error fetching latest metrics:', metricsError);
        } else if (metricsData && metricsData.length > 0) {
          setLatestMetrics(metricsData[0]);
        }
        
        // Fetch all historical metrics for this agency
        const { data: historicalData, error: historicalError } = await supabase
          .from('agency_regulation_document_historical_metrics')
          .select('*')
          .eq('agency_id', parseInt(agencyId as string, 10))
          .order('metrics_date', { ascending: true });
        
        if (historicalError) {
          console.warn('Error fetching historical metrics:', historicalError);
        } else if (historicalData) {
          setHistoricalMetrics(historicalData);
          
          // Aggregate metrics by year
          const aggregated = aggregateMetricsByYear(historicalData);
          setAggregatedMetrics(aggregated);
        }
        
      } catch (error: any) {
        console.error('Error fetching agency data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAgencyData();
  }, [agencyId]);

  // Function to aggregate metrics by year
  const aggregateMetricsByYear = (metrics: AgencyMetric[]): AggregatedMetric[] => {
    const yearMap = new Map<number, { 
      count: number,
      word_count: number,
      paragraph_count: number,
      sentence_count: number,
      section_count: number,
      language_complexity_score: number,
      readability_score: number,
      simplicity_score: number
    }>();
    
    metrics.forEach(metric => {
      const year = new Date(metric.metrics_date).getFullYear();
      
      if (!yearMap.has(year)) {
        yearMap.set(year, {
          count: 0,
          word_count: 0,
          paragraph_count: 0,
          sentence_count: 0,
          section_count: 0,
          language_complexity_score: 0,
          readability_score: 0,
          simplicity_score: 0
        });
      }
      
      const yearData = yearMap.get(year)!;
      yearData.count += 1;
      yearData.word_count += metric.word_count;
      yearData.paragraph_count += metric.paragraph_count;
      yearData.sentence_count += metric.sentence_count;
      yearData.section_count += metric.section_count;
      yearData.language_complexity_score += metric.language_complexity_score;
      yearData.readability_score += metric.readability_score;
      yearData.simplicity_score += metric.simplicity_score;
    });
    
    // Calculate averages
    const result: AggregatedMetric[] = [];
    yearMap.forEach((data, year) => {
      result.push({
        year,
        word_count: Math.round(data.word_count / data.count),
        paragraph_count: Math.round(data.paragraph_count / data.count),
        sentence_count: Math.round(data.sentence_count / data.count),
        section_count: Math.round(data.section_count / data.count),
        language_complexity_score: Number((data.language_complexity_score / data.count).toFixed(2)),
        readability_score: Number((data.readability_score / data.count).toFixed(2)),
        simplicity_score: Number((data.simplicity_score / data.count).toFixed(2))
      });
    });
    
    // Sort by year
    return result.sort((a, b) => a.year - b.year);
  };

  // Define metrics for charts
  const metricDefinitions = [
    { id: 'readability_score', label: 'Readability Score', color: 'rgb(53, 162, 235)' },
    { id: 'simplicity_score', label: 'Simplicity Score', color: 'rgb(16, 185, 129)' },
    { id: 'language_complexity_score', label: 'Language Complexity', color: 'rgb(245, 158, 11)' },
    { id: 'word_count', label: 'Word Count', color: 'rgb(99, 102, 241)' },
    { id: 'paragraph_count', label: 'Paragraph Count', color: 'rgb(236, 72, 153)' },
    { id: 'sentence_count', label: 'Sentence Count', color: 'rgb(139, 92, 246)' },
    { id: 'section_count', label: 'Section Count', color: 'rgb(248, 113, 113)' },
  ];

  // Multi-metric chart data for readability metrics
  const readabilityChartData = {
    labels: aggregatedMetrics.map(m => m.year.toString()),
    datasets: [
      {
        label: 'Readability Score',
        data: aggregatedMetrics.map(m => m.readability_score),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        tension: 0.3,
        yAxisID: 'y',
      },
      {
        label: 'Simplicity Score',
        data: aggregatedMetrics.map(m => m.simplicity_score),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        tension: 0.3,
        yAxisID: 'y',
      },
      {
        label: 'Language Complexity',
        data: aggregatedMetrics.map(m => m.language_complexity_score),
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.5)',
        tension: 0.3,
        yAxisID: 'y',
      },
    ],
  };

  // Multi-metric chart options
  const readabilityChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#e5e7eb',
        },
      },
      title: {
        display: true,
        text: 'Readability Metrics Over Time',
        color: '#e5e7eb',
        font: {
          size: 16,
        },
      },
      tooltip: {
        backgroundColor: '#1e2538',
        titleColor: '#e5e7eb',
        bodyColor: '#e5e7eb',
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Year',
          color: '#9ca3af',
        },
        ticks: {
          color: '#9ca3af',
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Score',
          color: '#9ca3af',
        },
        ticks: {
          color: '#9ca3af',
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
        },
      },
    },
  };

  // Function to create chart data for a specific metric
  const createChartData = (metricId: string, metricLabel: string, metricColor: string) => {
    return {
      labels: aggregatedMetrics.map(m => m.year.toString()),
      datasets: [
        {
          label: metricLabel,
          data: aggregatedMetrics.map(m => m[metricId as keyof AggregatedMetric] as number),
          borderColor: metricColor,
          backgroundColor: `${metricColor.slice(0, -1)}, 0.5)`,
          tension: 0.3,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    };
  };

  // Function to create chart options for a specific metric
  const createChartOptions = (metricLabel: string) => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            color: '#e5e7eb',
          },
        },
        title: {
          display: true,
          text: `${metricLabel} Over Time`,
          color: '#e5e7eb',
          font: {
            size: 16,
          },
        },
        tooltip: {
          backgroundColor: '#1e2538',
          titleColor: '#e5e7eb',
          bodyColor: '#e5e7eb',
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Year',
            color: '#9ca3af',
          },
          ticks: {
            color: '#9ca3af',
          },
          grid: {
            color: 'rgba(75, 85, 99, 0.2)',
          },
        },
        y: {
          title: {
            display: true,
            text: metricLabel,
            color: '#9ca3af',
          },
          ticks: {
            color: '#9ca3af',
          },
          grid: {
            color: 'rgba(75, 85, 99, 0.2)',
          },
        },
      },
    };
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 bg-[#171c2e] min-h-screen">
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        </div>
      </div>
    );
  }

  if (error || !agency) {
    return (
      <div className="container mx-auto px-4 py-6 bg-[#171c2e] min-h-screen">
        <div className="p-4 text-center text-red-400 bg-[#2a1c24] rounded-md">
          {error || "Agency not found"}
        </div>
      </div>
    );
  }

  // Format CFR references for display
  const cfrReferencesText = agency.cfr_references?.map(ref => 
    `Title ${ref.title}, Chapter ${ref.chapter}`
  ).join('; ');

  return (
    <>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <Link to="/agencies" className="text-blue-400 hover:underline flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Agencies
          </Link>
        </div>
        
        {/* Agency Header */}
        <div className="bg-[#1e2538] rounded-lg shadow-md overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-6">
            <div className="flex items-center">
              <div className="bg-blue-700 rounded-full p-3 mr-4">
                <span className="text-2xl font-bold text-white">{agency.short_name?.charAt(0) || agency.name.charAt(0)}</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">
                  {agency.display_name || agency.name}
                </h1>
                {agency.short_name && (
                  <p className="text-blue-200 text-sm">{agency.short_name}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-2">
                <h2 className="text-lg font-semibold text-white mb-2">About</h2>
                <p className="text-gray-300">
                  {agency.description || `The ${agency.name} is a federal agency of the United States government.`}
                </p>
              </div>
              
              <div className="bg-[#232939] rounded-lg p-4">
                <h3 className="text-gray-300 text-sm font-medium mb-3 border-b border-gray-700 pb-2">Agency Details</h3>
                
                <div className="mb-3">
                  <p className="text-xs text-gray-400">ID</p>
                  <p className="text-sm text-white">{agency.id}</p>
                </div>
                
                <div className="mb-3">
                  <p className="text-xs text-gray-400">Slug</p>
                  <p className="text-sm text-white">{agency.slug}</p>
                </div>
                
                {cfrReferencesText && (
                  <div>
                    <p className="text-xs text-gray-400">CFR References</p>
                    <p className="text-sm text-white">{cfrReferencesText}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Latest Metrics Section */}
        <div className="bg-[#1e2538] rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Latest Metrics</h2>
            {latestMetrics && (
              <div className="text-sm text-gray-400">
                As of {formatDate(latestMetrics.metrics_date)}
              </div>
            )}
          </div>
          
          {!latestMetrics ? (
            <div className="text-center py-8 text-gray-400">
              No metrics data available for this agency
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Document Structure Metrics */}
              <div className="bg-[#232939] rounded-lg p-4">
                <h3 className="text-gray-300 text-sm font-medium mb-3 border-b border-gray-700 pb-2">Document Structure</h3>
                
                <div className="mb-3">
                  <p className="text-xs text-gray-400">Word Count</p>
                  <p className="text-xl font-bold text-white">{latestMetrics.word_count.toLocaleString()}</p>
                </div>
                
                <div className="mb-3">
                  <p className="text-xs text-gray-400">Paragraph Count</p>
                  <p className="text-xl font-bold text-white">{latestMetrics.paragraph_count.toLocaleString()}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-400">Sentence Count</p>
                  <p className="text-xl font-bold text-white">{latestMetrics.sentence_count.toLocaleString()}</p>
                </div>
              </div>
              
              {/* Readability Metrics */}
              <div className="bg-[#232939] rounded-lg p-4">
                <h3 className="text-gray-300 text-sm font-medium mb-3 border-b border-gray-700 pb-2">Readability</h3>
                
                <div className="mb-3">
                  <p className="text-xs text-gray-400">Readability Score</p>
                  <p className="text-xl font-bold text-white">{latestMetrics.readability_score.toFixed(2)}</p>
                </div>
                
                <div className="mb-3">
                  <p className="text-xs text-gray-400">Simplicity Score</p>
                  <p className="text-xl font-bold text-white">{latestMetrics.simplicity_score.toFixed(2)}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-400">Language Complexity</p>
                  <p className="text-xl font-bold text-white">{latestMetrics.language_complexity_score.toFixed(2)}</p>
                </div>
              </div>
              
              {/* Section Metrics */}
              <div className="bg-[#232939] rounded-lg p-4">
                <h3 className="text-gray-300 text-sm font-medium mb-3 border-b border-gray-700 pb-2">Document Sections</h3>
                
                <div className="mb-3">
                  <p className="text-xs text-gray-400">Section Count</p>
                  <p className="text-xl font-bold text-white">{latestMetrics.section_count.toLocaleString()}</p>
                </div>
                
                {latestMetrics.average_sentence_length && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-400">Avg. Sentence Length</p>
                    <p className="text-xl font-bold text-white">{latestMetrics.average_sentence_length.toFixed(1)} words</p>
                  </div>
                )}
                
                {latestMetrics.average_word_length && (
                  <div>
                    <p className="text-xs text-gray-400">Avg. Word Length</p>
                    <p className="text-xl font-bold text-white">{latestMetrics.average_word_length.toFixed(1)} chars</p>
                  </div>
                )}
              </div>
              
              {/* Visual Representation */}
              <div className="bg-[#232939] rounded-lg p-4">
                <h3 className="text-gray-300 text-sm font-medium mb-3 border-b border-gray-700 pb-2">Complexity Rating</h3>
                
                <div className="flex flex-col items-center justify-center h-full">
                  {/* Circular gauge for readability */}
                  <div className="relative w-32 h-32">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      {/* Background circle */}
                      <circle 
                        cx="50" cy="50" r="45" 
                        fill="transparent" 
                        stroke="#374151" 
                        strokeWidth="10" 
                      />
                      
                      {/* Foreground circle - calculate stroke-dasharray based on score */}
                      <circle 
                        cx="50" cy="50" r="45" 
                        fill="transparent" 
                        stroke={
                          latestMetrics.readability_score > 80 ? "#10B981" : 
                          latestMetrics.readability_score > 60 ? "#3B82F6" : 
                          latestMetrics.readability_score > 40 ? "#F59E0B" : 
                          "#EF4444"
                        } 
                        strokeWidth="10" 
                        strokeDasharray={`${latestMetrics.readability_score * 2.83} 283`} 
                        strokeDashoffset="0" 
                        strokeLinecap="round" 
                        transform="rotate(-90 50 50)" 
                      />
                      
                      {/* Score text */}
                      <text 
                        x="50" y="50" 
                        dominantBaseline="middle" 
                        textAnchor="middle" 
                        fontSize="20" 
                        fontWeight="bold" 
                        fill="white"
                      >
                        {Math.round(latestMetrics.readability_score)}
                      </text>
                      <text 
                        x="50" y="65" 
                        dominantBaseline="middle" 
                        textAnchor="middle" 
                        fontSize="10" 
                        fill="#9CA3AF"
                      >
                        Readability
                      </text>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Historical Metrics Section */}
        {aggregatedMetrics.length > 0 && (
          <div className="bg-[#1e2538] rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-6">Historical Metrics</h2>
            
            {/* Readability Metrics Chart (Combined) */}
            <div className="mb-8 bg-[#232939] rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-4">Readability Metrics Over Time</h3>
              <div className="h-80">
                <Line data={readabilityChartData} options={readabilityChartOptions} />
              </div>
            </div>
            
            {/* Individual Metric Charts */}
            <div className="space-y-8">
              {metricDefinitions.filter(m => !['readability_score', 'simplicity_score', 'language_complexity_score'].includes(m.id)).map((metric) => (
                <div key={metric.id} className="bg-[#232939] rounded-lg p-6">
                  <h3 className="text-lg font-medium text-white mb-4">{metric.label} Over Time</h3>
                  <div className="h-64">
                    <Line 
                      data={createChartData(metric.id, metric.label, metric.color)} 
                      options={createChartOptions(metric.label)} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default AgencyDetailPage; 