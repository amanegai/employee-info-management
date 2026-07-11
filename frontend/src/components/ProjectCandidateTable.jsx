import { Link } from 'react-router-dom';
import CandidateStageProgress from './CandidateStageProgress';
import { workStatusClass } from '../utils';
import { isCandidateActionable, nextStageActions } from '../utils/projectWorkflow';

export default function ProjectCandidateTable({
  candidates,
  canEdit,
  saving,
  onStageAction,
  onReject,
  onWithdraw,
}) {
  const colSpan = canEdit ? 6 : 5;

  return (
    <div className="project-candidate-table-wrap">
      <table className="table table-hover align-middle mb-0 project-candidate-table project-workflow-table">
        <colgroup>
          <col className="project-candidate-col-employee" />
          <col className="project-candidate-col-dept" />
          <col className="project-candidate-col-status" />
          <col className="project-candidate-col-progress" />
          <col className="project-candidate-col-score" />
          {canEdit && <col className="project-candidate-col-action" />}
        </colgroup>
        <thead className="table-light">
          <tr>
            <th className="project-candidate-th-text">社員</th>
            <th className="project-candidate-th-text">所属</th>
            <th className="project-candidate-th-meta">稼働状況</th>
            <th className="project-candidate-th-progress">選考進捗</th>
            <th className="project-candidate-th-meta">スコア</th>
            {canEdit && <th className="project-candidate-th-action">操作</th>}
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate) => (
            <tr key={candidate.id} className="project-candidate-row">
              <td className="project-candidate-cell-employee">
                <Link
                  to={`/employees/${candidate.employeeId}`}
                  className="project-candidate-employee-link"
                >
                  {candidate.employeeName}
                </Link>
              </td>
              <td className="project-candidate-cell-dept">{candidate.departmentName || '—'}</td>
              <td className="project-candidate-cell-meta">
                <span className={`badge status-badge ${workStatusClass(candidate.workStatus)}`}>
                  {candidate.workStatus}
                </span>
              </td>
              <td className="project-candidate-cell-progress">
                <CandidateStageProgress stage={candidate.stage} compact />
              </td>
              <td className="project-candidate-cell-meta">
                {candidate.matchScore != null ? (
                  <span className="project-candidate-score">{candidate.matchScore}%</span>
                ) : (
                  '—'
                )}
              </td>
              {canEdit && (
                <td className="project-candidate-cell-action">
                  {isCandidateActionable(candidate.stage) ? (
                    <div className="project-candidate-actions">
                      {nextStageActions(candidate.stage).map((action) => (
                        <button
                          key={action.stage || action.action}
                          type="button"
                          className={`btn btn-sm app-btn project-candidate-action-btn ${
                            action.action === 'confirm' ? 'btn-success' : 'btn-outline-primary'
                          }`}
                          disabled={saving}
                          onClick={() => onStageAction(candidate, action)}
                        >
                          {action.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger app-btn project-candidate-action-btn"
                        disabled={saving}
                        onClick={() => onReject(candidate)}
                      >
                        不採用
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary app-btn project-candidate-action-btn"
                        disabled={saving}
                        title="顧客判断前に、当社側の理由でこの社員の提案を取り下げます"
                        onClick={() => onWithdraw(candidate)}
                      >
                        撤回
                      </button>
                    </div>
                  ) : (
                    <span className="project-candidate-action-done">—</span>
                  )}
                </td>
              )}
            </tr>
          ))}
          {candidates.length === 0 && (
            <tr>
              <td colSpan={colSpan} className="text-center text-muted py-4">
                候補者がいません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
