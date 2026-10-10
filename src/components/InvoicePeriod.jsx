import { useCallback, useMemo, useState } from 'react';
import { useTheme } from '../theme.jsx';
import BarChart from '../charts/BarChart.jsx';
import BillingTable from './BillingTable.jsx';
import { Stat, Delta, Section, Panel, RangeFilter, WarnIcon } from './ui.jsx';
import { change, daysBetween, takeLast } from '../utils/analytics.js';
import { fmtNum3, fmtEur, fmtPrice, fmtDate, fmtDayMonth } from '../utils/format.js';

const unitPrice = (p) => (p?.consumption > 0 ? p.importe / p.consumption : null);

function InvoicePeriod({ supply, period, periods, onSelectPeriod }) {
  const { tokens: t } = useTheme();
  const { invoices, unit, formatQty } = supply;
  const color = t[supply.key];
  const priceUnit = `€/${unit}`;
  const previous = periods[periods.indexOf(period) + 1];
  const invoice = invoices.find((i) => i.numFact === period.numFact);
  const billedDays = daysBetween(period.from, period.to);
  const price = unitPrice(period);
  const [range, setRange] = useState(12);

  const chart = useMemo(() => {
    const chrono = takeLast([...invoices].reverse(), range);
    const barColor = (inv) => (inv.numFact === period.numFact ? t.ink : color);
    // Con más de un año a la vista, el año evita confundir meses repetidos
    const spansYears =
      chrono.length > 1 && daysBetween(chrono[0].fEmision, chrono.at(-1).fEmision) > 365;
    const label = (i) =>
      spansYears ? `${fmtDayMonth(i.fEmision)} ${i.fEmision.slice(2, 4)}` : fmtDayMonth(i.fEmision);
    return {
      chrono,
      labels: chrono.map(label),
      quantities: chrono.map((i) => i.consumo),
      prices: chrono.map((i) => i.pricePerKwh),
      quantityColors: chrono.map(barColor),
      priceColors: chrono.map((i) => (i.isOutlier ? t.warn : barColor(i))),
      hasOutliers: chrono.some((i) => i.isOutlier),
    };
  }, [invoices, range, period.numFact, color, t.ink, t.warn]);

  const invoiceTitle = useCallback(
    (i) => `Factura del ${fmtDate(chart.chrono[i].fEmision)}`,
    [chart],
  );
  const quantityLabel = useCallback(
    (i) => `${formatQty(chart.chrono[i].consumo)} ${unit} · ${fmtEur(chart.chrono[i].importe)} €`,
    [chart, formatQty, unit],
  );
  const priceLabel = useCallback(
    (i) =>
      `${fmtPrice(chart.prices[i])} ${priceUnit}${chart.chrono[i].isOutlier ? ' · revisar' : ''}`,
    [chart, priceUnit],
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
    versusPrevious(price, unitPrice(previous))
  );

  const legend = [
    { label: 'Factura', color },
    { label: 'Seleccionada', color: t.ink },
  ];

  return (
    <div>
      <div className="stats">
        <Stat
          label="Consumo facturado"
          value={formatQty(period.consumption)}
          unit={unit}
          foot={versusPrevious(period.consumption, previous?.consumption)}
        />
        <Stat
          label="Importe"
          value={fmtEur(period.importe)}
          unit="€"
          foot={versusPrevious(period.importe, previous?.importe)}
        />
        <Stat label="Precio medio" value={fmtPrice(price)} unit={priceUnit} foot={priceFoot} />
        <Stat
          label="Consumo por día"
          value={billedDays > 0 ? formatQty(period.consumption / billedDays) : null}
          unit={unit}
          foot={`~${billedDays} días facturados`}
        />
      </div>

      <Section
        num="01"
        title="Facturas"
        note={`Consumo y precio por ${unit} de cada factura, por fecha de emisión. Pulsa una barra para ver esa factura.`}
        aside={<RangeFilter total={invoices.length} value={range} onChange={setRange} />}
      >
        <div className="grid-halves">
          <Panel title="Consumo facturado" legend={legend}>
            <BarChart
              labels={chart.labels}
              values={chart.quantities}
              colors={chart.quantityColors}
              yTitle={unit}
              onSelect={selectInvoice}
              tooltipTitle={invoiceTitle}
              tooltipLabel={quantityLabel}
              short
              ariaLabel="Consumo por factura"
            />
          </Panel>
          <Panel
            title={`Precio medio por ${unit}`}
            legend={[
              ...legend,
              ...(chart.hasOutliers ? [{ label: 'Precio anómalo', color: t.warn }] : []),
            ]}
          >
            <BarChart
              labels={chart.labels}
              values={chart.prices}
              colors={chart.priceColors}
              yTitle={priceUnit}
              yFormat={fmtNum3}
              onSelect={selectInvoice}
              tooltipTitle={invoiceTitle}
              tooltipLabel={priceLabel}
              short
              ariaLabel={`Precio medio por ${unit} de cada factura`}
            />
          </Panel>
        </div>
      </Section>

      <Section num="02" title="Historial de facturas" aside={`${invoices.length} facturas`}>
        <BillingTable invoices={invoices} unit={unit} formatQty={formatQty} maxRows={10} />
      </Section>
    </div>
  );
}

export default InvoicePeriod;
