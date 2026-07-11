export default function RecoveryCodesPanel({
  codes,
  onClose,
  title = 'バックアップコード',
  variant = 'default',
}) {
  if (!codes?.length) return null;

  return (
    <div className={`recovery-codes-panel${variant === 'login' ? ' recovery-codes-panel--login' : ''}`} role="alert">
      <div className="recovery-codes-panel-head">
        <div className="recovery-codes-panel-title-row">
          <span className="recovery-codes-panel-icon" aria-hidden="true">
            <i className="bi bi-key-fill" />
          </span>
          <h3 className="recovery-codes-panel-title">{title}</h3>
        </div>
        <p className="recovery-codes-panel-desc mb-0">
          認証アプリにアクセスできない場合に使用します。安全な場所に保存してください。各コードは 1 回のみ使用できます。
        </p>
      </div>
      <ul className="recovery-codes-list">
        {codes.map((code) => (
          <li key={code}>
            <code>{code}</code>
          </li>
        ))}
      </ul>
      {onClose && (
        <button type="button" className="btn btn-primary app-btn w-100 recovery-codes-done-btn" onClick={onClose}>
          <i className="bi bi-check2-circle" aria-hidden="true" />
          保存しました
        </button>
      )}
    </div>
  );
}
