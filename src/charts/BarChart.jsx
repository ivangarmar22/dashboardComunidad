import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { useTheme } from '../theme.jsx';
import { baseOptions, barStyle, referenceLine, backgroundBands, alpha } from './setup.js';
import { fmtNum } from '../utils/format.js';

const PLUGINS = [referenceLine, backgroundBands];

/**
 * Barras de una sola serie. `colors` puede ser un color o uno por barra;
 * `reference` dibuja una línea horizontal y `bands` sombrea categorías del eje X.
 */
function BarChart({
  labels,
  values,
  colors,
  yTitle = 'kWh',
  yFormat = fmtNum,
  tooltipTitle,
  tooltipLabel,
  reference,
  bands,
  onSelect,
  xTickFormat,
  ariaLabel,
  short = false,
}) {
  const { tokens: t } = useTheme();

  const data = useMemo(
    () => ({ labels, datasets: [{ data: values, ...barStyle(colors) }] }),
    [labels, values, colors],
  );

  const options = useMemo(() => {
    const options = baseOptions(t, {
      yFormat,
      tooltip: {
        callbacks: {
          title: (items) => (tooltipTitle ? tooltipTitle(items[0].dataIndex) : items[0]?.label),
          label: (ctx) =>
            tooltipLabel ? tooltipLabel(ctx.dataIndex) : `${yFormat(ctx.parsed.y)} ${yTitle}`,
        },
      },
    });

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
    options.plugins.bands = bands && { indices: bands, color: alpha(t.ink, 0.045) };

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
  }, [t, yTitle, yFormat, tooltipTitle, tooltipLabel, reference, bands, onSelect, xTickFormat]);

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
