const EVAL_CATEGORY_VARIANTS = {
  BASIC: 'blue',
  TECH: 'green',
  COMM: 'amber',
  PROJECT: 'purple',
  COMPLIANCE: 'rose',
  CUSTOMER: 'navy',
  LEARNING: 'cyan',
};

const INVALID_EVAL_ICONS = {
  'bi-handshake': 'bi-people-fill',
};

export function getEvalCategoryVariant(code) {
  return EVAL_CATEGORY_VARIANTS[code] || 'slate';
}

export function normalizeEvalIcon(icon) {
  if (!icon) return null;
  const normalized = INVALID_EVAL_ICONS[icon] || icon;
  return normalized.startsWith('bi-') ? normalized : `bi-${normalized}`;
}

export default function EvalCategorySectionHeader({ code, label, icon }) {
  const variant = getEvalCategoryVariant(code);
  const iconClass = normalizeEvalIcon(icon);

  return (
    <div className={`detail-section-header detail-section-header-${variant}`}>
      <div className="detail-section-header-main">
        {iconClass && (
          <i className={`bi ${iconClass} detail-section-header-icon`} aria-hidden="true" />
        )}
        <span className="detail-section-header-title">{label}</span>
      </div>
    </div>
  );
}
