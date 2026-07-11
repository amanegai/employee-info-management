import { useCallback, useEffect, useMemo, useState } from 'react';
import JapaneseEraDateInput from './JapaneseEraDateInput';

const SECTION_ICONS = {
  header: 'bi-card-heading',
  'sec-1': 'bi-person-heart',
  'sec-2': 'bi-calendar-heart',
  'sec-3-1': 'bi-calendar-range',
  'sec-3-2': 'bi-clipboard-check',
  'sec-4-1': 'bi-calendar-range',
  'sec-4-2': 'bi-clipboard-check',
  'sec-5-1': 'bi-calendar-range',
  'sec-5-2': 'bi-clipboard-check',
  'sec-3': 'bi-calendar-range',
  'sec-4': 'bi-clipboard-check',
};

const DEFAULT_OPEN_IDS = new Set();

function inferFieldGroup(field, sectionId) {
  if (/1回目/.test(field.label)) return '1回目';
  if (/2回目/.test(field.label)) return '2回目';
  if (sectionId === 'sec-5-1') return '休業期間';
  if (sectionId === 'sec-3') return '休業期間';
  return null;
}

function groupFields(fields, sectionId) {
  const groups = [];
  let current = { name: null, fields: [] };

  fields.forEach((field) => {
    const groupName = field.group ?? inferFieldGroup(field, sectionId);
    if (groupName !== current.name) {
      if (current.fields.length) groups.push(current);
      current = { name: groupName, fields: [field] };
    } else {
      current.fields.push(field);
    }
  });
  if (current.fields.length) groups.push(current);
  return groups;
}

function isFieldFilled(form, field) {
  const value = form[field.key];
  if (value == null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  return Boolean(value);
}

function sectionStats(section, form) {
  const required = section.fields.filter((f) => f.required);
  const requiredDone = required.filter((f) => isFieldFilled(form, f)).length;
  const filled = section.fields.filter((f) => isFieldFilled(form, f)).length;
  return {
    requiredTotal: required.length,
    requiredDone,
    filled,
    total: section.fields.length,
    complete: required.length === 0 ? filled > 0 : requiredDone === required.length,
  };
}

function EditFormField({ label, htmlFor, required, hint, wide, children }) {
  return (
    <div className={`hr-ops-app-edit-field${wide ? ' hr-ops-app-edit-field--wide' : ''}`}>
      <label className="hr-ops-app-edit-field-label" htmlFor={htmlFor}>
        {label}
        {required && <span className="hr-ops-app-edit-required">必須</span>}
      </label>
      {children}
      {hint &&
        (hint.length > 55 ? (
          <details className="hr-ops-app-edit-hint-details">
            <summary>説明を表示</summary>
            <p>{hint}</p>
          </details>
        ) : (
          <p className="hr-ops-app-edit-hint">{hint}</p>
        ))}
    </div>
  );
}

function EditFieldControl({ field, form, updateField, disabled }) {
  const id = `cl-${field.key}`;
  const value = form[field.key] ?? '';
  const wide = field.wide || field.type === 'textarea' || (field.hint?.length ?? 0) > 60;

  if (field.type === 'date') {
    return (
      <EditFormField label={field.label} htmlFor={id} required={field.required} hint={field.hint} wide={wide}>
        <JapaneseEraDateInput
          id={id}
          value={value}
          disabled={disabled}
          futureBuffer={15}
          onChange={(next) => updateField(field.key, next)}
        />
      </EditFormField>
    );
  }

  if (field.type === 'textarea') {
    return (
      <EditFormField label={field.label} htmlFor={id} required={field.required} hint={field.hint} wide>
        <textarea
          id={id}
          className="form-control hr-ops-app-edit-textarea"
          rows={2}
          value={value}
          disabled={disabled}
          onChange={(e) => updateField(field.key, e.target.value)}
        />
      </EditFormField>
    );
  }

  if (field.type === 'select') {
    return (
      <EditFormField label={field.label} htmlFor={id} required={field.required} hint={field.hint} wide={wide}>
        <select
          id={id}
          className="form-select"
          value={value}
          disabled={disabled}
          onChange={(e) => updateField(field.key, e.target.value)}
        >
          {(field.options ?? []).map((opt) => (
            <option key={opt.value || '_empty'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </EditFormField>
    );
  }

  return (
    <EditFormField label={field.label} htmlFor={id} required={field.required} hint={field.hint} wide={wide}>
      <input
        id={id}
        type="text"
        className="form-control"
        value={value}
        disabled={disabled}
        placeholder={field.placeholder}
        onChange={(e) => updateField(field.key, e.target.value)}
      />
    </EditFormField>
  );
}

function SectionBadge({ stats }) {
  if (stats.requiredTotal > 0) {
    const done = stats.requiredDone === stats.requiredTotal;
    return (
      <span className={`hr-ops-app-edit-badge${done ? ' is-done' : ' is-required'}`}>
        {done ? '必須完了' : `必須 ${stats.requiredDone}/${stats.requiredTotal}`}
      </span>
    );
  }
  if (stats.filled > 0) {
    return (
      <span className="hr-ops-app-edit-badge is-partial">
        {stats.filled}/{stats.total} 入力
      </span>
    );
  }
  return <span className="hr-ops-app-edit-badge is-empty">未入力</span>;
}

export default function ChildcareApplicationEditPanel({ sections, form, updateField, disabled }) {
  const [openIds, setOpenIds] = useState(() => new Set(DEFAULT_OPEN_IDS));

  useEffect(() => {
    setOpenIds(new Set(DEFAULT_OPEN_IDS));
  }, [sections]);

  const overview = useMemo(() => {
    let requiredTotal = 0;
    let requiredDone = 0;
    let filled = 0;
    let total = 0;
    sections.forEach((section) => {
      const stats = sectionStats(section, form);
      requiredTotal += stats.requiredTotal;
      requiredDone += stats.requiredDone;
      filled += stats.filled;
      total += stats.total;
    });
    return { requiredTotal, requiredDone, filled, total, sectionCount: sections.length };
  }, [sections, form]);

  const toggleSection = useCallback((id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setOpenIds(new Set(sections.map((s) => s.id ?? s.title)));
  }, [sections]);

  const collapseAll = useCallback(() => {
    setOpenIds(new Set());
  }, []);

  return (
    <div className="hr-ops-app-edit-panel">
      <div className="hr-ops-app-edit-overview">
        <div className="hr-ops-app-edit-overview-main">
          <span className="hr-ops-app-edit-overview-count">{overview.sectionCount} セクション</span>
          <span className="hr-ops-app-edit-overview-dot" aria-hidden="true">
            ·
          </span>
          <span className="hr-ops-app-edit-overview-filled">
            {overview.filled}/{overview.total} 項目入力済
          </span>
          {overview.requiredTotal > 0 && (
            <>
              <span className="hr-ops-app-edit-overview-dot" aria-hidden="true">
                ·
              </span>
              <span
                className={`hr-ops-app-edit-overview-required${overview.requiredDone === overview.requiredTotal ? ' is-done' : ''}`}
              >
                必須 {overview.requiredDone}/{overview.requiredTotal}
              </span>
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
          const sectionId = section.id ?? section.title;
          const isOpen = openIds.has(sectionId);
          const stats = sectionStats(section, form);
          const icon = section.icon ?? SECTION_ICONS[sectionId] ?? 'bi-journal-text';
          const fieldGroups = groupFields(section.fields, sectionId);

          return (
            <article
              key={sectionId}
              className={`hr-ops-app-edit-section${isOpen ? ' is-open' : ''}${stats.complete ? ' is-complete' : ''}`}
            >
              <button
                type="button"
                className="hr-ops-app-edit-section-head"
                aria-expanded={isOpen}
                onClick={() => toggleSection(sectionId)}
              >
                <span className="hr-ops-app-edit-section-icon" aria-hidden="true">
                  <i className={`bi ${icon}`} />
                </span>
                <span className="hr-ops-app-edit-section-text">
                  <strong>{section.title}</strong>
                  {section.description && <span>{section.description}</span>}
                </span>
                <SectionBadge stats={stats} />
                <i className={`bi bi-chevron-down hr-ops-app-edit-chevron${isOpen ? ' is-open' : ''}`} aria-hidden="true" />
              </button>

              {isOpen && (
                <div className="hr-ops-app-edit-section-body">
                  {fieldGroups.map((group) => (
                    <div key={group.name ?? '_default'} className="hr-ops-app-edit-group">
                      {group.name && <div className="hr-ops-app-edit-group-label">{group.name}</div>}
                      <div className="hr-ops-app-edit-grid">
                        {group.fields.map((field) => (
                          <EditFieldControl
                            key={field.key}
                            field={field}
                            form={form}
                            updateField={updateField}
                            disabled={disabled}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
