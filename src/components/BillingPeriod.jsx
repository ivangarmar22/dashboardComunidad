import { useCallback, useMemo } from 'react';
import { useBilling } from '../hooks/useBilling.js';
import { useTheme } from '../theme.jsx';
import BarChart from '../charts/BarChart.jsx';
import BillingTable from './BillingTable.jsx';
import { Stat, Delta, Section, Panel, Legend, WarnIcon } from './ui.jsx';
import { change, daysBetween } from '../utils/analytics.js';
import { fmtNum0, fmtNum3, fmtEur, fmtPrice, fmtDate, fmtDayMonth } from '../utils/format.js';

const pricePerKwh = (p) => (p?.consumption > 0 ? p.importe / p.consumption : null);

// Período de un contrato del que solo hay facturas (sin datos diarios)
function BillingPeriod({ period, periods, onSelectPeriod }) {
  const { tokens: t } = useTheme();
  const billing = useBilling();
  const color = t.comunes;
  const previous = periods[periods.indexOf(period) + 1];
  const invoice = billing.invoices.find((i) => i.numFact === period.numFact);
  const billedDays = daysBetween(period.from, period.to);
  const price = pricePerKwh(period);

  const chart = useMemo(() => {
    const chrono = [...billing.invoices].reverse();
    const barColor = (inv) => (inv.numFact === period.numFact ? t.ink : color);
    return {
      chrono,
      labels: chrono.map((i) => fmtDayMonth(i.fEmision)),
      kwh: chrono.map((i) => i.consumo),
      prices: chrono.map((i) => i.pricePerKwh),
      kwhColors: chrono.map(barColor),
      priceColors: chrono.map((i) => (i.isOutlier ? t.warn : barColor(i))),
      hasOutliers: chrono.some((i) => i.isOutlier),
    };
  }, [billing.invoices, period.numFact, color, t.ink, t.warn]);

  const invoiceTitle = useCallback(
    (i) => `Factura del ${fmtDate(chart.chrono[i].fEmision)}`,
    [chart],
  );
  const kwhLabel = useCallback(
    (i) => `${fmtNum0(chart.chrono[i].consumo)} kWh · ${fmtEur(chart.chrono[i].importe)} €`,
    [chart],
  );
  const priceLabel = useCallback(
    (i) => `${fmtPrice(chart.prices[i])} €/kWh${chart.chrono[i].isOutlier ? ' · revisar' : ''}`,
    [chart],
  );
  const selectInvoice = useCallback(
    (i) => {
      const target = periods.findIndex((p) => p.numFact === chart.chrono[i].numFact);
      if (target >= 0) onSelectPeriod(target);
    },
    [periods, chart, onSelectPeriod],
  );

  const versusPrevious = (current, before) =>
    previous ? <Delta value={change(current, before)} suffix="vs. anterior" /> : null;

  const priceFoot = invoice?.isOutlier ? (
    <span className="price-flag">
      <WarnIcon /> {invoice.priceDeviation > 0 ? 'Muy por encima' : 'Muy por debajo'} de lo habitual
    </span>
  ) : (
    versusPrevious(price, pricePerKwh(previous))
  );

  return (
    <div>
      <div className="stats">
        <Stat
          label="Consumo facturado"
          value={fmtNum0(period.consumption)}
          unit="kWh"
          foot={versusPrevious(period.consumption, previous?.consumption)}
        />
        <Stat
          label="Importe"
          value={fmtEur(period.importe)}
          unit="€"
          foot={versusPrevious(period.importe, previous?.importe)}
        />
        <Stat label="Precio medio" value={fmtPrice(price)} unit="€/kWh" foot={priceFoot} />
        <Stat
          label="Consumo por día"
          value={billedDays > 0 ? fmtNum0(period.consumption / billedDays) : null}
          unit="kWh"
          foot={`~${billedDays} días entre facturas`}
        />
      </div>

      <Section
        num="01"
        title="Facturas"
        note="Consumo y precio por kWh de cada factura, por fecha de emisión. Pulsa una barra para ver esa factura."
      >
        <div className="grid-halves">
          <Panel title="Consumo facturado" refreshing={billing.refreshing}>
            <Legend
              items={[
                { label: 'Factura', color },
                { label: 'Seleccionada', color: t.ink },
              ]}
            />
            <BarChart
              labels={chart.labels}
              values={chart.kwh}
              colors={chart.kwhColors}
              onSelect={selectInvoice}
              tooltipTitle={invoiceTitle}
              tooltipLabel={kwhLabel}
              short
              ariaLabel="Consumo por factura"
            />
          </Panel>
          <Panel title="Precio medio por kWh" refreshing={billing.refreshing}>
            <Legend
              items={[
                { label: 'Factura', color },
                { label: 'Seleccionada', color: t.ink },
                ...(chart.hasOutliers ? [{ label: 'Precio anómalo', color: t.warn }] : []),
              ]}
            />
            <BarChart
              labels={chart.labels}
              values={chart.prices}
              colors={chart.priceColors}
              yTitle="€/kWh"
              yFormat={fmtNum3}
              onSelect={selectInvoice}
              tooltipTitle={invoiceTitle}
              tooltipLabel={priceLabel}
              short
              ariaLabel="Precio medio por kWh de cada factura"
            />
          </Panel>
        </div>
      </Section>

      <Section num="02" title="Historial de facturas">
        <BillingTable invoices={billing.invoices} loading={billing.loading} error={billing.error} />
      </Section>
    </div>
  );
}

export default BillingPeriod;
