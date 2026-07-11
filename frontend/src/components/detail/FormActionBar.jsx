const FORM_ID = 'employee-form';

export default function FormActionBar({ isEdit, saving, onCancel, onBack, backLabel = '一覧に戻る' }) {
  return (
    <div className="detail-action-bar">
      <button
        type="submit"
        form={FORM_ID}
        className="btn btn-primary app-btn"
        disabled={saving}
      >
        <i className="bi bi-check-lg" aria-hidden="true" />
        {saving ? (isEdit ? '更新中…' : '登録中…') : isEdit ? '更新' : '登録'}
      </button>
      <button type="button" className="btn btn-outline-secondary app-btn" onClick={onCancel}>
        <i className="bi bi-x-lg" aria-hidden="true" />
        キャンセル
      </button>
      <button type="button" className="btn btn-outline-secondary app-btn" onClick={onBack}>
        <i className="bi bi-arrow-left" aria-hidden="true" />
        {backLabel}
      </button>
    </div>
  );
}

export { FORM_ID };
