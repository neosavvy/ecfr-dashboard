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
  combined_readability_score: number;
  flesch_reading_ease: number;
  smog_index_score: number;
  automated_readability_score: number;
}

interface AggregatedMetric {
  year: number;
  word_count: number;
  cumulative_word_count: number;
  paragraph_count: number;
  cumulative_paragraph_count: number;
  sentence_count: number;
  cumulative_sentence_count: number;
  avg_combined_readability_score: number;
  avg_flesch_reading_ease: number;
  avg_smog_index_score: number;
  avg_automated_readability_score: number;
}

// Add this helper function at the top level
function generateYearRange(startYear: number, endYear: number): number[] {
  const years = [];
  for (let year = startYear; year <= endYear; year++) {
    years.push(year);
  }
  return years;
}

// Add helper function for readability interpretation
function getReadabilityInterpretation(score: number): { text: string; color: string } {
  if (score >= 90) return { text: 'Very easy to read', color: '#10B981' }; // green
  if (score >= 70) return { text: 'Easy to read', color: '#3B82F6' }; // blue
  if (score >= 50) return { text: 'Fairly difficult', color: '#F59E0B' }; // yellow
  if (score >= 30) return { text: 'Difficult', color: '#EF4444' }; // red
  return { text: 'Very difficult', color: '#991B1B' }; // dark red
}

// Update the aggregateMetricsByYear function
const aggregateMetricsByYear = (metrics: AgencyMetric[]): AggregatedMetric[] => {
  const currentYear = new Date().getFullYear();
  const allYears = generateYearRange(2016, currentYear);
  
  // First, group metrics by year and calculate yearly totals/averages
  const yearlyMetrics = metrics.reduce((acc, metric) => {
    const year = new Date(metric.metrics_date).getFullYear();
    
    if (!acc[year]) {
      acc[year] = {
        count: 0,
        word_count: 0,
        paragraph_count: 0,
        sentence_count: 0,
        combined_readability_score: 0,
        flesch_reading_ease: 0,
        smog_index_score: 0,
        automated_readability_score: 0
      };
    }
    
    acc[year].count += 1;
    acc[year].word_count += metric.word_count || 0;
    acc[year].paragraph_count += metric.paragraph_count || 0;
    acc[year].sentence_count += metric.sentence_count || 0;
    acc[year].combined_readability_score += metric.combined_readability_score || 0;
    acc[year].flesch_reading_ease += metric.flesch_reading_ease || 0;
    acc[year].smog_index_score += metric.smog_index_score || 0;
    acc[year].automated_readability_score += metric.automated_readability_score || 0;
    
    return acc;
  }, {} as Record<number, {
    count: number;
    word_count: number;
    paragraph_count: number;
    sentence_count: number;
    combined_readability_score: number;
    flesch_reading_ease: number;
    smog_index_score: number;
    automated_readability_score: number;
  }>);

  // Initialize running totals
  let cumulativeWordCount = 0;
  let cumulativeParagraphCount = 0;
  let cumulativeSentenceCount = 0;
  let lastReadabilityScore = 0;
  let lastFleschScore = 0;
  let lastSmogScore = 0;
  let lastAutomatedScore = 0;

  // Create continuous data points for all years
  return allYears.map(year => {
    const yearData = yearlyMetrics[year] || {
      count: 0,
      word_count: 0,
      paragraph_count: 0,
      sentence_count: 0,
      combined_readability_score: lastReadabilityScore,
      flesch_reading_ease: lastFleschScore,
      smog_index_score: lastSmogScore,
      automated_readability_score: lastAutomatedScore
    };

    // Update cumulative totals
    cumulativeWordCount += yearData.word_count;
    cumulativeParagraphCount += yearData.paragraph_count;
    cumulativeSentenceCount += yearData.sentence_count;

    // Calculate averages for readability scores when there's data
    const avgCombined = yearData.count > 0 ? yearData.combined_readability_score / yearData.count : lastReadabilityScore;
    const avgFlesch = yearData.count > 0 ? yearData.flesch_reading_ease / yearData.count : lastFleschScore;
    const avgSmog = yearData.count > 0 ? yearData.smog_index_score / yearData.count : lastSmogScore;
    const avgAutomated = yearData.count > 0 ? yearData.automated_readability_score / yearData.count : lastAutomatedScore;

    // Update last known scores
    if (yearData.count > 0) {
      lastReadabilityScore = avgCombined;
      lastFleschScore = avgFlesch;
      lastSmogScore = avgSmog;
      lastAutomatedScore = avgAutomated;
    }

    return {
      year,
      word_count: yearData.word_count,
      cumulative_word_count: cumulativeWordCount,
      paragraph_count: yearData.paragraph_count,
      cumulative_paragraph_count: cumulativeParagraphCount,
      sentence_count: yearData.sentence_count,
      cumulative_sentence_count: cumulativeSentenceCount,
      avg_combined_readability_score: avgCombined,
      avg_flesch_reading_ease: avgFlesch,
      avg_smog_index_score: avgSmog,
      avg_automated_readability_score: avgAutomated
    };
  });
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
        
        if (agencyError) throw agencyError;
        
        // Update the date range to start from 2016
        const { data: metricsData, error: metricsError } = await supabase
          .from('agency_regulation_document_historical_metrics')
          .select('*')
          .eq('agency_id', parseInt(agencyId as string, 10))
          .gte('metrics_date', '2016-01-01')
          .order('metrics_date', { ascending: true });

        if (metricsError) throw metricsError;

        setAgency(agencyData);
        setHistoricalMetrics(metricsData);
        
        // Aggregate metrics with continuous data points
        const aggregated = aggregateMetricsByYear(metricsData);
        console.log('Aggregated metrics with continuous data:', aggregated);
        setAggregatedMetrics(aggregated);

        // Calculate latest cumulative totals
        const latestMetrics = aggregated[aggregated.length - 1];
        setLatestMetrics({
          id: 0,
          agency_id: parseInt(agencyId),
          metrics_date: new Date().toISOString(),
          word_count: latestMetrics.cumulative_word_count,
          paragraph_count: latestMetrics.cumulative_paragraph_count,
          sentence_count: latestMetrics.cumulative_sentence_count,
          combined_readability_score: latestMetrics.avg_combined_readability_score,
          flesch_reading_ease: latestMetrics.avg_flesch_reading_ease,
          smog_index_score: latestMetrics.avg_smog_index_score,
          automated_readability_score: latestMetrics.avg_automated_readability_score
        });

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
    { id: 'word_count', label: 'Word Count', color: 'rgb(99, 102, 241)' },
    { id: 'paragraph_count', label: 'Paragraph Count', color: 'rgb(236, 72, 153)' },
    { id: 'sentence_count', label: 'Sentence Count', color: 'rgb(139, 92, 246)' }
  ];

  // Multi-metric chart data for readability metrics
  const readabilityChartData = {
    labels: aggregatedMetrics.map(m => m.year.toString()),
    datasets: [
      {
        label: 'Combined Score',
        data: aggregatedMetrics.map(m => m.avg_combined_readability_score),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        tension: 0.3,
      },
      {
        label: 'Flesch Reading Ease',
        data: aggregatedMetrics.map(m => m.avg_flesch_reading_ease),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        tension: 0.3,
      },
      {
        label: 'SMOG Index',
        data: aggregatedMetrics.map(m => m.avg_smog_index_score),
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.5)',
        tension: 0.3,
      },
      {
        label: 'Automated Readability Index',
        data: aggregatedMetrics.map(m => m.avg_automated_readability_score),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
        tension: 0.3,
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
    const isCountMetric = ['word_count', 'paragraph_count', 'sentence_count'].includes(metricId);
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
  const readabilityScore = latestMetrics?.combined_readability_score ?? 0;
  const { color: readabilityColor } = getReadabilityInterpretation(readabilityScore);

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
                    <p className="text-sm text-gray-400">Total Sentence Count</p>
                    <p className="text-2xl font-bold text-white">{formatCountValue(latestMetrics.sentence_count)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Paragraph Count</p>
                    <p className="text-2xl font-bold text-white">{formatCountValue(latestMetrics.paragraph_count)}</p>
                  </div>
                </div>
              </div>
              
              {/* Readability Metrics */}
              <div className="bg-[#232939] rounded-lg p-6">
                <h3 className="text-gray-300 text-sm font-medium mb-4 border-b border-gray-700 pb-2">Readability Scores</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <p className="text-sm text-gray-400">Combined Score</p>
                      <p className="text-xs text-gray-500">{getReadabilityInterpretation(latestMetrics?.combined_readability_score || 0).text}</p>
                    </div>
                    <p className="text-xl font-bold text-white">{formatMetricValue(latestMetrics?.combined_readability_score)}</p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <p className="text-sm text-gray-400">Flesch Reading Ease</p>
                      <p className="text-xs text-gray-500">{getReadabilityInterpretation(latestMetrics?.flesch_reading_ease || 0).text}</p>
                    </div>
                    <p className="text-xl font-bold text-white">{formatMetricValue(latestMetrics?.flesch_reading_ease)}</p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <p className="text-sm text-gray-400">SMOG Index</p>
                      <p className="text-xs text-gray-500">Grade level</p>
                    </div>
                    <p className="text-xl font-bold text-white">{formatMetricValue(latestMetrics?.smog_index_score)}</p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <p className="text-sm text-gray-400">Automated Readability Index</p>
                      <p className="text-xs text-gray-500">Grade level</p>
                    </div>
                    <p className="text-xl font-bold text-white">{formatMetricValue(latestMetrics?.automated_readability_score)}</p>
                  </div>
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