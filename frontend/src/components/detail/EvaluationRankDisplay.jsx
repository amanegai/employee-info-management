import { parseEvaluation, rankColor } from '../../utils';

/** 一覧評価（S1〜D5）と連動した総合ランク表示 */
export default function EvaluationRankDisplay({ evaluation, rankLabel, size = 'lg' }) {
  const parsed = parseEvaluation(evaluation);
  if (!parsed) return <span className="text-muted">—</span>;

  const badgeCls = size === 'lg' ? 'eval-rank-badge eval-rank-badge-lg' : 'eval-rank-badge';

  return (
    <div className="eval-rank-display">
      <div className="d-flex align-items-center gap-2 flex-wrap">
        <span className={badgeCls} style={{ backgroundColor: rankColor(parsed.grade) }}>
          {parsed.grade}
        </span>
        <span className="eval-rank-full fw-bold">{parsed.full}</span>
        <span className="text-muted">{rankLabel || parsed.rankLabel}</span>
      </div>
      <div className="eval-level-bar mt-2" aria-label={`${parsed.grade}ランク ${parsed.level}段階`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`eval-level-segment ${n <= parsed.level ? 'active' : ''}`}
            style={n <= parsed.level ? { backgroundColor: rankColor(parsed.grade) } : undefined}
            title={`${parsed.grade}${n}`}
          />
        ))}
        <span className="eval-level-text ms-2 small text-muted">
          {parsed.grade}ランク {parsed.level} / 5 段階
        </span>
      </div>
    </div>
  );
}
