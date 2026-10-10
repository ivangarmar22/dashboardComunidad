import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { useTheme } from '../theme.jsx';
import { baseOptions, barStyle, referenceLine, backgroundBands, alpha } from './setup.js';
import { fmtNum } from '../utils/format.js';

const PLUGINS = [referenceLine, backgroundBands];

// En barras apiladas solo se redondea el último tramo con valor de cada barra
const topRadius = (stacks, index) => (ctx) =>
  stacks.slice(index + 1).some((s) => s.values[ctx.dataIndex] > 0)
    ? 0
    : { topLeft: 4, topRight: 4 };

/**
 * Una serie (`values` y `colors`, uno o uno por barra) o varias apiladas (`stacks`).
 * `reference` dibuja una línea horizontal, `bands` sombrea categorías del eje X
 * y `highlight` marca una barra.
 */
function BarChart({
  labels,
  values,
  colors,
  stacks,
  yTitle = 'kWh',
  yFormat = fmtNum,
  tooltipTitle,
  tooltipLabel,
  tooltipFooter,
  reference,
  bands,
  highlight,
  onSelect,
  xTickFormat,
  ariaLabel,
  short = false,
}) {
  const { tokens: t } = useTheme();

  const data = useMemo(
    () => ({
      labels,
      datasets: stacks
        ? stacks.map((s, i) => ({
            label: s.label,
            data: s.values,
            ...barStyle(s.color),
            borderRadius: topRadius(stacks, i),
          }))
        : [{ data: values, ...barStyle(colors) }],
    }),
    [labels, values, colors, stacks],
  );

  const options = useMemo(() => {
    const options = baseOptions(t, {
      yFormat,
      tooltip: {
        callbacks: {
          title: (items) => (tooltipTitle ? tooltipTitle(items[0].dataIndex) : items[0]?.label),
          label: (ctx) =>
            tooltipLabel
              ? tooltipLabel(ctx.dataIndex, ctx.datasetIndex)
              : `${yFormat(ctx.parsed.y)} ${yTitle}`,
          footer: (items) => tooltipFooter?.(items[0].dataIndex),
        },
      },
    });

    if (stacks) {
      options.scales.x.stacked = true;
      options.scales.y.stacked = true;
      Object.assign(options.plugins.tooltip, {
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
        bodyFont: { ...options.plugins.tooltip.bodyFont, weight: 400 },
        footerColor: t.ink,
        footerFont: { ...options.plugins.tooltip.bodyFont, weight: 600 },
        footerMarginTop: 6,
      });
    }

    if (xTickFormat) {
      options.scales.x.ticks.callback = function (value, index) {
        return xTickFormat(index, this.getLabelForValue(value));
      };
    }
    options.plugins.referenceLine = reference && {
      ...reference,
      color: t.ink,
      background: alpha(t.surface, 0.85),
      font: t.fontSans,
    };
    options.plugins.bands =
      highlight != null
        ? { indices: new Set([highlight]), color: alpha(t.ink, 0.08) }
        : bands && { indices: bands, color: alpha(t.ink, 0.045) };

    if (onSelect) {
      options.onClick = (event, elements, chart) => {
        const element =
          elements[0] ??
          chart.getElementsAtEventForMode(event, 'index', { intersect: false }, false)[0];
        if (element) onSelect(element.index);
      };
      options.onHover = (event, elements) => {
        event.native.target.style.cursor = elements.length ? 'pointer' : 'default';
      };
    }
    return options;
  }, [
    t,
    stacks,
    yTitle,
    yFormat,
    tooltipTitle,
    tooltipLabel,
    tooltipFooter,
    reference,
    bands,
    highlight,
    onSelect,
    xTickFormat,
  ]);

  return (
    <div className={`chart-box${short ? ' is-short' : ''}`} role="img" aria-label={ariaLabel}>
      {yTitle && (
        <span className="chart-unit" aria-hidden="true">
          {yTitle}
        </span>
      )}
      <Bar data={data} options={options} plugins={PLUGINS} />
    </div>
  );
}

export default BarChart;
