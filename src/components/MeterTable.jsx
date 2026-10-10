import { fmtEur } from '../utils/format.js';

const pointName = (p) => (p.bloque ? `${p.uso} · bloque ${p.bloque}` : p.uso);
const total = (parts, field) => parts.reduce((sum, p) => sum + (p[field] || 0), 0);

function MeterTable({ parts, uses, unit, formatQty }) {
  const rows = [...parts].sort(
    (a, b) => uses.indexOf(a.uso) - uses.indexOf(b.uso) || (a.bloque ?? 0) - (b.bloque ?? 0),
  );

  return (
    <div className="table-wrap">
      <table className="table table-meters">
        <thead>
          <tr>
            <th>Punto de suministro</th>
            <th className="hide-sm">Contador</th>
            <th className="hide-sm">Factura</th>
            <th className="is-num">
              Consumo<span className="show-sm-inline"> {unit}</span>
            </th>
            <th className="is-num">
              Importe<span className="show-sm-inline"> €</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.numFact}>
              <td>
                {pointName(p)}
                <span className="cell-sub mono show-sm">{p.contador}</span>
              </td>
              <td className="mono muted hide-sm">{p.contador}</td>
              <td className="mono muted hide-sm">{p.numFact}</td>
              <td className="is-num">
                {formatQty(p.consumo)}
                <span className="hide-sm"> {unit}</span>
              </td>
              <td className="is-num">
                <strong>
                  {fmtEur(p.importe)}
                  <span className="hide-sm"> €</span>
                </strong>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="total-label">
              Total<span className="total-count hide-sm">{rows.length} contadores</span>
            </td>
            <td className="hide-sm" />
            <td className="hide-sm" />
            <td className="is-num">
              {formatQty(total(rows, 'consumo'))}
              <span className="hide-sm"> {unit}</span>
            </td>
            <td className="is-num">
              {fmtEur(total(rows, 'importe'))}
              <span className="hide-sm"> €</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default MeterTable;
