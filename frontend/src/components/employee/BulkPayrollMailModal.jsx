import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { useAppMessage } from '../../context/MessageContext';
import { currentTargetMonth, formatTargetMonthLabel } from '../../utils/fileCategories';
import { buildPayrollMailBody, buildPayrollMailSubject } from '../../utils/payrollMailTemplate';

const STATUS_META = {
  SENT: { label: '送信済', tone: 'success', icon: 'bi-check-circle-fill' },
  SKIPPED: { label: 'スキップ', tone: 'muted', icon: 'bi-dash-circle' },
  FAILED: { label: '失敗', tone: 'danger', icon: 'bi-x-circle-fill' },
  NOT_FOUND: { label: '未登録', tone: 'warning', icon: 'bi-person-x' },
};

function StepCard({ step, title, hint, children }) {
  return (
    <section className="bulk-payroll-step">
      <div className="bulk-payroll-step__head">
        <span className="bulk-payroll-step__no">{step}</span>
        <div>
          <h3 className="bulk-payroll-step__title">{title}</h3>
          {hint && <p className="bulk-payroll-step__hint">{hint}</p>}
        </div>
      </div>
      <div className="bulk-payroll-step__body">{children}</div>
    </section>
  );
}

function ResultStatusBadge({ status }) {
  const meta = STATUS_META[status] ?? { label: status, tone: 'muted', icon: 'bi-question-circle' };
  return (
    <span className={`bulk-payroll-result-badge bulk-payroll-result-badge--${meta.tone}`}>
      <i className={`bi ${meta.icon}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export default function BulkPayrollMailModal({ show, onClose, employees, initialTargetMonth }) {
  const { showMessage } = useAppMessage();
  const [targetMonth, setTargetMonth] = useState(initialTargetMonth || currentTargetMonth());
  const [extraMessage, setExtraMessage] = useState('');
  const [mailConfigured, setMailConfigured] = useState(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const previewEmployee = employees[0] ?? null;
  const previewSubject = useMemo(() => buildPayrollMailSubject(targetMonth), [targetMonth]);
  const previewBody = useMemo(
    () => buildPayrollMailBody(previewEmployee?.name, extraMessage),
    [previewEmployee?.name, extraMessage]
  );

  useEffect(() => {
    if (!show) return;
    setTargetMonth(initialTargetMonth || currentTargetMonth());
    setExtraMessage('');
    setResult(null);
    api.getPayrollMailStatus()
      .then((status) => setMailConfigured(status))
      .catch(() => setMailConfigured({ configured: false }));
  }, [show, initialTargetMonth]);

  if (!show) return null;

  const mailReady = mailConfigured?.configured;
  const canSend = mailReady && employees.length > 0 && !sending;

  async function handleSend() {
    if (!employees.length) {
      showMessage('送信対象の社員を選択してください', 'warning');
      return;
    }
    if (!window.confirm(`${employees.length} 名に給与明細メールを一括送信します。よろしいですか？`)) {
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const response = await api.sendBulkPayrollMail({
        targetMonth,
        employeeIds: employees.map((emp) => emp.id),
        extraMessage,
      });
      setResult(response);
      if (!response.mailConfigured) {
        showMessage('メール送信が未設定です。SMTP 設定を確認してください。', 'warning');
        return;
      }
      if (response.sentCount > 0) {
        showMessage(`${response.sentCount} 件のメールを送信しました`, 'success');
      } else {
        showMessage('送信できたメールはありません。結果を確認してください。', 'warning');
      }
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="modal d-block bulk-payroll-modal"
      tabIndex={-1}
      role="dialog"
      aria-labelledby="bulkPayrollModalTitle"
      aria-modal="true"
    >
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content bulk-payroll-modal__content">
          <div className="modal-header bulk-payroll-modal__header">
            <div className="bulk-payroll-modal__header-main">
              <span className="bulk-payroll-modal__header-icon" aria-hidden="true">
                <i className="bi bi-envelope-paper-heart" />
              </span>
              <div>
                <h2 id="bulkPayrollModalTitle" className="modal-title h5 mb-0">
                  給与明細一括送信
                </h2>
                <p className="bulk-payroll-modal__subtitle mb-0">
                  選択した社員へ、対象月の給与明細 PDF をメールで一括送付します
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="閉じる"
              onClick={onClose}
              disabled={sending}
            />
          </div>

          <div className="modal-body bulk-payroll-modal__body">
            {mailConfigured && (
              <div
                className={`bulk-payroll-modal__banner${mailReady ? ' bulk-payroll-modal__banner--ok' : ' bulk-payroll-modal__banner--warn'}`}
                role="status"
              >
                <i
                  className={`bi ${mailReady ? 'bi-envelope-check' : 'bi-exclamation-triangle-fill'}`}
                  aria-hidden="true"
                />
                <div>
                  {mailReady ? (
                    <>
                      <strong>メール送信の準備ができています</strong>
                      {mailConfigured.fromAddress && (
                        <span className="bulk-payroll-modal__banner-sub">
                          送信元：{mailConfigured.fromAddress}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <strong>メール送信が未設定です</strong>
                      <span className="bulk-payroll-modal__banner-sub">
                        SMTP 設定後に一括送信が利用できます（app.mail.enabled 等）
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="bulk-payroll-modal__stats">
              <div className="bulk-payroll-stat bulk-payroll-stat--primary">
                <span className="bulk-payroll-stat__label">送信対象</span>
                <span className="bulk-payroll-stat__value">
                  {employees.length}
                  <small>名</small>
                </span>
              </div>
              <div className="bulk-payroll-stat">
                <span className="bulk-payroll-stat__label">対象月</span>
                <span className="bulk-payroll-stat__value bulk-payroll-stat__value--text">
                  {formatTargetMonthLabel(targetMonth)}
                </span>
              </div>
              <div className="bulk-payroll-stat">
                <span className="bulk-payroll-stat__label">添付ファイル</span>
                <span className="bulk-payroll-stat__value bulk-payroll-stat__value--text">
                  給与明細 PDF
                </span>
              </div>
            </div>

            <div className="bulk-payroll-modal__layout">
              <div className="bulk-payroll-modal__settings">
                <StepCard
                  step="1"
                  title="対象月を指定"
                  hint={`${formatTargetMonthLabel(targetMonth)}分の給与明細を各社員に添付します`}
                >
                  <label className="bulk-payroll-field-label" htmlFor="bulkPayrollTargetMonth">
                    給与対象月
                  </label>
                  <input
                    id="bulkPayrollTargetMonth"
                    type="month"
                    className="form-control bulk-payroll-month-input"
                    value={targetMonth}
                    onChange={(e) => setTargetMonth(e.target.value)}
                    disabled={sending}
                  />
                </StepCard>

                <StepCard
                  step="2"
                  title="送信対象社員"
                  hint="社員一覧でチェックを入れた社員が対象です"
                >
                  {employees.length === 0 ? (
                    <div className="bulk-payroll-empty">
                      <i className="bi bi-person-x" aria-hidden="true" />
                      <p className="mb-0">社員が選択されていません。一覧に戻って選択してください。</p>
                    </div>
                  ) : (
                    <div className="bulk-payroll-recipient-grid" role="list">
                      {employees.map((emp) => (
                        <article key={emp.id} className="bulk-payroll-recipient-card" role="listitem">
                          <div className="bulk-payroll-recipient-card__avatar" aria-hidden="true">
                            <i className="bi bi-person-fill" />
                          </div>
                          <span className="bulk-payroll-recipient-card__code">{emp.employeeCode}</span>
                          <h4 className="bulk-payroll-recipient-card__name">{emp.name}</h4>
                          {emp.departmentName && (
                            <p className="bulk-payroll-recipient-card__dept">
                              <i className="bi bi-building" aria-hidden="true" />
                              {emp.departmentName}
                            </p>
                          )}
                          {emp.position && (
                            <p className="bulk-payroll-recipient-card__meta">{emp.position}</p>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </StepCard>

                <StepCard
                  step="3"
                  title="追記メッセージ（任意）"
                  hint="定型文の末尾・署名の前に追加されます"
                >
                  <label className="visually-hidden" htmlFor="bulkPayrollExtraMessage">
                    追記メッセージ
                  </label>
                  <textarea
                    id="bulkPayrollExtraMessage"
                    className="form-control"
                    rows={3}
                    value={extraMessage}
                    onChange={(e) => setExtraMessage(e.target.value)}
                    disabled={sending}
                    placeholder="例：今月分の給与明細を添付いたします。ご確認ください。"
                  />
                </StepCard>
              </div>

              <div className="bulk-payroll-modal__preview">
                <StepCard
                  step="4"
                  title="メールプレビュー"
                  hint={
                    previewEmployee
                      ? `表示例：${previewEmployee.name} さん宛（全員に個別送信）`
                      : '社員を選択するとプレビューが表示されます'
                  }
                >
                  <div className="bulk-payroll-mail-preview">
                    <div className="bulk-payroll-mail-preview__toolbar">
                      <span className="bulk-payroll-mail-preview__tag">件名</span>
                      <span className="bulk-payroll-mail-preview__subject">{previewSubject}</span>
                    </div>
                    <div className="bulk-payroll-mail-preview__meta">
                      <i className="bi bi-paperclip" aria-hidden="true" />
                      添付：{formatTargetMonthLabel(targetMonth)} 給与明細書.pdf（社員ごとに自動匹配）
                    </div>
                    <pre className="bulk-payroll-mail-preview__body">{previewBody}</pre>
                  </div>
                </StepCard>
              </div>
            </div>

            {result && (
              <section className="bulk-payroll-result" aria-live="polite">
                <div className="bulk-payroll-result__head">
                  <h3 className="bulk-payroll-result__title">送信結果</h3>
                  <div className="bulk-payroll-result__counts">
                    <span className="bulk-payroll-result__count bulk-payroll-result__count--success">
                      送信 {result.sentCount}
                    </span>
                    <span className="bulk-payroll-result__count bulk-payroll-result__count--muted">
                      スキップ {result.skippedCount}
                    </span>
                    <span className="bulk-payroll-result__count bulk-payroll-result__count--danger">
                      失敗 {result.failedCount}
                    </span>
                  </div>
                </div>
                <ul className="bulk-payroll-result__list">
                  {(result.items ?? []).map((item, index) => (
                    <li key={`${item.employeeId}-${item.status}-${index}`} className="bulk-payroll-result__item">
                      <ResultStatusBadge status={item.status} />
                      <div className="bulk-payroll-result__item-main">
                        <strong>
                          {item.employeeCode} {item.employeeName}
                        </strong>
                        <span>{item.message}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <div className="modal-footer bulk-payroll-modal__footer">
            <button
              type="button"
              className="btn btn-outline-secondary app-btn"
              onClick={onClose}
              disabled={sending}
            >
              閉じる
            </button>
            <button
              type="button"
              className="btn btn-primary app-btn bulk-payroll-modal__submit"
              onClick={handleSend}
              disabled={!canSend}
            >
              <i className="bi bi-send-fill" aria-hidden="true" />
              {sending ? '送信中…' : `一括送信（${employees.length} 名）`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
