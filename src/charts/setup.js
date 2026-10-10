import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
} from 'chart.js';
import { fmtNum } from '../utils/format.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip);

const parseHex = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export function alpha(hex, opacity) {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/** Mezcla dos colores; `weight` es la proporción de `a` (0-1) */
export function mix(a, b, weight) {
  const cb = parseHex(b);
  const channels = parseHex(a).map((v, i) => Math.round(v * weight + cb[i] * (1 - weight)));
  return `#${channels.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// Barras finas con el extremo redondeado y la base recta
export function barStyle(color) {
  return {
    backgroundColor: color,
    hoverBackgroundColor: color,
    borderRadius: { topLeft: 4, topRight: 4 },
    borderSkipped: 'bottom',
    maxBarThickness: 24,
    categoryPercentage: 0.8,
    barPercentage: 0.9,
  };
}

export function baseOptions(t, { yFormat = fmtNum, tooltip = {} } = {}) {
  const font = { family: t.fontSans, size: 12 };
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 250 },
    // Hueco arriba para la unidad del eje, que va en horizontal (.chart-unit)
    layout: { padding: { top: 22 } },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      tooltip: {
        backgroundColor: t.surface,
        titleColor: t.muted,
        bodyColor: t.ink,
        borderColor: t.baseline,
        borderWidth: 1,
        cornerRadius: 6,
        padding: 10,
        titleFont: { ...font, weight: 400 },
        bodyFont: { ...font, size: 13, weight: 600 },
        boxWidth: 10,
        boxHeight: 2,
        boxPadding: 6,
        displayColors: false,
        ...tooltip,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: t.baseline },
        ticks: { color: t.muted, font, maxRotation: 0, autoSkipPadding: 12 },
      },
      y: {
        beginAtZero: true,
        grid: { color: t.grid, drawTicks: false },
        border: { display: false },
        ticks: {
          color: t.muted,
          font,
          padding: 6,
          crossAlign: 'far',
          maxTicksLimit: 6,
          callback: (v) => yFormat(v),
        },
      },
    },
  };
}

// Línea horizontal de referencia con etiqueta: options.plugins.referenceLine = { value, label, ... }
export const referenceLine = {
  id: 'referenceLine',
  afterDatasetsDraw(chart, _args, opts) {
    if (opts?.value == null) return;
    const { ctx, chartArea, scales } = chart;
    const y = Math.round(scales.y.getPixelForValue(opts.value)) + 0.5;
    if (y < chartArea.top || y > chartArea.bottom) return;

    ctx.save();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartArea.left, y);
    ctx.lineTo(chartArea.right, y);
    ctx.stroke();

    if (opts.label) {
      ctx.font = `500 11px ${opts.font}`;
      const width = ctx.measureText(opts.label).width + 8;
      ctx.fillStyle = opts.background;
      ctx.fillRect(chartArea.right - width, y - 16, width, 14);
      ctx.fillStyle = opts.color;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(opts.label, chartArea.right - 4, y - 3);
    }
    ctx.restore();
  },
};

// Bandas de fondo en categorías del eje X: options.plugins.bands = { indices: Set, color }
export const backgroundBands = {
  id: 'bands',
  beforeDatasetsDraw(chart, _args, opts) {
    if (!opts?.indices?.size) return;
    const { ctx, chartArea, scales } = chart;
    const step = scales.x.getPixelForValue(1) - scales.x.getPixelForValue(0) || chartArea.width;
    ctx.save();
    ctx.fillStyle = opts.color;
    for (const i of opts.indices) {
      const center = scales.x.getPixelForValue(i);
      ctx.fillRect(center - step / 2, chartArea.top, step, chartArea.bottom - chartArea.top);
    }
    ctx.restore();
  },
};
