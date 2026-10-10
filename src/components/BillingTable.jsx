import { Fragment } from 'react';
import { fmtNum0, fmtEur, fmtPrice, fmtDate, fmtPct } from '../utils/format.js';
import { Empty, ErrorBox, WarnIcon } from './ui.jsx';

const sum = (rows, field) => rows.reduce((total, row) => total + (row[field] || 0), 0);

function OutlierNote({ invoices }) {
  return (
    <div className="table-note">
      <WarnIcon />
      <p>
        {invoices.map((inv, i) => (
          <Fragment key={inv.numFact}>
            {i > 0 && ' '}
            La factura del <strong>{fmtDate(inv.fEmision)}</strong> sale a{' '}
            {fmtPrice(inv.pricePerKwh)}&nbsp;€/kWh, un {fmtPct(Math.abs(inv.priceDeviation))}{' '}
            {inv.priceDeviation > 0 ? 'más' : 'menos'} de lo habitual.
          </Fragment>
        ))}{' '}
        Puede tratarse de una regularización o de un cargo extra: conviene revisarla.
      </p>
    </div>
  );
}

function BillingTable({ invoices, loading, error, limit }) {
  if (loading) return <Empty>Cargando facturas…</Empty>;
  if (error) return <ErrorBox>No se pudieron cargar las facturas: {error}</ErrorBox>;
  if (!invoices?.length) return <Empty>Sin facturas disponibles</Empty>;

  const rows = limit ? invoices.slice(0, limit) : invoices;
  const maxImporte = Math.max(...invoices.map((i) => i.importe || 0));
  const totalImporte = sum(rows, 'importe');
  const totalConsumo = sum(rows, 'consumo');
  const outliers = rows.filter((i) => i.isOutlier);

  return (
    <>
      <div className="table-wrap">
        <table className="table table-billing">
          <thead>
            <tr>
              <th className="col-date">Emisión</th>
              <th className="col-ref hide-sm">Factura</th>
              <th className="col-kwh is-num">
                Consumo<span className="show-sm-inline"> kWh</span>
              </th>
              <th className="col-amount is-num">
                Importe<span className="show-sm-inline"> €</span>
              </th>
              <th className="col-bar hide-sm" aria-hidden="true" />
              <th className="col-price is-num">€/kWh</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => (
              <tr key={inv.numFact}>
                <td>
                  {fmtDate(inv.fEmision)}
                  <span className="cell-sub mono show-sm">{inv.numFact}</span>
                </td>
                <td className="mono muted hide-sm">{inv.numFact}</td>
                <td className="is-num">
                  {fmtNum0(inv.consumo)}
                  <span className="hide-sm"> kWh</span>
                </td>
                <td className="is-num">
                  <strong>
                    {fmtEur(inv.importe)}
                    <span className="hide-sm"> €</span>
                  </strong>
                </td>
                <td className="hide-sm" aria-hidden="true">
                  <span
                    className="inline-bar"
                    style={{ width: `${Math.max(3, (inv.importe / maxImporte) * 100)}%` }}
                  />
                </td>
                <td className="is-num">
                  {inv.isOutlier ? (
                    <span
                      className="price-flag"
                      title={`${fmtPct(inv.priceDeviation, { signed: true })} respecto al precio habitual`}
                    >
                      <WarnIcon />
                      {fmtPrice(inv.pricePerKwh)}
                      <span className="visually-hidden"> (precio anómalo)</span>
                    </span>
                  ) : (
                    fmtPrice(inv.pricePerKwh)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="total-label">
                Total<span className="total-count hide-sm">{rows.length} facturas</span>
              </td>
              <td className="hide-sm" />
              <td className="is-num">
                {fmtNum0(totalConsumo)}
                <span className="hide-sm"> kWh</span>
              </td>
              <td className="is-num">
                {fmtEur(totalImporte)}
                <span className="hide-sm"> €</span>
              </td>
              <td className="hide-sm" />
              <td className="is-num">
                {totalConsumo > 0 ? fmtPrice(totalImporte / totalConsumo) : '--'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {outliers.length > 0 && <OutlierNote invoices={outliers} />}
    </>
  );
}

export default BillingTable;
