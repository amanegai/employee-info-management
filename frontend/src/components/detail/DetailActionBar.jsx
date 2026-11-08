export default function DetailActionBar({
  onEdit,
  onDelete,
  onBack,
  backLabel = '一覧に戻る',
  onResume,
  onAppeal,
  onPersonalSummary,
  showPersonalSummary = false,
  deleting,
  canEdit = true,
  canDelete = true,
}) {
  return (
    <div className="detail-action-bar" data-guide="detail-action-bar">
      <div className="dropdown dropdown-center">
        <button
          type="button"
          className="btn btn-outline-primary app-btn dropdown-toggle"
          data-bs-toggle="dropdown"
          data-bs-display="static"
          aria-expanded="false"
          aria-haspopup="true"
        >
          <i className="bi bi-printer" aria-hidden="true" />
          書類出力
        </button>
        <ul className="dropdown-menu shadow-sm detail-output-menu">
          <li>
            <button type="button" className="dropdown-item" onClick={onResume}>
              <i className="bi bi-file-earmark-text" aria-hidden="true" />
              履歴書生成
            </button>
          </li>
          <li>
            <button type="button" className="dropdown-item" onClick={onAppeal}>
              <i className="bi bi-megaphone" aria-hidden="true" />
              アピール文書
            </button>
          </li>
          {showPersonalSummary && (
            <li>
              <button type="button" className="dropdown-item" onClick={onPersonalSummary}>
                <i className="bi bi-card-text" aria-hidden="true" />
                個人情報サマリー
              </button>
            </li>
          )}
        </ul>
      </div>
      {canEdit && (
        <button type="button" className="btn btn-primary app-btn" onClick={onEdit}>
          <i className="bi bi-pencil-square" aria-hidden="true" />
          編集
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          className="btn btn-danger app-btn"
          onClick={onDelete}
          disabled={deleting}
        >
          <i className="bi bi-trash" aria-hidden="true" />
          {deleting ? '削除中…' : '削除'}
        </button>
      )}
      <button type="button" className="btn btn-outline-secondary app-btn" onClick={onBack}>
        <i className="bi bi-arrow-left" aria-hidden="true" />
        {backLabel}
      </button>
    </div>
  );
}
