import { useNavigate } from 'react-router-dom';
import ListSectionBar from '../ListSectionBar';
import ProjectStatusBadge from '../ProjectStatusBadge';
function formatDate(value) {
  if (!value) return '—';
  return value.replace('T', ' ').slice(0, 10).replace(/-/g, '/');
}

export default function ClientRelatedProjectsSection({
  projects,
  loading,
  clientId,
  backState,
}) {
  const navigate = useNavigate();
  const navState = backState ?? { from: `/clients/${clientId}`, fromLabel: '取引先詳細' };

  function openProject(projectId) {
    navigate(`/projects/${projectId}`, { state: navState });
  }

  return (
    <section className="table-section list-section-panel client-related-projects-panel mt-3">
      <ListSectionBar
        icon="bi-briefcase"
        title="関連案件"
        count={projects.length}
        hideCount={loading}
      />
      <div className="list-section-body">
        <div className="project-list-table-wrap client-related-projects-table-wrap">
          <table className="table table-hover align-middle mb-0 project-list-table project-workflow-table client-related-projects-table">
            <colgroup>
              <col className="client-related-projects-col-name" />
              <col className="client-related-projects-col-status" />
              <col className="client-related-projects-col-count" />
              <col className="client-related-projects-col-location" />
              <col className="client-related-projects-col-date" />
              <col className="client-related-projects-col-date" />
              <col className="client-related-projects-col-date" />
            </colgroup>
            <thead className="table-light">
              <tr>
                <th className="project-list-th-text">案件名</th>
                <th className="project-list-th-meta">ステータス</th>
                <th className="project-list-th-meta">人数</th>
                <th className="project-list-th-text">勤務地</th>
                <th className="project-list-th-meta">開始予定</th>
                <th className="project-list-th-meta">終了予定</th>
                <th className="project-list-th-meta">更新日</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    読み込み中…
                  </td>
                </tr>
              )}
              {!loading && projects.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    関連案件はありません
                  </td>
                </tr>
              )}
              {!loading &&
                projects.map((project) => (
                  <tr
                    key={project.id}
                    className="client-related-projects-row project-list-row-clickable"
                    onClick={() => openProject(project.id)}
                    title="クリックで詳細を表示"
                  >
                    <td className="project-list-cell-name">{project.projectName}</td>
                    <td className="project-list-cell-meta">
                      <ProjectStatusBadge status={project.status} />
                    </td>
                    <td className="project-list-cell-meta">
                      <span className="project-list-count">
                        {project.headcountFilled}/{project.headcountRequired}
                      </span>
                    </td>
                    <td className="project-list-cell-client">{project.workLocation || '—'}</td>
                    <td className="project-list-cell-meta">{formatDate(project.expectedStartDate)}</td>
                    <td className="project-list-cell-meta">{formatDate(project.expectedEndDate)}</td>
                    <td className="project-list-cell-meta">{formatDate(project.updatedAt)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
