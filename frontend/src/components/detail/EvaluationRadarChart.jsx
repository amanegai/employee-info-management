const MAX_SCORE = 5;
const GRID_LEVELS = [1, 2, 3, 4, 5];
const DOT_RADIUS = 4;
const SCORE_GAP = 11;
const NAME_GAP = 15;
const NAME_NUDGE_BY_CODE = {
  PROJECT: { dx: -8, dy: 0 },
  COMPLIANCE: { dx: 8, dy: 0 },
};

function getNameNudge(code) {
  return NAME_NUDGE_BY_CODE[code] ?? { dx: 0, dy: 0 };
}

function polarPoint(cx, cy, radius, angleRad) {
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function polygonPoints(cx, cy, radius, count, angleOffset = -Math.PI / 2) {
  const step = (Math.PI * 2) / count;
  return Array.from({ length: count }, (_, i) => {
    const { x, y } = polarPoint(cx, cy, radius, angleOffset + i * step);
    return `${x},${y}`;
  }).join(' ');
}

function formatScore(score) {
  return typeof score === 'number' ? score.toFixed(1) : '';
}

function getTextAnchor(angle) {
  const cos = Math.cos(angle);
  if (cos < -0.2) return 'end';
  if (cos > 0.2) return 'start';
  return 'middle';
}

function getLabelRadii(score, maxRadius) {
  const ratio = Math.max(0, Math.min(1, score / MAX_SCORE));
  const dataPointRadius = maxRadius * ratio;
  const scoreRadius = Math.max(maxRadius + 2, dataPointRadius + DOT_RADIUS + SCORE_GAP);
  const nameRadius = scoreRadius + NAME_GAP;
  return { scoreRadius, nameRadius };
}

export default function EvaluationRadarChart({ data, className = '' }) {
  if (!data?.length || data.length < 3) {
    return null;
  }

  const count = data.length;
  const angleStep = (Math.PI * 2) / count;
  const startAngle = -Math.PI / 2;
  const maxRadius = 118;

  const maxLabelChars = Math.max(...data.map((item) => item.label?.length ?? 0), 1);
  const maxNameRadius = Math.max(
    ...data.map((item) => getLabelRadii(item.score, maxRadius).nameRadius),
    maxRadius + 24,
  );
  const edgePad = Math.max(20, Math.min(maxLabelChars * 3.4, 42));
  const size = (maxNameRadius + edgePad) * 2;
  const cx = size / 2;
  const cy = size / 2;

  const valuePoints = data.map((item, i) => {
    const ratio = Math.max(0, Math.min(1, item.score / MAX_SCORE));
    return polarPoint(cx, cy, maxRadius * ratio, startAngle + i * angleStep);
  });
  const valuePolygon = valuePoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <figure
      className={`eval-radar-chart ${className}`.trim()}
      aria-label="評価領域レーダーチャート"
    >
      <svg viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
        <title>評価レーダーチャート</title>
        {GRID_LEVELS.map((level) => (
          <polygon
            key={level}
            points={polygonPoints(cx, cy, (maxRadius * level) / MAX_SCORE, count, startAngle)}
            className="eval-radar-grid"
          />
        ))}
        {data.map((_, i) => {
          const end = polarPoint(cx, cy, maxRadius, startAngle + i * angleStep);
          return (
            <line
              key={`axis-${i}`}
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              className="eval-radar-axis"
            />
          );
        })}
        <polygon points={valuePolygon} className="eval-radar-area" />
        <polyline
          points={`${valuePolygon} ${valuePoints[0].x},${valuePoints[0].y}`}
          className="eval-radar-line"
        />
        {valuePoints.map((point, i) => (
          <circle
            key={`dot-${data[i].code}`}
            cx={point.x}
            cy={point.y}
            r={DOT_RADIUS}
            className="eval-radar-dot"
          />
        ))}
        {data.map((item, i) => {
          const angle = startAngle + i * angleStep;
          const { scoreRadius, nameRadius } = getLabelRadii(item.score, maxRadius);
          const scorePos = polarPoint(cx, cy, scoreRadius, angle);
          const namePos = polarPoint(cx, cy, nameRadius, angle);
          const anchor = getTextAnchor(angle);
          const nameNudge = getNameNudge(item.code);

          return (
            <g key={`label-${item.code}`} className="eval-radar-label-group">
              <text
                x={namePos.x + nameNudge.dx}
                y={namePos.y + nameNudge.dy}
                textAnchor={anchor}
                dominantBaseline="middle"
                className="eval-radar-label eval-radar-label-name"
              >
                {item.label}
              </text>
              <text
                x={scorePos.x}
                y={scorePos.y}
                textAnchor={anchor}
                dominantBaseline="middle"
                className="eval-radar-label eval-radar-label-score"
              >
                {formatScore(item.score)}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
