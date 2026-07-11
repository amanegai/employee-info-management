import { useCallback, useEffect, useMemo, useState } from 'react';
import ListSectionBar from '../components/ListSectionBar';
import HrOpsTaskShell from '../components/hrOps/HrOpsTaskShell';
import { useAppMessage } from '../context/MessageContext';
import { useAuth } from '../context/AuthContext';
import {
  filterDepartmentsByScope,
  filterEmployeesByUserScope,
  resolveSearchDepartmentScope,
} from '../auth';
import { api } from '../api';
import { findHrOpsBusinessType } from '../utils/hrOpsBusinessTypes';
import { currentTargetMonth, formatTargetMonthLabel } from '../utils/fileCategories';
import { timesheetFileMatchesEmployee } from '../utils/timesheetImport';
import { payrollFileMatchesEmployee } from '../utils/payrollDocument';
import { applicationFileMatchesEmployee } from '../utils/childcareLeaveApplication';
import {
  buildPayrollMailBody,
  buildPayrollMailSubject,
} from '../utils/payrollMailTemplate';
import { excludeParentDepartments, filterEmployeesByDepartmentScope } from '../utils';

const BUSINESS_TYPE = findHrOpsBusinessType('client-send');

function formatAttachFileSize(bytes) {
  if (bytes == null || Number.isNaN(bytes)) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getAttachFileIconInfo(filename) {
  const ext = (filename || '').split('.').pop()?.toLowerCase() ?? '';
  const map = {
    pdf: { icon: 'bi-file-earmark-pdf', tone: 'pdf' },
    doc: { icon: 'bi-file-earmark-word', tone: 'doc' },
    docx: { icon: 'bi-file-earmark-word', tone: 'doc' },
    xls: { icon: 'bi-file-earmark-excel', tone: 'sheet' },
    xlsx: { icon: 'bi-file-earmark-excel', tone: 'sheet' },
    csv: { icon: 'bi-file-earmark-spreadsheet', tone: 'sheet' },
    png: { icon: 'bi-file-earmark-image', tone: 'image' },
    jpg: { icon: 'bi-file-earmark-image', tone: 'image' },
    jpeg: { icon: 'bi-file-earmark-image', tone: 'image' },
    gif: { icon: 'bi-file-earmark-image', tone: 'image' },
    webp: { icon: 'bi-file-earmark-image', tone: 'image' },
    zip: { icon: 'bi-file-earmark-zip', tone: 'archive' },
    rar: { icon: 'bi-file-earmark-zip', tone: 'archive' },
    ppt: { icon: 'bi-file-earmark-ppt', tone: 'slide' },
    pptx: { icon: 'bi-file-earmark-ppt', tone: 'slide' },
    txt: { icon: 'bi-file-earmark-text', tone: 'text' },
  };
  return map[ext] ?? { icon: 'bi-file-earmark', tone: 'default' };
}

const DOCUMENT_TYPES = [
  { value: 'PAYROLL', label: '給与明細書', icon: 'bi-cash-stack', desc: '社員の給与明細を送付' },
  { value: 'APPLICATION', label: '申請書（PDF）', icon: 'bi-file-earmark-check', desc: '社員の申請書PDFを送付' },
  { value: 'TIMESHEET', label: '勤務表', icon: 'bi-table', desc: '取引先向け勤務表を送付' },
  { value: 'REPORT', label: '報告書類', icon: 'bi-file-earmark-text', desc: '報告書類を取引先へ送付' },
];

function isEmployeeDirectSend(documentType) {
  return documentType === 'PAYROLL' || documentType === 'APPLICATION';
}

const INITIAL_TARGET_MONTH = currentTargetMonth();

function collectClientRecipientEmails(client) {
  const emails = [];
  (client.clientContacts ?? []).forEach((contact) => {
    [contact.email1, contact.email2, contact.email3].forEach((email) => {
      if (email?.trim()) {
        emails.push({ email: email.trim(), name: contact.contactName, source: '取引先担当' });
      }
    });
  });
  const seen = new Set();
  return emails.filter((item) => {
    const key = item.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildMailBody(form, context) {
  if (form.documentType === 'PAYROLL') {
    return buildPayrollMailBody(context.recipientName, form.message);
  }
  if (form.documentType === 'APPLICATION') {
    const lines = [
      `${context.recipientName || 'ご担当者'} 様`,
      '',
      'いつもお世話になっております。',
      '人事部でございます。',
      '',
      '下記の申請書を送付いたします。',
      '',
      `■ 件名：${form.subject || '—'}`,
    ];
    if (form.message?.trim()) {
      lines.push('', form.message.trim());
    }
    lines.push('', 'ご確認のほど、よろしくお願いいたします。');
    return lines.join('\n');
  }

  const typeLabel = DOCUMENT_TYPES.find((item) => item.value === form.documentType)?.label ?? '書類';
  const lines = [
    `${context.clientName || context.recipientName || 'ご担当者'} 様`,
    '',
    'いつもお世話になっております。',
    '人事部でございます。',
    '',
    '下記の書類を送付いたします。',
    '',
    `■ 送付種別：${typeLabel}`,
  ];

  if (form.documentType === 'TIMESHEET' && form.targetMonth) {
    lines.push(`■ 送付年月：${formatTargetMonthLabel(form.targetMonth)}`);
  }
  if (context.employeeLines?.length) {
    context.employeeLines.forEach((line) => lines.push(line));
  }
  lines.push(`■ 件名：${form.subject || '—'}`);
  if (form.message?.trim()) {
    lines.push('', form.message.trim());
  }
  lines.push('', 'ご確認のほど、よろしくお願いいたします。');
  return lines.join('\n');
}

function SendFormField({ label, htmlFor, required, hint, children }) {
  return (
    <div className="hr-ops-send-field">
      <label className="hr-ops-send-field-label" htmlFor={htmlFor}>
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {hint && <p className="hr-ops-send-field-hint">{hint}</p>}
    </div>
  );
}

function SendEmployeeCard({ employee, selected, onClick, multi = false }) {
  return (
    <button
      type="button"
      className={`hr-ops-send-employee-card${selected ? ' is-selected' : ''}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      {multi && (
        <span className="hr-ops-send-employee-card-check" aria-hidden="true">
          <i className={`bi ${selected ? 'bi-check-square-fill' : 'bi-square'}`} />
        </span>
      )}
      <span className="hr-ops-send-employee-card-code">{employee.employeeCode}</span>
      <span className="hr-ops-send-employee-card-name">{employee.name}</span>
      {employee.meta && <span className="hr-ops-send-employee-card-meta">{employee.meta}</span>}
    </button>
  );
}

function SendEmployeeSingleSelect({
  id,
  disabled,
  loading,
  query,
  onQueryChange,
  employees,
  value,
  onChange,
  emptyMessage,
  waitingMessage,
  isWaiting,
}) {
  if (isWaiting) {
    return (
      <div className="hr-ops-send-inline-hint">
        <i className="bi bi-building" aria-hidden="true" />
        {waitingMessage}
      </div>
    );
  }
  if (loading) {
    return (
      <div className="text-center py-2">
        <div className="spinner-border spinner-border-sm text-primary" role="status" />
      </div>
    );
  }
  return (
    <div className={`hr-ops-send-employee-picker${disabled ? ' is-disabled' : ''}`}>
      <div className="hr-ops-send-search">
        <i className="bi bi-search" aria-hidden="true" />
        <input
          id={id}
          type="search"
          className="form-control"
          placeholder="氏名・社員IDで検索"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          disabled={disabled}
        />
      </div>
      {employees.length === 0 ? (
        <div className="hr-ops-send-inline-hint">
          <i className="bi bi-person-x" aria-hidden="true" />
          {emptyMessage}
        </div>
      ) : (
        <div className="hr-ops-send-employee-grid" role="listbox" aria-label="対象社員">
          {employees.map((employee) => {
            const selected = String(employee.id) === value;
            return (
              <SendEmployeeCard
                key={employee.id}
                employee={employee}
                selected={selected}
                onClick={() => onChange(String(employee.id))}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function SendEmployeeMultiSelect({
  id,
  disabled,
  loading,
  query,
  onQueryChange,
  allEmployees,
  filteredEmployees,
  selectedIds,
  onChange,
  emptyMessage,
}) {
  const selectedSet = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);

  function toggleEmployee(employeeId) {
    const id = String(employeeId);
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-2">
        <div className="spinner-border spinner-border-sm text-primary" role="status" />
      </div>
    );
  }
  if (allEmployees.length === 0) {
    return (
      <div className="hr-ops-send-inline-hint">
        <i className="bi bi-person-x" aria-hidden="true" />
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="hr-ops-send-employee-picker">
      <div className="hr-ops-send-search">
        <i className="bi bi-search" aria-hidden="true" />
        <input
          id={id}
          type="search"
          className="form-control"
          placeholder="氏名・社員IDで検索"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          disabled={disabled}
        />
      </div>
      {filteredEmployees.length === 0 ? (
        <div className="hr-ops-send-inline-hint">
          <i className="bi bi-search" aria-hidden="true" />
          検索条件に一致する社員がいません
        </div>
      ) : (
        <div className="hr-ops-send-employee-grid" role="group" aria-label="自社社員名">
          {filteredEmployees.map((employee) => (
            <SendEmployeeCard
              key={employee.id}
              employee={employee}
              selected={selectedSet.has(String(employee.id))}
              multi
              onClick={() => toggleEmployee(employee.id)}
            />
          ))}
        </div>
      )}
      <p className="hr-ops-send-field-hint mb-0">{selectedIds.length} 名選択中</p>
    </div>
  );
}

function SendFilePicker({
  id,
  loading,
  files,
  emptyTitle,
  emptyMessage,
  waitingMessage,
  isWaiting,
  layout = 'list',
  multi = false,
  selectedFileId,
  selectedFileIds = [],
  onSelectFile,
  onToggleFile,
}) {
  if (isWaiting) {
    return (
      <div className="hr-ops-send-file-empty">
        <i className="bi bi-info-circle" aria-hidden="true" />
        <p className="mb-0">{waitingMessage}</p>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="text-center py-3">
        <div className="spinner-border spinner-border-sm text-primary" role="status" />
      </div>
    );
  }
  if (files.length === 0) {
    return (
      <div className="hr-ops-send-file-empty hr-ops-send-file-empty--warn">
        <i className="bi bi-inbox" aria-hidden="true" />
        <strong>{emptyTitle}</strong>
        <p className="mb-0">{emptyMessage}</p>
      </div>
    );
  }

  if (layout === 'cards') {
    const selectedCount = multi
      ? selectedFileIds.length
      : selectedFileId
        ? 1
        : 0;

    return (
      <div className="hr-ops-send-file-picker-cards">
        <div
          className="hr-ops-send-file-grid"
          role={multi ? 'group' : 'radiogroup'}
          aria-labelledby={id}
        >
          {files.map((file) => {
            const selected = multi
              ? selectedFileIds.includes(String(file.id))
              : String(file.id) === selectedFileId;
            const iconInfo = getAttachFileIconInfo(file.originalName);
            const sizeLabel = formatAttachFileSize(file.sizeBytes);

            return (
              <label
                key={file.id}
                className={`hr-ops-send-file-card${selected ? ' is-selected' : ''}`}
                onClick={() => {
                  if (!multi) {
                    onSelectFile(selected ? '' : String(file.id));
                  }
                }}
              >
                <span className="hr-ops-send-file-card-check">
                  <input
                    type={multi ? 'checkbox' : 'radio'}
                    name={multi ? `attach-${id}` : 'attachFileId'}
                    className="form-check-input"
                    checked={selected}
                    readOnly={!multi}
                    onChange={() => {
                      if (multi) onToggleFile(String(file.id));
                    }}
                  />
                </span>
                <span
                  className={`file-type-icon file-type-icon--${iconInfo.tone} hr-ops-send-file-card-icon`}
                  aria-hidden="true"
                >
                  <i className={`bi ${iconInfo.icon}`} />
                </span>
                <span className="hr-ops-send-file-card-body">
                  <strong className="hr-ops-send-file-card-name" title={file.originalName}>
                    {file.originalName}
                  </strong>
                  {file.description && (
                    <span className="hr-ops-send-file-card-desc" title={file.description}>
                      {file.description}
                    </span>
                  )}
                  {file.employeeLabel && (
                    <span className="hr-ops-send-file-card-meta">{file.employeeLabel}</span>
                  )}
                  {sizeLabel && <span className="hr-ops-send-file-card-meta">{sizeLabel}</span>}
                </span>
              </label>
            );
          })}
        </div>
        {multi && selectedCount > 0 && (
          <p className="hr-ops-send-file-picker-count mb-0">{selectedCount} 件選択中</p>
        )}
      </div>
    );
  }

  return (
    <div className="hr-ops-send-file-list" role={multi ? 'group' : 'radiogroup'} aria-labelledby={id}>
      {files.map((file) => {
        const selected = multi
          ? selectedFileIds.includes(String(file.id))
          : String(file.id) === selectedFileId;
        return (
          <label
            key={file.id}
            className={`hr-ops-send-file-item${selected ? ' is-selected' : ''}`}
            onClick={() => {
              if (!multi) {
                onSelectFile(selected ? '' : String(file.id));
              }
            }}
          >
            <input
              type={multi ? 'checkbox' : 'radio'}
              name={multi ? `attach-${id}` : 'attachFileId'}
              className="form-check-input"
              checked={selected}
              readOnly={!multi}
              onChange={() => {
                if (multi) onToggleFile(String(file.id));
              }}
            />
            <span className="hr-ops-send-file-item-main">
              <strong>{file.originalName}</strong>
              {file.description && <span className="hr-ops-send-file-item-desc">{file.description}</span>}
              {file.employeeLabel && (
                <span className="hr-ops-send-file-item-employee">{file.employeeLabel}</span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export default function HrOpsClientSendPage() {
  const { showMessage } = useAppMessage();
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [files, setFiles] = useState([]);
  const [master, setMaster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [clientDetail, setClientDetail] = useState(null);
  const [activeEmployees, setActiveEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [payrollEmployees, setPayrollEmployees] = useState([]);
  const [payrollEmployeesLoading, setPayrollEmployeesLoading] = useState(false);
  const [payrollEmployeeDetail, setPayrollEmployeeDetail] = useState(null);
  const [mailStatus, setMailStatus] = useState({ configured: false, fromAddress: '' });
  const [sending, setSending] = useState(false);
  const [payrollEmployeeQuery, setPayrollEmployeeQuery] = useState('');
  const [timesheetEmployeeQuery, setTimesheetEmployeeQuery] = useState('');
  const [form, setForm] = useState({
    documentType: '',
    clientId: '',
    recipientEmail: '',
    targetMonth: INITIAL_TARGET_MONTH,
    departmentId: '',
    employeeId: '',
    employeeIds: [],
    subject: '',
    message: '',
    fileId: '',
    fileIds: [],
  });

  const visibleDepartments = useMemo(
    () => excludeParentDepartments(filterDepartmentsByScope(master?.departments ?? [], user)),
    [master, user]
  );

  const loadFiles = useCallback(
    async (documentType, targetMonth) => {
      if (!documentType) {
        setFiles([]);
        return;
      }
      setFilesLoading(true);
      try {
        const params = {};
        if (documentType === 'TIMESHEET') {
          params.category = 'TIMESHEET';
          if (targetMonth) params.targetMonth = targetMonth;
        } else if (documentType === 'PAYROLL') {
          params.category = 'PAYROLL';
          if (targetMonth) params.targetMonth = targetMonth;
        } else if (documentType === 'APPLICATION') {
          params.category = 'APPLICATION';
        }
        setFiles(await api.listFiles(params));
      } catch (e) {
        showMessage(e.message, 'danger');
        setFiles([]);
      } finally {
        setFilesLoading(false);
      }
    },
    [showMessage]
  );

  const loadMeta = useCallback(async () => {
    setLoading(true);
    try {
      const [clientList, status, masterData] = await Promise.all([
        api.searchClients({}),
        api.getHrOpsClientMailStatus(),
        api.getMaster(),
      ]);
      setClients(clientList);
      setMailStatus(status ?? { configured: false, fromAddress: '' });
      setMaster(masterData);
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (loading || !form.documentType) return;
    loadFiles(form.documentType, form.targetMonth);
  }, [loading, form.documentType, form.targetMonth, loadFiles]);

  useEffect(() => {
    if (!form.clientId || isEmployeeDirectSend(form.documentType)) {
      setClientDetail(null);
      return;
    }
    let cancelled = false;
    api
      .getClient(form.clientId)
      .then((detail) => {
        if (!cancelled) {
          setClientDetail(detail);
          const emails = collectClientRecipientEmails(detail);
          setForm((prev) => ({ ...prev, recipientEmail: emails[0]?.email || '' }));
        }
      })
      .catch((e) => {
        if (!cancelled) showMessage(e.message, 'danger');
      });
    return () => {
      cancelled = true;
    };
  }, [form.clientId, form.documentType, showMessage]);

  useEffect(() => {
    if (form.documentType !== 'TIMESHEET' || !form.clientId) {
      setActiveEmployees([]);
      return;
    }
    let cancelled = false;
    setEmployeesLoading(true);
    api
      .getHrOpsClientActiveEmployees(form.clientId)
      .then((employees) => {
        if (!cancelled) setActiveEmployees(employees ?? []);
      })
      .catch((e) => {
        if (!cancelled) {
          showMessage(e.message, 'danger');
          setActiveEmployees([]);
        }
      })
      .finally(() => {
        if (!cancelled) setEmployeesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.clientId, form.documentType, showMessage]);

  useEffect(() => {
    if (!isEmployeeDirectSend(form.documentType) || !form.departmentId || !master || !user) {
      setPayrollEmployees([]);
      return;
    }
    let cancelled = false;
    setPayrollEmployeesLoading(true);
    (async () => {
      try {
        const departments = master.departments ?? [];
        const deptScope = resolveSearchDepartmentScope(user, departments, form.departmentId);
        if (deptScope && deptScope.length === 0) {
          setPayrollEmployees([]);
          return;
        }
        const data = await api.searchEmployees({
          departmentId: deptScope?.length === 1 ? deptScope[0] : undefined,
        });
        let result =
          deptScope && deptScope.length > 1
            ? filterEmployeesByDepartmentScope(data, deptScope)
            : data;
        result = filterEmployeesByUserScope(result, user, departments);
        if (!cancelled) {
          setPayrollEmployees(result.filter((emp) => emp.workStatus !== '退職'));
        }
      } catch (e) {
        if (!cancelled) {
          showMessage(e.message, 'danger');
          setPayrollEmployees([]);
        }
      } finally {
        if (!cancelled) setPayrollEmployeesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.documentType, form.departmentId, master, user, showMessage]);

  useEffect(() => {
    if (!isEmployeeDirectSend(form.documentType) || !form.employeeId) {
      setPayrollEmployeeDetail(null);
      return;
    }
    let cancelled = false;
    api
      .getEmployeeDetail(form.employeeId)
      .then((detail) => {
        if (!cancelled) setPayrollEmployeeDetail(detail);
      })
      .catch(() => {
        if (!cancelled) setPayrollEmployeeDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [form.documentType, form.employeeId]);

  const recipientOptions = useMemo(
    () => (clientDetail ? collectClientRecipientEmails(clientDetail) : []),
    [clientDetail]
  );

  const selectedTimesheetEmployees = useMemo(
    () => activeEmployees.filter((item) => form.employeeIds.includes(String(item.employeeId))),
    [activeEmployees, form.employeeIds]
  );

  const selectedPayrollEmployee = useMemo(
    () => payrollEmployees.find((item) => String(item.id) === form.employeeId) ?? null,
    [payrollEmployees, form.employeeId]
  );

  const filteredPayrollEmployees = useMemo(() => {
    const keyword = payrollEmployeeQuery.trim().toLowerCase();
    const base = payrollEmployees.map((emp) => ({
      id: emp.id,
      employeeCode: emp.employeeCode,
      name: emp.name,
      meta: emp.position || emp.departmentName || '',
    }));
    if (!keyword) return base;
    return base.filter((emp) => {
      const haystack = [emp.name, emp.employeeCode, emp.meta].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(keyword);
    });
  }, [payrollEmployees, payrollEmployeeQuery]);

  const timesheetEmployeeOptions = useMemo(
    () =>
      activeEmployees.map((emp) => ({
        id: emp.employeeId,
        employeeCode: emp.employeeCode,
        name: emp.employeeName,
        meta: emp.projectName || '',
      })),
    [activeEmployees]
  );

  const filteredTimesheetEmployees = useMemo(() => {
    const keyword = timesheetEmployeeQuery.trim().toLowerCase();
    if (!keyword) return timesheetEmployeeOptions;
    return timesheetEmployeeOptions.filter((emp) => {
      const haystack = [emp.name, emp.employeeCode, emp.meta].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(keyword);
    });
  }, [timesheetEmployeeOptions, timesheetEmployeeQuery]);

  const displayFiles = useMemo(() => {
    if (form.documentType === 'TIMESHEET') {
      if (selectedTimesheetEmployees.length === 0) return [];
      return files
        .filter((file) =>
          selectedTimesheetEmployees.some((employee) =>
            timesheetFileMatchesEmployee(file.originalName, employee)
          )
        )
        .map((file) => {
          const employee = selectedTimesheetEmployees.find((item) =>
            timesheetFileMatchesEmployee(file.originalName, item)
          );
          return {
            ...file,
            employeeLabel: employee
              ? `${employee.employeeCode} ${employee.employeeName}`
              : undefined,
          };
        });
    }
    if (form.documentType === 'PAYROLL' && selectedPayrollEmployee) {
      return files.filter((file) => payrollFileMatchesEmployee(file.originalName, selectedPayrollEmployee));
    }
    if (form.documentType === 'APPLICATION' && selectedPayrollEmployee) {
      return files.filter(
        (file) =>
          file.originalName?.toLowerCase().endsWith('.pdf') &&
          applicationFileMatchesEmployee(file.originalName, selectedPayrollEmployee)
      );
    }
    if (form.documentType === 'REPORT') {
      return files;
    }
    return files;
  }, [files, form.documentType, selectedTimesheetEmployees, selectedPayrollEmployee]);

  const selectedFile = useMemo(
    () => displayFiles.find((file) => String(file.id) === form.fileId) ?? null,
    [displayFiles, form.fileId]
  );

  const selectedFiles = useMemo(
    () => displayFiles.filter((file) => form.fileIds.includes(String(file.id))),
    [displayFiles, form.fileIds]
  );

  const mailPreviewContext = useMemo(() => {
    const clientName = clientDetail?.name ?? null;
    if (isEmployeeDirectSend(form.documentType) && selectedPayrollEmployee) {
      return {
        recipientName: selectedPayrollEmployee.name,
      };
    }
    if (form.documentType === 'TIMESHEET' && selectedTimesheetEmployees.length > 0) {
      return {
        clientName,
        employeeLines: selectedTimesheetEmployees.map(
          (emp) => `■ 自社社員：${emp.employeeName}（${emp.employeeCode}）`
        ),
      };
    }
    return { clientName, recipientName: clientName };
  }, [form.documentType, clientDetail, selectedPayrollEmployee, selectedTimesheetEmployees]);

  const mailPreview = useMemo(
    () => buildMailBody(form, mailPreviewContext),
    [form, mailPreviewContext]
  );

  const previewTo = useMemo(() => {
    if (isEmployeeDirectSend(form.documentType)) {
      return payrollEmployeeDetail?.email?.trim() || '（社員メール未登録）';
    }
    return form.recipientEmail || '—';
  }, [form.documentType, form.recipientEmail, payrollEmployeeDetail]);

  useEffect(() => {
    setForm((prev) => {
      const nextFileIds = prev.fileIds.filter((id) =>
        displayFiles.some((file) => String(file.id) === id)
      );
      const nextFileId =
        prev.fileId && displayFiles.some((file) => String(file.id) === prev.fileId)
          ? prev.fileId
          : '';
      if (nextFileId === prev.fileId && nextFileIds.length === prev.fileIds.length) {
        return prev;
      }
      return { ...prev, fileId: nextFileId, fileIds: nextFileIds };
    });
  }, [displayFiles]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function selectDocumentType(value) {
    const month = currentTargetMonth();
    setForm({
      documentType: value,
      clientId: '',
      recipientEmail: '',
      targetMonth: month,
      departmentId: '',
      employeeId: '',
      employeeIds: [],
      subject:
        value === 'TIMESHEET'
          ? `【勤務表】${formatTargetMonthLabel(month)}分`
          : value === 'PAYROLL'
            ? buildPayrollMailSubject(month)
            : value === 'APPLICATION'
              ? '【申請書】'
              : '【報告書類】',
      message: '',
      fileId: '',
      fileIds: [],
    });
    setPayrollEmployeeQuery('');
    setTimesheetEmployeeQuery('');
  }

  function updateTargetMonth(value) {
    setForm((prev) => ({
      ...prev,
      targetMonth: value,
      fileId: '',
      fileIds: [],
      subject:
        prev.documentType === 'TIMESHEET' && value
          ? `【勤務表】${formatTargetMonthLabel(value)}分`
          : prev.documentType === 'PAYROLL' && value
            ? buildPayrollMailSubject(value)
            : prev.subject,
    }));
  }

  function setTimesheetEmployeeIds(employeeIds) {
    setForm((prev) => ({
      ...prev,
      employeeIds,
      fileId: '',
      fileIds: [],
    }));
  }

  function toggleFileId(fileId) {
    setForm((prev) => {
      const exists = prev.fileIds.includes(fileId);
      return {
        ...prev,
        fileIds: exists ? prev.fileIds.filter((id) => id !== fileId) : [...prev.fileIds, fileId],
      };
    });
  }

  async function handleSendMail() {
    if (!form.documentType) {
      showMessage('送付種別を選択してください', 'warning');
      return;
    }
    if (!form.subject.trim()) {
      showMessage('件名を入力してください', 'warning');
      return;
    }
    if (!mailStatus.configured) {
      showMessage('メール送信が未設定です。管理者に SMTP 設定を依頼してください。', 'warning');
      return;
    }

    if (isEmployeeDirectSend(form.documentType)) {
      if (!form.departmentId) {
        showMessage('社員所属を選択してください', 'warning');
        return;
      }
      if (!form.employeeId) {
        showMessage('対象社員を選択してください', 'warning');
        return;
      }
      if (!form.fileId) {
        showMessage('送付するPDFファイルを選択してください', 'warning');
        return;
      }
      const email = payrollEmployeeDetail?.email?.trim();
      if (!email) {
        showMessage('対象社員のメールアドレスが未登録です', 'warning');
        return;
      }
      setSending(true);
      try {
        const result = await api.sendHrOpsClientMail({
          recipientEmail: email,
          clientId: null,
          documentType: form.documentType,
          subject: form.subject.trim(),
          body: mailPreview,
          fileId: form.fileId ? Number(form.fileId) : null,
        });
        showMessage(result.message || 'メールを送信しました', 'success');
      } catch (e) {
        showMessage(e.message, 'danger');
      } finally {
        setSending(false);
      }
      return;
    }

    if (!form.clientId) {
      showMessage('取引先を選択してください', 'warning');
      return;
    }
    if (!form.recipientEmail) {
      showMessage('送付先メールアドレスを選択してください', 'warning');
      return;
    }

    if (form.documentType === 'TIMESHEET') {
      if (form.employeeIds.length === 0) {
        showMessage('自社社員名を1名以上選択してください', 'warning');
        return;
      }
      const fileIdsToSend =
        form.fileIds.length > 0 ? form.fileIds : form.fileId ? [form.fileId] : [];
      if (fileIdsToSend.length === 0) {
        showMessage('添付ファイルを選択してください', 'warning');
        return;
      }
      setSending(true);
      try {
        for (const fileId of fileIdsToSend) {
          await api.sendHrOpsClientMail({
            recipientEmail: form.recipientEmail,
            clientId: Number(form.clientId),
            documentType: form.documentType,
            subject: form.subject.trim(),
            body: mailPreview,
            fileId: Number(fileId),
          });
        }
        showMessage(
          fileIdsToSend.length > 1
            ? `${fileIdsToSend.length} 件のメールを送信しました`
            : 'メールを送信しました',
          'success'
        );
      } catch (e) {
        showMessage(e.message, 'danger');
      } finally {
        setSending(false);
      }
      return;
    }

    if (form.documentType === 'REPORT') {
      const fileIdsToSend =
        form.fileIds.length > 0 ? form.fileIds : form.fileId ? [form.fileId] : [];
      if (fileIdsToSend.length === 0) {
        showMessage('添付ファイルを1件以上選択してください', 'warning');
        return;
      }
      setSending(true);
      try {
        for (const fileId of fileIdsToSend) {
          await api.sendHrOpsClientMail({
            recipientEmail: form.recipientEmail,
            clientId: Number(form.clientId),
            documentType: form.documentType,
            subject: form.subject.trim(),
            body: mailPreview,
            fileId: Number(fileId),
          });
        }
        showMessage(
          fileIdsToSend.length > 1
            ? `${fileIdsToSend.length} 件のメールを送信しました`
            : 'メールを送信しました',
          'success'
        );
      } catch (e) {
        showMessage(e.message, 'danger');
      } finally {
        setSending(false);
      }
      return;
    }

    showMessage('未対応の送付種別です', 'warning');
  }

  const showClientFields = form.documentType === 'TIMESHEET' || form.documentType === 'REPORT';
  const showRecipientField =
    showClientFields && form.clientId && (form.documentType === 'REPORT' || form.documentType === 'TIMESHEET');

  return (
    <HrOpsTaskShell businessType={BUSINESS_TYPE} guideId="hr-ops-client-send">
      <div className="row g-4 hr-ops-send-layout">
        <div className="col-lg-6">
          <section className="hr-ops-send-panel">
            <div className="hr-ops-send-panel-head">
              <h2 className="hr-ops-send-panel-title">送付内容</h2>
              <p className="hr-ops-send-panel-desc mb-0">種別を選び、必要項目を順に入力してください</p>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border spinner-border-sm text-primary" role="status" />
              </div>
            ) : (
              <div className="hr-ops-send-panel-body">
                <div className="hr-ops-send-step">
                  <div className="hr-ops-send-step-label">
                    <span className="hr-ops-send-step-no">1</span>
                    送付種別
                  </div>
                  <div className="hr-ops-send-type-grid" role="radiogroup" aria-label="送付種別">
                    {DOCUMENT_TYPES.map((type) => {
                      const selected = form.documentType === type.value;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          className={`hr-ops-send-type-card${selected ? ' is-selected' : ''}`}
                          onClick={() => selectDocumentType(type.value)}
                        >
                          <i className={`bi ${type.icon}`} aria-hidden="true" />
                          <strong>{type.label}</strong>
                          <span>{type.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {form.documentType && (
                  <>
                    <div className="hr-ops-send-step">
                      <div className="hr-ops-send-step-label">
                        <span className="hr-ops-send-step-no">2</span>
                        詳細入力
                      </div>

                      {(form.documentType === 'PAYROLL' || form.documentType === 'APPLICATION') && (
                        <div className="hr-ops-send-fields">
                          {form.documentType === 'PAYROLL' && (
                            <SendFormField label="対象年月" htmlFor="sendPayrollTargetMonth" required>
                              <input
                                id="sendPayrollTargetMonth"
                                type="month"
                                className="form-control"
                                value={form.targetMonth}
                                onChange={(e) => updateTargetMonth(e.target.value)}
                              />
                            </SendFormField>
                          )}

                          <SendFormField label="社員所属" htmlFor="sendDepartmentId" required>
                            <select
                              id="sendDepartmentId"
                              className="form-select"
                              value={form.departmentId}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  departmentId: e.target.value,
                                  employeeId: '',
                                  fileId: '',
                                }))
                              }
                            >
                              <option value="">部署を選択</option>
                              {visibleDepartments.map((dept) => (
                                <option key={dept.id} value={String(dept.id)}>
                                  {dept.name}
                                </option>
                              ))}
                            </select>
                          </SendFormField>

                          <SendFormField
                            label="対象社員"
                            htmlFor="sendPayrollEmployeeQuery"
                            required
                            hint={!form.departmentId ? '先に社員所属を選択してください' : undefined}
                          >
                            <SendEmployeeSingleSelect
                              id="sendPayrollEmployeeQuery"
                              disabled={!form.departmentId}
                              loading={payrollEmployeesLoading}
                              query={payrollEmployeeQuery}
                              onQueryChange={setPayrollEmployeeQuery}
                              employees={filteredPayrollEmployees}
                              value={form.employeeId}
                              onChange={(employeeId) =>
                                setForm((prev) => ({
                                  ...prev,
                                  employeeId,
                                  fileId: '',
                                }))
                              }
                              isWaiting={!form.departmentId}
                              waitingMessage="社員所属を選択すると社員を選べます"
                              emptyMessage="該当する社員がいません"
                            />
                          </SendFormField>
                        </div>
                      )}

                      {form.documentType === 'TIMESHEET' && (
                        <div className="hr-ops-send-fields">
                          <SendFormField label="取引先" htmlFor="sendClientId" required>
                            <select
                              id="sendClientId"
                              className="form-select"
                              value={form.clientId}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  clientId: e.target.value,
                                  recipientEmail: '',
                                  employeeIds: [],
                                  fileId: '',
                                  fileIds: [],
                                }))
                              }
                            >
                              <option value="">取引先を選択</option>
                              {clients.map((client) => (
                                <option key={client.id} value={String(client.id)}>
                                  {client.name}
                                </option>
                              ))}
                            </select>
                          </SendFormField>

                          {form.clientId && (
                            <SendFormField label="自社社員名" htmlFor="sendTimesheetEmployeeQuery" required hint="複数選択できます">
                              <SendEmployeeMultiSelect
                                id="sendTimesheetEmployeeQuery"
                                loading={employeesLoading}
                                query={timesheetEmployeeQuery}
                                onQueryChange={setTimesheetEmployeeQuery}
                                allEmployees={timesheetEmployeeOptions}
                                filteredEmployees={filteredTimesheetEmployees}
                                selectedIds={form.employeeIds}
                                onChange={setTimesheetEmployeeIds}
                                emptyMessage="この取引先で稼働中の社員が見つかりません"
                              />
                            </SendFormField>
                          )}

                          {showRecipientField && (
                            <SendFormField label="送付先メール" htmlFor="recipientEmail" required>
                              <select
                                id="recipientEmail"
                                className="form-select"
                                value={form.recipientEmail}
                                onChange={(e) => updateField('recipientEmail', e.target.value)}
                              >
                                <option value="">担当者メールを選択</option>
                                {recipientOptions.map((item) => (
                                  <option key={item.email} value={item.email}>
                                    {item.name ? `${item.name} (${item.email})` : item.email}
                                  </option>
                                ))}
                              </select>
                            </SendFormField>
                          )}

                          <SendFormField label="送付年月" htmlFor="sendTargetMonth" required>
                            <input
                              id="sendTargetMonth"
                              type="month"
                              className="form-control"
                              value={form.targetMonth}
                              onChange={(e) => updateTargetMonth(e.target.value)}
                            />
                          </SendFormField>
                        </div>
                      )}

                      {form.documentType === 'REPORT' && (
                        <div className="hr-ops-send-fields">
                          <SendFormField label="取引先" htmlFor="sendReportClientId" required>
                            <select
                              id="sendReportClientId"
                              className="form-select"
                              value={form.clientId}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  clientId: e.target.value,
                                  recipientEmail: '',
                                  fileId: '',
                                  fileIds: [],
                                }))
                              }
                            >
                              <option value="">取引先を選択</option>
                              {clients.map((client) => (
                                <option key={client.id} value={String(client.id)}>
                                  {client.name}
                                </option>
                              ))}
                            </select>
                          </SendFormField>

                          {form.clientId && (
                            <SendFormField label="送付先メール" htmlFor="reportRecipientEmail" required>
                              <select
                                id="reportRecipientEmail"
                                className="form-select"
                                value={form.recipientEmail}
                                onChange={(e) => updateField('recipientEmail', e.target.value)}
                              >
                                <option value="">担当者メールを選択</option>
                                {recipientOptions.map((item) => (
                                  <option key={item.email} value={item.email}>
                                    {item.name ? `${item.name} (${item.email})` : item.email}
                                  </option>
                                ))}
                              </select>
                            </SendFormField>
                          )}
                        </div>
                      )}

                      <SendFormField label="添付ファイル" htmlFor="attachFileId">
                        <SendFilePicker
                          id="attachFileId"
                          loading={filesLoading}
                          files={displayFiles}
                          layout={isEmployeeDirectSend(form.documentType) ? 'list' : 'cards'}
                          multi={form.documentType === 'TIMESHEET' || form.documentType === 'REPORT'}
                          selectedFileId={form.fileId}
                          selectedFileIds={form.fileIds}
                          onSelectFile={(fileId) => updateField('fileId', fileId)}
                          onToggleFile={toggleFileId}
                          isWaiting={
                            (isEmployeeDirectSend(form.documentType) && !form.employeeId) ||
                            (form.documentType === 'TIMESHEET' && form.employeeIds.length === 0)
                          }
                          waitingMessage={
                            form.documentType === 'PAYROLL'
                              ? '対象社員を選択すると、ファイル管理の給与明細書が表示されます'
                              : form.documentType === 'APPLICATION'
                                ? '対象社員を選択すると、ファイル管理の申請書PDFが表示されます'
                                : '自社社員名を選択すると、該当社員の勤務表が表示されます'
                          }
                          emptyTitle="関連ファイルがありません"
                          emptyMessage={
                            form.documentType === 'PAYROLL'
                              ? '給与明細書作成画面からファイル管理へ保存してください。'
                              : form.documentType === 'APPLICATION'
                                ? '申請書確認画面からPDFをファイル管理へ保存してください。'
                                : form.documentType === 'TIMESHEET'
                                  ? 'ファイル名が「勤務表_社員ID_社員名_年-月.xlsx」形式か確認してください。'
                                  : 'ファイル管理に報告書類をアップロードしてください。'
                          }
                        />
                      </SendFormField>

                      <SendFormField label="件名" htmlFor="sendSubject" required>
                        <input
                          id="sendSubject"
                          type="text"
                          className="form-control"
                          value={form.subject}
                          onChange={(e) => updateField('subject', e.target.value)}
                        />
                      </SendFormField>

                      <SendFormField
                        label="本文追記"
                        htmlFor="sendMessage"
                        hint={isEmployeeDirectSend(form.documentType) ? '任意（定型文の後、署名の前に追記されます）' : '任意'}
                      >
                        <textarea
                          id="sendMessage"
                          className="form-control"
                          rows={4}
                          value={form.message}
                          onChange={(e) => updateField('message', e.target.value)}
                        />
                      </SendFormField>
                    </div>

                    <div className="hr-ops-send-actions">
                      {!mailStatus.configured && (
                        <div className="hr-ops-send-hint hr-ops-send-hint--warning">
                          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                          メール送信が未設定です。SMTP 設定後にシステム内送信が利用できます。
                        </div>
                      )}

                      {mailStatus.configured && mailStatus.fromAddress && (
                        <div className="hr-ops-send-hint">
                          <i className="bi bi-envelope-check" aria-hidden="true" />
                          送信元：{mailStatus.fromAddress}
                        </div>
                      )}

                      <button
                        type="button"
                        className="btn btn-primary app-btn hr-ops-send-submit"
                        disabled={sending || !mailStatus.configured}
                        onClick={handleSendMail}
                      >
                        <i className="bi bi-send" aria-hidden="true" />
                        {sending ? '送信中…' : '送信する'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        </div>

        <div className="col-lg-6">
          <section className="list-section-panel hr-ops-preview-panel">
            <ListSectionBar icon="bi-envelope" title="送付プレビュー" />
            <div className="list-section-body list-section-body-padded">
              {!form.documentType ? (
                <div className="hr-ops-send-preview-empty">
                  <i className="bi bi-envelope-paper" aria-hidden="true" />
                  <p className="mb-0">送付種別を選択するとプレビューが表示されます</p>
                </div>
              ) : (
                <div className="hr-ops-mail-preview">
                  <div className="hr-ops-mail-preview-row">
                    <span className="hr-ops-mail-preview-label">From</span>
                    <span>{mailStatus.fromAddress || '—'}</span>
                  </div>
                  <div className="hr-ops-mail-preview-row">
                    <span className="hr-ops-mail-preview-label">To</span>
                    <span>{previewTo}</span>
                  </div>
                  <div className="hr-ops-mail-preview-row">
                    <span className="hr-ops-mail-preview-label">件名</span>
                    <span>{form.subject || '—'}</span>
                  </div>
                  {(selectedFile || selectedFiles.length > 0) && (
                    <div className="hr-ops-mail-preview-row">
                      <span className="hr-ops-mail-preview-label">添付</span>
                      <span>
                        {(form.documentType === 'TIMESHEET' || form.documentType === 'REPORT') &&
                        selectedFiles.length > 0
                          ? selectedFiles.map((file) => file.originalName).join('、')
                          : selectedFile?.originalName || '—'}
                      </span>
                    </div>
                  )}
                  <pre className="hr-ops-mail-preview-body">{mailPreview}</pre>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </HrOpsTaskShell>
  );
}
