import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import AlignedJapaneseName from '../components/AlignedJapaneseName';
import AppFooter from '../components/AppFooter';
import PageHeader from '../components/PageHeader';
import { useAppMessage } from '../context/MessageContext';
import { EMPTY_DISPLAY, SUMMARY_FILTERS, workStatusClass } from '../utils';

function InfoCell({ label, value }) {
  const empty = value == null || value === '';
  return (
    <div className="detail-info-cell">
      <div className="detail-info-label">{label}</div>
      <div className={`detail-info-value${empty ? ' is-empty' : ''}`}>
        {empty ? EMPTY_DISPLAY : value}
      </div>
    </div>
  );
}

function AttentionCard({ to, label, count, icon, variant, hint }) {
  const urgent = count > 0;
  const className = `mypage-attention-card mypage-attention-card--${variant}${urgent ? ' is-urgent' : ''}${to ? '' : ' is-static'}`;
  const content = (
    <>
      <div className={`mypage-attention-icon mypage-attention-icon--${variant}`} aria-hidden="true">
        <i className={`bi ${icon}`} />
      </div>
      <div className="mypage-attention-body">
        <div className="mypage-attention-label">{label}</div>
        <div className="mypage-attention-count">
          {count}
          <span className="mypage-attention-unit">件</span>
        </div>
        {hint && <div className="mypage-attention-hint">{hint}</div>}
      </div>
      {to && <i className="bi bi-chevron-right mypage-attention-chevron" aria-hidden="true" />}
    </>
  );
  if (!to) {
    return <div className={className}>{content}</div>;
  }
  return (
    <Link to={to} className={className}>
      {content}
    </Link>
  );
}

function PersonnelCard({ label, value, icon, variant, onClick }) {
  return (
    <button type="button" className={`card summary-card summary-card-${variant} summary-card-btn w-100 text-start`} onClick={onClick}>
      <div className="card-body summary-card-body">
        <div className="summary-card-layout">
          <div className={`summary-card-icon summary-card-icon-${variant}`} aria-hidden="true">
            <i className={`bi ${icon}`} />
          </div>
          <div className="summary-card-content">
            <div className="summary-card-label">{label}</div>
            <div className="summary-value">
              {value}
              <span className="summary-value-unit">名</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function PersonalSection({ data, defaultOpen = true }) {
  return (
    <details className="mypage-personal-details" open={defaultOpen}>
      <summary className="mypage-personal-summary">
        <i className="bi bi-person-vcard" aria-hidden="true" />
        個人情報
        <span className="mypage-personal-summary-hint">基本情報・写真</span>
      </summary>
      <div className="detail-summary-card mb-0 mypage-summary-card mt-3">
        <div className="detail-summary-hero">
          <div className="detail-summary-hero-text">
            {data.employeeLinked ? (
              <AlignedJapaneseName
                name={data.name || data.displayName}
                kana={data.nameKana}
              />
            ) : (
              <>
                <h2 className="detail-employee-name">{data.displayName || data.username}</h2>
                <div className="detail-employee-kana text-muted">社員マスタ未連携</div>
              </>
            )}
          </div>
          {data.employeeLinked && data.workStatus && (
            <span className={`badge status-badge detail-summary-status ${workStatusClass(data.workStatus)}`}>
              {data.workStatus}
            </span>
          )}
        </div>
        <div className="detail-summary-body">
          <div className="row g-4 align-items-start">
            <div className="col">
              <div className="row g-3 detail-summary-fields">
                {data.employeeLinked ? (
                  <>
                    <div className="col-md-4">
                      <InfoCell label="社員番号" value={data.employeeCode} />
                    </div>
                    <div className="col-md-4">
                      <InfoCell label="社員種別" value={data.employeeType} />
                    </div>
                    <div className="col-md-4">
                      <InfoCell label="所属会社" value={data.affiliationCompany} />
                    </div>
                    <div className="col-md-4">
                      <InfoCell label="所属部門" value={data.departmentName} />
                    </div>
                    <div className="col-md-4">
                      <InfoCell label="役職" value={data.position} />
                    </div>
                    <div className="col-md-4">
                      <InfoCell label="メール" value={data.email} />
                    </div>
                    <div className="col-md-4">
                      <InfoCell label="電話" value={data.phone} />
                    </div>
                    <div className="col-md-4">
                      <InfoCell
                        label="有給残（今年度）"
                        value={
                          data.paidLeaveCurrentYearRemaining != null
                            && data.paidLeaveCurrentYearRemaining !== ''
                            ? `${data.paidLeaveCurrentYearRemaining}日`
                            : ''
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <InfoCell
                        label="有給残（前年度）"
                        value={
                          data.paidLeavePreviousYearRemaining != null
                            && data.paidLeavePreviousYearRemaining !== ''
                            ? `${data.paidLeavePreviousYearRemaining}日`
                            : ''
                        }
                      />
                    </div>
                  </>
                ) : (
                  <div className="col-12">
                    <div className="mypage-unlinked-note">
                      <i className="bi bi-info-circle" aria-hidden="true" />
                      <span>
                        社員マスタとの連携がまだありません。ユーザー管理から連携できます。
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="col-auto">
              <div className="detail-photo-box">
                {data.photoUrl ? (
                  <img src={data.photoUrl} alt="個人写真" className="detail-photo-img" />
                ) : (
                  <div className="detail-photo-placeholder">
                    <i className="bi bi-person-bounding-box" />
                    <span>個人写真</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </details>
  );
}

/** 一時非表示。再表示時は true に戻す */
const SHOW_MYPAGE_SELF_SERVICE = false;

const SELF_APPLICATION_ENTRIES = [
  { id: 'leave', label: '休暇申請', icon: 'bi-calendar-x', desc: '有給・休暇の申請' },
  { id: 'address', label: '住所変更届', icon: 'bi-geo-alt', desc: '住所変更の届出' },
  { id: 'other', label: 'その他申請', icon: 'bi-file-earmark-text', desc: 'その他の申請書類' },
];

function EmployeeSelfServiceSection() {
  if (!SHOW_MYPAGE_SELF_SERVICE) return null;

  return (
    <div className="mypage-self-service mb-4">
      <section className="mypage-self-panel mb-3" aria-label="通知">
        <div className="mypage-section-title">
          <i className="bi bi-bell" aria-hidden="true" />
          通知
          <span className="mypage-coming-soon-badge">準備中</span>
        </div>
        <div className="mypage-notify-placeholder">
          <div className="mypage-notify-empty">
            <i className="bi bi-inbox" aria-hidden="true" />
            <div>
              <div className="mypage-notify-empty-title">通知はまだありません</div>
              <p className="mypage-notify-empty-desc mb-0">
                申請結果やお知らせは、ここに表示される予定です。
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-outline-secondary btn-sm" disabled>
            すべて既読
          </button>
        </div>
      </section>

      <section className="mypage-self-panel" aria-label="申請入口">
        <div className="mypage-section-title">
          <i className="bi bi-file-earmark-plus" aria-hidden="true" />
          申請
          <span className="mypage-coming-soon-badge">準備中</span>
        </div>
        <div className="row g-3">
          {SELF_APPLICATION_ENTRIES.map((item) => (
            <div key={item.id} className="col-12 col-md-4">
              <button type="button" className="mypage-app-entry" disabled title="準備中">
                <span className={`mypage-app-entry-icon`} aria-hidden="true">
                  <i className={`bi ${item.icon}`} />
                </span>
                <span className="mypage-app-entry-body">
                  <span className="mypage-app-entry-label">
                    {item.label}
                    <span className="mypage-coming-soon-badge">準備中</span>
                  </span>
                  <span className="mypage-app-entry-desc">{item.desc}</span>
                </span>
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AdminDashboard({ overview, displayName }) {
  const navigate = useNavigate();

  function openEmployees(summaryKey) {
    navigate('/employees', {
      state: { mypageSummaryFilter: SUMMARY_FILTERS[summaryKey] },
    });
  }

  return (
    <>
      <div className="mypage-admin-hero mb-3">
        <div className="mypage-admin-hero-text">
          <div className="mypage-admin-eyebrow">管理者ワークスペース</div>
          <h2 className="mypage-admin-title">{displayName || '管理者'} さん、今日の確認ポイント</h2>
          <p className="mypage-admin-lead mb-0">未処理の対応と人員状況を先に確認できます。</p>
        </div>
      </div>

      <section className="mb-4" aria-label="要対応">
        <div className="mypage-section-title">
          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
          要対応
        </div>
        <div className="row g-3">
          <div className="col-12 col-md-6 col-xl-3">
            <AttentionCard
              to="/assignment-cancel-followups"
              label="配属取消フォロー"
              count={overview.cancelFollowupOpenCount ?? 0}
              icon="bi-exclamation-triangle"
              variant="danger"
              hint="未完了のフォロー"
            />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <AttentionCard
              to="/bp-help-requests"
              label="BP求援"
              count={overview.bpHelpOpenCount ?? 0}
              icon="bi-people"
              variant="warning"
              hint="募集中の求援"
            />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <AttentionCard
              to="/employee-status/suggestions"
              label="状態提案"
              count={overview.statusSuggestionPendingCount ?? 0}
              icon="bi-arrow-repeat"
              variant="primary"
              hint="承認待ち"
            />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <AttentionCard
              label="未読通知"
              count={overview.notificationUnreadCount ?? 0}
              icon="bi-bell"
              variant="neutral"
              hint="右上の通知ベルから確認"
            />
          </div>
        </div>
      </section>

      <section className="mb-4" aria-label="人員状況">
        <div className="mypage-section-title">
          <i className="bi bi-people-fill" aria-hidden="true" />
          人員状況
        </div>
        <div className="row g-3 summary-cards-row mb-0">
          <div className="col-12 col-md-6 col-xl-3">
            <PersonnelCard
              label="在籍社員数"
              value={overview.activeCount ?? 0}
              icon="bi-people-fill"
              variant="primary"
              onClick={() => openEmployees('activeCount')}
            />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <PersonnelCard
              label="稼働中社員数"
              value={overview.workingCount ?? 0}
              icon="bi-lightning-charge-fill"
              variant="success"
              onClick={() => openEmployees('workingCount')}
            />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <PersonnelCard
              label="待機中社員数"
              value={overview.standbyCount ?? 0}
              icon="bi-pause-circle-fill"
              variant="warning"
              onClick={() => openEmployees('standbyCount')}
            />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <PersonnelCard
              label="今月終了予定社員数"
              value={overview.endingThisMonthCount ?? 0}
              icon="bi-calendar-event-fill"
              variant="danger"
              onClick={() => openEmployees('endingThisMonthCount')}
            />
          </div>
        </div>
      </section>

      <section className="mb-4" aria-label="管理ショートカット">
        <div className="mypage-section-title">
          <i className="bi bi-grid-1x2" aria-hidden="true" />
          管理ショートカット
        </div>
        <div className="mypage-admin-shortcuts">
          <Link to="/users" className="mypage-admin-shortcut">
            <i className="bi bi-person-gear" aria-hidden="true" />
            ユーザー管理
          </Link>
          <Link to="/admin/master-import" className="mypage-admin-shortcut">
            <i className="bi bi-database-up" aria-hidden="true" />
            マスタ一括登録
          </Link>
          <Link to="/admin/audit-logs" className="mypage-admin-shortcut">
            <i className="bi bi-journal-text" aria-hidden="true" />
            監査ログ
          </Link>
          <Link to="/employees" className="mypage-admin-shortcut">
            <i className="bi bi-list-ul" aria-hidden="true" />
            社員一覧
          </Link>
        </div>
      </section>
    </>
  );
}

export default function MyPagePage() {
  const { showMessage } = useAppMessage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getMyPage()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) showMessage(err.message || 'MyPageの取得に失敗しました', 'danger');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showMessage]);

  const isAdminView = Boolean(data?.adminOverview);

  return (
    <div className="container-fluid py-4 px-3 px-lg-5 list-page mypage-page">
      <PageHeader
        guideId="mypage"
        icon={isAdminView ? 'bi-speedometer2' : 'bi-person-badge'}
        title="MyPage"
        lead={
          isAdminView
            ? '運用状況の確認と管理操作の入口'
            : 'ご自身の基本情報を確認できます'
        }
      />

      {loading ? (
        <div className="page-state-panel">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-3 mb-0">読み込み中…</p>
        </div>
      ) : !data ? (
        <div className="page-state-panel">
          <i className="bi bi-exclamation-circle page-state-panel-icon" aria-hidden="true" />
          <p className="mb-0">情報を表示できません。</p>
        </div>
      ) : (
        <>
          {isAdminView && (
            <AdminDashboard
              overview={data.adminOverview}
              displayName={data.displayName || data.username}
            />
          )}
          {!isAdminView && <EmployeeSelfServiceSection />}
          <PersonalSection data={data} defaultOpen={!isAdminView} />
        </>
      )}

      <AppFooter />
    </div>
  );
}
