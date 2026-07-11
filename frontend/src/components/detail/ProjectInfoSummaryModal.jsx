import { useMemo, useState } from 'react';
import { useAppMessage } from '../../context/MessageContext';
import {
  PROJECT_INFO_SUMMARY_FIELDS,
  buildProjectInfoSummaryFields,
  formatProjectInfoSummaryPlainText,
} from '../../utils/projectInfoSummary';

const FIELD_GROUPS = [
  {
    title: '案件情報',
    icon: 'bi-briefcase',
    keys: ['projectName', 'location', 'recruitment', 'requiredSkills', 'optionalSkills'],
  },
];

const MULTILINE_KEYS = new Set(['requiredSkills', 'optionalSkills']);

function SummaryField({ field, value, onChange }) {
  const { key, label } = field;
  const inputId = `project-summary-${key}`;
  const isMultiline = MULTILINE_KEYS.has(key);

  return (
    <div className="personal-summary-field">
      <label className="personal-summary-field__label" htmlFor={inputId}>
        {label}
      </label>
      {isMultiline ? (
        <textarea
          id={inputId}
          className="form-control personal-summary-field__input personal-summary-field__textarea"
          rows={2}
          value={value}
          onChange={(e) => onChange(key, e.target.value)}
        />
      ) : (
        <input
          id={inputId}
          type="text"
          className="form-control personal-summary-field__input"
          value={value}
          onChange={(e) => onChange(key, e.target.value)}
        />
      )}
    </div>
  );
}

export default function ProjectInfoSummaryModal({ project, onClose }) {
  const { showMessage } = useAppMessage();
  const [fields, setFields] = useState(() => buildProjectInfoSummaryFields(project));
  const [copying, setCopying] = useState(false);

  const fieldMap = useMemo(
    () => Object.fromEntries(PROJECT_INFO_SUMMARY_FIELDS.map((field) => [field.key, field])),
    [],
  );

  const previewText = useMemo(() => formatProjectInfoSummaryPlainText(fields), [fields]);

  function regenerate() {
    setFields(buildProjectInfoSummaryFields(project));
  }

  function updateField(key, value) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCopy() {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(previewText);
      showMessage('案件情報サマリをクリップボードにコピーしました', 'success');
    } catch {
      showMessage('コピーに失敗しました', 'danger');
    } finally {
      setCopying(false);
    }
  }

  return (
    <>
      <div
        className="modal fade show d-block personal-summary-modal-root"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="projectInfoSummaryModalTitle"
      >
        <div className="modal-dialog modal-xl modal-dialog-scrollable personal-summary-modal">
          <div className="modal-content personal-summary-modal__content">
            <div className="modal-header personal-summary-modal__header">
              <div className="personal-summary-modal__header-main">
                <span className="personal-summary-modal__header-icon" aria-hidden="true">
                  <i className="bi bi-card-text" />
                </span>
                <div className="min-w-0">
                  <h2 className="modal-title h5 mb-0" id="projectInfoSummaryModalTitle">
                    案件情報サマリ
                  </h2>
                  <p className="personal-summary-modal__subtitle mb-0">{project.projectName}</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                aria-label="閉じる"
                onClick={onClose}
              />
            </div>

            <div className="modal-body personal-summary-modal__body">
              <div className="personal-summary-modal__banner">
                <i className="bi bi-info-circle" aria-hidden="true" />
                <div>
                  案件情報から自動生成しました。各項目を確認・修正してからコピーしてください。
                </div>
              </div>

              <div className="personal-summary-modal__layout">
                <div className="personal-summary-modal__editor">
                  {FIELD_GROUPS.map((group) => (
                    <section key={group.title} className="personal-summary-section">
                      <header className="personal-summary-section__head">
                        <i className={`bi ${group.icon}`} aria-hidden="true" />
                        <h3 className="personal-summary-section__title">{group.title}</h3>
                      </header>
                      <div className="personal-summary-section__body personal-summary-section__body--stacked">
                        {group.keys.map((key) => {
                          const field = fieldMap[key];
                          if (!field) return null;
                          return (
                            <SummaryField
                              key={key}
                              field={field}
                              value={fields[key] ?? ''}
                              onChange={updateField}
                            />
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>

                <aside className="personal-summary-modal__preview-panel">
                  <div className="personal-summary-preview-card">
                    <header className="personal-summary-preview-card__head">
                      <span className="personal-summary-preview-card__title">
                        <i className="bi bi-eye" aria-hidden="true" />
                        プレビュー
                      </span>
                      <span className="personal-summary-preview-card__hint">コピー形式</span>
                    </header>
                    <div className="personal-summary-preview-card__body">
                      <pre className="personal-summary-preview-card__text">{previewText}</pre>
                    </div>
                  </div>
                </aside>
              </div>
            </div>

            <div className="modal-footer personal-summary-modal__footer">
              <button type="button" className="btn btn-outline-secondary app-btn" onClick={regenerate}>
                <i className="bi bi-arrow-clockwise" aria-hidden="true" />
                再生成
              </button>
              <button
                type="button"
                className="btn btn-primary app-btn personal-summary-modal__copy-btn"
                onClick={handleCopy}
                disabled={copying}
              >
                <i className="bi bi-clipboard-check" aria-hidden="true" />
                {copying ? 'コピー中…' : 'コピー'}
              </button>
              <button type="button" className="btn btn-outline-secondary app-btn" onClick={onClose}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show personal-summary-modal-backdrop" onClick={onClose} />
    </>
  );
}
