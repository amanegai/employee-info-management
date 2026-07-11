import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { useAppMessage } from '../../context/MessageContext';
import {
  PERSONAL_INFO_SUMMARY_FIELDS,
  buildPersonalInfoSummaryFields,
  countPipelineCandidates,
  formatPersonalInfoSummaryPlainText,
} from '../../utils/personalInfoSummary';

const FIELD_GROUPS = [
  {
    title: '基本情報',
    icon: 'bi-person-vcard',
    keys: ['name', 'nationality', 'gender', 'affiliation', 'age', 'nearestStation'],
  },
  {
    title: '語学・スキル',
    icon: 'bi-translate',
    keys: ['japanese', 'english', 'experienceYears', 'engineeringPhase', 'specialtyLanguages'],
  },
  {
    title: '営業情報',
    icon: 'bi-briefcase',
    keys: ['unitPrice', 'workStart', 'salesStatus', 'progress'],
  },
];

const MULTILINE_KEYS = new Set(['specialtyLanguages']);

function SummaryField({ field, value, onChange }) {
  const { key, label } = field;
  const inputId = `personal-summary-${key}`;
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

export default function EmployeePersonalSummaryModal({ employee, onClose }) {
  const { showMessage } = useAppMessage();
  const [fields, setFields] = useState(() => buildPersonalInfoSummaryFields(employee));
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [candidates, setCandidates] = useState([]);

  const pipelineCount = useMemo(() => countPipelineCandidates(candidates), [candidates]);

  const fieldMap = useMemo(
    () => Object.fromEntries(PERSONAL_INFO_SUMMARY_FIELDS.map((field) => [field.key, field])),
    []
  );

  const previewText = useMemo(() => formatPersonalInfoSummaryPlainText(fields), [fields]);

  const regenerate = useCallback(
    (loadedCandidates) => {
      setFields(
        buildPersonalInfoSummaryFields(employee, {
          candidates: loadedCandidates,
        })
      );
    },
    [employee]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getEmployeeCandidates(employee.id)
      .then((loadedCandidates) => {
        if (cancelled) return;
        setCandidates(loadedCandidates ?? []);
        regenerate(loadedCandidates ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setCandidates([]);
        regenerate([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employee.id, regenerate]);

  function updateField(key, value) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCopy() {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(previewText);
      showMessage('個人情報サマリーをクリップボードにコピーしました', 'success');
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
        aria-labelledby="employeePersonalSummaryModalTitle"
      >
        <div className="modal-dialog modal-xl modal-dialog-scrollable personal-summary-modal">
          <div className="modal-content personal-summary-modal__content">
            <div className="modal-header personal-summary-modal__header">
              <div className="personal-summary-modal__header-main">
                <span className="personal-summary-modal__header-icon" aria-hidden="true">
                  <i className="bi bi-card-text" />
                </span>
                <div className="min-w-0">
                  <h2 className="modal-title h5 mb-0" id="employeePersonalSummaryModalTitle">
                    個人情報サマリー
                  </h2>
                  <p className="personal-summary-modal__subtitle mb-0">
                    {employee.name}
                    {!loading && pipelineCount > 0 && (
                      <span className="personal-summary-modal__badge">
                        選考中 {pipelineCount} 件
                      </span>
                    )}
                  </p>
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
              {loading ? (
                <div className="personal-summary-modal__loading">
                  <div className="spinner-border text-primary" role="status" />
                  <p className="text-muted small mt-3 mb-0">社員情報から生成中…</p>
                </div>
              ) : (
                <>
                  <div className="personal-summary-modal__banner">
                    <i className="bi bi-info-circle" aria-hidden="true" />
                    <div>
                      社員情報から自動生成しました。各項目を確認・修正してからコピーしてください。
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
                          <div className="personal-summary-section__body">
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
                </>
              )}
            </div>

            <div className="modal-footer personal-summary-modal__footer">
              <button
                type="button"
                className="btn btn-outline-secondary app-btn"
                onClick={() => regenerate(candidates)}
                disabled={loading}
              >
                <i className="bi bi-arrow-clockwise" aria-hidden="true" />
                再生成
              </button>
              <button
                type="button"
                className="btn btn-primary app-btn personal-summary-modal__copy-btn"
                onClick={handleCopy}
                disabled={loading || copying}
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
