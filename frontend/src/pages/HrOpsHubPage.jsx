import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import AppFooter from '../components/AppFooter';
import PageGuideHelpButton from '../components/guide/PageGuideHelpButton';
import { groupHrOpsBusinessTypes, HR_OPS_BUSINESS_TYPES } from '../utils/hrOpsBusinessTypes';

function HubCard({ item }) {
  const cardClass = `hr-ops-hub-card hr-ops-hub-card--${item.tone}${item.available ? '' : ' hr-ops-hub-card--disabled'}`;

  const inner = (
    <>
      <div className="hr-ops-hub-card-top">
        <div className={`hr-ops-hub-card-icon hr-ops-hub-card-icon--${item.tone}`} aria-hidden="true">
          <i className={`bi ${item.icon}`} />
        </div>
        {!item.available && <span className="hr-ops-hub-card-badge">準備中</span>}
      </div>
      <div className="hr-ops-hub-card-body">
        <h2 className="hr-ops-hub-card-title">{item.label}</h2>
        <p className="hr-ops-hub-card-desc">{item.description}</p>
      </div>
      {item.available && (
        <span className="hr-ops-hub-card-action">
          業務を開始
          <i className="bi bi-arrow-right" aria-hidden="true" />
        </span>
      )}
    </>
  );

  if (!item.available) {
    return (
      <div key={item.id} className={cardClass} aria-disabled="true">
        {inner}
      </div>
    );
  }

  return (
    <Link key={item.id} to={item.route} className={cardClass}>
      {inner}
    </Link>
  );
}

export default function HrOpsHubPage() {
  const groups = useMemo(() => groupHrOpsBusinessTypes(), []);
  const availableCount = HR_OPS_BUSINESS_TYPES.filter((item) => item.available).length;

  return (
    <div className="container-fluid py-4 hr-ops-page hr-ops-hub-page">
      <section className="hr-ops-hero">
        <div className="hr-ops-hero-content">
          <div className="hr-ops-hero-badge">
            <i className="bi bi-stars" aria-hidden="true" />
            HR Operations
          </div>
          <div className="hr-ops-hero-title-row">
            <h1 className="hr-ops-hero-title mb-0">人事業務管理</h1>
            <PageGuideHelpButton guideId="hr-ops-hub" />
          </div>
          <p className="hr-ops-hero-desc">
            証明書作成から勤務表の取り込み、関連書類送付まで。日常の人事業務をここから選んで開始できます。
          </p>
          <div className="hr-ops-hero-stats">
            <div className="hr-ops-hero-stat">
              <span className="hr-ops-hero-stat-value">{availableCount}</span>
              <span className="hr-ops-hero-stat-label">利用可能な業務</span>
            </div>
            <div className="hr-ops-hero-stat">
              <span className="hr-ops-hero-stat-value">{HR_OPS_BUSINESS_TYPES.length}</span>
              <span className="hr-ops-hero-stat-label">業務種別</span>
            </div>
          </div>
        </div>
        <div className="hr-ops-hero-visual" aria-hidden="true">
          <div className="hr-ops-hero-orbit hr-ops-hero-orbit--1">
            <i className="bi bi-file-earmark-text" />
          </div>
          <div className="hr-ops-hero-orbit hr-ops-hero-orbit--2">
            <i className="bi bi-table" />
          </div>
          <div className="hr-ops-hero-orbit hr-ops-hero-orbit--3">
            <i className="bi bi-envelope-paper" />
          </div>
        </div>
      </section>

      <div data-guide="hr-ops-hub-cards">
      {groups.map((group) => (
        <section key={group.id} className="hr-ops-hub-section" aria-label={group.label}>
          <div className="hr-ops-hub-section-head">
            <div className="hr-ops-hub-section-icon" aria-hidden="true">
              <i className={`bi ${group.icon}`} />
            </div>
            <div>
              <h2 className="hr-ops-hub-section-title">{group.label}</h2>
              <p className="hr-ops-hub-section-desc mb-0">
                {group.items.filter((item) => item.available).length} / {group.items.length} 件が利用可能
              </p>
            </div>
          </div>
          <div className="hr-ops-hub-grid">
            {group.items.map((item) => (
              <HubCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}
      </div>

      <AppFooter />
    </div>
  );
}
