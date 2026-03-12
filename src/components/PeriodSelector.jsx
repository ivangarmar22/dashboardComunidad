import React, { useState, useEffect } from 'react';
import { fmtNum1, fmtDate } from '../utils/format.js';

const API_BASE = '/api';

function PeriodSelector({ contractKey, onDataLoaded, onLoadingChange }) {
  const [periods, setPeriods] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);
  const [consumptionMean, setConsumptionMean] = useState(null);

  useEffect(() => {
    async function loadPeriods() {
      try {
        setLoading(true);
        setPeriods([]);
        setSelectedIdx(-1);
        const res = await fetch(`${API_BASE}/endesa/${contractKey}/periods`);
        const json = await res.json();
        let periodsData = json.success ? (json.periods || []) : [];

        // Si no hay períodos del scraper, generar desde facturación (solo comunes)
        if (periodsData.length === 0 && contractKey === 'comunes') {
          try {
            const billingRes = await fetch(`${API_BASE}/endesa/billing`);
            const billingJson = await billingRes.json();
            if (billingJson.success && billingJson.data?.length > 0) {
              const invoices = billingJson.data.sort((a, b) => b.fEmision.localeCompare(a.fEmision));
              periodsData = invoices.map((inv, idx) => {
                const to = inv.fEmision;
                const from = idx < invoices.length - 1
                  ? invoices[idx + 1].fEmision
                  : (() => { const d = new Date(inv.fEmision); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; })();
                return {
                  from,
                  to,
                  consumption: inv.consumo,
                  isCurrent: idx === 0,
                  isBilling: true,
                  importe: inv.importe,
                  numFact: inv.numFact,
                };
              });
            }
          } catch { /* ignore billing fallback errors */ }
        }

        const sorted = periodsData.sort((a, b) => {
          if (a.isCurrent && !b.isCurrent) return -1;
          if (!a.isCurrent && b.isCurrent) return 1;
          return b.from.localeCompare(a.from);
        });
        setPeriods(sorted);
        setConsumptionMean(json.consumptionMean);
        if (sorted.length > 0) {
          setSelectedIdx(0);
          // Para períodos de billing, no cargar datos diarios (no existen)
          if (sorted[0].isBilling) {
            onDataLoaded([], sorted[0]);
          } else {
            loadPeriodData(sorted[0]);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadPeriods();
  }, [contractKey]);

  async function loadPeriodData(period) {
    try {
      setLoadingData(true);
      onLoadingChange?.(true);
      setError(null);
      const res = await fetch(`${API_BASE}/endesa/${contractKey}/period`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(period),
      });
      const json = await res.json();
      if (json.success) {
        onDataLoaded(json.data || [], period);
      } else {
        setError(json.error || 'Error cargando datos del período');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingData(false);
      onLoadingChange?.(false);
    }
  }

  function handleSelect(idx) {
    setSelectedIdx(idx);
    const period = periods[idx];
    if (period.isBilling) {
      onDataLoaded([], period);
    } else {
      loadPeriodData(period);
    }
  }

  if (loading) {
    return (
      <div className="period-selector">
        <div className="loading">
          <div className="loading-spinner" />
          Cargando períodos...
        </div>
      </div>
    );
  }

  if (error && periods.length === 0) {
    return (
      <div className="period-selector">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="period-selector">
      <div className="period-selector-header">
        <label>Período de facturación:</label>
        <select
          className="period-dropdown"
          value={selectedIdx}
          onChange={(e) => handleSelect(Number(e.target.value))}
          disabled={loadingData}
        >
          {periods.map((p, idx) => (
            <option key={idx} value={idx}>
              {fmtDate(p.from)} - {fmtDate(p.to)}
              {p.isCurrent ? ' (actual)' : ''}
              {p.consumption != null ? ` - ${fmtNum1(p.consumption)} kWh` : ''}
              {p.importe != null ? ` - ${fmtNum1(p.importe)} €` : ''}
            </option>
          ))}
        </select>
        {loadingData && <div className="loading-spinner period-spinner" />}
      </div>
      {consumptionMean != null && (
        <span className="period-mean">Media por período: {fmtNum1(consumptionMean)} kWh</span>
      )}
      {error && <div className="error-message" style={{ marginTop: 8 }}>{error}</div>}
    </div>
  );
}

export default PeriodSelector;
