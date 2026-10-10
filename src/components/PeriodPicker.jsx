import { useState } from 'react';
import { fmtRange, fmtRangeShort, fmtNum0, fmtEur } from '../utils/format.js';

const yearOf = (period) => period.to.slice(0, 4);

/**
 * Períodos agrupados por año (como mucho ~12 a la vista) con botones
 * anterior/siguiente. `periods` va del más reciente al más antiguo.
 */
function PeriodPicker({ periods, selected, onSelect }) {
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
              {p.consumption != null ? `${fmtNum0(p.consumption)} kWh` : '—'}
              {p.importe != null && (
                <>
                  <span className="period-sep"> · </span>
                  <span className="period-amount">{fmtEur(p.importe)}&nbsp;€</span>
                </>
              )}
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
