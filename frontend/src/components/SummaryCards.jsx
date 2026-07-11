import { SUMMARY_FILTERS } from '../utils';

const CARDS = [
  { key: 'activeCount', label: '在籍社員数', variant: 'primary', icon: 'bi-people-fill' },
  { key: 'workingCount', label: '稼働中社員数', variant: 'success', icon: 'bi-lightning-charge-fill' },
  { key: 'standbyCount', label: '待機中社員数', variant: 'warning', icon: 'bi-pause-circle-fill' },
  { key: 'endingThisMonthCount', label: '今月終了予定社員数', variant: 'danger', icon: 'bi-calendar-event-fill' },
];

export default function SummaryCards({ summary, loading, activeFilter, onFilterClick }) {
  return (
    <div className="row g-3 mb-4 summary-cards-row">
      {CARDS.map(({ key, label, variant, icon }) => {
        const filterValue = SUMMARY_FILTERS[key];
        const isActive = activeFilter === filterValue;
        return (
          <div key={key} className="col-12 col-md-6 col-xl-3">
            <button
              type="button"
              className={`card summary-card summary-card-${variant} summary-card-btn w-100 text-start ${
                isActive ? 'summary-card-active' : ''
              }`}
              onClick={() => onFilterClick(filterValue)}
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
                      {loading ? '…' : (summary?.[key] ?? 0)}
                      <span className="summary-value-unit">名</span>
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
