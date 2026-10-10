import { useMemo } from 'react';
import { useFloatTip } from './ui.jsx';
import { isValleDay } from '../utils/analytics.js';
import { fmtNum3, fmtDateLong, fmtHourRange, parseISODate } from '../utils/format.js';

const HOUR_LABELS = Array.from({ length: 24 }, (_, i) =>
  i % 3 === 0 ? `${String(i).padStart(2, '0')}h` : '',
);

// Una columna por día y una fila por hora; escala de un solo tono (el del contrato)
function Heatmap({ days }) {
  const [tip, showTip, hideTip] = useFloatTip();

  const { min, max } = useMemo(() => {
    const values = days
      .flatMap((d) => d.hourly.map((h) => h.kwh))
      .filter((v) => v > 0)
      .sort((a, b) => a - b);
    if (values.length === 0) return { min: 0, max: 0 };
    // El percentil 98 como máximo evita que un pico aislado aplane el resto
    return { min: values[0], max: values[Math.floor((values.length - 1) * 0.98)] };
  }, [days]);

  if (days.length === 0 || max === 0) return null;

  const labelEvery = days.length > 40 ? 7 : days.length > 20 ? 3 : 1;
  const columns = { gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` };
  const level = (v) => {
    const ratio = Math.min(1, Math.max(0, (v - min) / (max - min || 1)));
    return `${Math.round(6 + ratio * 94)}%`;
  };

  return (
    <div>
      <div
        className="heatmap"
        role="img"
        aria-label={`Consumo por hora de ${days.length} días. El detalle está en la tabla de datos diarios.`}
      >
        <div className="heatmap-hours" aria-hidden="true">
          {HOUR_LABELS.map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>
        <div className="heatmap-grid" style={columns} onMouseLeave={hideTip}>
          {days.map((d) =>
            d.hourly.map((h) => (
              <div
                key={`${d.date}-${h.hour}`}
                className="heat-cell"
                style={{ '--v': level(h.kwh) }}
                onMouseEnter={(event) =>
                  showTip(
                    event,
                    <>
                      <strong>{fmtNum3(h.kwh)} kWh</strong>
                      {fmtDateLong(d.date)} · {fmtHourRange(h.hour)}
                    </>,
                  )
                }
              />
            )),
          )}
        </div>
        <div className="heatmap-days" style={columns} aria-hidden="true">
          {days.map((d, i) => (
            <span
              key={d.date}
              className={labelEvery === 1 && isValleDay(d.date) ? 'is-weekend' : undefined}
            >
              {i % labelEvery === 0 ? parseISODate(d.date).getDate() : ''}
            </span>
          ))}
        </div>
      </div>
      <div className="heat-scale">
        <span>{fmtNum3(min)}</span>
        <span className="heat-scale-bar" aria-hidden="true" />
        <span>{fmtNum3(max)} kWh por hora</span>
        {labelEvery === 1 && (
          <span className="heat-scale-note">Días en negrita: fin de semana o festivo</span>
        )}
      </div>
      {tip}
    </div>
  );
}

export default Heatmap;
