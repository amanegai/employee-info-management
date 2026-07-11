import { Link } from 'react-router-dom';

export default function HrOpsBackButton({ to = '/hr-ops', label = '人事業務管理' }) {
  return (
    <Link to={to} className="hr-ops-back-btn">
      <span className="hr-ops-back-btn-icon" aria-hidden="true">
        <i className="bi bi-grid-3x3-gap" />
      </span>
      <span className="hr-ops-back-btn-text">
        <span className="hr-ops-back-btn-label">{label}</span>
        <span className="hr-ops-back-btn-hint">業務一覧に戻る</span>
      </span>
      <i className="bi bi-chevron-left hr-ops-back-btn-arrow" aria-hidden="true" />
    </Link>
  );
}
