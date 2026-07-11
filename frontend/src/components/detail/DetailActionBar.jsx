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
      <button type="button" className="btn btn-outline-primary app-btn" onClick={onResume}>
        <i className="bi bi-file-earmark-text" aria-hidden="true" />
        履歴書生成
      </button>
      <button type="button" className="btn btn-outline-primary app-btn" onClick={onAppeal}>
        <i className="bi bi-megaphone" aria-hidden="true" />
        アピール文書
      </button>
      {showPersonalSummary && (
        <button type="button" className="btn btn-outline-primary app-btn" onClick={onPersonalSummary}>
          <i className="bi bi-card-text" aria-hidden="true" />
          個人情報サマリー
        </button>
      )}
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
