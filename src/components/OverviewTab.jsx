import { useCallback, useMemo } from 'react';
import { useTheme } from '../theme.jsx';
import { SUPPLIES } from '../data.js';
import BarChart from '../charts/BarChart.jsx';
import MonthlyAveragePanel from '../charts/MonthlyAveragePanel.jsx';
import Sparkline from '../charts/Sparkline.jsx';
import BillingTable from './BillingTable.jsx';
import { Stat, Delta, Section, Panel, Empty } from './ui.jsx';
import {
  summarize,
  change,
  monthlyFromDays,
  invoiceStats,
  daysBetween,
  lastTwelveMonths,
} from '../utils/analytics.js';
import {
  fmtNum,
  fmtNum0,
  fmtNum1,
  fmtPrice,
  fmtPct,
  fmtEur,
  fmtDate,
  fmtDayMonth,
} from '../utils/format.js';

const WINDOW_DAYS = 30;
const { comunes, portales, agua } = SUPPLIES;
const INVOICE_SUPPLIES = [comunes, agua];

// El resumen enseña como mucho el último año; el histórico completo está en cada vista
const yearOfInvoices = (supply) =>
  lastTwelveMonths([...supply.invoices].reverse(), (i) => i.fEmision);

function SupplyCard({ supply, onOpen, children }) {
  return (
    <article className={`contract entity-${supply.key}`}>
      <header className="contract-head">
        <span className="contract-name">
          <span className="legend-key" style={{ background: 'var(--entity)' }} />
          {supply.title}
        </span>
        <button type="button" className="contract-link" onClick={() => onOpen(supply.key)}>
          Ver detalle
        </button>
      </header>
      {children}
    </article>
  );
}

function InvoiceCard({ supply, onOpen }) {
  const [last, previous] = supply.invoices;
  const stats = invoiceStats(supply.invoices);
  const delta = previous && change(last.importe, previous.importe);

  return (
    <SupplyCard supply={supply} onOpen={onOpen}>
      <div className="contract-figures">
        <Stat
          label="Última factura"
          value={last && fmtEur(last.importe)}
          unit="€"
          foot={delta != null && <Delta value={delta} suffix="vs. anterior" />}
        />
        <Stat
          label="Consumo facturado"
          value={last && supply.formatQty(last.consumo)}
          unit={supply.unit}
          foot={
            last &&
            (last.consumo == null
              ? 'Pendiente de la factura completa'
              : `${fmtPrice(last.pricePerKwh)} €/${supply.unit}`)
          }
        />
      </div>
      {last ? (
        <>
          <Sparkline
            values={yearOfInvoices(supply).map((i) => i.importe)}
            label="Tendencia del importe de las facturas"
          />
          <p className="panel-caption">
            {stats.count} facturas · {fmtEur(stats.totalImporte)}&nbsp;€ en total ·{' '}
            {fmtPrice(stats.avgPrice)}&nbsp;€/{supply.unit} de media
          </p>
        </>
      ) : (
        <p className="panel-caption">Sin facturas todavía.</p>
      )}
    </SupplyCard>
  );
}

function PortalesCard({ recent, before, onOpen }) {
  const summary = summarize(recent);
  const beforeSummary = before.length >= WINDOW_DAYS * 0.8 ? summarize(before) : null;
  const delta = summary && beforeSummary && change(summary.avgKwh, beforeSummary.avgKwh);

  return (
    <SupplyCard supply={portales} onOpen={onOpen}>
      <div className="contract-figures">
        <Stat
          label={`Últimos ${summary?.days ?? WINDOW_DAYS} días`}
          value={summary && fmtNum1(summary.totalKwh)}
          unit="kWh"
          foot={recent.length > 0 && `hasta el ${fmtDayMonth(recent.at(-1).date)}`}
        />
        <Stat
          label="Media diaria"
          value={summary && fmtNum(summary.avgKwh)}
          unit="kWh"
          foot={
            delta != null && <Delta value={delta} suffix={`vs. ${before.length} días previos`} />
          }
        />
      </div>
      <Sparkline
        values={portales.days.slice(-60).map((d) => d.totalKwh)}
        label="Consumo diario de los últimos 60 días"
      />
      {summary?.baseLoadKw != null && (
        <p className="panel-caption">
          Consumo de fondo ~{fmtNum0(summary.baseLoadKw * 1000)}&nbsp;W, el{' '}
          {fmtPct(summary.baseShare)} del total
        </p>
      )}
    </SupplyCard>
  );
}

function InvoiceYearPanel({ supply }) {
  const { tokens: t } = useTheme();
  const chrono = useMemo(() => yearOfInvoices(supply), [supply]);
  const labels = useMemo(() => chrono.map((i) => fmtDayMonth(i.fEmision)), [chrono]);
  const values = useMemo(() => chrono.map((i) => i.consumo), [chrono]);
  const tooltipTitle = useCallback((i) => `Factura del ${fmtDate(chrono[i].fEmision)}`, [chrono]);
  const tooltipLabel = useCallback(
    (i) => `${supply.formatQty(chrono[i].consumo)} ${supply.unit} · ${fmtEur(chrono[i].importe)} €`,
    [chrono, supply],
  );

  return (
    <Panel
      title={`${supply.title} · ${supply.unit} por factura, último año`}
      className={`entity-${supply.key}`}
    >
      {chrono.length > 0 ? (
        <BarChart
          labels={labels}
          values={values}
          colors={t[supply.key]}
          yTitle={supply.unit}
          tooltipTitle={tooltipTitle}
          tooltipLabel={tooltipLabel}
          short
          ariaLabel={`Consumo de ${supply.title.toLowerCase()} por factura`}
        />
      ) : (
        <Empty>Sin facturas todavía</Empty>
      )}
    </Panel>
  );
}

function LastInvoiceText({ supply, label }) {
  const [last, previous] = supply.invoices;
  if (!last) return null;
  const delta = previous && change(last.importe, previous.importe);
  return (
    <>
      La última factura {label}, del <strong>{fmtDate(last.fEmision)}</strong>, fue de{' '}
      <strong>{fmtEur(last.importe)}&nbsp;€</strong>
      {delta != null && (
        <>
          {' '}
          ({delta < 0 ? 'baja' : 'sube'} un {fmtPct(Math.abs(delta))} respecto a la anterior)
        </>
      )}
      .{' '}
    </>
  );
}

function OverviewTab({ onNavigate }) {
  const { tokens: t } = useTheme();
  const recent = useMemo(() => portales.days.slice(-WINDOW_DAYS), []);
  const before = useMemo(() => portales.days.slice(-WINDOW_DAYS * 2, -WINDOW_DAYS), []);
  const recentSummary = useMemo(() => summarize(recent), [recent]);
  const monthly = useMemo(
    () => lastTwelveMonths(monthlyFromDays(portales.days), (m) => m.month),
    [],
  );

  const comunesStats = invoiceStats(comunes.invoices);
  const comunesPerDay =
    comunes.invoices.length > 1
      ? comunesStats.totalConsumo /
        (daysBetween(comunes.invoices.at(-1).fEmision, comunes.invoices[0].fEmision) + WINDOW_DAYS)
      : null;
  const scaleRatio =
    comunesPerDay && recentSummary?.avgKwh ? comunesPerDay / recentSummary.avgKwh : null;

  return (
    <div>
      <div className="page-intro">
        <div className="page-kicker">Resumen</div>
        <h2 className="page-title">Suministros de la comunidad</h2>
        <p className="lede">
          <LastInvoiceText supply={comunes} label="de luz de zonas comunes" />
          <LastInvoiceText supply={agua} label="de agua" />
          {recentSummary && (
            <>
              Los portales gastan <strong>{fmtNum(recentSummary.avgKwh)}&nbsp;kWh al día</strong> de
              media en los {recentSummary.days} días con lectura hasta el{' '}
              {fmtDate(recent.at(-1).date)}.
            </>
          )}
        </p>
      </div>

      <div className="contracts">
        <InvoiceCard supply={comunes} onOpen={onNavigate} />
        <PortalesCard recent={recent} before={before} onOpen={onNavigate} />
        <InvoiceCard supply={agua} onOpen={onNavigate} />
      </div>

      <Section
        num="01"
        title="Evolución"
        note={
          scaleRatio
            ? `Cada suministro con su propia escala: las zonas comunes consumen unas ${fmtNum0(scaleRatio)} veces más luz que los portales.`
            : 'Cada suministro con su propia escala, porque sus consumos no son comparables.'
        }
      >
        <div className="grid-thirds">
          <InvoiceYearPanel supply={comunes} />
          {monthly.length > 0 ? (
            <MonthlyAveragePanel
              title="Portales · kWh/día por mes, último año"
              monthly={monthly}
              color={t.portales}
              className="entity-portales"
            />
          ) : (
            <Panel title="Portales · kWh/día por mes" className="entity-portales">
              <Empty>Sin datos</Empty>
            </Panel>
          )}
          <InvoiceYearPanel supply={agua} />
        </div>
      </Section>

      <Section num="02" title="Últimas facturas">
        {INVOICE_SUPPLIES.filter((s) => s.invoices.length > 0).map((supply) => (
          <div key={supply.key} className={`invoice-group entity-${supply.key}`}>
            <h4 className="invoice-group-title">
              <span className="legend-key" style={{ background: 'var(--entity)' }} />
              {supply.title}
            </h4>
            <BillingTable
              invoices={supply.invoices}
              unit={supply.unit}
              formatQty={supply.formatQty}
              limit={6}
            />
          </div>
        ))}
      </Section>
    </div>
  );
}

export default OverviewTab;
