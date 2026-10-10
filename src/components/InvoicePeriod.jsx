import { useCallback, useMemo, useState } from 'react';
import { useTheme } from '../theme.jsx';
import { alpha, mix } from '../charts/setup.js';
import BarChart from '../charts/BarChart.jsx';
import BillingTable from './BillingTable.jsx';
import MeterTable from './MeterTable.jsx';
import { Stat, Delta, Section, Panel, RangeFilter, WarnIcon } from './ui.jsx';
import { change, daysBetween, takeLast } from '../utils/analytics.js';
import { fmtNum0, fmtNum3, fmtEur, fmtPrice, fmtDate, fmtDayMonth } from '../utils/format.js';

const unitPrice = (p) => (p?.consumption > 0 ? p.importe / p.consumption : null);

const sumByUse = (inv, use, field) =>
  inv.parts.filter((p) => p.uso === use).reduce((total, p) => total + (p[field] || 0), 0);

function InvoicePeriod({ supply, period, periods, onSelectPeriod }) {
  const { tokens: t } = useTheme();
  const { invoices, unit, formatQty, grouped, uses } = supply;
  const color = t[supply.key];
  const priceUnit = `€/${unit}`;
  const previous = periods[periods.indexOf(period) + 1];
  const invoice = invoices.find((i) => i.numFact === period.numFact);
  const pending = period.consumption == null;
  const price = unitPrice(period);
  const [range, setRange] = useState(12);

  const useColors = useMemo(
    () => [color, mix(color, t.surface, t.ramp2), mix(color, t.surface, t.ramp3)],
    [color, t.surface, t.ramp2, t.ramp3],
  );

  const chart = useMemo(() => {
    const chrono = takeLast([...invoices].reverse(), range);
    const barColor = (inv) => (inv.numFact === period.numFact ? t.ink : color);
    // Con más de un año a la vista, el año evita confundir meses repetidos
    const spansYears =
      chrono.length > 1 && daysBetween(chrono[0].fEmision, chrono.at(-1).fEmision) > 365;
    const label = (i) =>
      spansYears ? `${fmtDayMonth(i.fEmision)} ${i.fEmision.slice(2, 4)}` : fmtDayMonth(i.fEmision);
    const stacks = (field) =>
      uses?.map((use, i) => ({
        label: use,
        color: useColors[i],
        values: chrono.map((inv) => sumByUse(inv, use, field)),
      }));
    const selected = chrono.findIndex((i) => i.numFact === period.numFact);
    return {
      chrono,
      labels: chrono.map(label),
      quantities: chrono.map((i) => i.consumo),
      prices: chrono.map((i) => i.pricePerKwh),
      colors: chrono.map(barColor),
      priceColors: chrono.map((i) => (i.isOutlier ? t.warn : barColor(i))),
      hasOutliers: chrono.some((i) => i.isOutlier),
      quantityStacks: grouped ? stacks('consumo') : null,
      amountStacks: grouped ? stacks('importe') : null,
      selected: selected >= 0 ? selected : null,
    };
  }, [invoices, range, period.numFact, color, grouped, uses, useColors, t.ink, t.warn]);

  const invoiceTitle = useCallback(
    (i) => `${grouped ? 'Facturas' : 'Factura'} del ${fmtDate(chart.chrono[i].fEmision)}`,
    [chart, grouped],
  );
  const quantityLabel = useCallback(
    (i, stack) => {
      const inv = chart.chrono[i];
      if (grouped) {
        return `${uses[stack]}: ${formatQty(chart.quantityStacks[stack].values[i])} ${unit}`;
      }
      const quantity =
        inv.consumo == null ? 'Consumo pendiente' : `${formatQty(inv.consumo)} ${unit}`;
      return `${quantity} · ${fmtEur(inv.importe)} €`;
    },
    [chart, grouped, uses, formatQty, unit],
  );
  const amountLabel = useCallback(
    (i, stack) => `${uses[stack]}: ${fmtEur(chart.amountStacks[stack].values[i])} €`,
    [chart, uses],
  );
  const totalFooter = useCallback(
    (i) => {
      const inv = chart.chrono[i];
      return `Total: ${formatQty(inv.consumo)} ${unit} · ${fmtEur(inv.importe)} €`;
    },
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

  const legend = grouped
    ? [
        ...uses.map((use, i) => ({ label: use, color: useColors[i] })),
        { label: 'Seleccionado', color: alpha(t.ink, 0.12) },
      ]
    : [
        { label: 'Factura', color },
        { label: 'Seleccionada', color: t.ink },
      ];

  const invoiceCount = invoices.reduce((n, i) => n + (i.parts?.length ?? 1), 0);

  return (
    <div>
      <div className="stats">
        <Stat
          label="Consumo facturado"
          value={formatQty(period.consumption)}
          unit={unit}
          foot={
            pending
              ? 'Pendiente de la factura completa'
              : versusPrevious(period.consumption, previous?.consumption)
          }
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
          value={pending ? null : formatQty(period.consumption / period.days)}
          unit={unit}
          foot={pending ? 'Pendiente de la factura completa' : `${period.days} días facturados`}
        />
      </div>

      <Section
        num="01"
        title="Facturas"
        note={
          grouped
            ? `Consumo e importe de cada período, sumando los ${supply.meters} contadores. Pulsa una barra para ver ese período.`
            : `Consumo y precio por ${unit} de cada factura, por fecha de emisión. Pulsa una barra para ver esa factura.`
        }
        aside={<RangeFilter total={invoices.length} value={range} onChange={setRange} />}
      >
        <div className="grid-halves">
          <Panel title="Consumo facturado" legend={legend}>
            <BarChart
              labels={chart.labels}
              values={chart.quantities}
              colors={chart.colors}
              stacks={chart.quantityStacks}
              highlight={grouped ? chart.selected : null}
              yTitle={unit}
              onSelect={selectInvoice}
              tooltipTitle={invoiceTitle}
              tooltipLabel={quantityLabel}
              tooltipFooter={grouped ? totalFooter : null}
              short
              ariaLabel="Consumo por factura"
            />
          </Panel>
          {grouped ? (
            <Panel title="Importe facturado" legend={legend}>
              <BarChart
                labels={chart.labels}
                stacks={chart.amountStacks}
                highlight={chart.selected}
                yTitle="€"
                yFormat={fmtNum0}
                onSelect={selectInvoice}
                tooltipTitle={invoiceTitle}
                tooltipLabel={amountLabel}
                tooltipFooter={totalFooter}
                short
                ariaLabel="Importe por factura"
              />
            </Panel>
          ) : (
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
          )}
        </div>
      </Section>

      {period.parts && (
        <Section
          num="02"
          title="Contadores"
          note={`Las ${period.parts.length} facturas de este período, una por contador.`}
        >
          <MeterTable parts={period.parts} uses={uses} unit={unit} formatQty={formatQty} />
        </Section>
      )}

      <Section
        num={period.parts ? '03' : '02'}
        title="Historial de facturas"
        aside={
          grouped
            ? `${invoiceCount} facturas en ${invoices.length} períodos`
            : `${invoices.length} facturas`
        }
      >
        <BillingTable invoices={invoices} unit={unit} formatQty={formatQty} maxRows={10} />
      </Section>
    </div>
  );
}

export default InvoicePeriod;
