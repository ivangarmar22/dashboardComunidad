import { useState } from 'react';
import { useFetch } from '../hooks/useFetch.js';
import { useConsumption, usePeriodDays } from '../hooks/useConsumption.js';
import { endpoints } from '../api.js';
import PeriodPicker from './PeriodPicker.jsx';
import ConsumptionPeriod from './ConsumptionPeriod.jsx';
import BillingPeriod from './BillingPeriod.jsx';
import { ErrorBox } from './ui.jsx';
import { summarize, previousWindow, change } from '../utils/analytics.js';
import {
  fmtNum,
  fmtNum0,
  fmtNum1,
  fmtEur,
  fmtPrice,
  fmtPct,
  fmtDate,
  fmtRange,
} from '../utils/format.js';

const CONTRACT_INFO = {
  comunes: { title: 'Zonas comunes', kicker: 'Contrato · Zonas comunes' },
  portales: { title: 'Portales 1–7', kicker: 'Contrato · Portales' },
};

const isNoticeable = (diff) => diff != null && Math.abs(diff) >= 0.01;
const moreOrLess = (diff) => `un ${fmtPct(Math.abs(diff))} ${diff < 0 ? 'menos' : 'más'}`;

function BillingLede({ period, previous }) {
  const price = period.consumption > 0 ? period.importe / period.consumption : null;
  const diff = previous ? change(period.importe, previous.importe) : null;
  return (
    <p className="lede">
      La factura emitida el <strong>{fmtDate(period.to)}</strong> fue de{' '}
      <strong>{fmtEur(period.importe)}&nbsp;€</strong> por{' '}
      <strong>{fmtNum0(period.consumption)}&nbsp;kWh</strong>
      {price && <> ({fmtPrice(price)}&nbsp;€/kWh)</>}
      {isNoticeable(diff) && <>, {moreOrLess(diff)} que la anterior</>}.
    </p>
  );
}

function ConsumptionLede({ contractKey, period }) {
  const { days } = usePeriodDays(contractKey, period);
  const history = useConsumption(contractKey);
  const summary = summarize(days);
  if (!summary) return <p className="lede">Período {fmtRange(period.from, period.to)}.</p>;

  const previous = previousWindow(history.data, days[0].date, days.length);
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

function ContractView({ contractKey }) {
  const info = CONTRACT_INFO[contractKey];
  const periodsReq = useFetch(endpoints.periods(contractKey));
  const periods = periodsReq.data?.periods ?? [];
  const [selected, setSelected] = useState(0);
  const period = periods[selected] ?? null;
  const isEmpty = !periodsReq.loading && !periodsReq.error && periods.length === 0;

  return (
    <div className={`entity-${contractKey}`}>
      <div className="page-intro">
        <div className="page-kicker">{info.kicker}</div>
        <h2 className="page-title">{info.title}</h2>
        {periodsReq.loading && <p className="lede">Cargando períodos de facturación…</p>}
        {periodsReq.error && (
          <ErrorBox>No se pudieron cargar los períodos: {periodsReq.error}</ErrorBox>
        )}
        {isEmpty && <p className="lede">Todavía no hay datos para este contrato.</p>}
        {period?.isBilling && <BillingLede period={period} previous={periods[selected + 1]} />}
        {period && !period.isBilling && (
          <ConsumptionLede contractKey={contractKey} period={period} />
        )}
      </div>

      <PeriodPicker periods={periods} selected={selected} onSelect={setSelected} />

      {period?.isBilling && (
        <BillingPeriod period={period} periods={periods} onSelectPeriod={setSelected} />
      )}
      {period && !period.isBilling && (
        <ConsumptionPeriod contractKey={contractKey} period={period} />
      )}
    </div>
  );
}

export default ContractView;
