import { useCallback, useMemo, useState } from 'react';
import { useConsumption, usePeriodDays } from '../hooks/useConsumption.js';
import { useTheme } from '../theme.jsx';
import { mix } from '../charts/setup.js';
import BarChart from '../charts/BarChart.jsx';
import ProfileChart from '../charts/ProfileChart.jsx';
import MonthlyAverageChart from '../charts/MonthlyAverageChart.jsx';
import Heatmap from './Heatmap.jsx';
import TariffBreakdown from './TariffBreakdown.jsx';
import { Stat, Delta, Section, Panel, Legend, Empty, ErrorBox, DataDetails } from './ui.jsx';
import {
  summarize,
  tariffBreakdown,
  tariffPeriod,
  hourlyProfile,
  previousWindow,
  change,
  monthlyFromDays,
  isValleDay,
  TARIFF_PERIODS,
} from '../utils/analytics.js';
import {
  fmtNum,
  fmtNum0,
  fmtNum1,
  fmtNum3,
  fmtPct,
  fmtDayMonth,
  fmtDateLong,
  fmtRange,
  fmtHourRange,
  parseISODate,
} from '../utils/format.js';

const hourMin = (day) => Math.min(...day.hourly.map((h) => h.kwh));
const hourMax = (day) => Math.max(...day.hourly.map((h) => h.kwh));

const DAILY_COLUMNS = [
  { key: 'date', label: 'Día', render: (r) => fmtDateLong(r.date) },
  { key: 'totalKwh', label: 'kWh', num: true, render: (r) => fmtNum3(r.totalKwh) },
  { key: 'min', label: 'Mín. horario', num: true, render: (r) => fmtNum3(hourMin(r)) },
  { key: 'max', label: 'Máx. horario', num: true, render: (r) => fmtNum3(hourMax(r)) },
];

const dayTick = (i, label) => {
  const day = parseISODate(label).getDate();
  return i === 0 || day === 1 ? fmtDayMonth(label) : String(day);
};
const everyThirdTick = (i, label) => (i % 3 === 0 ? label : '');

function ConsumptionPeriod({ contractKey, period }) {
  const { tokens: t } = useTheme();
  const color = t[contractKey];
  const req = usePeriodDays(contractKey, period);
  const history = useConsumption(contractKey);
  const { days } = req;
  const [selectedDate, setSelectedDate] = useState(null);

  const summary = useMemo(() => summarize(days), [days]);
  const breakdown = useMemo(() => tariffBreakdown(days), [days]);
  const profile = useMemo(() => hourlyProfile(days), [days]);
  const monthly = useMemo(() => monthlyFromDays(history.data), [history.data]);
  const previous = useMemo(
    () => (days.length ? previousWindow(history.data, days[0].date, days.length) : []),
    [history.data, days],
  );
  const previousSummary = previous.length >= days.length * 0.8 ? summarize(previous) : null;
  const day = days.find((d) => d.date === selectedDate) ?? days.at(-1);

  const shades = useMemo(
    () => ({
      P1: color,
      P2: mix(color, t.surface, t.ramp2),
      P3: mix(color, t.surface, t.ramp3),
    }),
    [color, t.surface, t.ramp2, t.ramp3],
  );

  const daily = useMemo(
    () => ({
      labels: days.map((d) => d.date),
      values: days.map((d) => d.totalKwh),
      colors: days.map((d) => (d.date === day?.date ? t.ink : color)),
      weekends: new Set(days.flatMap((d, i) => (isValleDay(d.date) ? [i] : []))),
      reference: summary && { value: summary.avgKwh, label: `media ${fmtNum1(summary.avgKwh)}` },
    }),
    [days, day, summary, color, t.ink],
  );
  const selectDay = useCallback((i) => setSelectedDate(days[i]?.date), [days]);
  const dayTitle = useCallback((i) => fmtDateLong(days[i].date), [days]);
  const dayLabel = useCallback((i) => `${fmtNum3(days[i].totalKwh)} kWh`, [days]);

  const hours = useMemo(() => {
    if (!day) return null;
    const periods = day.hourly.map((h) => tariffPeriod(day.date, h.hour));
    return {
      labels: day.hourly.map((h) => `${String(h.hour - 1).padStart(2, '0')}h`),
      values: day.hourly.map((h) => h.kwh),
      colors: periods.map((p) => shades[p]),
      periods,
    };
  }, [day, shades]);
  const hourTitle = useCallback((i) => fmtHourRange(i + 1), []);
  const hourLabel = useCallback(
    (i) => {
      const label = TARIFF_PERIODS.find((p) => p.id === hours.periods[i]).label;
      return `${fmtNum3(hours.values[i])} kWh · ${label}`;
    },
    [hours],
  );

  if (req.loading) return <Empty>Cargando datos del período…</Empty>;
  if (req.error) return <ErrorBox>No se pudieron cargar los datos: {req.error}</ErrorBox>;
  if (!summary) {
    return (
      <Empty>
        No hay lecturas para este período. Endesa publica los datos con 1–2 días de retraso.
      </Empty>
    );
  }

  const avgDelta = previousSummary && change(summary.avgKwh, previousSummary.avgKwh);
  const baseDelta = previousSummary && change(summary.baseLoadKw, previousSummary.baseLoadKw);

  return (
    <div className={req.refreshing ? 'is-refreshing' : undefined}>
      <div className="stats">
        <Stat
          label="Consumo del período"
          value={fmtNum1(summary.totalKwh)}
          unit="kWh"
          foot={`${summary.days} días con lectura · hasta el ${fmtDayMonth(days.at(-1).date)}`}
        />
        <Stat
          label="Media diaria"
          value={fmtNum(summary.avgKwh)}
          unit="kWh"
          foot={
            avgDelta != null ? (
              <Delta value={avgDelta} suffix={`vs. ${previous.length} días previos`} />
            ) : (
              'Sin período previo para comparar'
            )
          }
        />
        <Stat
          label="Consumo de fondo"
          value={summary.baseLoadKw != null ? fmtNum0(summary.baseLoadKw * 1000) : null}
          unit="W"
          foot={
            <>
              {summary.baseShare != null && <span>{fmtPct(summary.baseShare)} del total</span>}
              {baseDelta != null && <Delta value={baseDelta} />}
            </>
          }
        />
        <Stat
          label="Hora de más consumo"
          value={summary.peak ? fmtNum3(summary.peak.kwh) : null}
          unit="kWh"
          foot={
            summary.peak && `${fmtDayMonth(summary.peak.date)}, ${fmtHourRange(summary.peak.hour)}`
          }
        />
      </div>

      <Section
        num="01"
        title="Consumo diario"
        note="La línea marca la media del período y las bandas grises, fines de semana y festivos. Pulsa una barra para ver ese día hora a hora."
        aside={`Máx. ${fmtNum1(summary.maxDay.totalKwh)} kWh el ${fmtDayMonth(summary.maxDay.date)}`}
      >
        <Panel refreshing={req.refreshing}>
          <BarChart
            labels={daily.labels}
            values={daily.values}
            colors={daily.colors}
            reference={daily.reference}
            bands={daily.weekends}
            onSelect={selectDay}
            xTickFormat={dayTick}
            tooltipTitle={dayTitle}
            tooltipLabel={dayLabel}
            ariaLabel={`Consumo diario del ${fmtRange(period.from, period.to)}`}
          />
          <DataDetails
            label="Ver datos diarios"
            columns={DAILY_COLUMNS}
            rows={[...days].reverse()}
          />
        </Panel>
      </Section>

      {hours && (
        <Section
          num="02"
          title="Hora a hora"
          note="Cada barra se colorea según el periodo de la tarifa 2.0TD en que cae."
          aside={
            <>
              {fmtDateLong(day.date)} · <strong>{fmtNum3(day.totalKwh)}&nbsp;kWh</strong>
            </>
          }
        >
          <Panel>
            <Legend
              items={TARIFF_PERIODS.map((p) => ({
                label: `${p.label} (${p.id})`,
                color: shades[p.id],
              }))}
            />
            <BarChart
              labels={hours.labels}
              values={hours.values}
              colors={hours.colors}
              yFormat={fmtNum3}
              xTickFormat={everyThirdTick}
              tooltipTitle={hourTitle}
              tooltipLabel={hourLabel}
              short
              ariaLabel={`Consumo por horas del ${fmtDateLong(day.date)}`}
            />
          </Panel>
        </Section>
      )}

      <Section
        num="03"
        title="Mapa del período"
        note="Cada columna es un día y cada fila una hora: cuanto más intenso el color, más consumo. Así se ven de un vistazo los horarios fijos (alumbrado, motores) y los días anómalos."
      >
        <Panel>
          <Heatmap days={days} />
        </Panel>
      </Section>

      <Section num="04" title="Cómo se reparte el consumo">
        <div className="grid-2">
          <Panel title="Perfil horario medio">
            <ProfileChart profile={profile} color={color} />
          </Panel>
          <Panel title="Por periodos de la tarifa 2.0TD">
            <TariffBreakdown breakdown={breakdown} />
            <p className="panel-caption">
              Periodos de los peajes regulados. El precio de cada uno depende del contrato.
            </p>
          </Panel>
        </div>
      </Section>

      {monthly.length > 1 && (
        <Section
          num="05"
          title="Evolución mensual"
          note="Media de consumo diario de cada mes, para poder comparar también los meses incompletos."
        >
          <Panel refreshing={history.refreshing}>
            <MonthlyAverageChart monthly={monthly} color={color} withTable />
          </Panel>
        </Section>
      )}
    </div>
  );
}

export default ConsumptionPeriod;
