import { useCallback, useState } from 'react';
import { fmtPct } from '../utils/format.js';

export function Stat({ label, value, unit, foot, loading = false }) {
  const hasValue = value != null && value !== '--';
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      {loading ? (
        <div className="stat-loading" aria-label="Cargando" />
      ) : (
        <div className="stat-value">
          {value ?? '--'}
          {unit && hasValue && <span className="stat-unit">{unit}</span>}
        </div>
      )}
      {foot && !loading && <div className="stat-foot">{foot}</div>}
    </div>
  );
}

// Flecha y signo además del color; en consumo, bajar es bueno
export function Delta({ value, lowerIsBetter = true, suffix }) {
  if (value == null || !Number.isFinite(value)) return null;
  const flat = Math.abs(value) < 0.01;
  const good = lowerIsBetter ? value < 0 : value > 0;
  const tone = flat ? 'is-flat' : good ? 'is-good' : 'is-bad';
  const arrow = flat ? '→' : value > 0 ? '↑' : '↓';
  return (
    <span className={`delta ${tone}`}>
      <span aria-hidden="true">{arrow}</span>
      {fmtPct(value, { signed: true })}
      {suffix && <span className="delta-suffix">{suffix}</span>}
    </span>
  );
}

export function Section({ num, title, note, aside, children }) {
  return (
    <section className="section">
      <header className="section-head">
        <span className="section-num">{num}</span>
        <h3 className="section-title">{title}</h3>
        {aside ? <span className="section-aside">{aside}</span> : <span />}
        {note && <p className="section-note">{note}</p>}
      </header>
      {children}
    </section>
  );
}

export function Panel({ title, children, refreshing = false, className = '' }) {
  return (
    <div className={`panel ${refreshing ? 'is-refreshing' : ''} ${className}`}>
      {title && <h4 className="panel-title">{title}</h4>}
      {children}
    </div>
  );
}

export function Legend({ items }) {
  return (
    <div className="legend">
      {items.map((item) => (
        <span key={item.label} className="legend-item">
          <span
            className={`legend-key${item.line ? ' is-line' : ''}`}
            style={{ background: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

export function ErrorBox({ children }) {
  return (
    <div className="error-box" role="alert">
      {children}
    </div>
  );
}

// Tabla plegable con los datos del gráfico: ningún valor depende solo del tooltip
export function DataDetails({ columns, rows, label = 'Ver datos' }) {
  return (
    <details className="data-toggle">
      <summary>{label}</summary>
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={c.num ? 'is-num' : undefined}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.key} className={c.num ? 'is-num' : undefined}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// Tooltip para elementos HTML (mapa de calor, barra de periodos)
export function useFloatTip() {
  const [tip, setTip] = useState(null);

  const show = useCallback((event, content) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTip({ x: rect.left + rect.width / 2, y: rect.top, content });
  }, []);
  const hide = useCallback(() => setTip(null), []);

  const element = tip && (
    <div className="float-tip" role="tooltip" style={{ left: tip.x, top: tip.y }}>
      {tip.content}
    </div>
  );

  return [element, show, hide];
}

export function WarnIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.5 15 14H1L8 1.5Z" fill="currentColor" />
      <path d="M8 6v3.6M8 11.4v.1" stroke="#191814" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
