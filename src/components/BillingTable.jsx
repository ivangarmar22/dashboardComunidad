import { Fragment, useLayoutEffect, useRef } from 'react';
import { fmtEur, fmtPrice, fmtDate, fmtPct } from '../utils/format.js';
import { averagePrice } from '../utils/analytics.js';
import { Empty, WarnIcon } from './ui.jsx';

const sum = (rows, field) => rows.reduce((total, row) => total + (row[field] || 0), 0);

function OutlierNote({ invoices, unit }) {
  return (
    <div className="table-note">
      <WarnIcon />
      <p>
        {invoices.map((inv, i) => (
          <Fragment key={inv.numFact}>
            {i > 0 && ' '}
            La factura del <strong>{fmtDate(inv.fEmision)}</strong> sale a{' '}
            {fmtPrice(inv.pricePerKwh)}&nbsp;€/{unit}, un {fmtPct(Math.abs(inv.priceDeviation))}{' '}
            {inv.priceDeviation > 0 ? 'más' : 'menos'} de lo habitual.
          </Fragment>
        ))}{' '}
        Puede tratarse de una regularización o de un cargo extra: conviene revisarla.
      </p>
    </div>
  );
}

// Limita la altura a las primeras `maxRows` filas (midiéndolas: en móvil ocupan dos líneas)
function useRowLimit(maxRows, rowCount) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const wrap = ref.current;
    const table = wrap?.querySelector('table');
    if (!table) return undefined;

    const apply = () => {
      if (!maxRows || rowCount <= maxRows) {
        wrap.style.maxHeight = '';
        return;
      }
      const rows = [...table.tBodies[0].rows].slice(0, maxRows);
      const height =
        table.tHead.offsetHeight +
        rows.reduce((total, row) => total + row.offsetHeight, 0) +
        (table.tFoot?.offsetHeight ?? 0);
      wrap.style.maxHeight = `${height}px`;
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(table);
    return () => observer.disconnect();
  }, [maxRows, rowCount]);

  return ref;
}

function BillingTable({ invoices, unit, formatQty, limit, maxRows }) {
  const visibleCount = limit ? Math.min(limit, invoices.length) : invoices.length;
  const wrapRef = useRowLimit(maxRows, visibleCount);

  if (invoices.length === 0) return <Empty>Sin facturas todavía</Empty>;

  const rows = limit ? invoices.slice(0, limit) : invoices;
  const maxImporte = Math.max(...invoices.map((i) => i.importe || 0));
  const totalImporte = sum(rows, 'importe');
  const totalConsumo = sum(rows, 'consumo');
  const outliers = rows.filter((i) => i.isOutlier);
  const scrollable = Boolean(maxRows) && rows.length > maxRows;

  return (
    <>
      <div
        ref={wrapRef}
        className={`table-wrap${scrollable ? ' is-scrollable' : ''}`}
        {...(scrollable && {
          tabIndex: 0,
          role: 'region',
          'aria-label': `Historial de ${rows.length} facturas, desplazable`,
        })}
      >
        <table className="table table-billing">
          <thead>
            <tr>
              <th className="col-date">Emisión</th>
              <th className="col-ref hide-sm">Factura</th>
              <th className="col-kwh is-num">
                Consumo<span className="show-sm-inline"> {unit}</span>
              </th>
              <th className="col-amount is-num">
                Importe<span className="show-sm-inline"> €</span>
              </th>
              <th className="col-bar hide-sm" aria-hidden="true" />
              <th className="col-price is-num">€/{unit}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => (
              <tr key={inv.numFact}>
                <td>
                  {fmtDate(inv.fEmision)}
                  {inv.uso && <span className="cell-sub">{inv.uso}</span>}
                  <span className="cell-sub mono show-sm">{inv.numFact}</span>
                </td>
                <td className="mono muted hide-sm">{inv.numFact}</td>
                <td className="is-num">
                  {inv.consumo == null ? (
                    <span className="muted" title="Consumo pendiente de la factura completa">
                      Pendiente
                    </span>
                  ) : (
                    <>
                      {formatQty(inv.consumo)}
                      <span className="hide-sm"> {unit}</span>
                    </>
                  )}
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
                {formatQty(totalConsumo)}
                <span className="hide-sm"> {unit}</span>
              </td>
              <td className="is-num">
                {fmtEur(totalImporte)}
                <span className="hide-sm"> €</span>
              </td>
              <td className="hide-sm" />
              <td className="is-num">{fmtPrice(averagePrice(rows))}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {scrollable && (
        <p className="table-hint">Desplaza la tabla para ver las {rows.length} facturas</p>
      )}
      {outliers.length > 0 && <OutlierNote invoices={outliers} unit={unit} />}
    </>
  );
}

export default BillingTable;
