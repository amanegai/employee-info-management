export default function ListSectionBar({
  icon,
  title,
  count,
  hideCount = false,
  badge = null,
  actions = null,
}) {
  const showEnd = actions || (!hideCount && count != null);

  return (
    <div className="list-section-bar">
      <div className="list-section-title-group">
        {icon && (
          <span className="list-section-icon" aria-hidden="true">
            <i className={`bi ${icon}`} />
          </span>
        )}
        <h2 className="list-section-title">{title}</h2>
        {badge}
      </div>
      {showEnd && (
        <div className="list-section-bar-end">
          {actions}
          {!hideCount && count != null && <span className="list-section-count">{count} 件</span>}
        </div>
      )}
    </div>
  );
}
