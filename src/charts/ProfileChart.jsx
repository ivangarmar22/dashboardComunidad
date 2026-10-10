import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { useTheme } from '../theme.jsx';
import { baseOptions } from './setup.js';
import { fmtHourRange, fmtNum3 } from '../utils/format.js';
import { Legend } from '../components/ui.jsx';

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}h`);

// Perfil horario medio: laborables en el color del contrato, festivos en gris
function ProfileChart({ profile, color }) {
  const { tokens: t } = useTheme();

  const series = useMemo(
    () =>
      [
        profile.laborable && {
          name: 'Laborables',
          legend: `Laborables (${profile.nLaborable} días)`,
          values: profile.laborable,
          color,
        },
        profile.festivo && {
          name: 'Festivos',
          legend: `Fines de semana y festivos (${profile.nFestivo})`,
          values: profile.festivo,
          color: t.neutral,
        },
      ].filter(Boolean),
    [profile, color, t.neutral],
  );

  const data = useMemo(
    () => ({
      labels: HOURS,
      datasets: series.map((s) => ({
        label: s.name,
        data: s.values,
        borderColor: s.color,
        backgroundColor: s.color,
        borderWidth: 2,
        borderCapStyle: 'round',
        borderJoinStyle: 'round',
        cubicInterpolationMode: 'monotone',
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: t.surface,
      })),
    }),
    [series, t.surface],
  );

  const options = useMemo(() => {
    const options = baseOptions(t, {
      yFormat: fmtNum3,
      tooltip: {
        displayColors: true,
        callbacks: {
          title: (items) => fmtHourRange(items[0].dataIndex + 1),
          label: (ctx) => ` ${fmtNum3(ctx.parsed.y)} kWh · ${ctx.dataset.label}`,
        },
      },
    });
    options.scales.y.beginAtZero = false;
    options.scales.x.ticks.autoSkip = false;
    options.scales.x.ticks.callback = (_value, i) => (i % 3 === 0 ? HOURS[i] : '');
    return options;
  }, [t]);

  if (series.length === 0) return null;

  return (
    <>
      <Legend items={series.map((s) => ({ label: s.legend, color: s.color, line: true }))} />
      <div className="chart-box is-short" role="img" aria-label="Perfil horario medio de consumo">
        <Line data={data} options={options} />
      </div>
    </>
  );
}

export default ProfileChart;
