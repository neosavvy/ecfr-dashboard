import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ChartData } from '../types';
import { metrics } from '../data/metrics';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface BarChartProps {
  data: ChartData;
  onBarClick?: (agencyIndex: number) => void;
}

export function BarChart({ data, onBarClick }: BarChartProps) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        borderColor: 'rgba(75, 85, 99, 0.3)',
        borderWidth: 1,
        displayColors: false,
        callbacks: {
          title: (tooltipItems: any) => tooltipItems[0].label,
          label: (context: any) => [
            context.dataset.label + ': ' + (
              metrics.find(m => m.name === context.dataset.label)?.formatter(context.parsed.y) ||
              context.parsed.y.toLocaleString()
            ),
            '',
            '🖱️ Click to add/remove trend line'
          ],
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
            const metric = metrics.find(m => m.name === data.datasets[0].label);
            return metric ? metric.formatter(value) : value;
          },
        },
      },
    },
    onClick: (_event: any, elements: any[]) => {
      if (elements.length > 0 && onBarClick) {
        onBarClick(elements[0].index);
      }
    },
  };

  return (
    <div className="w-full h-[400px] bg-gray-900 rounded-lg p-4">
      <Bar data={data} options={options} />
    </div>
  );
}