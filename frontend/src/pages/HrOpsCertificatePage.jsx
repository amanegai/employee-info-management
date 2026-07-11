import { useEffect, useMemo, useRef, useState } from 'react';

import { api } from '../api';

import HrOpsDocumentPreview from '../components/hrOps/HrOpsDocumentPreview';

import HrOpsPayrollEmployeePicker from '../components/hrOps/HrOpsPayrollEmployeePicker';

import HrOpsTaskShell from '../components/hrOps/HrOpsTaskShell';

import { useAppMessage } from '../context/MessageContext';

import {

  buildCertificateHtml,

  CERTIFICATE_TYPES,

  saveCertificateToFiles,

} from '../utils/certificateDocument';

import { findHrOpsBusinessType } from '../utils/hrOpsBusinessTypes';



const BUSINESS_TYPE = findHrOpsBusinessType('certificate');



const INITIAL_FORM = {

  employeeId: '',

  certificateType: '',

  companyName: '',

  issuerName: '人事部',

  recipient: '',

  purpose: '',

  issueDate: new Date().toISOString().slice(0, 10),

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



export default function HrOpsCertificatePage() {

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



  const selectedType = CERTIFICATE_TYPES.find((t) => t.value === form.certificateType);



  const previewHtml = useMemo(() => {

    if (!employee || !form.certificateType) return '';

    return buildCertificateHtml(employee, form);

  }, [employee, form]);



  function updateField(key, value) {

    setForm((prev) => ({ ...prev, [key]: value }));

  }



  function selectCertificateType(value) {
    setForm((prev) => {
      if (prev.certificateType === value) return prev;
      return {
        ...INITIAL_FORM,
        certificateType: value,
        issueDate: new Date().toISOString().slice(0, 10),
      };
    });
    setEmployee(null);
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

    if (!form.certificateType) {

      showMessage('証明書種別を選択してください', 'warning');

      return;

    }

    if (!employee) {

      showMessage('対象社員を選択してください', 'warning');

      return;

    }

    setSavingFile(true);

    try {

      await saveCertificateToFiles(api, employee, form);

      showMessage('ファイル管理に保存しました（証明書）', 'success');

    } catch (e) {

      showMessage(e.message, 'danger');

    } finally {

      setSavingFile(false);

    }

  }



  return (

    <HrOpsTaskShell businessType={BUSINESS_TYPE} guideId="hr-ops-certificate">

      <div className="row g-4 payroll-workspace">

        <div className="col-lg-6">

          <section className="payroll-sidebar">

            <div className="payroll-sidebar-header">

              <div>

                <h2 className="payroll-sidebar-title">証明書の作成</h2>

                <p className="payroll-sidebar-desc mb-0">

                  証明書種別と対象社員を選び、内容を確認して保存します

                </p>

              </div>

              <span className="payroll-sidebar-badge hr-ops-doc-badge-cert">

                <i className="bi bi-award" aria-hidden="true" />

                書類作成

              </span>

            </div>



            <div className="payroll-picker-step">

              <div className="payroll-picker-step-label">

                <span className="payroll-picker-step-no">1</span>

                証明書種別

              </div>

              <div className="hr-ops-send-type-grid" role="radiogroup" aria-label="証明書種別">

                {CERTIFICATE_TYPES.map((type) => {

                  const selected = form.certificateType === type.value;

                  return (

                    <button

                      key={type.value}

                      type="button"

                      role="radio"

                      aria-checked={selected}

                      className={`hr-ops-send-type-card${selected ? ' is-selected' : ''}`}

                      onClick={() => selectCertificateType(type.value)}

                    >

                      <i className={`bi ${type.icon}`} aria-hidden="true" />

                      <strong>{type.label}</strong>

                      <span>{type.desc}</span>

                    </button>

                  );

                })}

              </div>

            </div>



            {form.certificateType && (

              <div className="payroll-picker-step">

                <div className="payroll-picker-step-label">

                  <span className="payroll-picker-step-no">2</span>

                  対象社員

                </div>

                <HrOpsPayrollEmployeePicker
                  key={form.certificateType}
                  value={form.employeeId}
                  onChange={(value) => updateField('employeeId', value)}
                  disabled={loadingEmployee}
                  embedded
                />

              </div>

            )}



            {form.certificateType && employee && (

              <>

                <div className="payroll-section-card">

                  <div className="payroll-section-card-title">

                    <i className="bi bi-pencil-square" aria-hidden="true" />

                    証明書内容

                    {selectedType && <span className="hr-ops-doc-type-chip">{selectedType.label}</span>}

                  </div>

                  <div className="hr-ops-doc-fields">

                    <FormField label="会社名" htmlFor="companyName">

                      <input

                        id="companyName"

                        type="text"

                        className="form-control"

                        value={form.companyName}

                        onChange={(e) => updateField('companyName', e.target.value)}

                        placeholder="例：株式会社○○"

                      />

                    </FormField>

                    <FormField label="発行部署" htmlFor="issuerName">

                      <input

                        id="issuerName"

                        type="text"

                        className="form-control"

                        value={form.issuerName}

                        onChange={(e) => updateField('issuerName', e.target.value)}

                      />

                    </FormField>

                    <FormField label="提出先" htmlFor="recipient" hint="任意。銀行・役所など">

                      <input

                        id="recipient"

                        type="text"

                        className="form-control"

                        value={form.recipient}

                        onChange={(e) => updateField('recipient', e.target.value)}

                        placeholder="例：○○銀行"

                      />

                    </FormField>

                    <FormField label="用途・本文" htmlFor="purpose" hint="任意。証明書冒頭の説明文">

                      <textarea

                        id="purpose"

                        className="form-control"

                        rows={3}

                        value={form.purpose}

                        onChange={(e) => updateField('purpose', e.target.value)}

                        placeholder="例：ローン申込のため"

                      />

                    </FormField>

                    <FormField label="発行日" htmlFor="issueDate" required>

                      <input

                        id="issueDate"

                        type="date"

                        className="form-control"

                        value={form.issueDate}

                        onChange={(e) => updateField('issueDate', e.target.value)}

                      />

                    </FormField>

                  </div>

                </div>



                <div className="payroll-action-bar">

                  <button

                    type="button"

                    className="btn btn-primary app-btn"

                    onClick={handlePrint}

                    disabled={loadingEmployee}

                  >

                    <i className="bi bi-printer" aria-hidden="true" />

                    印刷 / PDF保存

                  </button>

                  <button

                    type="button"

                    className="btn btn-outline-primary app-btn"

                    onClick={handleSaveToFiles}

                    disabled={loadingEmployee || savingFile}

                  >

                    <i className="bi bi-folder-plus" aria-hidden="true" />

                    {savingFile ? '保存中…' : 'ファイル管理へ保存'}

                  </button>

                </div>

              </>

            )}



            {form.certificateType && !employee && !loadingEmployee && (

              <div className="payroll-empty-hint">

                <i className="bi bi-arrow-up-circle" aria-hidden="true" />

                対象社員を選択すると証明書内容を編集できます

              </div>

            )}



            {loadingEmployee && (

              <div className="payroll-picker-loading py-4">

                <div className="spinner-border spinner-border-sm text-primary" role="status" />

                <span>社員情報を読み込み中…</span>

              </div>

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

              {!form.certificateType ? (

                <div className="hr-ops-doc-preview-empty">

                  <i className="bi bi-award" aria-hidden="true" />

                  <p>証明書種別を選択してください</p>

                </div>

              ) : !form.employeeId ? (

                <div className="hr-ops-doc-preview-empty">

                  <i className="bi bi-person" aria-hidden="true" />

                  <p>対象社員を選択してください</p>

                </div>

              ) : (

                <HrOpsDocumentPreview

                  html={previewHtml}

                  title={employee ? `${employee.name}の${selectedType?.label ?? '証明書'}` : '証明書プレビュー'}

                  ref={iframeRef}

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


