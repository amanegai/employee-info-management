export default function SectionCard({ title, icon, headerColor, variant, headerExtra, children, className = '' }) {
  const headerClassName = variant
    ? `detail-section-header detail-section-header-${variant}`
    : 'detail-section-header';

  return (
    <div className={`detail-section-card ${className}`}>
      <div
        className={headerClassName}
        style={!variant && headerColor ? { background: headerColor } : undefined}
      >
        <div className="detail-section-header-main">
          {icon && <i className={`bi ${icon} detail-section-header-icon`} aria-hidden="true" />}
          <span className="detail-section-header-title">{title}</span>
        </div>
        {headerExtra ? <div className="detail-section-header-extra">{headerExtra}</div> : null}
      </div>
      <div className="detail-section-body">{children}</div>
    </div>
  );
}
