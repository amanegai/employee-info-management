import { useAppMessage } from '../context/MessageContext';

const TYPE_CLASS = {
  success: 'app-message-bar-success',
  info: 'app-message-bar-info',
  warning: 'app-message-bar-warning',
  danger: 'app-message-bar-danger',
};

const TYPE_ICON = {
  success: 'bi-check-circle-fill',
  info: 'bi-info-circle-fill',
  warning: 'bi-exclamation-triangle-fill',
  danger: 'bi-x-circle-fill',
};

export default function AppMessageBar() {
  const { message, clearMessage } = useAppMessage();

  if (!message) return null;

  const type = message.type || 'info';

  return (
    <section className="app-message-bar-wrap" aria-label="メッセージ表示">
      <div className="container-fluid px-3 px-lg-5 app-message-bar-inner">
        <div
          className={`app-message-bar ${TYPE_CLASS[type] || TYPE_CLASS.info}`}
          role="status"
          aria-live="polite"
        >
          <i className={`bi ${TYPE_ICON[type] || TYPE_ICON.info} app-message-bar-icon`} aria-hidden="true" />
          <span className="app-message-bar-text">{message.text}</span>
          <button
            type="button"
            className="btn-close app-message-bar-close"
            aria-label="閉じる"
            onClick={clearMessage}
          />
        </div>
      </div>
    </section>
  );
}
