import { SUMMARY_FILTERS } from '../utils';
import {
  AFFILIATION_COMPANY_ALESIS,
  AFFILIATION_COMPANY_BITCROSS,
  AFFILIATION_COMPANY_SHUWA,
  EMPLOYEE_CODE_PREFIX_ALS,
  EMPLOYEE_CODE_PREFIX_BTC,
  EMPLOYEE_CODE_PREFIX_SWT,
} from '../utils/employeeCode';

const CARDS = [
  { key: 'activeCount', label: '在籍社員数', variant: 'primary', icon: 'bi-people-fill' },
  { key: 'workingCount', label: '稼働中社員数', variant: 'success', icon: 'bi-lightning-charge-fill' },
  { key: 'standbyCount', label: '待機中社員数', variant: 'warning', icon: 'bi-pause-circle-fill' },
  { key: 'endingThisMonthCount', label: '今月終了予定社員数', variant: 'danger', icon: 'bi-calendar-event-fill' },
];

const COMPANY_META = {
  [AFFILIATION_COMPANY_BITCROSS]: {
    tone: 'bitcross',
    code: EMPLOYEE_CODE_PREFIX_BTC.toUpperCase(),
  },
  [AFFILIATION_COMPANY_ALESIS]: {
    tone: 'alesis',
    code: EMPLOYEE_CODE_PREFIX_ALS.toUpperCase(),
  },
  [AFFILIATION_COMPANY_SHUWA]: {
    tone: 'shuwa',
    code: EMPLOYEE_CODE_PREFIX_SWT.toUpperCase(),
  },
};

function companyMeta(name) {
  return COMPANY_META[name] || { tone: 'default', code: '—' };
}

export function CompanyHeading({ name, primary = false }) {
  const meta = companyMeta(name);
  return (
    <div className={`summary-company-heading summary-company-heading-${meta.tone}`}>
      <div className="summary-company-heading-main">
        <span className="summary-company-heading-icon" aria-hidden="true">
          <i className="bi bi-buildings" />
        </span>
        <div className="summary-company-heading-text">
          <span className="summary-company-heading-eyebrow">所属会社</span>
          <h3 className="summary-company-heading-title">{name}</h3>
        </div>
      </div>
      <div className="summary-company-heading-meta">
        <span className="summary-company-code" title="社員番号プレフィックス">
          {meta.code}
        </span>
        {primary && <span className="summary-company-primary-badge">本職</span>}
      </div>
    </div>
  );
}

function CardRow({
  summary,
  loading,
  activeFilter,
  onFilterClick,
  companyFilter,
  interactive = true,
}) {
  return (
    <div className="row g-3 summary-cards-row">
      {CARDS.map(({ key, label, variant, icon }) => {
        const filterValue = SUMMARY_FILTERS[key];
        const isActive = interactive && activeFilter === filterValue;
        const className = `card summary-card summary-card-${variant} w-100 text-start ${
          interactive ? 'summary-card-btn' : 'summary-card-static'
        } ${isActive ? 'summary-card-active' : ''}`;
        const body = (
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
        );

        if (!interactive) {
          return (
            <div key={key} className="col-12 col-md-6 col-xl-3">
              <div className={className}>{body}</div>
            </div>
          );
        }

        return (
          <div key={key} className="col-12 col-md-6 col-xl-3">
            <button
              type="button"
              className={className}
              onClick={() => onFilterClick?.(filterValue, companyFilter)}
              disabled={loading}
              aria-pressed={isActive}
              title={`${label}で一覧を絞り込む`}
            >
              {body}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function SummaryCards({
  summary,
  loading,
  activeFilter,
  activeCompany,
  onFilterClick,
  interactive = true,
}) {
  const companies = summary?.companies ?? [];

  if (companies.length > 1) {
    const ordered = [...companies].sort((a, b) => Number(b.primary) - Number(a.primary));
    return (
      <div className="mb-4 d-flex flex-column gap-3 summary-company-stack">
        {ordered.map((companySummary) => (
          <section
            key={companySummary.affiliationCompany}
            className="summary-company-block"
            aria-label={`${companySummary.affiliationCompany}のサマリー`}
          >
            <CompanyHeading
              name={companySummary.affiliationCompany}
              primary={Boolean(companySummary.primary)}
            />
            <CardRow
              summary={companySummary}
              loading={loading}
              activeFilter={
                activeCompany === companySummary.affiliationCompany ? activeFilter : null
              }
              companyFilter={companySummary.affiliationCompany}
              onFilterClick={onFilterClick}
              interactive={interactive}
            />
          </section>
        ))}
      </div>
    );
  }

  const single = companies.length === 1 ? companies[0] : summary;
  return (
    <div className="mb-4">
      {companies.length === 1 && (
        <div className="summary-company-block summary-company-block-single">
          <CompanyHeading name={companies[0].affiliationCompany} />
        </div>
      )}
      <CardRow
        summary={single}
        loading={loading}
        activeFilter={activeFilter}
        companyFilter={companies[0]?.affiliationCompany || null}
        onFilterClick={onFilterClick}
        interactive={interactive}
      />
    </div>
  );
}
