const CARDS = [
  { key: '契約中', label: '契約中', variant: 'success', icon: 'bi-check-circle-fill' },
  { key: '商談中', label: '商談中', variant: 'warning', icon: 'bi-chat-dots-fill' },
  { key: '取引停止', label: '取引一時停止', variant: 'danger', icon: 'bi-x-circle-fill' },
  { key: '新規', label: '新規取引先', variant: 'primary', icon: 'bi-person-plus-fill' },
];

export default function ClientSummaryCards({ summary, loading, activeStatus, onFilterClick }) {
  const counts = {
    契約中: summary?.activeContractCount ?? 0,
    商談中: summary?.negotiatingCount ?? 0,
    取引停止: summary?.suspendedCount ?? 0,
    新規: summary?.newCount ?? 0,
  };

  return (
    <div className="row g-3 mb-4 summary-cards-row">
      {CARDS.map(({ key, label, variant, icon }) => {
        const isActive = activeStatus === key;
        return (
          <div key={key} className="col-12 col-md-6 col-xl-3">
            <button
              type="button"
              className={`card summary-card summary-card-${variant} summary-card-btn w-100 text-start ${
                isActive ? 'summary-card-active' : ''
              }`}
              onClick={() => onFilterClick(isActive ? '' : key)}
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
                      {loading ? '…' : counts[key]}
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
