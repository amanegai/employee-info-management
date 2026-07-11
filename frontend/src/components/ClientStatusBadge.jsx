const STATUS_CLASS = {
  契約中: 'client-status-badge client-status-badge--active',
  商談中: 'client-status-badge client-status-badge--negotiating',
  取引停止: 'client-status-badge client-status-badge--suspended',
  新規: 'client-status-badge client-status-badge--new',
};

const RANK_LABELS = {
  S: 'S（最優先）',
  A: 'A（重要顧客）',
  B: 'B（通常）',
  C: 'C（標準）',
  D: 'D（低優先）',
};

const RANK_TONE = {
  S: 'S',
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
};

export default function ClientStatusBadge({ status }) {
  if (!status) return <span className="text-muted">—</span>;
  return <span className={STATUS_CLASS[status] || 'client-status-badge'}>{status}</span>;
}

export function ClientRankBadge({ rank, compact = false }) {
  if (!rank) return <span className="text-muted">—</span>;
  const tone = RANK_TONE[rank] || 'C';
  const label = compact ? rank : RANK_LABELS[rank] || rank;
  return <span className={`client-rank-badge client-rank-badge--${tone}`}>{label}</span>;
}
