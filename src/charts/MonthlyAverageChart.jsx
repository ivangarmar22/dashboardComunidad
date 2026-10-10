import { useCallback, useMemo } from 'react';
import { useTheme } from '../theme.jsx';
import { mix } from './setup.js';
import BarChart from './BarChart.jsx';
import { DataDetails, Legend } from '../components/ui.jsx';
import { fmtNum, fmtNum0, fmtNum1, fmtMonthShort, fmtMonthLong } from '../utils/format.js';

const COLUMNS = [
  { key: 'month', label: 'Mes', render: (r) => fmtMonthLong(r.month) },
  { key: 'days', label: 'Días', num: true },
  { key: 'totalKwh', label: 'kWh', num: true, render: (r) => fmtNum1(r.totalKwh) },
  { key: 'avgKwh', label: 'kWh/día', num: true, render: (r) => fmtNum(r.avgKwh) },
];

// Media diaria por mes: comparable aunque el mes esté incompleto (que va más claro)
function MonthlyAverageChart({ monthly, color, withTable = false }) {
  const { tokens: t } = useTheme();
  const partialColor = mix(color, t.surface, t.ramp3);

  const chart = useMemo(
    () => ({
      labels: monthly.map((m) => fmtMonthShort(m.month)),
      values: monthly.map((m) => m.avgKwh),
      colors: monthly.map((m) => (m.complete ? color : partialColor)),
      hasPartial: monthly.some((m) => !m.complete),
    }),
    [monthly, color, partialColor],
  );
  const title = useCallback((i) => fmtMonthLong(monthly[i].month), [monthly]);
  const label = useCallback(
    (i) => {
      const m = monthly[i];
      const note = m.complete ? '' : ' (incompleto)';
      return [`${fmtNum(m.avgKwh)} kWh/día`, `${fmtNum0(m.totalKwh)} kWh en ${m.days} días${note}`];
    },
    [monthly],
  );

  return (
    <>
      {chart.hasPartial && (
        <Legend
          items={[
            { label: 'Mes completo', color },
            { label: 'Mes incompleto', color: partialColor },
          ]}
        />
      )}
      <BarChart
        labels={chart.labels}
        values={chart.values}
        colors={chart.colors}
        yTitle="kWh/día"
        tooltipTitle={title}
        tooltipLabel={label}
        short
        ariaLabel="Consumo medio diario por mes"
      />
      {withTable && <DataDetails columns={COLUMNS} rows={[...monthly].reverse()} />}
    </>
  );
}

export default MonthlyAverageChart;
