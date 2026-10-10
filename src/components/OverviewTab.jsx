import { useCallback, useMemo } from 'react';
import { useConsumption } from '../hooks/useConsumption.js';
import { useBilling } from '../hooks/useBilling.js';
import { useTheme } from '../theme.jsx';
import BarChart from '../charts/BarChart.jsx';
import MonthlyAverageChart from '../charts/MonthlyAverageChart.jsx';
import Sparkline from '../charts/Sparkline.jsx';
import BillingTable from './BillingTable.jsx';
import { Stat, Delta, Section, Panel, Empty } from './ui.jsx';
import {
  summarize,
  change,
  monthlyFromDays,
  invoiceStats,
  daysBetween,
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

function ContractCard({ entity, name, onOpen, children }) {
  return (
    <article className={`contract entity-${entity}`}>
      <header className="contract-head">
        <span className="contract-name">
          <span className="legend-key" style={{ background: 'var(--entity)' }} />
          {name}
        </span>
        <button type="button" className="contract-link" onClick={onOpen}>
          Ver detalle
        </button>
      </header>
      {children}
    </article>
  );
}

function OverviewTab({ onNavigate }) {
  const { tokens: t } = useTheme();
  const portales = useConsumption('portales');
  const billing = useBilling();
  const { invoices } = billing;

  const recent = useMemo(() => portales.data.slice(-WINDOW_DAYS), [portales.data]);
  const before = useMemo(
    () => portales.data.slice(-WINDOW_DAYS * 2, -WINDOW_DAYS),
    [portales.data],
  );
  const recentSummary = useMemo(() => summarize(recent), [recent]);
  const beforeSummary = before.length >= WINDOW_DAYS * 0.8 ? summarize(before) : null;
  const monthly = useMemo(() => monthlyFromDays(portales.data), [portales.data]);

  const [lastInvoice, previousInvoice] = invoices;
  const stats = useMemo(() => invoiceStats(invoices), [invoices]);
  const chrono = useMemo(() => [...invoices].reverse(), [invoices]);
  const invoiceLabels = useMemo(() => chrono.map((i) => fmtDayMonth(i.fEmision)), [chrono]);
  const invoiceKwh = useMemo(() => chrono.map((i) => i.consumo), [chrono]);
  const invoiceTitle = useCallback((i) => `Factura del ${fmtDate(chrono[i].fEmision)}`, [chrono]);
  const invoiceLabel = useCallback(
    (i) => `${fmtNum0(chrono[i].consumo)} kWh · ${fmtEur(chrono[i].importe)} €`,
    [chrono],
  );

  const invoiceDelta = previousInvoice && change(lastInvoice.importe, previousInvoice.importe);
  const portalesDelta = beforeSummary && change(recentSummary.avgKwh, beforeSummary.avgKwh);

  // kWh/día de zonas comunes según facturas frente a los portales
  const comunesPerDay =
    invoices.length > 1
      ? stats.totalConsumo /
        (daysBetween(invoices.at(-1).fEmision, invoices[0].fEmision) + WINDOW_DAYS)
      : null;
  const scaleRatio =
    comunesPerDay && recentSummary?.avgKwh ? comunesPerDay / recentSummary.avgKwh : null;
  const isEmpty = !lastInvoice && !recentSummary && !billing.loading && !portales.loading;

  return (
    <div>
      <div className="page-intro">
        <div className="page-kicker">Resumen</div>
        <h2 className="page-title">Electricidad de la comunidad</h2>
        <p className="lede">
          {lastInvoice && (
            <>
              La última factura de zonas comunes, del{' '}
              <strong>{fmtDate(lastInvoice.fEmision)}</strong>, fue de{' '}
              <strong>{fmtEur(lastInvoice.importe)}&nbsp;€</strong>
              {invoiceDelta != null && (
                <>
                  {' '}
                  ({invoiceDelta < 0 ? 'baja' : 'sube'} un {fmtPct(Math.abs(invoiceDelta))} respecto
                  a la anterior)
                </>
              )}
              .{' '}
            </>
          )}
          {recentSummary && (
            <>
              Los portales gastan <strong>{fmtNum(recentSummary.avgKwh)}&nbsp;kWh al día</strong> de
              media en los últimos {recentSummary.days} días con lectura.
            </>
          )}
          {isEmpty && 'Todavía no hay datos guardados.'}
        </p>
      </div>

      <div className="contracts">
        <ContractCard entity="comunes" name="Zonas comunes" onOpen={() => onNavigate('comunes')}>
          <div className="contract-figures">
            <Stat
              label="Última factura"
              value={lastInvoice && fmtEur(lastInvoice.importe)}
              unit="€"
              loading={billing.loading}
              foot={invoiceDelta != null && <Delta value={invoiceDelta} suffix="vs. anterior" />}
            />
            <Stat
              label="Consumo facturado"
              value={lastInvoice && fmtNum0(lastInvoice.consumo)}
              unit="kWh"
              loading={billing.loading}
              foot={lastInvoice && `${fmtPrice(lastInvoice.pricePerKwh)} €/kWh`}
            />
          </div>
          <Sparkline
            values={chrono.map((i) => i.importe)}
            label="Tendencia del importe de las facturas"
          />
          {stats && (
            <p className="panel-caption">
              {stats.count} facturas · {fmtEur(stats.totalImporte)}&nbsp;€ en total ·{' '}
              {fmtPrice(stats.avgPrice)}&nbsp;€/kWh de media
            </p>
          )}
        </ContractCard>

        <ContractCard entity="portales" name="Portales 1–7" onOpen={() => onNavigate('portales')}>
          <div className="contract-figures">
            <Stat
              label={`Últimos ${recentSummary?.days ?? WINDOW_DAYS} días`}
              value={recentSummary && fmtNum1(recentSummary.totalKwh)}
              unit="kWh"
              loading={portales.loading}
              foot={recent.length > 0 && `hasta el ${fmtDayMonth(recent.at(-1).date)}`}
            />
            <Stat
              label="Media diaria"
              value={recentSummary && fmtNum(recentSummary.avgKwh)}
              unit="kWh"
              loading={portales.loading}
              foot={
                portalesDelta != null && (
                  <Delta value={portalesDelta} suffix={`vs. ${before.length} días previos`} />
                )
              }
            />
          </div>
          <Sparkline
            values={portales.data.slice(-60).map((d) => d.totalKwh)}
            label="Consumo diario de los últimos 60 días"
          />
          {recentSummary?.baseLoadKw != null && (
            <p className="panel-caption">
              Consumo de fondo ~{fmtNum0(recentSummary.baseLoadKw * 1000)}&nbsp;W, el{' '}
              {fmtPct(recentSummary.baseShare)} del total
            </p>
          )}
        </ContractCard>
      </div>

      <Section
        num="01"
        title="Evolución"
        note={
          scaleRatio
            ? `Cada contrato con su propia escala: las zonas comunes consumen unas ${fmtNum0(scaleRatio)} veces más que los portales.`
            : 'Cada contrato con su propia escala, porque sus consumos no son comparables.'
        }
      >
        <div className="grid-halves">
          <Panel
            title="Zonas comunes · kWh por factura"
            refreshing={billing.refreshing}
            className="entity-comunes"
          >
            {chrono.length > 0 ? (
              <BarChart
                labels={invoiceLabels}
                values={invoiceKwh}
                colors={t.comunes}
                tooltipTitle={invoiceTitle}
                tooltipLabel={invoiceLabel}
                short
                ariaLabel="Consumo de zonas comunes por factura"
              />
            ) : (
              <Empty>{billing.loading ? 'Cargando…' : 'Sin facturas'}</Empty>
            )}
          </Panel>
          <Panel
            title="Portales · media diaria por mes"
            refreshing={portales.refreshing}
            className="entity-portales"
          >
            {monthly.length > 0 ? (
              <MonthlyAverageChart monthly={monthly} color={t.portales} />
            ) : (
              <Empty>{portales.loading ? 'Cargando…' : 'Sin datos'}</Empty>
            )}
          </Panel>
        </div>
      </Section>

      <Section
        num="02"
        title="Últimas facturas de zonas comunes"
        aside={stats?.outliers.length > 0 && `${stats.outliers.length} a revisar`}
      >
        <div className="entity-comunes">
          <BillingTable
            invoices={invoices}
            loading={billing.loading}
            error={billing.error}
            limit={6}
          />
        </div>
      </Section>
    </div>
  );
}

export default OverviewTab;
