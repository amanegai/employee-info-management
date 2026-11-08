import { useEffect, useMemo } from 'react';
import SectionCard from '../../detail/SectionCard';
import FormField from '../FormField';
import { calcGrossMonthlyPay, calcPayrollDeductions } from '../../../utils/payrollDeductionCalc';

const SOCIAL_INSURANCE_OPTIONS = ['', '加入', '未加入', '適用除外'];

const AUTO_DEDUCTION_FIELDS = [
  { key: 'deductionHealthCare', label: '健康保険（介護）' },
  { key: 'deductionHealth', label: '健康保険（健保）' },
  { key: 'deductionPension', label: '厚生年金' },
  { key: 'deductionEmployment', label: '雇用保険' },
  { key: 'deductionIncomeTax', label: '所得税' },
];

function formatDeductionDisplay(value) {
  const num = Number(value) || 0;
  return num > 0 ? `${num.toLocaleString()} 円` : '—';
}

function buildAutoDeductionValues(salary, personal, hr) {
  const result = calcPayrollDeductions({
    salary,
    personal,
    hr,
    preserveResidentTax: true,
  });
  if (!result) return null;
  return {
    deductionHealthCare: String(result.deductionHealthCare),
    deductionHealth: String(result.deductionHealth),
    deductionPension: String(result.deductionPension),
    deductionEmployment: String(result.deductionEmployment),
    deductionIncomeTax: String(result.deductionIncomeTax),
  };
}

const EMPTY_HR = {
  hireDate: '',
  resignationDate: '',
  contractStartDate: '',
  contractEndDate: '',
  socialInsuranceStatus: '',
  employmentInsuranceNo: '',
  pensionNo: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelation: '',
  paidLeaveStartDate: '',
};

export default function SalaryFormTab({ form, onChange, readOnly = false }) {
  const salary = form.salary ?? {};
  const hr = form.hr ?? EMPTY_HR;

  const autoDeductionInputs = useMemo(
    () =>
      [
        salary.basicSalaryMonthly,
        salary.housingAllowance,
        salary.familyAllowance,
        salary.fixedOvertimeAllowance,
        salary.commuterAllowance,
        form.personal?.birthDate,
        hr.socialInsuranceStatus,
      ].join('|'),
    [
      salary.basicSalaryMonthly,
      salary.housingAllowance,
      salary.familyAllowance,
      salary.fixedOvertimeAllowance,
      salary.commuterAllowance,
      form.personal?.birthDate,
      hr.socialInsuranceStatus,
    ]
  );

  const autoDeductions = useMemo(
    () => buildAutoDeductionValues(salary, form.personal, hr),
    [salary, form.personal, hr, autoDeductionInputs]
  );

  useEffect(() => {
    if (readOnly) return;
    const next = buildAutoDeductionValues(salary, form.personal, hr);
    if (!next) return;
    const changed = AUTO_DEDUCTION_FIELDS.some(({ key }) => salary[key] !== next[key]);
    if (!changed) return;
    onChange({
      ...form,
      salary: {
        ...salary,
        ...next,
      },
    });
  }, [autoDeductionInputs]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateSalary(field, value) {
    if (readOnly) return;
    onChange({ ...form, salary: { ...salary, [field]: value } });
  }

  function updateHr(field, value) {
    if (readOnly) return;
    onChange({ ...form, hr: { ...hr, [field]: value } });
  }

  const canAutoCalcDeductions = calcGrossMonthlyPay(salary) > 0;

  return (
    <fieldset disabled={readOnly} className="border-0 p-0 m-0">
      <div className="alert alert-danger d-flex align-items-center py-2 mb-3" role="alert">
        <i className="bi bi-lock-fill me-2" />
        {readOnly ? '給与・人事情報は閲覧のみです。編集は人事担当者が行います。' : 'この情報は管理者のみ閲覧可能です。'}
      </div>

      <SectionCard title="給与情報" icon="bi-currency-yen" headerColor="#dc3545">
        <div className="row g-3 detail-form-salary-fields">
          <div className="col-md-6 col-lg-3">
            <FormField label="基本給（月額）" htmlFor="basicSalaryMonthly">
              <input
                id="basicSalaryMonthly"
                type="number"
                min="0"
                step="1000"
                className="form-control"
                value={salary.basicSalaryMonthly}
                onChange={(e) => updateSalary('basicSalaryMonthly', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-6 col-lg-3">
            <FormField label="通勤手当（固定テンプレート）" htmlFor="commuterAllowance">
              <input
                id="commuterAllowance"
                type="number"
                min="0"
                step="1000"
                className="form-control"
                value={salary.commuterAllowance}
                onChange={(e) => updateSalary('commuterAllowance', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-6 col-lg-3">
            <FormField label="年俸" htmlFor="annualSalary">
              <input
                id="annualSalary"
                type="number"
                min="0"
                step="10000"
                className="form-control"
                value={salary.annualSalary}
                onChange={(e) => updateSalary('annualSalary', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-6 col-lg-3">
            <FormField label="賞与（年2回）" htmlFor="bonus">
              <input
                id="bonus"
                type="number"
                min="0"
                step="10000"
                className="form-control"
                value={salary.bonus}
                onChange={(e) => updateSalary('bonus', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-6 col-lg-3">
            <FormField label="残業単価" htmlFor="overtimeRate">
              <input
                id="overtimeRate"
                type="number"
                min="0"
                step="100"
                className="form-control"
                value={salary.overtimeRate}
                onChange={(e) => updateSalary('overtimeRate', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-6 col-lg-3">
            <FormField label="支給日" htmlFor="paymentDay">
              <input
                id="paymentDay"
                type="text"
                className="form-control"
                placeholder="25日"
                value={salary.paymentDay}
                onChange={(e) => updateSalary('paymentDay', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-6 col-lg-3">
            <FormField label="請求単価" htmlFor="billingUnitPrice">
              <input
                id="billingUnitPrice"
                type="number"
                min="0"
                step="1000"
                className="form-control"
                value={salary.billingUnitPrice}
                onChange={(e) => updateSalary('billingUnitPrice', e.target.value)}
              />
            </FormField>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="手当（明細書用）" icon="bi-plus-circle" headerColor="#0d6efd" className="mt-3">
        <div className="row g-3 detail-form-salary-fields">
          <div className="col-md-6 col-lg-3">
            <FormField label="住宅手当" htmlFor="housingAllowance">
              <input
                id="housingAllowance"
                type="number"
                min="0"
                step="1000"
                className="form-control"
                value={salary.housingAllowance}
                onChange={(e) => updateSalary('housingAllowance', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-6 col-lg-3">
            <FormField label="家族手当" htmlFor="familyAllowance">
              <input
                id="familyAllowance"
                type="number"
                min="0"
                step="1000"
                className="form-control"
                value={salary.familyAllowance}
                onChange={(e) => updateSalary('familyAllowance', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-6 col-lg-3">
            <FormField label="定額残業手当" htmlFor="fixedOvertimeAllowance">
              <input
                id="fixedOvertimeAllowance"
                type="number"
                min="0"
                step="1000"
                className="form-control"
                value={salary.fixedOvertimeAllowance}
                onChange={(e) => updateSalary('fixedOvertimeAllowance', e.target.value)}
              />
            </FormField>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="控除（明細書テンプレート）" icon="bi-dash-circle" headerColor="#6c757d" className="mt-3">
        <p className="small text-muted mb-3">
          健康保険・厚生年金・雇用保険・所得税は、支給額と社会保険情報から自動計算されます（編集不可）。
          住民税のみ手入力してください。
        </p>
        <div className="row g-3 detail-form-salary-fields">
          {AUTO_DEDUCTION_FIELDS.map(({ key, label }) => (
            <div key={key} className="col-md-6 col-lg-3">
              <FormField label={label} htmlFor={key}>
                <div id={key} className="payroll-readonly-field">
                  {canAutoCalcDeductions
                    ? formatDeductionDisplay(autoDeductions?.[key] ?? salary[key])
                    : '—'}
                </div>
              </FormField>
            </div>
          ))}
          <div className="col-md-6 col-lg-3">
            <FormField label="住民税" htmlFor="deductionResidentTax">
              <input id="deductionResidentTax" type="number" min="0" className="form-control" value={salary.deductionResidentTax} onChange={(e) => updateSalary('deductionResidentTax', e.target.value)} />
            </FormField>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="人事情報" icon="bi-person-badge" headerColor="#6f42c1" className="mt-3">
        <div className="row g-3 detail-form-hr-fields">
          <div className="col-md-6 col-lg-3">
            <FormField label="契約開始日" htmlFor="contractStartDate">
              <input
                id="contractStartDate"
                type="date"
                className="form-control"
                value={hr.contractStartDate}
                onChange={(e) => updateHr('contractStartDate', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-6 col-lg-3">
            <FormField label="契約終了日" htmlFor="contractEndDate">
              <input
                id="contractEndDate"
                type="date"
                className="form-control"
                value={hr.contractEndDate}
                onChange={(e) => updateHr('contractEndDate', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-6 col-lg-3">
            <FormField label="社会保険" htmlFor="socialInsuranceStatus">
              <select
                id="socialInsuranceStatus"
                className="form-select"
                value={hr.socialInsuranceStatus}
                onChange={(e) => updateHr('socialInsuranceStatus', e.target.value)}
              >
                {SOCIAL_INSURANCE_OPTIONS.map((opt) => (
                  <option key={opt || 'empty'} value={opt}>
                    {opt || '—'}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="col-md-6 col-lg-3">
            <FormField label="雇用保険番号" htmlFor="employmentInsuranceNo">
              <input
                id="employmentInsuranceNo"
                type="text"
                className="form-control"
                value={hr.employmentInsuranceNo}
                onChange={(e) => updateHr('employmentInsuranceNo', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-6 col-lg-3">
            <FormField label="基礎年金番号" htmlFor="pensionNo">
              <input
                id="pensionNo"
                type="text"
                className="form-control"
                value={hr.pensionNo}
                onChange={(e) => updateHr('pensionNo', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-6 col-lg-3">
            <FormField label="緊急連絡先（氏名）" htmlFor="emergencyContactName">
              <input
                id="emergencyContactName"
                type="text"
                className="form-control"
                value={hr.emergencyContactName}
                onChange={(e) => updateHr('emergencyContactName', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-6 col-lg-3">
            <FormField label="緊急連絡先（電話）" htmlFor="emergencyContactPhone">
              <input
                id="emergencyContactPhone"
                type="text"
                className="form-control"
                value={hr.emergencyContactPhone}
                onChange={(e) => updateHr('emergencyContactPhone', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-6 col-lg-3">
            <FormField label="続柄" htmlFor="emergencyContactRelation">
              <input
                id="emergencyContactRelation"
                type="text"
                className="form-control"
                placeholder="配偶者"
                value={hr.emergencyContactRelation}
                onChange={(e) => updateHr('emergencyContactRelation', e.target.value)}
              />
            </FormField>
          </div>
        </div>
      </SectionCard>
    </fieldset>
  );
}
