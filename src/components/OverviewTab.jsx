import React, { useMemo } from 'react';
import ServiceCard from './ServiceCard.jsx';
import MonthlyComparisonChart from './MonthlyComparisonChart.jsx';
import BillingTable from './BillingTable.jsx';
import { useConsumption } from '../hooks/useConsumption.js';
import { useBilling } from '../hooks/useBilling.js';
import { fmtNum } from '../utils/format.js';

function OverviewTab() {
  const defaultRange = useMemo(() => {
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);
    return {
      start: monthAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
    };
  }, []);

  const fullRange = useMemo(() => {
    const today = new Date();
    const yearAgo = new Date(today);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    return {
      start: yearAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
    };
  }, []);

  const portales = useConsumption('endesa', defaultRange, 300000, 'portales');
  const portalesFull = useConsumption('endesa', fullRange, 0, 'portales');
  const billing = useBilling();

  const totalKwhPortales = useMemo(
    () => portales.data.reduce((s, d) => s + (d.totalKwh || 0), 0),
    [portales.data]
  );

  const lastInvoice = billing.invoices.length > 0 ? billing.invoices[0] : null;

  const totalFacturado = useMemo(
    () => billing.invoices.reduce((s, i) => s + (i.importe || 0), 0),
    [billing.invoices]
  );
  const totalConsumoFacturado = useMemo(
    () => billing.invoices.reduce((s, i) => s + (i.consumo || 0), 0),
    [billing.invoices]
  );

  // Monthly de comunes desde billing
  const comunesMonthly = useMemo(() => {
    if (billing.invoices.length === 0) return [];
    return billing.invoices.map((inv) => ({
      month: inv.fEmision.substring(0, 7),
      totalKwh: inv.consumo,
    })).sort((a, b) => a.month.localeCompare(b.month));
  }, [billing.invoices]);

  return (
    <div>
      <div className="dashboard-grid dashboard-grid-3">
        <ServiceCard
          title="Zonas Comunes"
          badge="Última factura"
          badgeClass="badge-blue"
          value={lastInvoice ? fmtNum(lastInvoice.consumo) : '--'}
          unit="kWh"
          label={lastInvoice
            ? `${new Date(lastInvoice.fEmision).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} · ${fmtNum(lastInvoice.importe)} €`
            : 'Sin datos'}
          loading={billing.loading}
          error={billing.error}
          color="var(--accent-blue)"
        />
        <ServiceCard
          title="Portales (1-7)"
          badge="Últimos 30 días"
          badgeClass="badge-blue"
          value={totalKwhPortales > 0 ? fmtNum(totalKwhPortales) : '--'}
          unit="kWh"
          label={portales.data.length > 0
            ? `Media: ${fmtNum(totalKwhPortales / portales.data.length)} kWh/día`
            : 'Sin datos'}
          loading={portales.loading}
          error={portales.error}
          color="var(--accent-blue)"
        />
        <ServiceCard
          title="Total Facturado"
          badge={`${billing.invoices.length} facturas`}
          badgeClass="badge-blue"
          value={totalFacturado > 0 ? fmtNum(totalFacturado) : '--'}
          unit="€"
          label={totalConsumoFacturado > 0
            ? `${fmtNum(totalConsumoFacturado)} kWh consumidos`
            : 'Sin datos'}
          loading={billing.loading}
          error={billing.error}
          color="var(--accent-yellow)"
        />
      </div>

      <h2 className="section-title">Comparativa Mensual</h2>
      <MonthlyComparisonChart
        comunesMonthly={comunesMonthly}
        portalesMonthly={portalesFull.monthly}
      />

      <h2 className="section-title">Últimas Facturas - Zonas Comunes</h2>
      <BillingTable invoices={billing.invoices} loading={billing.loading} error={billing.error} />
    </div>
  );
}

export default OverviewTab;
