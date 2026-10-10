import { useState } from 'react';
import { fmtRange, fmtRangeShort, fmtEur } from '../utils/format.js';

const yearOf = (period) => period.to.slice(0, 4);

/**
 * Períodos agrupados por año (como mucho ~12 a la vista) con botones
 * anterior/siguiente. `periods` va del más reciente al más antiguo.
 */
function PeriodPicker({ periods, selected, onSelect, unit, formatQty }) {
  // Año elegido a mano; sin él se muestra el del período seleccionado
  const [browsedYear, setBrowsedYear] = useState(null);
  if (!periods.length) return null;

  const current = periods[selected];
  const years = [...new Set(periods.map(yearOf))];
  const year = browsedYear ?? (current ? yearOf(current) : years[0]);
  const visible = periods.map((p, idx) => ({ p, idx })).filter(({ p }) => yearOf(p) === year);
  const olderIdx = selected + 1 < periods.length ? selected + 1 : null;
  const newerIdx = selected > 0 ? selected - 1 : null;

  const select = (idx) => {
    setBrowsedYear(null);
    onSelect(idx);
  };
  const optionLabel = (p) =>
    [
      fmtRangeShort(p.from, p.to),
      p.consumption != null && `${formatQty(p.consumption)} ${unit}`,
      p.importe != null && `${fmtEur(p.importe)} €`,
      p.isCurrent && (p.isBilling ? 'última' : 'en curso'),
    ]
      .filter(Boolean)
      .join(' · ');
  const stepLabel = (idx, word) =>
    idx == null
      ? `No hay período ${word}`
      : `Período ${word}: ${fmtRange(periods[idx].from, periods[idx].to)}`;

  return (
    <div className="periods-block">
      <div className="periods-bar">
        {years.length > 1 ? (
          <div className="periods-years" role="group" aria-label="Año">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                className="periods-year"
                aria-pressed={y === year}
                onClick={() => setBrowsedYear(y)}
              >
                {y}
                <span className="periods-year-count">
                  {periods.filter((p) => yearOf(p) === y).length}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <span className="periods-caption">
            {periods.length} {periods.length === 1 ? 'período' : 'períodos'}
          </span>
        )}

        <div className="periods-nav">
          <span className="periods-position">
            {selected + 1} de {periods.length}
          </span>
          <button
            type="button"
            className="periods-step"
            onClick={() => select(olderIdx)}
            disabled={olderIdx == null}
            aria-label={stepLabel(olderIdx, 'anterior')}
          >
            <span aria-hidden="true">←</span> <span className="periods-step-label">Anterior</span>
          </button>
          <button
            type="button"
            className="periods-step"
            onClick={() => select(newerIdx)}
            disabled={newerIdx == null}
            aria-label={stepLabel(newerIdx, 'siguiente')}
          >
            <span className="periods-step-label">Siguiente</span> <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <div className="periods-select">
        {years.length > 1 && (
          <label className="periods-select-field is-year">
            <span className="visually-hidden">Año</span>
            <select
              value={year}
              onChange={(event) =>
                select(periods.findIndex((p) => yearOf(p) === event.target.value))
              }
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="periods-select-field">
          <span className="visually-hidden">Período de facturación</span>
          <select value={selected} onChange={(event) => select(Number(event.target.value))}>
            {visible.map(({ p, idx }) => (
              <option key={`${p.from}-${p.to}`} value={idx}>
                {optionLabel(p)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="periods" role="group" aria-label={`Períodos de ${year}`}>
        {visible.map(({ p, idx }) => (
          <button
            key={`${p.from}-${p.to}`}
            type="button"
            className="period"
            aria-pressed={idx === selected}
            onClick={() => select(idx)}
          >
            <span className="period-range">{fmtRangeShort(p.from, p.to)}</span>
            <span className="period-meta">
              {p.consumption != null ? `${formatQty(p.consumption)} ${unit}` : 'Pendiente'}
              {p.importe != null && ` · ${fmtEur(p.importe)} €`}
            </span>
            {p.isCurrent && (
              <span className="period-tag">{p.isBilling ? 'Última' : 'En curso'}</span>
            )}
          </button>
        ))}
      </div>

      {current && yearOf(current) !== year && (
        <p className="periods-hint">
          Seleccionado: {fmtRange(current.from, current.to)} ({yearOf(current)})
        </p>
      )}
    </div>
  );
}

export default PeriodPicker;
