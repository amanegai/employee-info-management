import { useCallback, useState } from 'react';

export default function HrOpsCollapsibleSections({
  sections,
  defaultOpenIds = [],
  overviewExtra = null,
}) {
  const [openIds, setOpenIds] = useState(() => new Set(defaultOpenIds));

  const toggleSection = useCallback((id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setOpenIds(new Set(sections.map((section) => section.id)));
  }, [sections]);

  const collapseAll = useCallback(() => {
    setOpenIds(new Set());
  }, []);

  return (
    <div className="hr-ops-app-edit-panel">
      <div className="hr-ops-app-edit-overview">
        <div className="hr-ops-app-edit-overview-main">
          <span className="hr-ops-app-edit-overview-count">{sections.length} セクション</span>
          {overviewExtra && (
            <>
              <span className="hr-ops-app-edit-overview-dot" aria-hidden="true">
                ·
              </span>
              {overviewExtra}
            </>
          )}
        </div>
        <div className="hr-ops-app-edit-overview-actions">
          <button type="button" className="btn btn-link btn-sm hr-ops-app-edit-link-btn" onClick={expandAll}>
            すべて開く
          </button>
          <button type="button" className="btn btn-link btn-sm hr-ops-app-edit-link-btn" onClick={collapseAll}>
            すべて閉じる
          </button>
        </div>
      </div>

      <div className="hr-ops-app-edit-sections">
        {sections.map((section) => {
          const isOpen = openIds.has(section.id);
          const icon = section.icon ?? 'bi-journal-text';

          return (
            <article
              key={section.id}
              className={`hr-ops-app-edit-section${isOpen ? ' is-open' : ''}${section.complete ? ' is-complete' : ''}`}
            >
              <button
                type="button"
                className="hr-ops-app-edit-section-head"
                aria-expanded={isOpen}
                onClick={() => toggleSection(section.id)}
              >
                <span className="hr-ops-app-edit-section-icon" aria-hidden="true">
                  <i className={`bi ${icon}`} />
                </span>
                <span className="hr-ops-app-edit-section-text">
                  <strong>{section.title}</strong>
                  {section.description && <span>{section.description}</span>}
                </span>
                {section.badge && (
                  <span className={`hr-ops-app-edit-badge${section.badgeTone ? ` is-${section.badgeTone}` : ' is-partial'}`}>
                    {section.badge}
                  </span>
                )}
                <i
                  className={`bi bi-chevron-down hr-ops-app-edit-chevron${isOpen ? ' is-open' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {isOpen && <div className="hr-ops-app-edit-section-body">{section.children}</div>}
            </article>
          );
        })}
      </div>
    </div>
  );
}
