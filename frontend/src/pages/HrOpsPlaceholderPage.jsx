import { Link } from 'react-router-dom';
import HrOpsTaskShell from '../components/hrOps/HrOpsTaskShell';
import { findHrOpsBusinessType } from '../utils/hrOpsBusinessTypes';

export default function HrOpsPlaceholderPage({ businessId }) {
  const businessType = findHrOpsBusinessType(businessId);

  return (
    <HrOpsTaskShell businessType={businessType} guideId="hr-ops-placeholder">
      <section className="list-section-panel">
        <div className="list-section-body list-section-body-padded text-center py-5">
          <i className="bi bi-tools display-4 text-muted mb-3 d-block" aria-hidden="true" />
          <h2 className="h5 mb-2">準備中</h2>
          <p className="text-muted mb-4">
            「{businessType?.label ?? 'この業務'}」は現在開発中です。
          </p>
          <Link to="/hr-ops" className="btn btn-outline-primary app-btn">
            業務一覧に戻る
          </Link>
        </div>
      </section>
    </HrOpsTaskShell>
  );
}
