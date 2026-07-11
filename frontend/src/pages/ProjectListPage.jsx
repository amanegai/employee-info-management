import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import AppFooter from '../components/AppFooter';
import PageHeader from '../components/PageHeader';
import ListSectionBar from '../components/ListSectionBar';
import ProjectSearchForm from '../components/ProjectSearchForm';
import ProjectStatusBadge from '../components/ProjectStatusBadge';
import ProjectSummaryCards from '../components/ProjectSummaryCards';
import { canWriteProjectFeatures } from '../auth';
import { useAuth } from '../context/AuthContext';
import { useAppMessage } from '../context/MessageContext';
import { buildProjectSummaryCounts, formatProjectHeadcountDisplay } from '../utils/projectWorkflow';

const EMPTY_FILTERS = {
  keyword: '',
  status: '',
};

const SEARCH_DEBOUNCE_MS = 300;

export default function ProjectListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showMessage } = useAppMessage();
  const canEdit = canWriteProjectFeatures(user);
  const [projects, setProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const skipSearchEffectRef = useRef(true);

  const summaryCounts = useMemo(() => buildProjectSummaryCounts(allProjects), [allProjects]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const list = await api.searchProjects({});
      setAllProjects(list);
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setSummaryLoading(false);
    }
  }, [showMessage]);

  const loadProjects = useCallback(
    async (searchFilters) => {
      setLoading(true);
      try {
        const list = await api.searchProjects({
          keyword: searchFilters.keyword || undefined,
          status: searchFilters.status || undefined,
        });
        setProjects(list);
      } catch (e) {
        showMessage(e.message, 'danger');
      } finally {
        setLoading(false);
      }
    },
    [showMessage]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const statusList = await api.getProjectStatuses();
        if (!cancelled) {
          setStatuses(statusList);
          await Promise.all([loadSummary(), loadProjects(EMPTY_FILTERS)]);
        }
      } catch (e) {
        if (!cancelled) showMessage(e.message, 'danger');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadProjects, loadSummary, showMessage]);

  useEffect(() => {
    if (skipSearchEffectRef.current) {
      skipSearchEffectRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      loadProjects(filters);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters, loadProjects]);

  function handleSummaryFilterClick(status) {
    skipSearchEffectRef.current = true;
    setFilters({ keyword: '', status });
    loadProjects({ keyword: '', status });
  }

  async function handleDeleteProject(project) {
    if (!window.confirm(`「${project.projectName}」を削除しますか？`)) return;
    setDeletingId(project.id);
    try {
      await api.deleteProject(project.id);
      showMessage(`「${project.projectName}」を削除しました`);
      await Promise.all([loadSummary(), loadProjects(filters)]);
    } catch (err) {
      showMessage(err.message, 'danger');
    } finally {
      setDeletingId(null);
    }
  }

  const colSpan = canEdit ? 7 : 6;

  return (
    <div className="container-fluid py-4 px-3 px-lg-5 list-page">
      <PageHeader
        guideId="project-list"
        icon="bi-briefcase-fill"
        title="案件一覧"
        lead="選考・配属の管理対象案件"
      >
        {canEdit && (
          <Link to="/projects/new" className="btn btn-primary app-btn">
            <i className="bi bi-plus-lg" aria-hidden="true" />
            新規案件
          </Link>
        )}
      </PageHeader>

      <ProjectSummaryCards
        counts={summaryCounts}
        loading={summaryLoading}
        activeStatus={filters.status}
        onFilterClick={handleSummaryFilterClick}
      />

      <ProjectSearchForm
        filters={filters}
        statuses={statuses}
        expanded={searchExpanded}
        onToggle={() => setSearchExpanded((v) => !v)}
        onChange={setFilters}
      />

      <section className="table-section list-section-panel" aria-label="案件一覧" data-guide="project-list-table">
        <ListSectionBar icon="bi-briefcase" title="案件一覧" count={projects.length} hideCount={loading} />
        <div className="list-section-body">
          <div className="project-list-table-wrap">
            <table className="table table-hover align-middle mb-0 project-list-table project-workflow-table">
              <colgroup>
                <col className="project-list-col-client" />
                <col className="project-list-col-name" />
                <col className="project-list-col-status" />
                <col className="project-list-col-count" />
                <col className="project-list-col-date" />
                <col className="project-list-col-date" />
                {canEdit && <col className="project-list-col-action" />}
              </colgroup>
              <thead className="table-light">
                <tr>
                  <th className="project-list-th-text">取引先</th>
                  <th className="project-list-th-text">案件名</th>
                  <th className="project-list-th-meta">ステータス</th>
                  <th className="project-list-th-meta">人数</th>
                  <th className="project-list-th-meta">開始予定</th>
                  <th className="project-list-th-meta">更新日</th>
                  {canEdit && <th className="project-list-th-action">操作</th>}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={colSpan} className="text-center text-muted py-4">
                      読み込み中…
                    </td>
                  </tr>
                )}
                {!loading && projects.length === 0 && (
                  <tr>
                    <td colSpan={colSpan} className="text-center text-muted py-4">
                      該当する案件がありません
                    </td>
                  </tr>
                )}
                {!loading &&
                  projects.map((project) => (
                    <tr
                      key={project.id}
                      className="project-list-row-clickable"
                      onClick={() => navigate(`/projects/${project.id}`, { state: { from: '/projects', fromLabel: '案件一覧' } })}
                      title="クリックで詳細を表示"
                    >
                      <td className="project-list-cell-client">{project.clientName}</td>
                      <td className="project-list-cell-name">{project.projectName}</td>
                      <td className="project-list-cell-meta">
                        <ProjectStatusBadge status={project.status} />
                      </td>
                      <td className="project-list-cell-meta">
                        <span className="project-list-count">
                          {formatProjectHeadcountDisplay(project)}
                        </span>
                      </td>
                      <td className="project-list-cell-meta">{project.expectedStartDate || '—'}</td>
                      <td className="project-list-cell-meta">{project.updatedAt?.slice(0, 10) || '—'}</td>
                      {canEdit && (
                        <td className="project-list-cell-action" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            disabled={deletingId === project.id}
                            aria-label={`${project.projectName} を削除`}
                            onClick={() => handleDeleteProject(project)}
                          >
                            <i className="bi bi-trash" aria-hidden="true" />
                            {deletingId === project.id ? '削除中…' : '削除'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <AppFooter />
    </div>
  );
}
