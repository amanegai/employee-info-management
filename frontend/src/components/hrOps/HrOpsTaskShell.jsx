import HrOpsBackButton from './HrOpsBackButton';
import AppFooter from '../AppFooter';
import PageGuideHelpButton from '../guide/PageGuideHelpButton';

export default function HrOpsTaskShell({ businessType, guideId, children }) {
  return (
    <div className="container-fluid py-4 px-3 hr-ops-page hr-ops-task-page">
      <header className="page-header hr-ops-task-header d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div className="page-header-main">
          <div className={`page-header-icon hr-ops-task-header-icon hr-ops-task-header-icon--${businessType?.tone || 'primary'}`} aria-hidden="true">
            <i className={`bi ${businessType?.icon || 'bi-clipboard-check'}`} />
          </div>
          <div>
            <div className="page-header-title-row">
              <h1 className="h3 mb-0">{businessType?.label ?? '人事業務'}</h1>
              {guideId && <PageGuideHelpButton guideId={guideId} />}
            </div>
            <p className="text-muted mb-0 small">{businessType?.description}</p>
          </div>
        </div>
        <div className="page-header-actions">
          <HrOpsBackButton />
        </div>
      </header>
      {children}
      <AppFooter />
    </div>
  );
}
