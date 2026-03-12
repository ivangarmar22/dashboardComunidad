import React, { useMemo, useState, useCallback } from 'react';
import ServiceCard from './ServiceCard.jsx';
import ConsumptionChart from './ConsumptionChart.jsx';
import HourlyChart from './HourlyChart.jsx';
import MonthlyChart from './MonthlyChart.jsx';
import PeriodSelector from './PeriodSelector.jsx';
import BillingTable from './BillingTable.jsx';
import { useConsumption } from '../hooks/useConsumption.js';
import { useBilling } from '../hooks/useBilling.js';
import { fmtNum } from '../utils/format.js';

function Dashboard({ activeContract }) {
  const [periodData, setPeriodData] = useState([]);
  const [activePeriod, setActivePeriod] = useState(null);
  const [periodLoading, setPeriodLoading] = useState(false);

  const handlePeriodData = useCallback((data, period) => {
    setPeriodData(data);
    setActivePeriod(period);
  }, []);

  const periodTotalKwh = useMemo(
    () => periodData.reduce((s, d) => s + (d.totalKwh || 0), 0),
    [periodData]
  );
  const periodLatest = periodData.length > 0 ? periodData[periodData.length - 1] : null;

  // --- Monthly (último año) ---
  const fullRange = useMemo(() => {
    const today = new Date();
    const yearAgo = new Date(today);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    return {
      start: yearAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
    };
  }, []);
  const endesaFull = useConsumption('endesa', fullRange, 0, activeContract);

  // --- Facturación ---
  const billing = useBilling();

  // Generar datos mensuales: fallback a billing solo para comunes
  const monthlyData = useMemo(() => {
    if (endesaFull.monthly.length > 0) return endesaFull.monthly;
    if (activeContract !== 'comunes') return [];
    if (billing.invoices.length === 0) return [];
    return billing.invoices.map((inv) => ({
      month: inv.fEmision.substring(0, 7),
      totalKwh: inv.consumo,
    })).sort((a, b) => a.month.localeCompare(b.month));
  }, [endesaFull.monthly, billing.invoices, activeContract]);

  return (
    <div style={{ position: 'relative' }}>
      {periodLoading && (
        <div className="loading-overlay">
          <div className="loading-overlay-content">
            <div className="loading-spinner loading-spinner-lg" />
            <span>Cargando datos del período...</span>
          </div>
        </div>
      )}

      <PeriodSelector
        key={activeContract}
        contractKey={activeContract}
        onDataLoaded={handlePeriodData}
        onLoadingChange={setPeriodLoading}
      />

      <div className="dashboard-grid" style={{ marginTop: 20 }}>
        <ServiceCard
          title="Consumo del período"
          badge="Endesa"
          badgeClass="badge-blue"
          value={activePeriod?.isBilling
            ? fmtNum(activePeriod.consumption)
            : periodTotalKwh > 0 ? fmtNum(periodTotalKwh) : '--'}
          unit="kWh"
          label={activePeriod?.isBilling
            ? `Factura ${activePeriod.numFact}`
            : periodData.length > 0 ? `${periodData.length} días de datos` : 'Selecciona un período'}
          loading={false}
          error={null}
          color="var(--accent-blue)"
        />
        <ServiceCard
          title={activePeriod?.isBilling ? "Importe" : "Media diaria"}
          badge="Período"
          badgeClass="badge-blue"
          value={activePeriod?.isBilling
            ? fmtNum(activePeriod.importe)
            : periodData.length > 0 ? fmtNum(periodTotalKwh / periodData.length) : '--'}
          unit={activePeriod?.isBilling ? "€" : "kWh/día"}
          label={activePeriod ? `${new Date(activePeriod.from).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${new Date(activePeriod.to).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}` : ''}
          loading={false}
          error={null}
          color="var(--accent-blue)"
        />
      </div>

      {periodData.length > 0 && (
        <>
          <h2 className="section-title">Consumo Eléctrico Diario</h2>
          <ConsumptionChart endesaData={periodData} />
          <h2 className="section-title">Consumo por Horas (último día del período)</h2>
          <HourlyChart data={periodLatest} />
        </>
      )}

      <h2 className="section-title">Evolución Mensual</h2>
      <MonthlyChart endesaMonthly={monthlyData} />

      {activeContract === 'comunes' && (
        <>
          <h2 className="section-title">Historial de Facturas</h2>
          <BillingTable invoices={billing.invoices} loading={billing.loading} error={billing.error} />
        </>
      )}
    </div>
  );
}

export default Dashboard;
