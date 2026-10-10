const WIDTH = 300;
const PAD = 4;

// Tendencia sin ejes para acompañar a una cifra, no para leer valores
function Sparkline({ values, color = 'var(--entity)', height = 44, label }) {
  const clean = values.filter(Number.isFinite);
  if (clean.length < 2) return null;

  const min = Math.min(...clean);
  const span = Math.max(...clean) - min || 1;
  const x = (i) => PAD + (i / (clean.length - 1)) * (WIDTH - PAD * 2);
  const y = (v) => PAD + (1 - (v - min) / span) * (height - PAD * 2);
  const points = clean.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const lastX = x(clean.length - 1);

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${WIDTH} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      role="img"
      aria-label={label}
    >
      <polygon
        points={`${x(0)},${height} ${points} ${lastX},${height}`}
        fill={color}
        opacity="0.1"
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={lastX}
        cy={y(clean.at(-1))}
        r="3.5"
        fill={color}
        stroke="var(--page)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default Sparkline;
