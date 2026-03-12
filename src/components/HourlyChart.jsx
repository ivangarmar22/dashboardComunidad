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
import { fmtNum3, fmtNum, fmtDateShort } from '../utils/format.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function HourlyChart({ data }) {
  if (!data || !data.hourly || data.hourly.length === 0) {
    return (
      <div className="chart-container">
        <div className="no-alerts">Sin datos horarios disponibles</div>
      </div>
    );
  }

  const labels = data.hourly.map((h) => {
    const displayHour = h.hour === 24 ? 0 : h.hour;
    return `${String(displayHour).padStart(2, '0')}:00`;
  });
  const values = data.hourly.map((h) => h.kwh);

  const maxVal = Math.max(...values);
  const colors = values.map((v) => {
    const ratio = v / maxVal;
    if (ratio > 0.8) return '#ef4444';
    if (ratio > 0.5) return '#eab308';
    return '#22c55e';
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: `Consumo horario - ${fmtDateShort(data.date)}`,
        data: values,
        backgroundColor: colors.map((c) => c + '80'),
        borderColor: colors,
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8' },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f1f5f9',
        bodyColor: '#f1f5f9',
        borderColor: '#334155',
        borderWidth: 1,
        callbacks: {
          label: (ctx) => `${fmtNum3(ctx.parsed.y)} kWh`,
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
          callback: (val) => fmtNum3(val),
        },
        grid: { color: 'rgba(51, 65, 85, 0.5)' },
        title: { display: true, text: 'kWh', color: '#94a3b8' },
      },
    },
  };

  return (
    <div className="chart-container">
      <h3>Fecha: {fmtDateShort(data.date)} - Total: {fmtNum(data.totalKwh)} kWh</h3>
      <div className="chart-wrapper">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}

export default HourlyChart;
