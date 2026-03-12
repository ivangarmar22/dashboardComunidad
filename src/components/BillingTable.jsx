import React from 'react';
import { fmtNum, fmtDate } from '../utils/format.js';

function BillingTable({ invoices, loading, error }) {
  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        Cargando facturas...
      </div>
    );
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!invoices || invoices.length === 0) {
    return <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Sin facturas disponibles</p>;
  }

  const totalImporte = invoices.reduce((s, i) => s + (i.importe || 0), 0);
  const totalConsumo = invoices.reduce((s, i) => s + (i.consumo || 0), 0);

  return (
    <div className="billing-table-wrapper">
      <table className="billing-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>N. Factura</th>
            <th style={{ textAlign: 'center' }}>Consumo</th>
            <th style={{ textAlign: 'right' }}>Importe</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.numFact}>
              <td>{fmtDate(inv.fEmision)}</td>
              <td>{inv.numFact}</td>
              <td style={{ textAlign: 'center' }}>{fmtNum(inv.consumo)} kWh</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtNum(inv.importe)} €</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="2" style={{ fontWeight: 700 }}>Total</td>
            <td style={{ textAlign: 'center', fontWeight: 700 }}>{fmtNum(totalConsumo)} kWh</td>
            <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtNum(totalImporte)} €</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default BillingTable;
