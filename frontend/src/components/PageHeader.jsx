import PageGuideHelpButton from './guide/PageGuideHelpButton';

export default function PageHeader({
  guideId,
  icon,
  title,
  lead,
  children,
  className = '',
  iconClassName = '',
}) {
  return (
    <header
      className={`page-header d-flex flex-wrap justify-content-between align-items-center gap-2 ${className}`.trim()}
    >
      <div className="page-header-main">
        {icon && (
          <div className={`page-header-icon ${iconClassName}`.trim()} aria-hidden="true">
            <i className={`bi ${icon}`} />
          </div>
        )}
        <div>
          <div className="page-header-title-row">
            <h1 className="h3 mb-0">{title}</h1>
            {guideId && <PageGuideHelpButton guideId={guideId} />}
          </div>
          {lead && <p className="text-muted mb-0 small">{lead}</p>}
        </div>
      </div>
      {children ? (
        <div className="page-header-actions d-flex flex-wrap gap-2 align-items-center">{children}</div>
      ) : null}
    </header>
  );
}
