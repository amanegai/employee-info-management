const CARDS = [
  { key: 'OPEN', label: '募集中', variant: 'primary', icon: 'bi-megaphone-fill' },
  { key: 'PARTIALLY_FILLED', label: '一部確定', variant: 'warning', icon: 'bi-person-check-fill' },
  { key: 'FILLED', label: '満員', variant: 'success', icon: 'bi-check-circle-fill' },
  { key: '', label: '全案件', variant: 'neutral', icon: 'bi-briefcase-fill' },
];

export default function ProjectSummaryCards({ counts, loading, activeStatus, onFilterClick }) {
  return (
    <div className="row g-3 mb-4 summary-cards-row project-summary-cards-row">
      {CARDS.map(({ key, label, variant, icon }) => {
        const isActive = activeStatus === key;
        const count = key ? (counts?.[key] ?? 0) : (counts?.total ?? 0);
        return (
          <div key={key || 'all'} className="col-12 col-md-6 col-xl-3">
            <button
              type="button"
              className={`card summary-card summary-card-${variant} summary-card-btn w-100 text-start ${
                isActive ? 'summary-card-active' : ''
              }`}
              onClick={() => onFilterClick(key)}
              disabled={loading}
              aria-pressed={isActive}
              title={`${label}で一覧を絞り込む`}
            >
              <div className="card-body summary-card-body">
                <div className="summary-card-layout">
                  <div className={`summary-card-icon summary-card-icon-${variant}`} aria-hidden="true">
                    <i className={`bi ${icon}`} />
                  </div>
                  <div className="summary-card-content">
                    <div className="summary-card-label">{label}</div>
                    <div className="summary-value">
                      {loading ? '…' : count}
                      <span className="summary-value-unit">件</span>
                    </div>
                    {isActive && <div className="summary-card-active-badge">絞り込み中</div>}
                  </div>
                </div>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
