import { rankColor } from '../../utils';

export default function RankBadge({ rank, size = 'md' }) {
  if (!rank) return <span className="text-muted">—</span>;
  const letter = rank.charAt(0);
  const cls = size === 'lg' ? 'rank-badge rank-badge-lg' : 'rank-badge';
  return (
    <span className={cls} style={{ backgroundColor: rankColor(letter) }}>
      {letter}
    </span>
  );
}
