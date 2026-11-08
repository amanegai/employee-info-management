import { useMemo } from 'react';
import SectionCard from '../../detail/SectionCard';
import FormField from '../FormField';
import EmployeePhotoField from '../EmployeePhotoField';
import LanguageLegendNotes from '../../LanguageLegendNotes';
import {
  NEEDS_END_DATE,
  endDateFieldLabel,
  MARITAL_STATUS_OPTIONS,
  EDUCATION_DEGREE_OPTIONS,
  LANGUAGE_LEVEL_OPTIONS,
  SKILL_MARK_OPTIONS,
  EMPTY_DISPLAY,
  formatYearsInJapan,
  excludeParentDepartments,
  assignmentRoleLabel,
} from '../../../utils';
import {
  AFFILIATION_COMPANIES,
  EMPLOYEE_TYPE_LETTER,
  filterDepartmentsForEmployeeType,
  canChangeEmployeeDepartment,
} from '../../../utils/employeeCode';
import { RESIGNATION_WORK_STATUSES } from '../../../auth';

export default function BasicFormTab({
  form,
  master,
  isEdit,
  onChange,
  codeHint = '',
  canChangeDeptRole = false,
  canEditResignation = false,
  canEditStatus = true,
  onRequestCodeHint,
}) {
  const showEndDate = NEEDS_END_DATE.includes(form.workStatus);
  const endDateLabel = endDateFieldLabel(form.workStatus);
  const workStatusOptions = useMemo(() => {
    const all = master?.workStatuses ?? [];
    const filtered = canEditResignation
      ? all
      : all.filter((s) => !RESIGNATION_WORK_STATUSES.includes(s));
    // 権限なしでも現在値が退職系なら表示用に残す（変更は canEditStatus で抑止）
    if (
      form.workStatus &&
      RESIGNATION_WORK_STATUSES.includes(form.workStatus) &&
      !filtered.includes(form.workStatus)
    ) {
      return [...filtered, form.workStatus];
    }
    return filtered;
  }, [canEditResignation, form.workStatus, master?.workStatuses]);
  const lockType = isEdit;
  const lockDepartment = isEdit && (!canChangeDeptRole || !canChangeEmployeeDepartment(form.employeeType));
  const lockAssignmentRole = isEdit && !canChangeDeptRole;
  const lockPosition = isEdit && !canChangeDeptRole;

  const companyOptions = master?.affiliationCompanies?.length
    ? master.affiliationCompanies
    : AFFILIATION_COMPANIES;

  const departmentOptions = useMemo(() => {
    const base = excludeParentDepartments(
      master?.assignableDepartments ??
      master?.departments ??
      []
    );
    const filtered = filterDepartmentsForEmployeeType(
      base,
      form.employeeType,
      form.affiliationCompany
    );
    if (!isEdit || !form.departmentId) return filtered;
    const id = Number(form.departmentId);
    if (!Number.isFinite(id) || id <= 0 || filtered.some((d) => d.id === id)) return filtered;
    const current = (master?.departments ?? []).find((d) => d.id === id);
    return current ? [...filtered, current] : filtered;
  }, [form.affiliationCompany, form.departmentId, form.employeeType, isEdit, master]);

  function updatePersonal(field, value) {
    onChange({ ...form, personal: { ...form.personal, [field]: value } });
  }

  function updateHr(field, value) {
    onChange({ ...form, hr: { ...form.hr, [field]: value } });
  }

  function syncDepartmentForCompany(nextForm) {
    const allowed = filterDepartmentsForEmployeeType(
      excludeParentDepartments(master?.assignableDepartments ?? master?.departments ?? []),
      nextForm.employeeType,
      nextForm.affiliationCompany
    );
    const currentOk = allowed.some((d) => String(d.id) === String(nextForm.departmentId));
    if (currentOk) return nextForm;
    return {
      ...nextForm,
      departmentId: allowed[0] ? String(allowed[0].id) : '',
    };
  }

  function handleAffiliationCompanyChange(affiliationCompany) {
    if (isEdit) return;
    const next = syncDepartmentForCompany({ ...form, affiliationCompany });
    onChange(next);
    onRequestCodeHint?.(next.employeeType, next.departmentId, next.affiliationCompany);
  }

  function handleEmployeeTypeChange(employeeType) {
    const next = syncDepartmentForCompany({ ...form, employeeType });
    onChange(next);
    onRequestCodeHint?.(next.employeeType, next.departmentId, next.affiliationCompany);
  }

  function handleDepartmentChange(departmentId) {
    onChange({ ...form, departmentId });
    onRequestCodeHint?.(form.employeeType, departmentId, form.affiliationCompany);
  }

  function updateNationality(nationalityId) {
    const selected = (master?.nationalities ?? []).find((n) => String(n.id) === String(nationalityId));
    const isJapan = selected?.isJapan === true;
    onChange({
      ...form,
      personal: {
        ...form.personal,
        nationalityId: nationalityId || '',
        ...(isJapan || !nationalityId
          ? {
              residenceStatusId: '',
              residenceCardNumber: '',
              residenceCardExpiry: '',
            }
          : {}),
      },
    });
  }

  const selectedNationality = useMemo(() => {
    const id = form.personal.nationalityId;
    if (!id) return null;
    return (master?.nationalities ?? []).find((n) => String(n.id) === String(id)) ?? null;
  }, [form.personal.nationalityId, master]);

  const showResidenceFields = Boolean(selectedNationality && !selectedNationality.isJapan);

  return (
    <>
      <div className="detail-summary-card mb-3">
        <div className="detail-summary-hero">
          <div className="detail-summary-hero-text">
            <input
              id="employeeName"
              type="text"
              className="form-control detail-form-name-input detail-form-hero-name-input"
              required
              placeholder="社員名を入力"
              value={form.name}
              onChange={(e) => onChange({ ...form, name: e.target.value })}
              aria-label="社員名"
            />
            <input
              id="furiganaHero"
              type="text"
              className="form-control detail-form-hero-kana-input"
              placeholder="フリガナ"
              value={form.personal.furigana}
              onChange={(e) => updatePersonal('furigana', e.target.value)}
              aria-label="フリガナ"
            />
          </div>
          <div className="detail-summary-hero-status">
            <select
              id="workStatus"
              className="form-select detail-form-hero-status-select"
              required
              value={form.workStatus}
              disabled={!canEditStatus}
              onChange={(e) => onChange({ ...form, workStatus: e.target.value })}
              aria-label="稼働状況"
              title={
                !canEditStatus
                  ? '退職予定・退職の稼働状況は人事または管理者のみ変更できます'
                  : undefined
              }
            >
              <option value="">{EMPTY_DISPLAY}</option>
              {workStatusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="detail-summary-body" data-guide="employee-form-status">
          <div className="row g-4 align-items-start">
            <div className="col">
              <div className="row g-3 detail-form-summary-fields">
                <div className="col-md-4">
                  <FormField
                    label="社員ID"
                    htmlFor="employeeCode"
                    required={!isEdit}
                    hint={
                      isEdit
                        ? '変更不可'
                        : codeHint ||
                          'btc/als/swt + 種別英字(S/K/P/B) + 5桁（例：btcS00001）／S正社員 K契約 P個人 B=BP'
                    }
                  >
                    <input
                      id="employeeCode"
                      type="text"
                      className="form-control"
                      required={!isEdit}
                      readOnly={isEdit}
                      placeholder={isEdit ? '' : '例：btcS00001'}
                      value={form.employeeCode}
                      onChange={(e) => onChange({ ...form, employeeCode: e.target.value.trim() })}
                      autoComplete="off"
                    />
                  </FormField>
                </div>
                <div className="col-md-4">
                  <FormField label="所属会社" htmlFor="affiliationCompany" required>
                    <select
                      id="affiliationCompany"
                      className="form-select"
                      required
                      disabled={isEdit}
                      value={form.affiliationCompany || ''}
                      onChange={(e) => handleAffiliationCompanyChange(e.target.value)}
                    >
                      <option value="">{EMPTY_DISPLAY}</option>
                      {companyOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
                <div className="col-md-4">
                  <FormField label="社員種別" htmlFor="employeeType" required>
                    <select
                      id="employeeType"
                      className="form-select"
                      required
                      disabled={lockType}
                      value={form.employeeType}
                      onChange={(e) => handleEmployeeTypeChange(e.target.value)}
                    >
                      <option value="">{EMPTY_DISPLAY}</option>
                      {master?.employeeTypes.map((t) => (
                        <option key={t} value={t}>
                          {EMPLOYEE_TYPE_LETTER[t] ? `${t}（${EMPLOYEE_TYPE_LETTER[t]}）` : t}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
                <div className="col-md-4">
                  <FormField label="所属部門" htmlFor="departmentId" required>
                    <select
                      id="departmentId"
                      className="form-select"
                      required
                      disabled={lockDepartment}
                      value={form.departmentId}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                    >
                      <option value="">{EMPTY_DISPLAY}</option>
                      {departmentOptions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
                <div className="col-md-4">
                  <FormField label="役職" htmlFor="position">
                    <select
                      id="position"
                      className="form-select"
                      disabled={lockPosition}
                      value={form.position}
                      onChange={(e) => onChange({ ...form, position: e.target.value })}
                    >
                      <option value="">{EMPTY_DISPLAY}</option>
                      {master?.positions.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
                <div className="col-md-4">
                  <FormField label="役割" htmlFor="assignmentRole">
                    <select
                      id="assignmentRole"
                      className="form-select"
                      disabled={lockAssignmentRole}
                      value={form.assignmentRole}
                      onChange={(e) => onChange({ ...form, assignmentRole: e.target.value })}
                    >
                      <option value="">{EMPTY_DISPLAY}</option>
                      {(master?.assignmentRoles ?? []).map((role) => (
                        <option key={role} value={role}>
                          {assignmentRoleLabel(role)}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
                <div className="col-md-4">
                  <FormField label="入社日" htmlFor="hireDate">
                    <input
                      id="hireDate"
                      type="date"
                      className="form-control"
                      value={form.hr?.hireDate ?? ''}
                      onChange={(e) => updateHr('hireDate', e.target.value)}
                    />
                  </FormField>
                </div>
                <div className="col-md-4">
                  <FormField
                    label="退社日"
                    htmlFor="resignationDate"
                    hint={canEditResignation ? '' : '人事・管理者のみ編集可'}
                  >
                    <input
                      id="resignationDate"
                      type="date"
                      className="form-control"
                      value={form.hr?.resignationDate ?? ''}
                      disabled={!canEditResignation}
                      onChange={(e) => updateHr('resignationDate', e.target.value)}
                    />
                  </FormField>
                </div>
                {showEndDate && (
                  <div className="col-md-4">
                    <FormField label={endDateLabel} htmlFor="endDate">
                      <input
                        id="endDate"
                        type="date"
                        className="form-control"
                        value={form.endDate}
                        onChange={(e) => onChange({ ...form, endDate: e.target.value })}
                      />
                    </FormField>
                  </div>
                )}
              </div>
            </div>
            <div className="col-auto detail-form-photo-col">
              <EmployeePhotoField
                photoUrl={form.personal.photoUrl}
                onChange={(value) => updatePersonal('photoUrl', value)}
              />
            </div>
          </div>
        </div>
      </div>

      <SectionCard title="個人情報" icon="bi-person-vcard" variant="teal">
        <p className="text-muted small mb-3">履歴書テンプレート（技術者履歴書）に対応する項目です。</p>

        <h6 className="detail-form-subsection-title">基本</h6>
        <div className="row g-3 detail-form-personal-fields mb-3">
          <div className="col-md-4">
            <FormField label="性別" htmlFor="gender">
              <select
                id="gender"
                className="form-select"
                value={form.personal.gender}
                onChange={(e) => updatePersonal('gender', e.target.value)}
              >
                <option value="">{EMPTY_DISPLAY}</option>
                <option value="男性">男性</option>
                <option value="女性">女性</option>
                <option value="その他">その他</option>
              </select>
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="生年月日" htmlFor="birthDate">
              <input
                id="birthDate"
                type="date"
                className="form-control"
                value={form.personal.birthDate}
                onChange={(e) => updatePersonal('birthDate', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="国籍" htmlFor="nationalityId">
              <select
                id="nationalityId"
                className="form-select"
                value={form.personal.nationalityId}
                onChange={(e) => updateNationality(e.target.value)}
              >
                <option value="">{EMPTY_DISPLAY}</option>
                {(master?.nationalities ?? []).map((n) => (
                  <option key={n.id} value={String(n.id)}>
                    {n.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          {showResidenceFields && (
            <>
              <div className="col-md-4">
                <FormField label="在留資格" htmlFor="residenceStatusId">
                  <select
                    id="residenceStatusId"
                    className="form-select"
                    value={form.personal.residenceStatusId}
                    onChange={(e) => updatePersonal('residenceStatusId', e.target.value)}
                  >
                    <option value="">{EMPTY_DISPLAY}</option>
                    {(master?.residenceStatuses ?? []).map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              <div className="col-md-4">
                <FormField label="在留カード番号" htmlFor="residenceCardNumber">
                  <input
                    id="residenceCardNumber"
                    type="text"
                    className="form-control"
                    value={form.personal.residenceCardNumber}
                    onChange={(e) => updatePersonal('residenceCardNumber', e.target.value)}
                  />
                </FormField>
              </div>
              <div className="col-md-4">
                <FormField label="在留カード有効期限" htmlFor="residenceCardExpiry">
                  <input
                    id="residenceCardExpiry"
                    type="date"
                    className="form-control"
                    value={form.personal.residenceCardExpiry}
                    onChange={(e) => updatePersonal('residenceCardExpiry', e.target.value)}
                  />
                </FormField>
              </div>
            </>
          )}
          <div className="col-md-4">
            <FormField label="結婚" htmlFor="maritalStatus">
              <select
                id="maritalStatus"
                className="form-select"
                value={form.personal.maritalStatus}
                onChange={(e) => updatePersonal('maritalStatus', e.target.value)}
              >
                <option value="">{EMPTY_DISPLAY}</option>
                {MARITAL_STATUS_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="最寄駅" htmlFor="nearestStation">
              <input
                id="nearestStation"
                type="text"
                className="form-control"
                value={form.personal.nearestStation}
                onChange={(e) => updatePersonal('nearestStation', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="IT業界経験年数" htmlFor="itIndustryYears">
              <input
                id="itIndustryYears"
                type="number"
                min="0"
                className="form-control"
                value={form.personal.itIndustryYears}
                onChange={(e) => updatePersonal('itIndustryYears', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="来日年月" htmlFor="japanArrivalDate">
              <input
                id="japanArrivalDate"
                type="date"
                className="form-control"
                value={form.personal.japanArrivalDate}
                onChange={(e) => updatePersonal('japanArrivalDate', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="日本滞在年数" htmlFor="yearsInJapan" hint="来日年月から自動計算（年・月）">
              <input
                id="yearsInJapan"
                type="text"
                className="form-control"
                readOnly
                value={formatYearsInJapan(form.personal.japanArrivalDate) || EMPTY_DISPLAY}
              />
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="電話番号" htmlFor="phone">
              <input
                id="phone"
                type="text"
                className="form-control"
                value={form.personal.phone}
                onChange={(e) => updatePersonal('phone', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="メール" htmlFor="email">
              <input
                id="email"
                type="email"
                className="form-control"
                value={form.personal.email}
                onChange={(e) => updatePersonal('email', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="住所" htmlFor="address">
              <input
                id="address"
                type="text"
                className="form-control"
                value={form.personal.address}
                onChange={(e) => updatePersonal('address', e.target.value)}
              />
            </FormField>
          </div>
        </div>

        <h6 className="detail-form-subsection-title">最終学歴</h6>
        <div className="row g-3 detail-form-personal-fields mb-3">
          <div className="col-md-4">
            <FormField label="学位" htmlFor="educationDegree">
              <select
                id="educationDegree"
                className="form-select"
                value={form.personal.educationDegree}
                onChange={(e) => updatePersonal('educationDegree', e.target.value)}
              >
                <option value="">{EMPTY_DISPLAY}</option>
                {EDUCATION_DEGREE_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="学校名" htmlFor="schoolName">
              <input
                id="schoolName"
                type="text"
                className="form-control"
                value={form.personal.schoolName}
                onChange={(e) => updatePersonal('schoolName', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="専攻学科" htmlFor="major">
              <input
                id="major"
                type="text"
                className="form-control"
                value={form.personal.major}
                onChange={(e) => updatePersonal('major', e.target.value)}
              />
            </FormField>
          </div>
        </div>

        <h6 className="detail-form-subsection-title">語学</h6>
        <div className="table-responsive mb-3">
          <table className="table table-bordered table-sm detail-language-table mb-0">
            <thead>
              <tr>
                <th>言語種別</th>
                <th>会話レベル</th>
                <th>仕様書解読</th>
                <th>仕様書作成</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>日本語</td>
                <td>
                  <select
                    className="form-select detail-language-select"
                    value={form.personal.japaneseLevel}
                    onChange={(e) => updatePersonal('japaneseLevel', e.target.value)}
                  >
                    <option value="">{EMPTY_DISPLAY}</option>
                    {LANGUAGE_LEVEL_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="form-select detail-language-select"
                    value={form.personal.japaneseReading}
                    onChange={(e) => updatePersonal('japaneseReading', e.target.value)}
                  >
                    <option value="">{EMPTY_DISPLAY}</option>
                    {SKILL_MARK_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="form-select detail-language-select"
                    value={form.personal.japaneseWriting}
                    onChange={(e) => updatePersonal('japaneseWriting', e.target.value)}
                  >
                    <option value="">{EMPTY_DISPLAY}</option>
                    {SKILL_MARK_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
              <tr>
                <td>英語</td>
                <td>
                  <select
                    className="form-select detail-language-select"
                    value={form.personal.englishLevel}
                    onChange={(e) => updatePersonal('englishLevel', e.target.value)}
                  >
                    <option value="">{EMPTY_DISPLAY}</option>
                    {LANGUAGE_LEVEL_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="form-select detail-language-select"
                    value={form.personal.englishReading}
                    onChange={(e) => updatePersonal('englishReading', e.target.value)}
                  >
                    <option value="">{EMPTY_DISPLAY}</option>
                    {SKILL_MARK_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="form-select detail-language-select"
                    value={form.personal.englishWriting}
                    onChange={(e) => updatePersonal('englishWriting', e.target.value)}
                  >
                    <option value="">{EMPTY_DISPLAY}</option>
                    {SKILL_MARK_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
                </tbody>
              </table>
            </div>
            <LanguageLegendNotes className="mb-3" />

            <h6 className="detail-form-subsection-title">得意分野・自己PR</h6>
        <div className="row g-3 detail-form-personal-fields">
          <div className="col-md-6">
            <FormField label="開発技術" htmlFor="specialtyDev">
              <textarea
                id="specialtyDev"
                className="form-control"
                rows={2}
                value={form.personal.specialtyDev}
                onChange={(e) => updatePersonal('specialtyDev', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="業務知識" htmlFor="specialtyBusiness">
              <textarea
                id="specialtyBusiness"
                className="form-control"
                rows={2}
                value={form.personal.specialtyBusiness}
                onChange={(e) => updatePersonal('specialtyBusiness', e.target.value)}
              />
            </FormField>
          </div>
          <div className="col-12">
            <FormField label="自己PR" htmlFor="selfPr">
              <textarea
                id="selfPr"
                className="form-control"
                rows={4}
                value={form.personal.selfPr}
                onChange={(e) => updatePersonal('selfPr', e.target.value)}
              />
            </FormField>
          </div>
        </div>
      </SectionCard>
    </>
  );
}
