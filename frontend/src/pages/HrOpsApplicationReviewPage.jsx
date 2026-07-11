import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import HrOpsDocumentPreview from '../components/hrOps/HrOpsDocumentPreview';
import ChildcareApplicationEditPanel from '../components/hrOps/ChildcareApplicationEditPanel';
import HrOpsPayrollEmployeePicker from '../components/hrOps/HrOpsPayrollEmployeePicker';
import HrOpsTaskShell from '../components/hrOps/HrOpsTaskShell';
import { useAppMessage } from '../context/MessageContext';
import {
  buildChildcareLeaveHtml,
  CHILDCARE_FORM_TYPES,
  createInitialChildcareForm,
  finalizeChildcareLeaveApplication,
  findPendingApplicationsForEmployee,
  formTypeLabel,
  getChildcareEditSections,
  isPendingApplicationFile,
  parseDocxBlobToForm,
  prefillChildcareFormFromEmployee,
} from '../utils/childcareLeaveApplication';
import { findHrOpsBusinessType } from '../utils/hrOpsBusinessTypes';

const BUSINESS_TYPE = findHrOpsBusinessType('application-review');

function formatFileSize(bytes) {
  if (bytes == null || Number.isNaN(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function HrOpsApplicationReviewPage() {
  const { showMessage } = useAppMessage();
  const iframeRef = useRef(null);
  const loadedFileKeyRef = useRef('');
  const [pendingFiles, setPendingFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [employeeId, setEmployeeId] = useState('');
  const [formTypeSelected, setFormTypeSelected] = useState('');
  const [form, setForm] = useState(createInitialChildcareForm());
  const [formSessionKey, setFormSessionKey] = useState(0);
  const [loadingFile, setLoadingFile] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadPendingFiles = useCallback(async () => {
    setFilesLoading(true);
    try {
      const files = await api.listFiles({ category: 'APPLICATION' });
      setPendingFiles((files ?? []).filter(isPendingApplicationFile));
    } catch (e) {
      showMessage(e.message, 'danger');
      setPendingFiles([]);
    } finally {
      setFilesLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    loadPendingFiles();
  }, [loadPendingFiles]);

  useEffect(() => {
    if (!employeeId) {
      setEmployee(null);
      setSelectedFile(null);
      loadedFileKeyRef.current = '';
      return;
    }
    let cancelled = false;
    api
      .getEmployeeDetail(employeeId)
      .then((detail) => {
        if (!cancelled) setEmployee(detail);
      })
      .catch((e) => {
        if (!cancelled) {
          showMessage(e.message, 'danger');
          setEmployee(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId, showMessage]);

  const matchedFiles = useMemo(() => {
    if (!employee || !formTypeSelected) return [];
    return findPendingApplicationsForEmployee(pendingFiles, employee, formTypeSelected);
  }, [pendingFiles, employee, formTypeSelected]);

  const loadApplicationFile = useCallback(
    async (file, emp, formType) => {
      setLoadingFile(true);
      try {
        let nextForm = createInitialChildcareForm(formType);
        const blob = await api.fetchFileBlob(file.id);
        const parsed = await parseDocxBlobToForm(blob, formType, emp);
        nextForm = {
          ...nextForm,
          ...parsed,
          formType: parsed.formType ?? formType,
        };
        nextForm = prefillChildcareFormFromEmployee(nextForm, emp);
        setSelectedFile(file);
        setForm(nextForm);
        loadedFileKeyRef.current = `${file.id}-${emp.id}-${formType}`;
      } catch (e) {
        showMessage(e.message, 'danger');
        setSelectedFile(null);
        loadedFileKeyRef.current = '';
      } finally {
        setLoadingFile(false);
      }
    },
    [showMessage]
  );

  useEffect(() => {
    if (!employee || !formTypeSelected || filesLoading) return;

    if (matchedFiles.length === 0) {
      setSelectedFile(null);
      loadedFileKeyRef.current = '';
      setForm(prefillChildcareFormFromEmployee(createInitialChildcareForm(formTypeSelected), employee));
      return;
    }

    const file = matchedFiles[0];
    const key = `${file.id}-${employee.id}-${formTypeSelected}`;
    if (loadedFileKeyRef.current === key) return;

    loadApplicationFile(file, employee, formTypeSelected);
  }, [employee, formTypeSelected, matchedFiles, filesLoading, loadApplicationFile]);

  const previewHtml = useMemo(() => {
    if (!employee || !selectedFile) return '';
    return buildChildcareLeaveHtml(employee, form);
  }, [employee, selectedFile, form]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function selectFormType(value) {
    setFormTypeSelected(value);
    setEmployeeId('');
    setEmployee(null);
    setSelectedFile(null);
    loadedFileKeyRef.current = '';
    setForm(createInitialChildcareForm(value));
    setFormSessionKey((key) => key + 1);
  }

  function handleEmployeeChange(value) {
    setEmployeeId(value);
    setSelectedFile(null);
    loadedFileKeyRef.current = '';
  }

  function handleSelectAlternateFile(file) {
    if (!employee || !formTypeSelected) return;
    loadedFileKeyRef.current = '';
    loadApplicationFile(file, employee, formTypeSelected);
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

  async function handleSavePdf() {
    if (!employee) {
      showMessage('対象社員を選択してください', 'warning');
      return;
    }
    if (!selectedFile) {
      showMessage('処理対象の申請書が見つかりません', 'warning');
      return;
    }
    if (!form.returnWorkDate) {
      showMessage('職場復帰予定日（1回目）を入力してください', 'warning');
      return;
    }
    if (
      !window.confirm(
        'PDFを保存し、社員の稼働状況を「休業」に更新します。元の申請書ファイルは削除されます。よろしいですか？'
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const result = await finalizeChildcareLeaveApplication(api, {
        employee,
        form,
        sourceFileId: selectedFile?.id,
      });
      showMessage(
        `PDFを保存しました。稼働状況を「休業」に更新し、職場復帰予定日を ${result.returnDate} に設定しました`,
        'success'
      );
      setSelectedFile(null);
      setEmployeeId('');
      setEmployee(null);
      loadedFileKeyRef.current = '';
      setForm(createInitialChildcareForm(formTypeSelected || 'MALE_CHILDCARE'));
      await loadPendingFiles();
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setSaving(false);
    }
  }

  const selectedType = CHILDCARE_FORM_TYPES.find((t) => t.value === form.formType);
  const editSections = useMemo(() => getChildcareEditSections(form.formType), [form.formType]);
  const showEmployeeStep = Boolean(formTypeSelected);
  const showFileStep = Boolean(formTypeSelected && employeeId);
  const showEditStep = Boolean(selectedFile && employee);

  return (
    <HrOpsTaskShell businessType={BUSINESS_TYPE} guideId="hr-ops-application-review">
      <div className="row g-4 payroll-workspace payroll-workspace--app-review">
        <div className="col-lg-6">
          <section className="payroll-sidebar">
            <div className="payroll-sidebar-header">
              <div>
                <h2 className="payroll-sidebar-title">申請書の確認・修正</h2>
                <p className="payroll-sidebar-desc mb-0">
                  申請書種別と社員を選ぶと、未処理の申請書を自動表示します
                </p>
              </div>
              <span className="payroll-sidebar-badge hr-ops-doc-badge-app">
                <i className="bi bi-file-earmark-check" aria-hidden="true" />
                確認
              </span>
            </div>

            <div className="payroll-picker-step">
              <div className="payroll-picker-step-label">
                <span className="payroll-picker-step-no">1</span>
                申請書種別
              </div>
              <div className="hr-ops-send-type-grid" role="radiogroup" aria-label="申請書種別">
                {CHILDCARE_FORM_TYPES.map((type) => {
                  const selected = formTypeSelected === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`hr-ops-send-type-card${selected ? ' is-selected' : ''}`}
                      onClick={() => selectFormType(type.value)}
                    >
                      <i className={`bi ${type.icon}`} aria-hidden="true" />
                      <strong>{type.shortLabel}</strong>
                      <span>{type.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {showEmployeeStep && (
              <div className="payroll-picker-step">
                <div className="payroll-picker-step-label">
                  <span className="payroll-picker-step-no">2</span>
                  対象社員
                </div>
                <HrOpsPayrollEmployeePicker
                  key={`app-review-picker-${formTypeSelected}-${formSessionKey}`}
                  value={employeeId}
                  onChange={handleEmployeeChange}
                  disabled={loadingFile || saving}
                  embedded
                />
              </div>
            )}

            {showFileStep && (
              <div className="payroll-picker-step">
                <div className="payroll-picker-step-label">
                  <span className="payroll-picker-step-no">3</span>
                  未処理の申請書
                  <span className="text-muted small ms-2">（自動表示）</span>
                </div>
                {filesLoading || loadingFile ? (
                  <div className="text-center py-3">
                    <span className="spinner-border spinner-border-sm text-primary" role="status" />
                    <p className="small text-muted mb-0 mt-2">申請書を読み込み中…</p>
                  </div>
                ) : matchedFiles.length === 0 ? (
                  <div className="hr-ops-doc-preview-empty py-4">
                    <i className="bi bi-inbox" aria-hidden="true" />
                    <p className="mb-0">該当する未処理申請書がありません</p>
                    <p className="small text-muted mb-0">
                      ファイル名に社員番号または氏名を含め、分類「申請書」で .docx をアップロードしてください
                    </p>
                  </div>
                ) : (
                  <div className="list-group hr-ops-app-file-list">
                    {matchedFiles.map((file) => {
                      const active = selectedFile?.id === file.id;
                      return (
                        <button
                          key={file.id}
                          type="button"
                          className={`list-group-item list-group-item-action hr-ops-app-file-item${active ? ' active' : ''}`}
                          onClick={() => handleSelectAlternateFile(file)}
                          disabled={matchedFiles.length === 1}
                        >
                          <div className="d-flex justify-content-between align-items-start gap-2">
                            <div className="text-start">
                              <strong className="d-block">{file.originalName}</strong>
                              <span className="small opacity-75">{file.description || '—'}</span>
                            </div>
                            <span className="small text-nowrap">{formatFileSize(file.sizeBytes)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {showEditStep && (
              <>
                <div className="payroll-section-card hr-ops-app-edit-card">
                  <div className="payroll-section-card-title">
                    <i className="bi bi-pencil-square" aria-hidden="true" />
                    申請内容の修正
                    {selectedType && <span className="hr-ops-doc-type-chip">{selectedType.shortLabel}</span>}
                  </div>
                  <ChildcareApplicationEditPanel
                    key={`app-review-edit-${form.formType}-${formSessionKey}`}
                    sections={editSections}
                    form={form}
                    updateField={updateField}
                    disabled={loadingFile || saving}
                  />
                </div>

                <div className="payroll-action-bar">
                  <button
                    type="button"
                    className="btn btn-primary app-btn"
                    onClick={handlePrint}
                    disabled={loadingFile}
                  >
                    <i className="bi bi-printer" aria-hidden="true" />
                    印刷 / PDF保存
                  </button>
                  <button
                    type="button"
                    className="btn btn-success app-btn"
                    onClick={handleSavePdf}
                    disabled={loadingFile || saving}
                  >
                    <i className="bi bi-check-circle" aria-hidden="true" />
                    {saving ? '保存中…' : 'PDF保存・社員情報更新'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>

        <div className="col-lg-6">
          <section className="list-section-panel hr-ops-preview-panel payroll-preview-panel hr-ops-app-review-preview">
            <div className="list-section-body list-section-body-padded p-0">
              <div className="hr-ops-preview-toolbar">
                <span className="small text-muted">
                  プレビュー
                  {employee && selectedType
                    ? ` — ${employee.name} / ${selectedType.shortLabel}`
                    : selectedFile
                      ? ` — ${selectedFile.originalName}`
                      : ''}
                </span>
                {(loadingFile || saving) && (
                  <span className="spinner-border spinner-border-sm text-primary" role="status" />
                )}
              </div>
              {!formTypeSelected ? (
                <div className="hr-ops-doc-preview-empty">
                  <i className="bi bi-file-earmark-ruled" aria-hidden="true" />
                  <p>左側で申請書種別を選択してください</p>
                </div>
              ) : !employeeId ? (
                <div className="hr-ops-doc-preview-empty">
                  <i className="bi bi-person" aria-hidden="true" />
                  <p>部署と対象社員を選択してください</p>
                </div>
              ) : !selectedFile ? (
                <div className="hr-ops-doc-preview-empty">
                  <i className="bi bi-inbox" aria-hidden="true" />
                  <p>該当する未処理申請書が見つかりません</p>
                </div>
              ) : (
                <HrOpsDocumentPreview
                  ref={iframeRef}
                  html={previewHtml}
                  title={employee ? `${employee.name}の${formTypeLabel(form.formType)}` : '申請書プレビュー'}
                  fitContent
                  fitContentExtra={0}
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </HrOpsTaskShell>
  );
}
