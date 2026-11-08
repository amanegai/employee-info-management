import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import AppFooter from '../components/AppFooter';
import ListSectionBar from '../components/ListSectionBar';
import PageHeader from '../components/PageHeader';
import ProjectStatusBadge from '../components/ProjectStatusBadge';
import { useAppMessage } from '../context/MessageContext';
import {
  formatProjectBillingPrice,
  isHeadcountUnlimited,
  parseProjectSkills,
} from '../utils/projectWorkflow';

const NAV_STATE = { from: '/bp-help-requests', fromLabel: 'BP求援一覧' };

const VISIBLE_SKILL_COUNT = 6;

function formatDateTime(value) {
  if (!value) return '—';
  return value.replace('T', ' ').slice(0, 16);
}

function formatElapsed(value) {
  if (!value) return null;
  const target = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(target.getTime())) return null;
  const minutes = Math.floor((Date.now() - target.getTime()) / 60000);
  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  return `${days}日前`;
}

function shortageLabel(project) {
  if (project.bpHelpSlotsNeeded != null) return `${project.bpHelpSlotsNeeded}名`;
  if (isHeadcountUnlimited(project)) return '複数名';
  const remain = (project.headcountRequired ?? 0) - (project.headcountFilled ?? 0);
  return remain > 0 ? `${remain}名` : '—';
}

function headcountProgress(project) {
  const filled = project.headcountFilled ?? 0;
  if (isHeadcountUnlimited(project)) return `確定 ${filled} 名 / 上限なし`;
  return `確定 ${filled} / ${project.headcountRequired ?? 0} 名`;
}

function MetaChip({ icon, label, value }) {
  return (
    <div className="bp-help-card-meta">
      <i className={`bi ${icon}`} aria-hidden="true" />
      <span className="bp-help-card-meta-label">{label}</span>
      <span className="bp-help-card-meta-value">{value || '—'}</span>
    </div>
  );
}

export default function BpHelpRequestsPage() {
  const { showMessage } = useAppMessage();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  const loadData = useCallback(async () => {
    try {
      setProjects(await api.getBpHelpRequests());
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    loadData();
    const id = window.setInterval(loadData, 30000);
    return () => window.clearInterval(id);
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      [p.projectName, p.clientName, p.requiredSkills, p.workLocation, p.bpHelpNote]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [projects, keyword]);

  async function handleOpenProject(projectId) {
    try {
      await api.markProjectNotificationsRead(projectId);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="container-fluid py-4 px-3 px-lg-5 list-page bp-help-page">
      <PageHeader
        guideId="bp-help-requests"
        icon="bi-people"
        iconClassName="bp-help-page-icon"
        title="BP求援一覧"
        lead="社内要員が不足している案件です。協力会社からの候補を探して担当へ共有してください。"
      />

      <section className="table-section list-section-panel">
        <ListSectionBar icon="bi-bell" title="公開中の求援" count={filtered.length} hideCount={loading} />
        <div className="list-section-body list-section-body-padded">
          <div className="bp-help-toolbar">
            <div className="bp-help-search">
              <i className="bi bi-search" aria-hidden="true" />
              <input
                type="search"
                className="form-control form-control-sm"
                placeholder="案件名・取引先・スキルで絞り込み"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                aria-label="求援案件を絞り込み"
              />
            </div>
            <span className="bp-help-toolbar-hint">
              <i className="bi bi-arrow-repeat" aria-hidden="true" />
              30秒ごとに自動更新
            </span>
          </div>

          {loading ? (
            <div className="page-state-panel">
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bp-help-empty">
              <i className="bi bi-inbox" aria-hidden="true" />
              <p className="mb-0">
                {projects.length === 0
                  ? '現在、公開中のBP求援はありません。'
                  : '条件に一致する求援がありません。'}
              </p>
            </div>
          ) : (
            <div className="bp-help-card-grid">
              {filtered.map((project) => {
                const allSkills = parseProjectSkills(project.requiredSkills);
                const skills = allSkills.slice(0, VISIBLE_SKILL_COUNT);
                const restCount = allSkills.length - skills.length;
                const elapsed = formatElapsed(project.bpHelpRequestedAt);
                return (
                  <article key={project.id} className="bp-help-card">
                    <header className="bp-help-card-head">
                      <div className="bp-help-card-title-wrap">
                        <h3 className="bp-help-card-title">{project.projectName}</h3>
                        <div className="bp-help-card-badges">
                          <ProjectStatusBadge status={project.status} />
                          <span className="bp-help-card-price">
                            {formatProjectBillingPrice(project.billingUnitPrice, project.billingPriceLabel)}
                          </span>
                        </div>
                      </div>
                      <div className="bp-help-card-shortage" title="不足人数">
                        <span className="bp-help-card-shortage-label">不足</span>
                        <span className="bp-help-card-shortage-value">{shortageLabel(project)}</span>
                      </div>
                    </header>

                    {(project.pendingReferralCount ?? 0) > 0 && (
                      <div className="bp-help-card-pending">
                        <i className="bi bi-hourglass-split" aria-hidden="true" />
                        担当確認待ち {project.pendingReferralCount} 件
                      </div>
                    )}

                    <div className="bp-help-card-metas">
                      <MetaChip icon="bi-building" label="取引先" value={project.clientName} />
                      <MetaChip icon="bi-people" label="人数" value={headcountProgress(project)} />
                      <MetaChip icon="bi-geo-alt" label="勤務地" value={project.workLocation} />
                      <MetaChip icon="bi-calendar3" label="開始予定" value={project.expectedStartDate} />
                    </div>

                    <div className="bp-help-card-skills">
                      <span className="bp-help-card-section-label">
                        <i className="bi bi-tools" aria-hidden="true" />
                        必要スキル
                      </span>
                      {skills.length ? (
                        <div className="bp-help-skill-tags">
                          {skills.map((skill) => (
                            <span key={skill} className="bp-help-skill-tag" title={skill}>
                              {skill}
                            </span>
                          ))}
                          {restCount > 0 && (
                            <span className="bp-help-skill-tag bp-help-skill-tag--more">＋{restCount}</span>
                          )}
                        </div>
                      ) : (
                        <span className="bp-help-card-empty-text">未登録</span>
                      )}
                    </div>

                    {project.bpHelpNote && (
                      <div className="bp-help-card-note">
                        <i className="bi bi-chat-left-text" aria-hidden="true" />
                        <span>{project.bpHelpNote}</span>
                      </div>
                    )}

                    <footer className="bp-help-card-foot">
                      <div className="bp-help-card-requester">
                        <span className="bp-help-card-avatar" aria-hidden="true">
                          <i className="bi bi-person" />
                        </span>
                        <div>
                          <div className="bp-help-card-requester-name">
                            {project.bpHelpRequesterName || project.ownerDisplayName || '—'}
                          </div>
                          <time
                            className="bp-help-card-time"
                            dateTime={project.bpHelpRequestedAt || undefined}
                            title={formatDateTime(project.bpHelpRequestedAt)}
                          >
                            {elapsed || formatDateTime(project.bpHelpRequestedAt)}
                          </time>
                        </div>
                      </div>
                      <Link
                        to={`/projects/${project.id}`}
                        state={NAV_STATE}
                        className="btn btn-sm btn-primary app-btn"
                        onClick={() => handleOpenProject(project.id)}
                      >
                        案件を開く
                        <i className="bi bi-arrow-right" aria-hidden="true" />
                      </Link>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
      <AppFooter />
    </div>
  );
}
