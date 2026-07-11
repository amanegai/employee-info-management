import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import HrOpsDocumentPreview from '../components/hrOps/HrOpsDocumentPreview';
import HrOpsPayrollEmployeePicker from '../components/hrOps/HrOpsPayrollEmployeePicker';
import HrOpsTaskShell from '../components/hrOps/HrOpsTaskShell';
import { useAppMessage } from '../context/MessageContext';
import {
  APPLICATION_TYPES,
  buildApplicationHtml,
  saveApplicationToFiles,
} from '../utils/applicationDocument';
import { findHrOpsBusinessType } from '../utils/hrOpsBusinessTypes';

const BUSINESS_TYPE = findHrOpsBusinessType('application');

const INITIAL_FORM = {
  employeeId: '',
  applicationType: '',
  companyName: '',
  submitDate: new Date().toISOString().slice(0, 10),
  newAddress: '',
  effectiveDate: '',
  leaveType: '有給休暇',
  leavePeriod: '',
  reason: '',
  subject: '',
  content: '',
  remarks: '',
};

function FormField({ label, htmlFor, required, hint, children }) {
  return (
    <div className="hr-ops-doc-field">
      <label className="hr-ops-doc-field-label" htmlFor={htmlFor}>
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {hint && <p className="hr-ops-doc-field-hint">{hint}</p>}
    </div>
  );
}

export default function HrOpsApplicationPage() {
  const { showMessage } = useAppMessage();
  const iframeRef = useRef(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [employee, setEmployee] = useState(null);
  const [loadingEmployee, setLoadingEmployee] = useState(false);
  const [savingFile, setSavingFile] = useState(false);

  useEffect(() => {
    if (!form.employeeId) {
      setEmployee(null);
      return;
    }
    let cancelled = false;
    setLoadingEmployee(true);
    api
      .getEmployeeDetail(form.employeeId)
      .then((detail) => {
        if (!cancelled) setEmployee(detail);
      })
      .catch((e) => {
        if (!cancelled) {
          showMessage(e.message, 'danger');
          setEmployee(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingEmployee(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.employeeId, showMessage]);

  const selectedType = APPLICATION_TYPES.find((t) => t.value === form.applicationType);

  const previewHtml = useMemo(() => {
    if (!employee || !form.applicationType) return '';
    return buildApplicationHtml(employee, form);
  }, [employee, form]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function selectApplicationType(value) {
    setForm((prev) => ({
      ...INITIAL_FORM,
      applicationType: value,
      submitDate: prev.submitDate,
    }));
  }

  function handlePrint() {
    const win = iframeRef.current?.contentWindow;
    if (!win) {
      showMessage('プレビューを生成してから印刷してください', 'warning');
      return;
    }
    win.focus();
    win.print();
  }

  async function handleSaveToFiles() {
    if (!form.applicationType) {
      showMessage('申請書種別を選択してください', 'warning');
      return;
    }
    if (!employee) {
      showMessage('対象社員を選択してください', 'warning');
      return;
    }
    setSavingFile(true);
    try {
      await saveApplicationToFiles(api, employee, form);
      showMessage('ファイル管理に保存しました（その他）', 'success');
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setSavingFile(false);
    }
  }

  return (
    <HrOpsTaskShell businessType={BUSINESS_TYPE} guideId="hr-ops-application">
      <div className="row g-4 payroll-workspace">
        <div className="col-lg-6">
          <section className="payroll-sidebar">
            <div className="payroll-sidebar-header">
              <div>
                <h2 className="payroll-sidebar-title">各種申請書の作成</h2>
                <p className="payroll-sidebar-desc mb-0">種別と社員を選び、内容を確認して保存します</p>
              </div>
              <span className="payroll-sidebar-badge hr-ops-doc-badge-app">
                <i className="bi bi-file-earmark-ruled" aria-hidden="true" />
                申請書
              </span>
            </div>

            <div className="payroll-picker-step">
              <div className="payroll-picker-step-label">
                <span className="payroll-picker-step-no">1</span>
                申請書種別
              </div>
              <div className="hr-ops-send-type-grid" role="radiogroup" aria-label="申請書種別">
                {APPLICATION_TYPES.map((type) => {
                  const selected = form.applicationType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`hr-ops-send-type-card${selected ? ' is-selected' : ''}`}
                      onClick={() => selectApplicationType(type.value)}
                    >
                      <i className={`bi ${type.icon}`} aria-hidden="true" />
                      <strong>{type.label}</strong>
                      <span>{type.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {form.applicationType && (
              <>
                <div className="payroll-picker-step">
                  <div className="payroll-picker-step-label">
                    <span className="payroll-picker-step-no">2</span>
                    対象社員
                  </div>
                  <HrOpsPayrollEmployeePicker
                    value={form.employeeId}
                    onChange={(value) => updateField('employeeId', value)}
                    disabled={loadingEmployee}
                    embedded
                  />
                </div>

                <div className="payroll-section-card">
                  <div className="payroll-section-card-title">
                    <i className="bi bi-pencil-square" aria-hidden="true" />
                    申請内容
                    {selectedType && <span className="hr-ops-doc-type-chip">{selectedType.label}</span>}
                  </div>
                  <div className="hr-ops-doc-fields">
                    <FormField label="会社名" htmlFor="appCompanyName">
                      <input
                        id="appCompanyName"
                        type="text"
                        className="form-control"
                        value={form.companyName}
                        onChange={(e) => updateField('companyName', e.target.value)}
                        placeholder="例：株式会社○○"
                        disabled={!employee}
                      />
                    </FormField>
                    <FormField label="提出日" htmlFor="submitDate" required>
                      <input
                        id="submitDate"
                        type="date"
                        className="form-control"
                        value={form.submitDate}
                        onChange={(e) => updateField('submitDate', e.target.value)}
                        disabled={!employee}
                      />
                    </FormField>

                    {form.applicationType === 'ADDRESS_CHANGE' && (
                      <>
                        <FormField label="新住所" htmlFor="newAddress" required>
                          <input
                            id="newAddress"
                            type="text"
                            className="form-control"
                            value={form.newAddress}
                            onChange={(e) => updateField('newAddress', e.target.value)}
                            disabled={!employee}
                          />
                        </FormField>
                        <FormField label="変更予定日" htmlFor="effectiveDate">
                          <input
                            id="effectiveDate"
                            type="date"
                            className="form-control"
                            value={form.effectiveDate}
                            onChange={(e) => updateField('effectiveDate', e.target.value)}
                            disabled={!employee}
                          />
                        </FormField>
                      </>
                    )}

                    {form.applicationType === 'LEAVE' && (
                      <>
                        <FormField label="休暇種別" htmlFor="leaveType">
                          <input
                            id="leaveType"
                            type="text"
                            className="form-control"
                            value={form.leaveType}
                            onChange={(e) => updateField('leaveType', e.target.value)}
                            disabled={!employee}
                          />
                        </FormField>
                        <FormField label="期間" htmlFor="leavePeriod" required hint="例：2026年6月1日〜2026年6月3日">
                          <input
                            id="leavePeriod"
                            type="text"
                            className="form-control"
                            value={form.leavePeriod}
                            onChange={(e) => updateField('leavePeriod', e.target.value)}
                            disabled={!employee}
                          />
                        </FormField>
                        <FormField label="理由" htmlFor="reason">
                          <textarea
                            id="reason"
                            className="form-control"
                            rows={2}
                            value={form.reason}
                            onChange={(e) => updateField('reason', e.target.value)}
                            disabled={!employee}
                          />
                        </FormField>
                      </>
                    )}

                    {form.applicationType === 'GENERAL' && (
                      <>
                        <FormField label="件名" htmlFor="subject">
                          <input
                            id="subject"
                            type="text"
                            className="form-control"
                            value={form.subject}
                            onChange={(e) => updateField('subject', e.target.value)}
                            disabled={!employee}
                          />
                        </FormField>
                        <FormField label="申請内容" htmlFor="content" required>
                          <textarea
                            id="content"
                            className="form-control"
                            rows={4}
                            value={form.content}
                            onChange={(e) => updateField('content', e.target.value)}
                            disabled={!employee}
                          />
                        </FormField>
                      </>
                    )}

                    <FormField label="備考" htmlFor="remarks">
                      <textarea
                        id="remarks"
                        className="form-control"
                        rows={2}
                        value={form.remarks}
                        onChange={(e) => updateField('remarks', e.target.value)}
                        disabled={!employee}
                      />
                    </FormField>
                  </div>
                </div>

                <div className="payroll-action-bar">
                  <button
                    type="button"
                    className="btn btn-primary app-btn"
                    onClick={handlePrint}
                    disabled={!employee || loadingEmployee}
                  >
                    <i className="bi bi-printer" aria-hidden="true" />
                    印刷 / PDF保存
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-primary app-btn"
                    onClick={handleSaveToFiles}
                    disabled={!employee || loadingEmployee || savingFile}
                  >
                    <i className="bi bi-folder-plus" aria-hidden="true" />
                    {savingFile ? '保存中…' : 'ファイル管理へ保存'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>

        <div className="col-lg-6">
          <section className="list-section-panel hr-ops-preview-panel payroll-preview-panel">
            <div className="list-section-body list-section-body-padded p-0">
              <div className="hr-ops-preview-toolbar">
                <span className="small text-muted">
                  プレビュー
                  {employee && selectedType ? ` — ${employee.name} / ${selectedType.label}` : ''}
                </span>
                {loadingEmployee && (
                  <span className="spinner-border spinner-border-sm text-primary" role="status" />
                )}
              </div>
              {!form.applicationType ? (
                <div className="hr-ops-doc-preview-empty">
                  <i className="bi bi-file-earmark-ruled" aria-hidden="true" />
                  <p>左側で申請書種別を選択してください</p>
                </div>
              ) : (
                <HrOpsDocumentPreview
                  ref={iframeRef}
                  html={previewHtml}
                  title={employee ? `${employee.name}の申請書` : '申請書プレビュー'}
                  fitContent
                  fitContentExtra={48}
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </HrOpsTaskShell>
  );
}
