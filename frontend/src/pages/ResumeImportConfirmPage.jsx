import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import AppFooter from '../components/AppFooter';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useAppMessage } from '../context/MessageContext';
import {
  canWrite,
  filterDepartmentsByScope,
} from '../auth';
import {
  AFFILIATION_COMPANIES,
  AFFILIATION_COMPANY_BITCROSS,
  EMPLOYEE_TYPE_LETTER,
  filterDepartmentsForEmployeeType,
  formatRecommendHint,
  validateEmployeeCode,
} from '../utils/employeeCode';
import {
  clearEmployeeImportBatch,
  readEmployeeImportBatch,
} from '../utils/employeeImportPrefill';
import { excludeParentDepartments, formToSavePayload } from '../utils';

function ageFromBirthDate(birthDate) {
  if (!birthDate) return '';
  const year = Number(String(birthDate).slice(0, 4));
  if (!Number.isFinite(year) || year < 1900) return '';
  return String(new Date().getFullYear() - year);
}

function nationalityLabel(form, nationalities) {
  const id = form?.personal?.nationalityId;
  if (id == null || id === '') return '';
  const found = nationalities.find((n) => String(n.id) === String(id));
  return found?.name || '';
}

function typeOptionLabel(type) {
  const letter = EMPLOYEE_TYPE_LETTER[type];
  return letter ? `${type}（${letter}）` : type;
}

function createRowState(item) {
  return {
    localId: item.localId,
    fileName: item.fileName || '',
    form: item.form || null,
    parseError: item.parseError || '',
    selected: !item.parseError && Boolean(item.form?.name),
    employeeCode: '',
    affiliationCompany: AFFILIATION_COMPANY_BITCROSS,
    employeeType: '',
    departmentId: '',
    position: item.form?.position || '',
    hireDate: item.form?.hr?.hireDate || '',
    codeError: '',
    codeChecking: false,
    recommendHint: '',
    registerError: '',
  };
}

export default function ResumeImportConfirmPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showMessage } = useAppMessage();

  const [master, setMaster] = useState(null);
  const [rows, setRows] = useState([]);
  const [batchCompany, setBatchCompany] = useState(AFFILIATION_COMPANY_BITCROSS);
  const [batchType, setBatchType] = useState('');
  const [batchDeptId, setBatchDeptId] = useState('');
  const [batchPosition, setBatchPosition] = useState('');
  const [batchHireDate, setBatchHireDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  const departments = useMemo(
    () => excludeParentDepartments(filterDepartmentsByScope(master?.departments ?? [], user)),
    [master, user]
  );

  const companyOptions = master?.affiliationCompanies?.length
    ? master.affiliationCompanies
    : AFFILIATION_COMPANIES;

  const batchDepartments = useMemo(
    () => filterDepartmentsForEmployeeType(departments, batchType, batchCompany),
    [batchCompany, departments, batchType]
  );

  useEffect(() => {
    if (!canWrite(user)) {
      navigate('/employees', { replace: true });
      return;
    }
    const batch = readEmployeeImportBatch();
    if (!batch?.length) {
      showMessage('インポート対象がありません。社員一覧から履歴書を選択してください。', 'warning');
      navigate('/employees', { replace: true });
      return;
    }
    setRows(batch.map(createRowState));
    setLoading(false);
    (async () => {
      try {
        setMaster(await api.getMaster());
      } catch (e) {
        showMessage(e.message, 'danger');
      }
    })();
  }, [user, navigate, showMessage]);

  const updateRow = useCallback((localId, patch) => {
    setRows((prev) => prev.map((row) => (row.localId === localId ? { ...row, ...patch } : row)));
  }, []);

  const deptNameOf = useCallback(
    (departmentId) => departments.find((d) => String(d.id) === String(departmentId))?.name || '',
    [departments]
  );

  const validateRowCode = useCallback(
    async (row, { checkDuplicate = true, allRows } = {}) => {
      if (row.parseError || !row.form) {
        return '解析に失敗した行です';
      }
      const deptName = deptNameOf(row.departmentId);
      const formatError = validateEmployeeCode(
        row.employeeCode,
        row.employeeType,
        deptName,
        row.affiliationCompany
      );
      if (formatError) return formatError;

      const code = row.employeeCode.trim();
      const peers = allRows || rows;
      const dupInBatch = peers.some(
        (other) =>
          other.localId !== row.localId &&
          other.selected &&
          !other.parseError &&
          other.employeeCode.trim().toLowerCase() === code.toLowerCase()
      );
      if (dupInBatch) return 'この画面内で社員IDが重複しています';

      if (checkDuplicate) {
        try {
          const result = await api.employeeCodeExists(code);
          if (result?.exists) return '社員IDが既に登録されています';
        } catch (e) {
          return e.message || '社員IDの重複確認に失敗しました';
        }
      }
      return '';
    },
    [deptNameOf, rows]
  );

  async function handleCodeBlur(row) {
    if (!row.selected || row.parseError) return;
    updateRow(row.localId, { codeChecking: true });
    const codeError = await validateRowCode(row);
    updateRow(row.localId, { codeError, codeChecking: false, registerError: '' });
  }

  async function refreshRecommend(row, employeeType, departmentId, affiliationCompany) {
    if (!employeeType || !departmentId || !affiliationCompany) {
      updateRow(row.localId, { recommendHint: '' });
      return;
    }
    try {
      const recommend = await api.recommendEmployeeCode(
        employeeType,
        Number(departmentId),
        affiliationCompany
      );
      updateRow(row.localId, {
        recommendHint: formatRecommendHint(recommend),
        recommendCode: recommend?.employeeCode || '',
      });
    } catch {
      updateRow(row.localId, { recommendHint: '', recommendCode: '' });
    }
  }

  function syncDept(rowPatch) {
    const allowed = filterDepartmentsForEmployeeType(
      departments,
      rowPatch.employeeType,
      rowPatch.affiliationCompany
    );
    const keepDept = allowed.some((d) => String(d.id) === String(rowPatch.departmentId));
    return {
      ...rowPatch,
      departmentId: keepDept ? rowPatch.departmentId : '',
    };
  }

  function handleCompanyChange(row, affiliationCompany) {
    const next = syncDept({ ...row, affiliationCompany });
    updateRow(row.localId, {
      affiliationCompany: next.affiliationCompany,
      departmentId: next.departmentId,
      codeError: '',
      registerError: '',
    });
    void refreshRecommend(next, next.employeeType, next.departmentId, next.affiliationCompany);
  }

  function handleTypeChange(row, employeeType) {
    const next = syncDept({ ...row, employeeType });
    updateRow(row.localId, {
      employeeType: next.employeeType,
      departmentId: next.departmentId,
      codeError: '',
      registerError: '',
    });
    void refreshRecommend(next, next.employeeType, next.departmentId, next.affiliationCompany);
  }

  function handleDeptChange(row, departmentId) {
    updateRow(row.localId, { departmentId, codeError: '', registerError: '' });
    void refreshRecommend(row, row.employeeType, departmentId, row.affiliationCompany);
  }

  function applyBatchDefaults() {
    if (!batchCompany && !batchType && !batchDeptId && !batchPosition && !batchHireDate) {
      showMessage(
        '一括設定の所属会社・社員種別・所属部門・役職・入社日のいずれかを選択してください',
        'warning'
      );
      return;
    }
    const nextRows = rows.map((row) => {
      if (row.parseError || !row.form) return row;
      const affiliationCompany = batchCompany || row.affiliationCompany;
      const employeeType = batchType || row.employeeType;
      const allowed = filterDepartmentsForEmployeeType(departments, employeeType, affiliationCompany);
      let departmentId = batchDeptId || row.departmentId;
      if (departmentId && !allowed.some((d) => String(d.id) === String(departmentId))) {
        departmentId = '';
      }
      return {
        ...row,
        affiliationCompany,
        employeeType,
        departmentId,
        position: batchPosition || row.position,
        hireDate: batchHireDate || row.hireDate,
        codeError: '',
        registerError: '',
      };
    });
    setRows(nextRows);
    showMessage('一括設定の既定値を反映しました');
    nextRows.forEach((row) => {
      if (!row.parseError && row.employeeType && row.departmentId && row.affiliationCompany) {
        void refreshRecommend(row, row.employeeType, row.departmentId, row.affiliationCompany);
      }
    });
  }

  function rowSetupError(row) {
    if (row.parseError) return row.parseError;
    if (!row.selected || row.registered) return '';
    if (!row.affiliationCompany) return '所属会社を選択してください';
    if (!row.employeeType) return '社員種別を選択してください';
    if (!row.departmentId) return '所属部門を選択してください';
    if (!row.hireDate) return '入社日を入力してください';
    if (!String(row.employeeCode || '').trim()) return '社員IDを入力してください';
    return row.codeError || row.registerError || '';
  }

  function fillRecommend(row) {
    if (!row.recommendCode) return;
    updateRow(row.localId, {
      employeeCode: row.recommendCode,
      codeError: '',
      registerError: '',
    });
  }

  const selectedCount = rows.filter((r) => r.selected && !r.parseError).length;

  async function handleRegister() {
    const targets = rows.filter((r) => r.selected && !r.parseError);
    if (targets.length === 0) {
      showMessage('登録する行を選択してください', 'warning');
      return;
    }

    setRegistering(true);
    const nextRows = [...rows];
    let blocked = false;

    for (const target of targets) {
      const idx = nextRows.findIndex((r) => r.localId === target.localId);
      const setupError = rowSetupError(nextRows[idx]);
      if (setupError && !nextRows[idx].codeError) {
        nextRows[idx] = { ...nextRows[idx], registerError: setupError };
        blocked = true;
        continue;
      }
      const codeError = await validateRowCode(nextRows[idx], { allRows: nextRows });
      nextRows[idx] = { ...nextRows[idx], codeError, registerError: codeError };
      if (codeError) blocked = true;
    }
    setRows(nextRows);
    if (blocked) {
      setRegistering(false);
      showMessage('入力内容に誤りがあります。赤字のカードを修正してください。', 'danger');
      return;
    }

    const successes = [];
    const failures = [];

    for (const target of targets) {
      const idx = nextRows.findIndex((r) => r.localId === target.localId);
      const row = nextRows[idx];
      try {
        const payload = formToSavePayload({
          ...row.form,
          employeeCode: row.employeeCode.trim(),
          affiliationCompany: row.affiliationCompany,
          employeeType: row.employeeType,
          departmentId: row.departmentId,
          position: row.position || '',
          workStatus: row.form.workStatus || '待機中',
          hr: {
            ...(row.form.hr || {}),
            hireDate: row.hireDate || null,
            paidLeaveStartDate: null,
          },
        });
        const created = await api.createEmployeeFromImport(payload);
        successes.push({
          id: created.id,
          employeeCode: created.employeeCode,
          name: created.name,
        });
        nextRows[idx] = { ...nextRows[idx], registerError: '', selected: false, registered: true };
      } catch (e) {
        const message = e.message || '登録に失敗しました';
        failures.push({ fileName: row.fileName, name: row.form?.name, message });
        nextRows[idx] = { ...nextRows[idx], registerError: message };
      }
    }

    setRows(nextRows);
    setRegistering(false);

    if (successes.length === 0) {
      showMessage(`登録できませんでした（失敗 ${failures.length} 件）`, 'danger');
      return;
    }

    clearEmployeeImportBatch();
    navigate('/employees', {
      replace: true,
      state: {
        importResult: {
          successCount: successes.length,
          failCount: failures.length,
          successes,
          failures,
          single: successes.length === 1 && failures.length === 0,
        },
      },
    });
  }

  function handleCancel() {
    clearEmployeeImportBatch();
    navigate('/employees');
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center text-muted">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-3 mb-0">読み込み中…</p>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 px-3 px-lg-5 resume-import-page list-page">
      <PageHeader
        guideId="resume-import-confirm"
        icon="bi-file-earmark-person"
        title="履歴書インポート確認"
        lead="履歴書の内容を確認し、入社日・所属・社員IDを設定して登録します"
      />

      <div className="alert alert-info py-2 resume-import-hint" role="status">
        <div className="fw-semibold mb-1">登録前に設定する項目</div>
        <div className="small mb-0">
          必須：所属会社・社員種別・所属部門・入社日・社員ID　／　任意：役職
          <br />
          社員ID：<code>btc</code> / <code>als</code> / <code>swt</code> ＋ 種別英字（S/K/P/B）＋ 5桁（例：btcS00001）
        </div>
      </div>

      <section className="list-section-panel resume-import-batch-bar mb-3" aria-label="一括設定">
        <div className="list-section-body py-3">
          <div className="resume-import-batch-title">一括設定</div>
          <div className="resume-import-batch-grid">
            <div>
              <label className="form-label small mb-1" htmlFor="batch-company">
                所属会社
              </label>
              <select
                id="batch-company"
                className="form-select"
                value={batchCompany}
                onChange={(e) => {
                  const nextCompany = e.target.value;
                  setBatchCompany(nextCompany);
                  const allowed = filterDepartmentsForEmployeeType(departments, batchType, nextCompany);
                  if (batchDeptId && !allowed.some((d) => String(d.id) === String(batchDeptId))) {
                    setBatchDeptId('');
                  }
                }}
              >
                {companyOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label small mb-1" htmlFor="batch-employee-type">
                社員種別（任意）
              </label>
              <select
                id="batch-employee-type"
                className="form-select"
                value={batchType}
                onChange={(e) => {
                  const nextType = e.target.value;
                  setBatchType(nextType);
                  const allowed = filterDepartmentsForEmployeeType(departments, nextType, batchCompany);
                  if (batchDeptId && !allowed.some((d) => String(d.id) === String(batchDeptId))) {
                    setBatchDeptId('');
                  }
                }}
              >
                <option value="">未設定</option>
                {(master?.employeeTypes ?? []).map((t) => (
                  <option key={t} value={t}>
                    {typeOptionLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label small mb-1" htmlFor="batch-department">
                所属部門（任意）
              </label>
              <select
                id="batch-department"
                className="form-select"
                value={batchDeptId}
                onChange={(e) => setBatchDeptId(e.target.value)}
                disabled={Boolean(batchType) && batchDepartments.length === 0}
              >
                <option value="">未設定</option>
                {batchDepartments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label small mb-1" htmlFor="batch-position">
                役職（任意）
              </label>
              <select
                id="batch-position"
                className="form-select"
                value={batchPosition}
                onChange={(e) => setBatchPosition(e.target.value)}
              >
                <option value="">未設定</option>
                {(master?.positions ?? []).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label small mb-1" htmlFor="batch-hire-date">
                入社日（任意）
              </label>
              <input
                id="batch-hire-date"
                type="date"
                className="form-control"
                value={batchHireDate}
                onChange={(e) => setBatchHireDate(e.target.value)}
              />
            </div>
            <div className="resume-import-batch-action">
              <button type="button" className="btn btn-outline-primary app-btn w-100" onClick={applyBatchDefaults}>
                <i className="bi bi-check2-square" aria-hidden="true" />
                全カードに反映
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="resume-import-card-list" aria-label="インポート確認一覧">
        {rows.map((row) => {
          const personal = row.form?.personal || {};
          const rowDepts = filterDepartmentsForEmployeeType(
            departments,
            row.employeeType,
            row.affiliationCompany
          );
          const hasError = Boolean(row.parseError || row.codeError || row.registerError);
          const disabled = Boolean(row.parseError) || row.registered || registering || !row.selected;
          const age = ageFromBirthDate(personal.birthDate);
          const nation = nationalityLabel(row.form, master?.nationalities ?? []);
          const statusLabel = row.parseError
            ? '解析エラー'
            : row.registered
              ? '登録済'
              : row.registerError || row.codeError
                ? '要修正'
                : row.selected
                  ? '登録待ち'
                  : 'スキップ';

          return (
            <article
              key={row.localId}
              className={`resume-import-card${hasError ? ' is-error' : ''}${row.registered ? ' is-done' : ''}${!row.selected && !row.parseError && !row.registered ? ' is-skipped' : ''}`}
            >
              <header className="resume-import-card-head">
                <label className="resume-import-card-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={row.selected}
                    disabled={Boolean(row.parseError) || row.registered || registering}
                    onChange={(e) => updateRow(row.localId, { selected: e.target.checked })}
                    aria-label={`${row.form?.name || row.fileName} を登録対象にする`}
                  />
                </label>
                <div className="resume-import-card-identity">
                  <div className="resume-import-card-name">
                    {row.form?.name || '—'}
                    {personal.furigana ? (
                      <span className="resume-import-card-kana">（{personal.furigana}）</span>
                    ) : null}
                  </div>
                  <div className="resume-import-card-file text-break">{row.fileName}</div>
                  <div className="resume-import-card-meta">
                    {personal.gender ? <span>{personal.gender}</span> : null}
                    {age ? <span>{age}歳</span> : null}
                    {nation ? <span>{nation}</span> : null}
                  </div>
                </div>
                <span
                  className={`resume-import-card-status${hasError ? ' is-error' : ''}${row.registered ? ' is-done' : ''}`}
                >
                  {statusLabel}
                </span>
              </header>

              {!row.parseError ? (
                <div className="resume-import-card-body">
                  <div className="resume-import-field">
                    <label className="form-label small mb-1" htmlFor={`company-${row.localId}`}>
                      所属会社 <span className="text-danger">*</span>
                    </label>
                    <select
                      id={`company-${row.localId}`}
                      className="form-select form-select-sm"
                      value={row.affiliationCompany}
                      disabled={disabled}
                      onChange={(e) => handleCompanyChange(row, e.target.value)}
                    >
                      {companyOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="resume-import-field">
                    <label className="form-label small mb-1" htmlFor={`type-${row.localId}`}>
                      社員種別 <span className="text-danger">*</span>
                    </label>
                    <select
                      id={`type-${row.localId}`}
                      className="form-select form-select-sm"
                      value={row.employeeType}
                      disabled={disabled}
                      onChange={(e) => handleTypeChange(row, e.target.value)}
                    >
                      <option value="">選択</option>
                      {(master?.employeeTypes ?? []).map((t) => (
                        <option key={t} value={t}>
                          {typeOptionLabel(t)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="resume-import-field">
                    <label className="form-label small mb-1" htmlFor={`dept-${row.localId}`}>
                      所属部門 <span className="text-danger">*</span>
                    </label>
                    <select
                      id={`dept-${row.localId}`}
                      className="form-select form-select-sm"
                      value={row.departmentId}
                      disabled={disabled || !row.employeeType}
                      onChange={(e) => handleDeptChange(row, e.target.value)}
                    >
                      <option value="">選択</option>
                      {rowDepts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="resume-import-field">
                    <label className="form-label small mb-1" htmlFor={`position-${row.localId}`}>
                      役職
                    </label>
                    <select
                      id={`position-${row.localId}`}
                      className="form-select form-select-sm"
                      value={row.position}
                      disabled={disabled}
                      onChange={(e) => updateRow(row.localId, { position: e.target.value })}
                    >
                      <option value="">未設定</option>
                      {(master?.positions ?? []).map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="resume-import-field">
                    <label className="form-label small mb-1" htmlFor={`hire-${row.localId}`}>
                      入社日 <span className="text-danger">*</span>
                    </label>
                    <input
                      id={`hire-${row.localId}`}
                      type="date"
                      className={`form-control form-control-sm${!row.hireDate && row.selected && !row.registered ? ' is-invalid' : ''}`}
                      value={row.hireDate}
                      disabled={disabled}
                      onChange={(e) =>
                        updateRow(row.localId, {
                          hireDate: e.target.value,
                          registerError: '',
                        })
                      }
                    />
                  </div>
                  <div className="resume-import-field resume-import-field--code">
                    <label className="form-label small mb-1" htmlFor={`code-${row.localId}`}>
                      社員ID <span className="text-danger">*</span>
                    </label>
                    <input
                      id={`code-${row.localId}`}
                      type="text"
                      className={`form-control form-control-sm ${row.codeError ? 'is-invalid' : ''}`}
                      value={row.employeeCode}
                      disabled={disabled}
                      placeholder="例：btcB00015"
                      onChange={(e) =>
                        updateRow(row.localId, {
                          employeeCode: e.target.value.trim(),
                          codeError: '',
                          registerError: '',
                        })
                      }
                      onBlur={() => handleCodeBlur(row)}
                      autoComplete="off"
                    />
                    {row.recommendHint ? (
                      <div className="small text-muted mt-1">
                        {row.recommendHint}
                        {row.recommendCode ? (
                          <>
                            {' '}
                            <button
                              type="button"
                              className="btn btn-link btn-sm p-0 align-baseline"
                              disabled={registering || row.registered}
                              onClick={() => fillRecommend(row)}
                            >
                              反映
                            </button>
                          </>
                        ) : null}
                      </div>
                    ) : (
                      <div className="small text-muted mt-1">
                        {row.employeeType
                          ? `第4文字は「${EMPLOYEE_TYPE_LETTER[row.employeeType] || '?'}」`
                          : '種別選択後に英字が決まります'}
                      </div>
                    )}
                    {row.codeChecking ? <div className="small text-muted">確認中…</div> : null}
                  </div>
                </div>
              ) : null}

              {(row.parseError || row.registerError || row.codeError) && (
                <div className="resume-import-card-error">
                  {row.parseError || row.registerError || row.codeError}
                </div>
              )}
            </article>
          );
        })}
      </section>

      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mt-3 mb-4">
        <div className="text-muted small">
          登録対象 {selectedCount} / {rows.length} 件
          （キャンセルしてもデータベースには保存されません）
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline-secondary app-btn" onClick={handleCancel} disabled={registering}>
            キャンセル
          </button>
          <button
            type="button"
            className="btn btn-primary app-btn"
            onClick={handleRegister}
            disabled={registering || selectedCount === 0}
          >
            {registering ? '登録中…' : `登録する（${selectedCount} 件）`}
          </button>
        </div>
      </div>

      <AppFooter />
    </div>
  );
}
