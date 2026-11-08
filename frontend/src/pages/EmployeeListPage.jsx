import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import SummaryCards from '../components/SummaryCards';
import SearchForm from '../components/SearchForm';
import ListSectionBar from '../components/ListSectionBar';
import EmployeeTable from '../components/EmployeeTable';
import {
  SUMMARY_FILTER_LABELS,
  exportEmployeesToCsv,
  excludeParentDepartments,
  filterBySummary,
  filterEmployeesByDepartmentScope,
} from '../utils';
import { parseResumeXlsxToForm } from '../utils/resumeImport';
import {
  clearEmployeeImportBatch,
  clearEmployeeImportPrefill,
  stashEmployeeImportBatch,
} from '../utils/employeeImportPrefill';
import AppFooter from '../components/AppFooter';
import PageHeader from '../components/PageHeader';
import { useAppMessage } from '../context/MessageContext';
import {
  canDelete,
  canManageHrOps,
  canWrite,
  filterDepartmentsByScope,
  filterEmployeesByUserScope,
  hasDataScopeRestriction,
  resolveSearchDepartmentScope,
} from '../auth';
import { useAuth } from '../context/AuthContext';
import BulkPayrollMailModal from '../components/employee/BulkPayrollMailModal';

const EMPTY_FILTERS = {
  keyword: '',
  departmentId: '',
  affiliationCompany: '',
  employeeType: '',
  workStatus: '',
  skillKeyword: '',
  technicalCategory: '',
  technicalItem: '',
  technicalMinLevel: '',
};

const SEARCH_DEBOUNCE_MS = 300;

function newLocalId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `import-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function EmployeeListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showMessage } = useAppMessage();
  const { user } = useAuth();

  const [summary, setSummary] = useState(null);
  const [master, setMaster] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [summaryFilter, setSummaryFilter] = useState(null);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [importing, setImporting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showBulkPayrollMail, setShowBulkPayrollMail] = useState(false);
  const [importBanner, setImportBanner] = useState(null);
  const [recentImportIds, setRecentImportIds] = useState(null);

  const importInputRef = useRef(null);
  const masterRef = useRef(null);
  const skipSearchEffectRef = useRef(true);

  const selectedEmployees = useMemo(
    () => employees.filter((emp) => selectedIds.has(emp.id)),
    [employees, selectedIds]
  );

  const displayedEmployees = useMemo(() => {
    if (!recentImportIds?.length) return employees;
    const idSet = new Set(recentImportIds);
    return employees.filter((emp) => idSet.has(emp.id));
  }, [employees, recentImportIds]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      setSummary(await api.getSummary());
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setSummaryLoading(false);
    }
  }, [showMessage]);

  const visibleDepartments = useMemo(
    () => excludeParentDepartments(filterDepartmentsByScope(master?.departments ?? [], user)),
    [master, user]
  );

  const loadEmployees = useCallback(
    async (searchFilters, filter) => {
      if (!user) return;
      setListLoading(true);
      try {
        const departments = masterRef.current?.departments ?? [];
        const deptScope = resolveSearchDepartmentScope(user, departments, searchFilters.departmentId);

        if (deptScope && deptScope.length === 0) {
          setEmployees([]);
          return;
        }

        const data = await api.searchEmployees({
          keyword: searchFilters.keyword || undefined,
          departmentId: deptScope?.length === 1 ? deptScope[0] : undefined,
          affiliationCompany: searchFilters.affiliationCompany || undefined,
          summaryFilter: filter || undefined,
          skillKeyword: searchFilters.skillKeyword || undefined,
          technicalCategory: searchFilters.technicalCategory || undefined,
          technicalItem: searchFilters.technicalItem || undefined,
          technicalMinLevel: searchFilters.technicalMinLevel || undefined,
          employeeType: searchFilters.employeeType || undefined,
          workStatus: searchFilters.workStatus || undefined,
        });

        let result =
          deptScope && deptScope.length > 1
            ? filterEmployeesByDepartmentScope(data, deptScope)
            : data;

        result = filterEmployeesByUserScope(result, user, departments);

        setEmployees(
          filter && filter !== 'endingThisMonth' ? filterBySummary(result, filter) : result
        );
      } catch (e) {
        showMessage(e.message, 'danger');
      } finally {
        setListLoading(false);
      }
    },
    [showMessage, user]
  );

  useEffect(() => {
    if (!user || !hasDataScopeRestriction(user)) return;
    setFilters((prev) => {
      if (!prev.departmentId) return prev;
      const allowed = new Set(visibleDepartments.map((d) => String(d.id)));
      return allowed.has(prev.departmentId) ? prev : { ...prev, departmentId: '' };
    });
  }, [user, visibleDepartments]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const masterData = await api.getMaster();
        if (cancelled) return;
        masterRef.current = masterData;
        setMaster(masterData);
        await Promise.all([loadSummary(), loadEmployees(EMPTY_FILTERS, null)]);
      } catch (e) {
        if (!cancelled) showMessage(e.message, 'danger');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loadSummary, loadEmployees, showMessage]);

  useEffect(() => {
    if (!user) return;
    if (skipSearchEffectRef.current) {
      skipSearchEffectRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      loadEmployees(filters, summaryFilter);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters, summaryFilter, loadEmployees, user]);

  useEffect(() => {
    if (!user || location.pathname !== '/employees') return;

    if (location.state?.refreshList) {
      loadSummary();
      loadEmployees(filters, summaryFilter);
      navigate(location.pathname, { replace: true, state: null });
      return;
    }

    if (location.state?.mypageSummaryFilter) {
      const nextFilter = location.state.mypageSummaryFilter;
      setRecentImportIds(null);
      setFilters(EMPTY_FILTERS);
      setSummaryFilter(nextFilter);
      skipSearchEffectRef.current = true;
      loadSummary();
      loadEmployees(EMPTY_FILTERS, nextFilter);
      navigate(location.pathname, { replace: true, state: null });
      return;
    }

    const result = location.state?.importResult;
    if (!result) return;

    const successIds = (result.successes || []).map((s) => s.id).filter(Boolean);
    setImportBanner(result);
    setRecentImportIds(successIds.length ? successIds : null);
    setFilters(EMPTY_FILTERS);
    setSummaryFilter(null);
    skipSearchEffectRef.current = true;
    loadSummary();
    loadEmployees(EMPTY_FILTERS, null);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, user, filters, summaryFilter, loadSummary, loadEmployees, navigate]);

  function handleSummaryFilterClick(filterValue) {
    const nextFilter = summaryFilter === filterValue ? null : filterValue;
    setRecentImportIds(null);
    setFilters(EMPTY_FILTERS);
    setSummaryFilter(nextFilter);
    skipSearchEffectRef.current = true;
    loadEmployees(EMPTY_FILTERS, nextFilter);
  }

  function handleExportCsv() {
    if (listLoading) return;
    if (selectedEmployees.length === 0) {
      showMessage('出力する社員を選択してください', 'warning');
      return;
    }
    exportEmployeesToCsv(selectedEmployees);
    showMessage(`${selectedEmployees.length} 件を CSV に出力しました`);
  }

  function handleImportClick() {
    if (listLoading || importing) return;
    importInputRef.current?.click();
  }

  async function handleImportFile(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;

    setImporting(true);
    clearEmployeeImportPrefill();
    clearEmployeeImportBatch();

    try {
      const nationalities = master?.nationalities ?? masterRef.current?.nationalities ?? [];
      const items = [];

      for (const file of files) {
        try {
          const form = await parseResumeXlsxToForm(file, nationalities);
          items.push({
            localId: newLocalId(),
            fileName: file.name,
            form: {
              ...form,
              workStatus: form.workStatus || '待機中',
              employeeType: form.employeeType || '',
            },
          });
        } catch (e) {
          items.push({
            localId: newLocalId(),
            fileName: file.name,
            parseError: e.message || '解析に失敗しました',
          });
        }
      }

      if (items.length === 0) {
        showMessage('読み込める履歴書がありません', 'warning');
        return;
      }

      stashEmployeeImportBatch(items);
      const okCount = items.filter((i) => !i.parseError).length;
      const ngCount = items.length - okCount;
      showMessage(
        ngCount > 0
          ? `履歴書を読み込みました（成功 ${okCount} / 失敗 ${ngCount}）。内容を確認して登録してください。`
          : `履歴書を ${okCount} 件読み込みました。内容を確認して登録してください。`
      );
      navigate('/employees/import/confirm');
    } catch (e) {
      showMessage(`履歴書インポートに失敗しました: ${e.message}`, 'danger');
    } finally {
      setImporting(false);
    }
  }

  function handleToggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleToggleSelectAll(checked) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) displayedEmployees.forEach((emp) => next.add(emp.id));
      else displayedEmployees.forEach((emp) => next.delete(emp.id));
      return next;
    });
  }

  async function handleDeleteEmployee(employee) {
    if (!window.confirm(`「${employee.name}」を削除しますか？`)) return;
    setDeletingId(employee.id);
    try {
      await api.deleteEmployee(employee.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(employee.id);
        return next;
      });
      showMessage(`「${employee.name}」を削除しました`);
      await Promise.all([loadSummary(), loadEmployees(filters, summaryFilter)]);
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setDeletingId(null);
    }
  }

  function clearRecentImportFilter() {
    setRecentImportIds(null);
  }

  function dismissImportBanner() {
    setImportBanner(null);
  }

  const singleSuccess = importBanner?.single && importBanner?.successes?.[0];

  return (
    <div className="container-fluid py-4 px-3 px-lg-5 list-page">
      <PageHeader
        guideId="employee-list"
        icon="bi-people-fill"
        title="社員情報管理"
        lead="派遣会社向け社員マスタ一覧"
        className="employee-list-page-header"
      >
        <div data-guide="employee-create-btn" className="d-flex flex-wrap gap-2">
          {canWrite(user) && (
            <button
              type="button"
              className="btn btn-primary app-btn"
              onClick={() => {
                clearEmployeeImportPrefill();
                clearEmployeeImportBatch();
                navigate('/employees/new');
              }}
            >
              <i className="bi bi-person-plus-fill" aria-hidden="true" />
              新規社員登録
            </button>
          )}
        </div>
      </PageHeader>

      {importBanner && (
        <div className="alert alert-success employee-import-banner" role="status">
          <div className="d-flex flex-wrap justify-content-between gap-2 align-items-start">
            <div>
              <div className="fw-semibold">
                履歴書インポートが完了しました（成功 {importBanner.successCount} 件
                {importBanner.failCount > 0 ? ` / 失敗 ${importBanner.failCount} 件` : ''}）
              </div>
              <div className="small mb-0 mt-1">
                履歴書から取り込めない項目（給与・評価・勤怠など）が未入力のことがあります。社員詳細を開き、内容を確認・更新してください。
              </div>
              {importBanner.failCount > 0 && (
                <ul className="small mb-0 mt-2">
                  {(importBanner.failures || []).slice(0, 5).map((f, idx) => (
                    <li key={`${f.fileName}-${idx}`}>
                      {f.name || f.fileName}: {f.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="d-flex flex-wrap gap-2">
              {singleSuccess ? (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() =>
                    navigate(`/employees/${singleSuccess.id}`, {
                      state: { from: '/employees', fromLabel: '一覧に戻る' },
                    })
                  }
                >
                  社員詳細を開く
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => {
                    if (importBanner.successes?.length) {
                      setRecentImportIds(importBanner.successes.map((s) => s.id));
                    }
                  }}
                >
                  今回の登録のみ表示
                </button>
              )}
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={dismissImportBanner}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      <div data-guide="employee-summary">
        <SummaryCards
          summary={summary}
          loading={summaryLoading}
          activeFilter={summaryFilter}
          onFilterClick={handleSummaryFilterClick}
        />
      </div>

      <div data-guide="employee-search">
        <SearchForm
          filters={filters}
          departments={visibleDepartments}
          affiliationCompanies={master?.affiliationCompanies ?? []}
          employeeTypes={master?.employeeTypes ?? []}
          workStatuses={master?.workStatuses ?? []}
          scopeRestricted={hasDataScopeRestriction(user)}
          expanded={searchExpanded}
          onToggle={() => setSearchExpanded((v) => !v)}
          onChange={(next) => {
            setRecentImportIds(null);
            setFilters(next);
          }}
        />
      </div>

      <section className="table-section list-section-panel" aria-label="社員基本情報一覧" data-guide="employee-table">
        <ListSectionBar
          icon="bi-table"
          title="社員基本情報一覧"
          count={displayedEmployees.length}
          hideCount={listLoading}
          badge={
            <>
              {summaryFilter ? (
                <span className="list-section-filter-badge">
                  {SUMMARY_FILTER_LABELS[summaryFilter]}で絞り込み中
                </span>
              ) : null}
              {recentImportIds?.length ? (
                <span className="list-section-filter-badge">
                  今回のインポート登録（{recentImportIds.length} 件）
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 ms-2 align-baseline"
                    onClick={clearRecentImportFilter}
                  >
                    解除
                  </button>
                </span>
              ) : null}
            </>
          }
          actions={
            <>
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                hidden
                multiple
                onChange={handleImportFile}
              />
              {canWrite(user) && (
                <button
                  type="button"
                  className="list-section-action-btn list-section-action-btn--primary"
                  onClick={handleImportClick}
                  disabled={listLoading || importing}
                  title="標準の技術者履歴書（.xlsx）を1件または複数選択"
                >
                  <i className="bi bi-file-earmark-arrow-up" aria-hidden="true" />
                  {importing ? '読み込み中…' : '履歴書を取り込む'}
                </button>
              )}
              {canManageHrOps(user) && (
                <button
                  type="button"
                  className="list-section-action-btn list-section-action-btn--primary"
                  onClick={() => setShowBulkPayrollMail(true)}
                  disabled={listLoading || selectedEmployees.length === 0}
                >
                  <i className="bi bi-envelope-paper" aria-hidden="true" />
                  給与明細一括送信
                </button>
              )}
              <button
                type="button"
                className="list-section-action-btn list-section-action-btn--primary"
                onClick={handleExportCsv}
                disabled={listLoading || selectedEmployees.length === 0}
              >
                <i className="bi bi-download" aria-hidden="true" />
                選択出力（CSV）
              </button>
              {selectedEmployees.length > 0 && (
                <span className="badge text-bg-primary">{selectedEmployees.length} 件選択中</span>
              )}
            </>
          }
        />

        <div className="list-section-body">
          {!listLoading && displayedEmployees.length === 0 ? (
            <div className="employee-list-empty text-center text-muted py-5">
              <p className="mb-2">条件に一致する社員が見つかりません。</p>
              <div className="d-flex flex-wrap gap-2 justify-content-center">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => {
                    setRecentImportIds(null);
                    setFilters(EMPTY_FILTERS);
                    setSummaryFilter(null);
                    skipSearchEffectRef.current = true;
                    loadEmployees(EMPTY_FILTERS, null);
                  }}
                >
                  条件をクリア
                </button>
                {canWrite(user) && (
                  <button type="button" className="btn btn-outline-primary btn-sm" onClick={handleImportClick}>
                    履歴書を取り込む
                  </button>
                )}
              </div>
            </div>
          ) : (
            <EmployeeTable
              employees={displayedEmployees}
              loading={listLoading}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              onDelete={canDelete(user) ? handleDeleteEmployee : undefined}
              deletingId={deletingId}
              canDelete={canDelete(user)}
            />
          )}
        </div>
      </section>

      <AppFooter />

      <BulkPayrollMailModal
        show={showBulkPayrollMail}
        onClose={() => setShowBulkPayrollMail(false)}
        employees={selectedEmployees}
      />
    </div>
  );
}
