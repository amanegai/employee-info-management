import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useLocation, useNavigate } from 'react-router-dom';

import { api } from '../api';

import SummaryCards from '../components/SummaryCards';

import SearchForm from '../components/SearchForm';

import ListSectionBar from '../components/ListSectionBar';

import EmployeeTable from '../components/EmployeeTable';

import { SUMMARY_FILTER_LABELS, exportEmployeesToCsv, excludeParentDepartments, filterBySummary, filterEmployeesByDepartmentScope, formToImportSavePayload, formToSavePayload } from '../utils';

import { parseResumeXlsxToForm } from '../utils/resumeImport';

import AppFooter from '../components/AppFooter';
import PageHeader from '../components/PageHeader';
import { useAppMessage } from '../context/MessageContext';
import { canDelete, canManageHrOps, canWrite, filterDepartmentsByScope, filterEmployeesByUserScope, hasDataScopeRestriction, resolveSearchDepartmentScope } from '../auth';
import { useAuth } from '../context/AuthContext';
import BulkPayrollMailModal from '../components/employee/BulkPayrollMailModal';



const EMPTY_FILTERS = {
  keyword: '',
  departmentId: '',
  employeeType: '',
  workStatus: '',
  skillKeyword: '',
  technicalCategory: '',
  technicalItem: '',
  technicalMinLevel: '',
};

const SEARCH_DEBOUNCE_MS = 300;



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

  const importInputRef = useRef(null);

  const masterRef = useRef(null);

  const skipSearchEffectRef = useRef(true);



  const selectedEmployees = useMemo(
    () => employees.filter((emp) => selectedIds.has(emp.id)),
    [employees, selectedIds]
  );



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
        const deptScope = resolveSearchDepartmentScope(
          user,
          departments,
          searchFilters.departmentId
        );

        if (deptScope && deptScope.length === 0) {
          setEmployees([]);
          return;
        }

        const data = await api.searchEmployees({

          keyword: searchFilters.keyword || undefined,

          departmentId:
            deptScope?.length === 1 ? deptScope[0] : undefined,

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

        await Promise.all([
          loadSummary(),
          loadEmployees(EMPTY_FILTERS, null),
        ]);

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
    if (!user || location.pathname !== '/') return;
    if (location.state?.refreshList) {
      loadSummary();
      loadEmployees(filters, summaryFilter);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, user, filters, summaryFilter, loadSummary, loadEmployees, navigate]);



  function handleSummaryFilterClick(filterValue) {

    const nextFilter = summaryFilter === filterValue ? null : filterValue;

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

    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) return;



    setImporting(true);

    try {

      const form = await parseResumeXlsxToForm(file);

      const payload = formToImportSavePayload(form, '');

      const created = await api.createEmployeeFromImport(payload);

      if (!created?.id) {
        throw new Error('登録は完了しましたが、編集画面へ移動できませんでした');
      }

      showMessage(`「${created.name}」を履歴書から取り込みました。社員種別・所属部門・稼働状況を入力してください`);

      navigate(`/employees/${created.id}/edit`, {
        state: { from: '/', fromLabel: '社員一覧に戻る', fromImport: true },
      });

      void Promise.all([loadSummary(), loadEmployees(filters, summaryFilter)]).catch(() => {});

    } catch (e) {

      showMessage(`履歴書インポートに失敗しました: ${e.message}`, 'danger');

    } finally {

      setImporting(false);

    }

  }



  function handleToggleSelect(id) {

    setSelectedIds((prev) => {

      const next = new Set(prev);

      if (next.has(id)) {

        next.delete(id);

      } else {

        next.add(id);

      }

      return next;

    });

  }



  function handleToggleSelectAll(checked) {

    setSelectedIds((prev) => {

      const next = new Set(prev);

      if (checked) {

        employees.forEach((emp) => next.add(emp.id));

      } else {

        employees.forEach((emp) => next.delete(emp.id));

      }

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
              onClick={() => navigate('/employees/new')}
            >
              <i className="bi bi-person-plus-fill" aria-hidden="true" />
              新規社員登録
            </button>
          )}
        </div>
      </PageHeader>

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

        employeeTypes={master?.employeeTypes ?? []}

        workStatuses={master?.workStatuses ?? []}

        scopeRestricted={hasDataScopeRestriction(user)}

        expanded={searchExpanded}

        onToggle={() => setSearchExpanded((v) => !v)}

        onChange={setFilters}

      />
      </div>

      <section className="table-section list-section-panel" aria-label="社員基本情報一覧" data-guide="employee-table">

        <ListSectionBar
          icon="bi-table"
          title="社員基本情報一覧"
          count={employees.length}
          hideCount={listLoading}
          badge={
            summaryFilter ? (
              <span className="list-section-filter-badge">
                {SUMMARY_FILTER_LABELS[summaryFilter]}で絞り込み中
              </span>
            ) : null
          }
          actions={
            <>
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                hidden
                onChange={handleImportFile}
              />
              {canWrite(user) && (
                <button
                  type="button"
                  className="list-section-action-btn list-section-action-btn--primary"
                  onClick={handleImportClick}
                  disabled={listLoading || importing}
                >
                  <i className="bi bi-file-earmark-arrow-up" aria-hidden="true" />
                  {importing ? 'インポート中…' : '履歴書インポート'}
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
        <EmployeeTable
          employees={employees}
          loading={listLoading}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          onDelete={canDelete(user) ? handleDeleteEmployee : undefined}
          deletingId={deletingId}
          canDelete={canDelete(user)}
        />

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


