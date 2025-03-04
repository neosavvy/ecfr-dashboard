import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ChartData } from '../types';
import { metrics } from '../data/metrics';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface LineChartProps {
  data: ChartData;
}

export function LineChart({ data }: LineChartProps) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#9CA3AF',
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        borderColor: 'rgba(75, 85, 99, 0.3)',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const metricName = context.dataset.label.split(' - ')[1];
            const metric = metrics.find(m => m.name === metricName);
            return metric ? metric.formatter(context.parsed.y) : context.parsed.y.toLocaleString();
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
          color: 'rgba(75, 85, 99, 0.2)',
        },
        ticks: {
          color: '#9CA3AF',
        },
      },
      y: {
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
        },
        ticks: {
          color: '#9CA3AF',
          callback: (value: number) => {
            const metricName = data.datasets[0]?.label.split(' - ')[1];
            const metric = metrics.find(m => m.name === metricName);
            return metric ? metric.formatter(value) : value;
          },
        },
      },
    },
  };

  return (
    <div className="w-full h-[400px] bg-gray-900 rounded-lg p-4">
      <Line data={data} options={options} />
    </div>
  );
}