import { useFloatTip } from './ui.jsx';
import { fmtNum1, fmtPct } from '../utils/format.js';

// Barra apilada al 100 % con rampa del color del contrato (punta = más intenso)
function TariffBreakdown({ breakdown }) {
  const [tip, showTip, hideTip] = useFloatTip();
  if (!breakdown.some((p) => p.kwh > 0)) return null;

  return (
    <div>
      <div className="tariff-bar" onMouseLeave={hideTip}>
        {breakdown
          .filter((p) => p.share > 0)
          .map((p) => (
            <div
              key={p.id}
              className="tariff-seg"
              data-p={p.id}
              style={{ flexGrow: p.share }}
              onMouseEnter={(event) =>
                showTip(
                  event,
                  <>
                    <strong>{fmtPct(p.share)}</strong>
                    {p.label} · {fmtNum1(p.kwh)} kWh
                  </>,
                )
              }
            />
          ))}
      </div>
      <ul className="tariff-list">
        {breakdown.map((p) => (
          <li key={p.id} className="tariff-row">
            <span className="legend-key tariff-seg" data-p={p.id} />
            <span className="tariff-name">
              {p.label} <span className="muted mono">{p.id}</span>
            </span>
            <span className="tariff-value">
              <strong>{fmtPct(p.share)}</strong>{' '}
              <span className="muted">· {fmtNum1(p.kwh)} kWh</span>
            </span>
            <span className="tariff-hours">{p.hours}</span>
          </li>
        ))}
      </ul>
      {tip}
    </div>
  );
}

export default TariffBreakdown;
