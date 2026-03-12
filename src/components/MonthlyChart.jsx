import React from 'react';
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
import { fmtNum } from '../utils/format.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function MonthlyChart({ endesaMonthly = [] }) {
  const labels = endesaMonthly.map((d) => d.month).sort();

  if (labels.length === 0) {
    return (
      <div className="chart-container">
        <div className="no-alerts">Sin datos mensuales disponibles</div>
      </div>
    );
  }

  const map = new Map(endesaMonthly.map((d) => [d.month, d.totalKwh]));
  const datasets = [
    {
      label: 'Electricidad (kWh)',
      data: labels.map((m) => map.get(m) || 0),
      backgroundColor: 'rgba(59, 130, 246, 0.7)',
      borderColor: '#3b82f6',
      borderWidth: 1,
      borderRadius: 6,
    },
  ];

  const monthNames = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
  ];
  const formattedLabels = labels.map((m) => {
    const [year, month] = m.split('-');
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  });

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#94a3b8' } },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f1f5f9',
        bodyColor: '#f1f5f9',
        borderColor: '#334155',
        borderWidth: 1,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${fmtNum(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(51, 65, 85, 0.5)' },
      },
      y: {
        ticks: {
          color: '#94a3b8',
          callback: (val) => fmtNum(val),
        },
        grid: { color: 'rgba(51, 65, 85, 0.5)' },
        title: {
          display: true,
          text: 'kWh',
          color: '#3b82f6',
        },
      },
    },
  };

  return (
    <div className="chart-container">
      <div className="chart-wrapper">
        <Bar data={{ labels: formattedLabels, datasets }} options={options} />
      </div>
    </div>
  );
}

export default MonthlyChart;
