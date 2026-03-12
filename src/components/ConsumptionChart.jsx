import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { fmtNum, fmtDateShort } from '../utils/format.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function ConsumptionChart({ endesaData = [] }) {
  const labels = endesaData.map((d) => d.date).sort();

  if (labels.length === 0) {
    return (
      <div className="chart-container">
        <div className="no-alerts">Sin datos de consumo disponibles</div>
      </div>
    );
  }

  const endesaMap = new Map(endesaData.map((d) => [d.date, d.totalKwh]));
  const datasets = [
    {
      label: 'Electricidad (kWh)',
      data: labels.map((date) => endesaMap.get(date) || null),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 6,
    },
  ];

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { size: 13 } },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f1f5f9',
        bodyColor: '#f1f5f9',
        borderColor: '#334155',
        borderWidth: 1,
        callbacks: {
          title: (items) => {
            if (!items.length) return '';
            return fmtDateShort(items[0].label);
          },
          label: (ctx) => {
            const val = fmtNum(ctx.parsed.y);
            return `${ctx.dataset.label}: ${val}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#94a3b8',
          maxRotation: 45,
          callback: function (val) {
            const label = this.getLabelForValue(val);
            return fmtDateShort(label);
          },
        },
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
        <Line data={{ labels, datasets }} options={options} />
      </div>
    </div>
  );
}

export default ConsumptionChart;
