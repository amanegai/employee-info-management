/**
 * 登録・編集画面のサイドプレビュー（イベント / 議事録共通）
 */
export function FormPreviewPanel({ isEdit, theme = 'indigo', children, footer }) {
  return (
    <aside className={`form-preview-aside form-preview-aside--${theme}`} aria-live="polite">
      <section className="client-event-form-section form-preview-section">
        <h3 className="client-event-form-section-title form-preview-section-title">
          <i className="bi bi-eye" aria-hidden="true" />
          プレビュー
          <span className={`form-preview-mode-badge${isEdit ? ' is-edit' : ' is-new'}`}>
            {isEdit ? '編集' : '新規'}
          </span>
        </h3>
        <div className="form-preview-section-inner">
          {children}
          {footer}
        </div>
      </section>
    </aside>
  );
}

export function FormPreviewEmpty({ message = '入力内容がここにプレビュー表示されます' }) {
  return (
    <aside className="form-preview-aside form-preview-aside--empty" aria-live="polite">
      <section className="client-event-form-section form-preview-section">
        <h3 className="client-event-form-section-title form-preview-section-title">
          <i className="bi bi-eye" aria-hidden="true" />
          プレビュー
        </h3>
        <p className="form-preview-placeholder mb-0">
          <i className="bi bi-sliders" aria-hidden="true" />
          {message}
        </p>
      </section>
    </aside>
  );
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function parsePreviewDate(dateIso) {
  if (!dateIso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateIso).trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return {
    year: String(year),
    month,
    monthLabel: `${month}月`,
    day: String(day),
    weekday: WEEKDAYS[date.getDay()],
    isoDisplay: `${year}/${match[2]}/${match[3]}`,
  };
}

/** カレンダー風の日付表示（ISO: YYYY-MM-DD） */
export function FormPreviewDateBanner({ dateIso, emptyLabel = '日付未設定' }) {
  const parsed = parsePreviewDate(dateIso);

  if (!parsed) {
    return (
      <div className="form-preview-date-card form-preview-date-card--empty">
        <i className="bi bi-calendar-x" aria-hidden="true" />
        <span>{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div
      className="form-preview-date-card"
      aria-label={`${parsed.isoDisplay}（${parsed.weekday}）`}
    >
      <div className="form-preview-date-card-cap">
        <div className="form-preview-date-card-cap-left">
          <span className="form-preview-date-card-cap-month">{parsed.monthLabel}</span>
          <span className="form-preview-date-card-cap-year">{parsed.year}</span>
        </div>
        <span className="form-preview-date-card-cap-weekday">{parsed.weekday}</span>
      </div>
      <div className="form-preview-date-card-body">
        <span className="form-preview-date-card-day" aria-hidden="true">
          {parsed.day}
        </span>
        <span className="form-preview-date-card-ring" aria-hidden="true" />
      </div>
    </div>
  );
}

export function FormPreviewTitle({ children }) {
  return <h3 className="form-preview-title">{children}</h3>;
}

export function FormPreviewDetails({ children }) {
  return <ul className="form-preview-details">{children}</ul>;
}

export function FormPreviewDetail({ icon, label, value }) {
  if (!value) return null;
  return (
    <li className="form-preview-detail">
      <span className="form-preview-detail-icon" aria-hidden="true">
        <i className={`bi ${icon}`} />
      </span>
      <span className="form-preview-detail-content">
        {label && <span className="form-preview-detail-label">{label}</span>}
        <span className="form-preview-detail-value">{value}</span>
      </span>
    </li>
  );
}

export function FormPreviewBadges({ children }) {
  if (!children) return null;
  return <div className="form-preview-badges">{children}</div>;
}

export function FormPreviewStats({ items }) {
  if (!items?.length) return null;
  return (
    <ul className="form-preview-stats">
      {items.map((item) => (
        <li key={item.key ?? item.label}>
          <i className={`bi ${item.icon}`} aria-hidden="true" />
          <span>
            {item.label} <strong>{item.value}</strong>
            {item.suffix}
          </span>
        </li>
      ))}
    </ul>
  );
}
