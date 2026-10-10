import { useMemo, useState } from 'react';
import PeriodPicker from './PeriodPicker.jsx';
import ConsumptionPeriod from './ConsumptionPeriod.jsx';
import InvoicePeriod from './InvoicePeriod.jsx';
import {
  summarize,
  previousWindow,
  change,
  periodsFromInvoices,
  periodsFromDays,
} from '../utils/analytics.js';
import { fmtNum, fmtNum1, fmtEur, fmtPrice, fmtPct, fmtDate, fmtRange } from '../utils/format.js';

const isNoticeable = (diff) => diff != null && Math.abs(diff) >= 0.01;
const moreOrLess = (diff) => `un ${fmtPct(Math.abs(diff))} ${diff < 0 ? 'menos' : 'más'}`;

function InvoiceLede({ supply, period, previous }) {
  const price = period.consumption > 0 ? period.importe / period.consumption : null;
  const diff = previous ? change(period.importe, previous.importe) : null;
  return (
    <p className="lede">
      {period.parts ? `Las ${period.parts.length} facturas emitidas` : 'La factura emitida'} el{' '}
      <strong>{fmtDate(period.emitted)}</strong> {period.parts ? 'suman' : 'fue de'}{' '}
      <strong>{fmtEur(period.importe)}&nbsp;€</strong>
      {period.consumption == null ? (
        ' (consumo pendiente de la factura completa)'
      ) : (
        <>
          {' '}
          por{' '}
          <strong>
            {supply.formatQty(period.consumption)}&nbsp;{supply.unit}
          </strong>
        </>
      )}
      {price && (
        <>
          {' '}
          ({fmtPrice(price)}&nbsp;€/{supply.unit})
        </>
      )}
      {isNoticeable(diff) && (
        <>
          , {moreOrLess(diff)} que {period.parts ? 'en el período anterior' : 'la anterior'}
        </>
      )}
      .
    </p>
  );
}

function ConsumptionLede({ supply, period }) {
  const days = supply.days.filter((d) => d.date >= period.from && d.date <= period.to);
  const summary = summarize(days);
  if (!summary) return <p className="lede">Período {fmtRange(period.from, period.to)}.</p>;

  const previous = previousWindow(supply.days, days[0].date, days.length);
  const previousAvg = previous.length >= days.length * 0.8 ? summarize(previous).avgKwh : null;
  const diff = change(summary.avgKwh, previousAvg);

  return (
    <p className="lede">
      Del {fmtRange(days[0].date, days.at(-1).date)} se han consumido{' '}
      <strong>{fmtNum1(summary.totalKwh)}&nbsp;kWh</strong>, {fmtNum(summary.avgKwh)}&nbsp;kWh al
      día
      {isNoticeable(diff) && (
        <>
          , {moreOrLess(diff)} que en los {previous.length} días anteriores
        </>
      )}
      .
      {summary.baseShare != null && (
        <>
          {' '}
          Cerca del <strong>{fmtPct(summary.baseShare)}</strong> es consumo de fondo, constante a
          cualquier hora.
        </>
      )}
    </p>
  );
}

function SupplyView({ supply }) {
  const periods = useMemo(
    () =>
      supply.kind === 'invoices'
        ? periodsFromInvoices(supply.invoices, { inclusiveDays: supply.inclusiveDays })
        : periodsFromDays(supply.days),
    [supply],
  );
  const [selected, setSelected] = useState(0);
  const period = periods[selected] ?? null;

  return (
    <div className={`entity-${supply.key}`}>
      <div className="page-intro">
        <div className="page-kicker">{supply.kicker}</div>
        <h2 className="page-title">{supply.title}</h2>
        {!period && (
          <p className="lede">Todavía no hay datos. Aparecerán aquí en cuanto se añadan.</p>
        )}
        {period?.isBilling && (
          <InvoiceLede supply={supply} period={period} previous={periods[selected + 1]} />
        )}
        {period && !period.isBilling && <ConsumptionLede supply={supply} period={period} />}
      </div>

      {period && (
        <>
          <PeriodPicker
            periods={periods}
            selected={selected}
            onSelect={setSelected}
            unit={supply.unit}
            formatQty={supply.formatQty}
          />
          {period.isBilling ? (
            <InvoicePeriod
              supply={supply}
              period={period}
              periods={periods}
              onSelectPeriod={setSelected}
            />
          ) : (
            <ConsumptionPeriod supply={supply} period={period} />
          )}
        </>
      )}
    </div>
  );
}

export default SupplyView;
