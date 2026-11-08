import { useEffect, useMemo, useState } from 'react';
import SectionCard from '../SectionCard';
import { formatJapaneseDate, formatYen } from '../../../utils';
import { formatTargetMonthLabel } from '../../../utils/fileCategories';
import { resolveLatestMonthlyExpense } from '../../../utils/expenseApplicationImport';
import { api } from '../../../api';

function InfoCell({ label, value }) {
  return (
    <div className="detail-info-cell">
      <div className="detail-info-label">{label}</div>
      <div className="detail-info-value">{value || '—'}</div>
    </div>
  );
}

export default function SalaryTab({ employee, active = true }) {
  const salary = employee.salary;
  const hr = employee.hr;
  const monthlyExpenses = employee.monthlyExpenses ?? [];
  const [selectedExpenseMonth, setSelectedExpenseMonth] = useState('');
  const [payrollSlips, setPayrollSlips] = useState([]);
  const [payrollLoading, setPayrollLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    setPayrollLoading(true);
    api.getEmployeePayrollSlips(employee.id)
      .then((rows) => {
        if (!cancelled) setPayrollSlips(rows ?? []);
      })
      .catch(() => {
        if (!cancelled) setPayrollSlips([]);
      })
      .finally(() => {
        if (!cancelled) setPayrollLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employee.id, active]);

  async function handleDownloadSlip(slip) {
    setDownloadingId(slip.fileId);
    try {
      await api.downloadFile(slip.fileId, slip.originalName);
    } finally {
      setDownloadingId(null);
    }
  }

  const activeExpense = useMemo(() => {
    if (selectedExpenseMonth) {
      return monthlyExpenses.find((item) => item.targetMonth === selectedExpenseMonth) ?? null;
    }
    return resolveLatestMonthlyExpense(employee);
  }, [employee, monthlyExpenses, selectedExpenseMonth]);

  return (
    <>
      <div className="alert alert-danger d-flex align-items-center py-2 mb-3" role="alert">
        <i className="bi bi-lock-fill me-2" />
        この情報は管理者のみ閲覧可能です。
      </div>

      <SectionCard title="給与情報" icon="bi-currency-yen" variant="rose">
        {salary ? (
          <div className="row g-3">
            <div className="col-md-6 col-lg-3">
              <div className="detail-info-label">基本給（月額）</div>
              <div className="salary-highlight text-danger mt-1">
                {formatYen(salary.basicSalaryMonthly)}
              </div>
            </div>
            <div className="col-md-6 col-lg-3">
              <InfoCell label="年俸" value={formatYen(salary.annualSalary)} />
            </div>
            <div className="col-md-6 col-lg-3">
              <InfoCell label="賞与（年2回）" value={formatYen(salary.bonus)} />
            </div>
            <div className="col-md-6 col-lg-3">
              <InfoCell label="残業単価" value={formatYen(salary.overtimeRate)} />
            </div>
            <div className="col-md-6 col-lg-3">
              <InfoCell label="支給日" value={salary.paymentDay} />
            </div>
            <div className="col-md-6 col-lg-3">
              <InfoCell label="請求単価" value={formatYen(salary.billingUnitPrice)} />
            </div>
            <div className="col-md-6 col-lg-3">
              <InfoCell label="住宅手当" value={formatYen(salary.housingAllowance)} />
            </div>
            <div className="col-md-6 col-lg-3">
              <InfoCell label="家族手当" value={formatYen(salary.familyAllowance)} />
            </div>
            <div className="col-md-6 col-lg-3">
              <InfoCell label="定額残業手当" value={formatYen(salary.fixedOvertimeAllowance)} />
            </div>
          </div>
        ) : (
          <p className="text-muted mb-0">給与情報は未登録です。</p>
        )}
      </SectionCard>

      <SectionCard title="給与明細一覧（履歴）" icon="bi-file-earmark-pdf" variant="amber" className="mt-3">
        {payrollLoading ? (
          <div className="text-center py-3">
            <div className="spinner-border spinner-border-sm text-primary" role="status" />
          </div>
        ) : payrollSlips.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>対象月</th>
                  <th>ファイル名</th>
                  <th>登録日</th>
                  <th>登録者</th>
                  <th className="text-end">操作</th>
                </tr>
              </thead>
              <tbody>
                {payrollSlips.map((slip) => (
                  <tr key={slip.fileId}>
                    <td>{slip.targetMonth ? formatTargetMonthLabel(slip.targetMonth) : '—'}</td>
                    <td>{slip.originalName}</td>
                    <td>{slip.createdAt ? formatJapaneseDate(slip.createdAt.slice(0, 10)) : '—'}</td>
                    <td>{slip.uploadedByName || '—'}</td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm app-btn"
                        onClick={() => handleDownloadSlip(slip)}
                        disabled={downloadingId === slip.fileId}
                      >
                        <i className="bi bi-download" aria-hidden="true" />
                        {downloadingId === slip.fileId ? '取得中…' : '表示'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted mb-0">
            給与明細の履歴はありません。人事業務の給与明細作成から PDF を登録するとここに表示されます。
          </p>
        )}
      </SectionCard>

      <SectionCard
        title="月次経費（経費申請より）"
        icon="bi-receipt"
        variant="blue"
        className="mt-3"
      >
        {monthlyExpenses.length > 0 ? (
          <>
            <div className="row g-3 align-items-end mb-3">
              <div className="col-md-6 col-lg-4">
                <label className="form-label" htmlFor="salaryExpenseMonth">
                  対象月
                </label>
                <select
                  id="salaryExpenseMonth"
                  className="form-select"
                  value={selectedExpenseMonth || activeExpense?.targetMonth || ''}
                  onChange={(e) => setSelectedExpenseMonth(e.target.value)}
                >
                  {monthlyExpenses.map((item) => (
                    <option key={item.targetMonth} value={item.targetMonth}>
                      {formatTargetMonthLabel(item.targetMonth)}
                    </option>
                  ))}
                </select>
              </div>
              {activeExpense?.sourceFileName && (
                <div className="col-md-6 col-lg-8">
                  <p className="small text-muted mb-0">
                    取込元：{activeExpense.sourceFileName}
                    {activeExpense.importedAt
                      ? `（${formatJapaneseDate(activeExpense.importedAt.slice(0, 10))}）`
                      : ''}
                  </p>
                </div>
              )}
            </div>
            <div className="row g-3">
              <div className="col-md-6 col-lg-3">
                <InfoCell label="定期券" value={formatYen(activeExpense?.periodicPassAllowance)} />
              </div>
              <div className="col-md-6 col-lg-3">
                <InfoCell
                  label="通勤手当（個別交通費）"
                  value={formatYen(activeExpense?.commuterIndividualAllowance)}
                />
              </div>
              <div className="col-md-6 col-lg-3">
                <InfoCell label="営業費" value={formatYen(activeExpense?.businessExpenseAllowance)} />
              </div>
            </div>
          </>
        ) : (
          <p className="text-muted mb-0">
            経費申請書が未取込です。ファイル管理から「申請書」分類で Excel をアップロードしてください。
          </p>
        )}
      </SectionCard>

      {salary && (
        <SectionCard title="控除（明細書テンプレート）" icon="bi-dash-circle" variant="purple" className="mt-3">
          <div className="row g-3">
            <div className="col-md-6 col-lg-3">
              <InfoCell label="健康保険（介護）" value={formatYen(salary.deductionHealthCare)} />
            </div>
            <div className="col-md-6 col-lg-3">
              <InfoCell label="健康保険（健保）" value={formatYen(salary.deductionHealth)} />
            </div>
            <div className="col-md-6 col-lg-3">
              <InfoCell label="厚生年金" value={formatYen(salary.deductionPension)} />
            </div>
            <div className="col-md-6 col-lg-3">
              <InfoCell label="雇用保険" value={formatYen(salary.deductionEmployment)} />
            </div>
            <div className="col-md-6 col-lg-3">
              <InfoCell label="所得税" value={formatYen(salary.deductionIncomeTax)} />
            </div>
            <div className="col-md-6 col-lg-3">
              <InfoCell label="住民税" value={formatYen(salary.deductionResidentTax)} />
            </div>
          </div>
        </SectionCard>
      )}

      <SectionCard title="人事情報" icon="bi-person-badge" variant="purple" className="mt-3">
        {hr ? (
          <div className="row g-3">
            <div className="col-md-6 col-lg-3">
              <InfoCell label="契約開始日" value={formatJapaneseDate(hr.contractStartDate)} />
            </div>
            <div className="col-md-6 col-lg-3">
              <InfoCell label="契約終了日" value={formatJapaneseDate(hr.contractEndDate)} />
            </div>
            <div className="col-md-6 col-lg-3">
              <InfoCell label="社会保険" value={hr.socialInsuranceStatus} />
            </div>
            <div className="col-md-6 col-lg-3">
              <InfoCell label="雇用保険番号" value={hr.employmentInsuranceNo} />
            </div>
            <div className="col-md-6 col-lg-3">
              <InfoCell label="基礎年金番号" value={hr.pensionNo} />
            </div>
            <div className="col-md-6 col-lg-3">
              <InfoCell label="緊急連絡先（氏名）" value={hr.emergencyContactName} />
            </div>
            <div className="col-md-6 col-lg-3">
              <InfoCell label="緊急連絡先（電話）" value={hr.emergencyContactPhone} />
            </div>
            <div className="col-md-6 col-lg-3">
              <InfoCell label="続柄" value={hr.emergencyContactRelation} />
            </div>
          </div>
        ) : (
          <p className="text-muted mb-0">人事情報は未登録です。</p>
        )}
      </SectionCard>
    </>
  );
}
