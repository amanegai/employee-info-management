import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import HrOpsCollapsibleSections from '../components/hrOps/HrOpsCollapsibleSections';
import HrOpsDocumentPreview from '../components/hrOps/HrOpsDocumentPreview';
import HrOpsPayrollEmployeePicker from '../components/hrOps/HrOpsPayrollEmployeePicker';
import HrOpsTaskShell from '../components/hrOps/HrOpsTaskShell';
import { useAppMessage } from '../context/MessageContext';
import { currentTargetMonth, formatTargetMonthLabel } from '../utils/fileCategories';
import {
  buildPayrollFormFromEmployee,
  buildPayrollHtml,
  calcPayrollTotals,
  isPayrollAttendanceMonthMatched,
  PAYROLL_DEDUCTION_FIELDS,
  PAYROLL_EARNING_FIELDS,
  savePayrollToFiles,
} from '../utils/payrollDocument';
import { resolveMonthlyExpense } from '../utils/expenseApplicationImport';
import { findHrOpsBusinessType } from '../utils/hrOpsBusinessTypes';
import { formatYen } from '../utils';

const BUSINESS_TYPE = findHrOpsBusinessType('payroll');

const INITIAL_FORM = {
  targetMonth: currentTargetMonth(),
  companyName: 'ビットクロス株式会社',
  payrollNo: '',
  workDays: '',
  workHours: '',
  basicSalary: '',
  housingAllowance: '',
  familyAllowance: '',
  fixedOvertimeAllowance: '',
  periodicPassAllowance: '',
  commuterAllowance: '',
  commuterCombined: '',
  businessExpenseAllowance: '',
  deductionHealthCare: '',
  deductionHealth: '',
  deductionPension: '',
  deductionEmployment: '',
  deductionIncomeTax: '',
  deductionResidentTax: '',
  remarks: '',
};

function ReadOnlyAmountRow({ label, value }) {
  return (
    <div className="payroll-amount-row">
      <span className="payroll-amount-label">{label}</span>
      <span className="payroll-amount-value">{formatYen(Number(value) || 0)}</span>
    </div>
  );
}

export default function HrOpsPayrollPage() {
  const { showMessage } = useAppMessage();
  const iframeRef = useRef(null);
  const [employeeId, setEmployeeId] = useState('');
  const [form, setForm] = useState(INITIAL_FORM);
  const [employee, setEmployee] = useState(null);
  const [loadingEmployee, setLoadingEmployee] = useState(false);
  const [savingFile, setSavingFile] = useState(false);

  useEffect(() => {
    if (!employeeId) {
      setEmployee(null);
      return;
    }
    let cancelled = false;
    setLoadingEmployee(true);
    api
      .getEmployeeDetail(employeeId)
      .then((detail) => {
        if (cancelled) return;
        if (!detail.salary) {
          showMessage('給与情報が未登録です。社員詳細の給与・人事タブで登録してください。', 'warning');
        }
        setEmployee(detail);
        setForm((prev) => ({
          ...buildPayrollFormFromEmployee(detail, prev.targetMonth || currentTargetMonth()),
          companyName: prev.companyName,
          remarks: prev.remarks,
        }));
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
  }, [employeeId, showMessage]);

  useEffect(() => {
    if (!employee) return;
    setForm((prev) => ({
      ...buildPayrollFormFromEmployee(employee, prev.targetMonth),
      companyName: prev.companyName,
      remarks: prev.remarks,
    }));
  }, [form.targetMonth, employee]);

  const totals = useMemo(() => calcPayrollTotals(form), [form]);
  const attendanceSynced = useMemo(
    () => isPayrollAttendanceMonthMatched(employee, form.targetMonth),
    [employee, form.targetMonth]
  );
  const showAttendanceFromDetail = attendanceSynced && Boolean(form.workDays || form.workHours);
  const monthlyExpense = useMemo(
    () => resolveMonthlyExpense(employee, form.targetMonth),
    [employee, form.targetMonth]
  );
  const showExpenseFromDetail = Boolean(monthlyExpense);

  const updateField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const payrollSections = useMemo(() => {
    if (!employee) return [];

    return [
      {
        id: 'basic',
        title: '対象月・基本情報',
        icon: 'bi-calendar3',
        badge: formatTargetMonthLabel(form.targetMonth),
        complete: Boolean(form.targetMonth),
        children: (
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="payrollTargetMonth">
                対象月
              </label>
              <input
                id="payrollTargetMonth"
                type="month"
                className="form-control"
                value={form.targetMonth}
                onChange={(e) => updateField('targetMonth', e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="payrollNo">
                給与NO
              </label>
              <input
                id="payrollNo"
                type="text"
                className="form-control"
                value={form.payrollNo}
                onChange={(e) => updateField('payrollNo', e.target.value)}
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="payrollCompanyName">
                会社名
              </label>
              <input
                id="payrollCompanyName"
                type="text"
                className="form-control"
                value={form.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
              />
            </div>
          </div>
        ),
      },
      {
        id: 'attendance',
        title: '勤怠',
        icon: 'bi-person-badge',
        description: showAttendanceFromDetail ? '社員詳細より自動反映' : '手入力',
        badge: `${form.workDays || '—'}日 / ${form.workHours || '—'}h`,
        complete: Boolean(form.workDays || form.workHours),
        children: (
          <div className="row g-3">
            <div className="col-6">
              <label className="form-label" htmlFor="payrollWorkDays">
                出勤日数
              </label>
              {showAttendanceFromDetail ? (
                <div className="payroll-readonly-field">{form.workDays || '—'}</div>
              ) : (
                <input
                  id="payrollWorkDays"
                  type="number"
                  min="0"
                  step="0.5"
                  className="form-control"
                  value={form.workDays}
                  onChange={(e) => updateField('workDays', e.target.value)}
                />
              )}
            </div>
            <div className="col-6">
              <label className="form-label" htmlFor="payrollWorkHours">
                勤務時間
              </label>
              {showAttendanceFromDetail ? (
                <div className="payroll-readonly-field">{form.workHours || '—'}</div>
              ) : (
                <input
                  id="payrollWorkHours"
                  type="number"
                  min="0"
                  step="0.5"
                  className="form-control"
                  value={form.workHours}
                  onChange={(e) => updateField('workHours', e.target.value)}
                />
              )}
            </div>
          </div>
        ),
      },
      {
        id: 'earnings',
        title: '支給',
        icon: 'bi-wallet2',
        description: showExpenseFromDetail ? '経費申請より反映' : '社員詳細より反映',
        badge: `${totals.grossPay.toLocaleString()} 円`,
        complete: totals.grossPay > 0,
        children: (
          <div className="payroll-amount-list">
            {PAYROLL_EARNING_FIELDS.map(({ key, label }) => (
              <ReadOnlyAmountRow key={key} label={label} value={form[key]} />
            ))}
          </div>
        ),
      },
      {
        id: 'deductions',
        title: '控除',
        icon: 'bi-dash-circle',
        description: '社員詳細より反映',
        badge: `${totals.totalDeduction.toLocaleString()} 円`,
        complete: totals.totalDeduction > 0,
        children: (
          <div className="payroll-amount-list">
            {PAYROLL_DEDUCTION_FIELDS.map(({ key, label }) => (
              <ReadOnlyAmountRow key={key} label={label} value={form[key]} />
            ))}
          </div>
        ),
      },
      {
        id: 'totals',
        title: '合計・差引',
        icon: 'bi-calculator',
        badge: `${totals.netPay.toLocaleString()} 円`,
        badgeTone: 'done',
        complete: true,
        children: (
          <div className="payroll-summary-card payroll-summary-card--embedded">
            <div className="payroll-summary-row">
              <span>総支給額</span>
              <strong>{totals.grossPay.toLocaleString()} 円</strong>
            </div>
            <div className="payroll-summary-row">
              <span>総控除額</span>
              <strong>{totals.totalDeduction.toLocaleString()} 円</strong>
            </div>
            <div className="payroll-summary-row payroll-summary-row--net">
              <span>差引支給額</span>
              <strong>{totals.netPay.toLocaleString()} 円</strong>
            </div>
          </div>
        ),
      },
      {
        id: 'remarks',
        title: '備考',
        icon: 'bi-chat-left-text',
        badge: form.remarks?.trim() ? '入力あり' : '—',
        complete: Boolean(form.remarks?.trim()),
        children: (
          <>
            <label className="form-label" htmlFor="payrollRemarks">
              備考
            </label>
            <textarea
              id="payrollRemarks"
              className="form-control"
              rows={2}
              value={form.remarks}
              onChange={(e) => updateField('remarks', e.target.value)}
            />
          </>
        ),
      },
    ];
  }, [
    employee,
    form,
    showAttendanceFromDetail,
    showExpenseFromDetail,
    totals.grossPay,
    totals.netPay,
    totals.totalDeduction,
    updateField,
  ]);

  const previewHtml = useMemo(() => {
    if (!employee) return '';
    return buildPayrollHtml(employee, form);
  }, [employee, form]);

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
    if (!employee) {
      showMessage('対象社員を選択してください', 'warning');
      return;
    }
    if (!form.targetMonth) {
      showMessage('対象月を選択してください', 'warning');
      return;
    }
    setSavingFile(true);
    try {
      await savePayrollToFiles(api, employee, form, iframeRef.current);
      showMessage('ファイル管理に保存しました（給与関連）', 'success');
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setSavingFile(false);
    }
  }

  return (
    <HrOpsTaskShell businessType={BUSINESS_TYPE} guideId="hr-ops-payroll">
      <div className="row g-4 payroll-workspace">
        <div className="col-lg-6">
          <section className="payroll-sidebar">
            <div className="payroll-sidebar-header">
              <div>
                <h2 className="payroll-sidebar-title">給与明細書の作成</h2>
                <p className="payroll-sidebar-desc mb-0">部署と社員を選び、内容を確認して保存します</p>
              </div>
              <span className="payroll-sidebar-badge">
                <i className="bi bi-cash-stack" aria-hidden="true" />
                手続き
              </span>
            </div>

            <HrOpsPayrollEmployeePicker value={employeeId} onChange={setEmployeeId} disabled={loadingEmployee} />

            {employee && (
              <>
                <div className="payroll-section-card hr-ops-app-edit-card">
                  <div className="payroll-section-card-title">
                    <i className="bi bi-sliders" aria-hidden="true" />
                    明細内容の確認
                  </div>
                  <HrOpsCollapsibleSections
                    sections={payrollSections}
                    overviewExtra={
                      <span className="hr-ops-app-edit-overview-required is-done">
                        差引 {totals.netPay.toLocaleString()} 円
                      </span>
                    }
                  />
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

            {!employee && !loadingEmployee && (
              <div className="payroll-empty-hint">
                <i className="bi bi-arrow-up-circle" aria-hidden="true" />
                部署を選び、対象社員を選択すると明細内容が表示されます
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
                  {employee && form.targetMonth ? ` — ${employee.name} / ${formatTargetMonthLabel(form.targetMonth)}` : ''}
                </span>
                {loadingEmployee && (
                  <span className="spinner-border spinner-border-sm text-primary" role="status" />
                )}
              </div>
              <HrOpsDocumentPreview
                html={previewHtml}
                title={employee ? `${employee.name}の給与明細書` : '給与明細書プレビュー'}
                ref={iframeRef}
                fitContent
                fitContentExtra={56}
              />
            </div>
          </section>
        </div>
      </div>
    </HrOpsTaskShell>
  );
}
