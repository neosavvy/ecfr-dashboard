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
  cumulative_word_count: number;
  paragraph_count: number;
  cumulative_paragraph_count: number;
  sentence_count: number;
  cumulative_sentence_count: number;
  section_count: number;
  cumulative_section_count: number;
  avg_language_complexity_score: number;
  avg_readability_score: number;
  avg_simplicity_score: number;
}

// Function to aggregate metrics by year and calculate cumulative totals
const aggregateMetricsByYear = (metrics: AgencyMetric[]): AggregatedMetric[] => {
  // First, group metrics by year and calculate yearly totals/averages
  const yearlyMetrics = metrics.reduce((acc, metric) => {
    const year = new Date(metric.metrics_date).getFullYear();
    
    if (!acc[year]) {
      acc[year] = {
        count: 0,
        word_count: 0,
        paragraph_count: 0,
        sentence_count: 0,
        section_count: 0,
        language_complexity_score: 0,
        readability_score: 0,
        simplicity_score: 0
      };
    }
    
    acc[year].count += 1;
    acc[year].word_count += metric.word_count;
    acc[year].paragraph_count += metric.paragraph_count;
    acc[year].sentence_count += metric.sentence_count;
    acc[year].section_count += metric.section_count;
    acc[year].language_complexity_score += metric.language_complexity_score;
    acc[year].readability_score += metric.readability_score;
    acc[year].simplicity_score += metric.simplicity_score;
    
    return acc;
  }, {} as Record<number, {
    count: number;
    word_count: number;
    paragraph_count: number;
    sentence_count: number;
    section_count: number;
    language_complexity_score: number;
    readability_score: number;
    simplicity_score: number;
  }>);

  // Convert to array and sort by year
  const yearlyArray = Object.entries(yearlyMetrics)
    .map(([year, data]) => ({
      year: parseInt(year),
      word_count: data.word_count,
      paragraph_count: data.paragraph_count,
      sentence_count: data.sentence_count,
      section_count: data.section_count,
      avg_language_complexity_score: Number((data.language_complexity_score / data.count).toFixed(2)),
      avg_readability_score: Number((data.readability_score / data.count).toFixed(2)),
      avg_simplicity_score: Number((data.simplicity_score / data.count).toFixed(2))
    }))
    .sort((a, b) => a.year - b.year);

  // Calculate cumulative totals
  let cumulativeWordCount = 0;
  let cumulativeParagraphCount = 0;
  let cumulativeSentenceCount = 0;
  let cumulativeSectionCount = 0;

  return yearlyArray.map(yearData => ({
    year: yearData.year,
    word_count: yearData.word_count,
    cumulative_word_count: (cumulativeWordCount += yearData.word_count),
    paragraph_count: yearData.paragraph_count,
    cumulative_paragraph_count: (cumulativeParagraphCount += yearData.paragraph_count),
    sentence_count: yearData.sentence_count,
    cumulative_sentence_count: (cumulativeSentenceCount += yearData.sentence_count),
    section_count: yearData.section_count,
    cumulative_section_count: (cumulativeSectionCount += yearData.section_count),
    avg_language_complexity_score: yearData.avg_language_complexity_score,
    avg_readability_score: yearData.avg_readability_score,
    avg_simplicity_score: yearData.avg_simplicity_score
  }));
};

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
        
        // Fetch ALL historical metrics for cumulative calculation
        const { data: metricsData, error: metricsError } = await supabase
          .from('agency_regulation_document_historical_metrics')
          .select('*')
          .eq('agency_id', parseInt(agencyId as string, 10));

        if (metricsError) throw metricsError;

        // Calculate cumulative metrics
        const cumulativeMetrics = metricsData.reduce((acc, curr) => {
          // Get the latest year for reference
          const currYear = new Date(curr.metrics_date).getFullYear();
          if (!acc.year || currYear > acc.year) {
            acc.year = currYear;
          }

          // Sum up all metrics
          acc.word_count = (acc.word_count || 0) + (curr.word_count || 0);
          acc.paragraph_count = (acc.paragraph_count || 0) + (curr.paragraph_count || 0);
          acc.sentence_count = (acc.sentence_count || 0) + (curr.sentence_count || 0);
          acc.section_count = (acc.section_count || 0) + (curr.section_count || 0);
          acc.readability_score = curr.readability_score || acc.readability_score; // Take the latest
          acc.language_complexity_score = curr.language_complexity_score || acc.language_complexity_score; // Take the latest
          acc.simplicity_score = curr.simplicity_score || acc.simplicity_score; // Take the latest

          return acc;
        }, {} as AgencyMetric);

        setAgency(agencyData);
        setLatestMetrics(cumulativeMetrics);
        setHistoricalMetrics(metricsData);
        
        // Aggregate metrics by year
        const aggregated = aggregateMetricsByYear(metricsData);
        console.log('Aggregated metrics:', aggregated);
        setAggregatedMetrics(aggregated);
      } catch (error: any) {
        console.error('Error fetching agency data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    if (agencyId) {
      fetchAgencyData();
    }
  }, [agencyId]);

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
        label: 'Average Readability Score',
        data: aggregatedMetrics.map(m => m.avg_readability_score),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        tension: 0.3,
        yAxisID: 'y',
      },
      {
        label: 'Average Simplicity Score',
        data: aggregatedMetrics.map(m => m.avg_simplicity_score),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        tension: 0.3,
        yAxisID: 'y',
      },
      {
        label: 'Average Language Complexity',
        data: aggregatedMetrics.map(m => m.avg_language_complexity_score),
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
    const isCountMetric = ['word_count', 'paragraph_count', 'sentence_count', 'section_count'].includes(metricId);
    const dataKey = isCountMetric ? `cumulative_${metricId}` : `avg_${metricId.replace('_score', '')}`;
    
    return {
      labels: aggregatedMetrics.map(m => m.year.toString()),
      datasets: [
        {
          label: `${isCountMetric ? 'Cumulative ' : ''}${metricLabel}`,
          data: aggregatedMetrics.map(m => m[dataKey as keyof AggregatedMetric] as number),
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
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  // Get date range string
  const getDateRangeString = (metrics: AgencyMetric[]) => {
    if (!metrics.length) return '';
    
    const dates = metrics.map(m => new Date(m.metrics_date));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    return `${formatDate(minDate.toISOString())} - ${formatDate(maxDate.toISOString())}`;
  };

  // Format CFR references for display with links
  const CfrReferences = () => {
    if (!agency?.cfr_references?.length) return null;
    
    return (
      <div>
        <p className="text-xs text-gray-400 mb-2">CFR References</p>
        <div className="space-y-1">
          {agency.cfr_references.map((ref, index) => (
            <a
              key={index}
              href={`https://www.ecfr.gov/current/title-${ref.title}/chapter-${ref.chapter}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors"
            >
              Title {ref.title}, Chapter {ref.chapter}
            </a>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        </div>
      </div>
    );
  }

  if (error || !agency) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="p-4 text-center text-red-400 bg-[#2a1c24] rounded-md">
          {error || "Agency not found"}
        </div>
      </div>
    );
  }

  // Safe rendering helper functions
  const formatMetricValue = (value: number | undefined | null, decimals = 2) => {
    if (value === undefined || value === null) return 'N/A';
    return typeof value === 'number' ? value.toFixed(decimals) : 'N/A';
  };

  const formatCountValue = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'N/A';
    return typeof value === 'number' ? value.toLocaleString() : 'N/A';
  };

  // Calculate readability score for gauge (with fallback)
  const readabilityScore = latestMetrics?.readability_score ?? 0;
  const readabilityColor = 
    readabilityScore > 80 ? "#10B981" : 
    readabilityScore > 60 ? "#3B82F6" : 
    readabilityScore > 40 ? "#F59E0B" : 
    "#EF4444";

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
                <CfrReferences />
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              <div className="bg-[#1e2538] p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Document Structure</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400">Total Word Count</p>
                    <p className="text-2xl font-bold text-white">{formatCountValue(latestMetrics.word_count)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Paragraph Count</p>
                    <p className="text-2xl font-bold text-white">{formatCountValue(latestMetrics.paragraph_count)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Sentence Count</p>
                    <p className="text-2xl font-bold text-white">{formatCountValue(latestMetrics.sentence_count)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Section Count</p>
                    <p className="text-2xl font-bold text-white">{formatCountValue(latestMetrics.section_count)}</p>
                  </div>
                </div>
              </div>
              
              {/* Readability Metrics */}
              <div className="bg-[#232939] rounded-lg p-4">
                <h3 className="text-gray-300 text-sm font-medium mb-3 border-b border-gray-700 pb-2">Readability</h3>
                
                <div className="mb-3">
                  <p className="text-xs text-gray-400">Readability Score</p>
                  <p className="text-xl font-bold text-white">{formatMetricValue(latestMetrics.readability_score)}</p>
                </div>
                
                <div className="mb-3">
                  <p className="text-xs text-gray-400">Simplicity Score</p>
                  <p className="text-xl font-bold text-white">{formatMetricValue(latestMetrics.simplicity_score)}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-400">Language Complexity</p>
                  <p className="text-xl font-bold text-white">{formatMetricValue(latestMetrics.language_complexity_score)}</p>
                </div>
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
                        stroke={readabilityColor} 
                        strokeWidth="10" 
                        strokeDasharray={`${readabilityScore * 2.83} 283`} 
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
                        {Math.round(readabilityScore)}
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
            
            {/* Individual Metric Charts */}
            <div className="space-y-8">
              {[
                metricDefinitions.find(m => m.id === 'word_count'),
                metricDefinitions.find(m => m.id === 'sentence_count'),
                metricDefinitions.find(m => m.id === 'paragraph_count')
              ].filter(Boolean).map((metric) => (
                <div key={metric!.id} className="bg-[#232939] rounded-lg p-6">
                  <h3 className="text-lg font-medium text-white mb-4">{metric!.label} Over Time</h3>
                  <div className="h-64">
                    <Line 
                      data={createChartData(metric!.id, metric!.label, metric!.color)} 
                      options={createChartOptions(metric!.label)} 
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