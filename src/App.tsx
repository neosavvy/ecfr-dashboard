import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BarChart } from './components/BarChart';
import { LineChart } from './components/LineChart';
import { MetricSelector } from './components/MetricSelector';
import { agencyData } from './data/mockData';
import { metrics } from './data/metrics';
import { MetricType } from './types';
import { BarChart as BarChartIcon, LineChart as LineChartIcon } from 'lucide-react';
import naraSeal from './assets/seal.svg.png';
import { Footer } from './components/Footer';

function App() {
  const [selectedAgenciesForTrend, setSelectedAgenciesForTrend] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { metric } = useParams<{ metric: MetricType }>();
  
  // Default to 'wordCount' if no metric in URL or invalid metric
  const selectedMetric = metric && metrics.some(m => m.id === metric) ? metric : 'wordCount';

  useEffect(() => {
    if (!metric || !metrics.some(m => m.id === metric)) {
      navigate('/wordCount', { replace: true });
    }
  }, [metric, navigate]);

  const handleMetricSelect = (newMetric: MetricType) => {
    navigate(`/${newMetric}`);
  };

  const selectedMetricInfo = metrics.find(m => m.id === selectedMetric)!;
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const getAgencyColor = (agencyId: string): string => {
    const index = Array.from(selectedAgenciesForTrend).indexOf(agencyId);
    return index === -1 ? '#64748B' : colors[index % colors.length];
  };

  const barChartData = {
    labels: agencyData.map((agency) => agency.name),
    datasets: [
      {
        label: selectedMetricInfo.name,
        data: agencyData.map((agency) => agency.metrics[selectedMetric]),
        backgroundColor: agencyData.map((agency) => getAgencyColor(agency.id)),
        borderRadius: 6,
      },
    ],
  };

  const lineChartData = {
    labels: agencyData[0].trend.map((point) =>
      new Date(point.date).toLocaleDateString('en-US', { month: 'short' })
    ),
    datasets: Array.from(selectedAgenciesForTrend).map((agencyId, index) => {
      const agency = agencyData.find((a) => a.id === agencyId)!;
      return {
        label: `${agency.name} - ${selectedMetricInfo.name}`,
        data: agency.trend.map((point) => point.metrics[selectedMetric]),
        borderColor: colors[index % colors.length],
        backgroundColor: `${colors[index % colors.length]}19`,
        tension: 0.4,
      };
    }),
  };

  const toggleAgencyTrend = (agencyId: string) => {
    setSelectedAgenciesForTrend((prev) => {
      const next = new Set(prev);
      if (next.has(agencyId)) {
        next.delete(agencyId);
      } else if (next.size < 5) {
        next.add(agencyId);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={naraSeal}
              alt="National Archives Logo"
              className="h-16 w-16"
            />
            <h1 className="text-2xl font-bold">Code of Federal Regulations Analyzer</h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <MetricSelector metrics={metrics} selectedMetric={selectedMetric} onMetricSelect={handleMetricSelect} />
          </div>
        </div>

        <div className="grid gap-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChartIcon className="h-5 w-5 text-blue-500" />
              <h2 className="text-xl font-semibold">{selectedMetricInfo.name} by Agency</h2>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Click on bars to compare historical trends (max 5 agencies)
            </p>
            <BarChart
              data={barChartData}
              onBarClick={(index) => toggleAgencyTrend(agencyData[index].id)}
            />
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <LineChartIcon className="h-5 w-5 text-blue-500" />
              <h2 className="text-xl font-semibold">
                Historical Trends of {selectedMetricInfo.name}
              </h2>
            </div>
            {selectedAgenciesForTrend.size > 0 ? (
              <LineChart data={lineChartData} />
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] bg-gray-900 rounded-lg p-8 text-center">
                <LineChartIcon className="h-16 w-16 text-gray-700 mb-4" />
                <h3 className="text-lg font-semibold text-gray-400 mb-2">No Historical Data Selected</h3>
                <p className="text-gray-500 max-w-md">
                  Click on bars in the chart above to select up to 5 agencies and compare their historical trends.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default App;
