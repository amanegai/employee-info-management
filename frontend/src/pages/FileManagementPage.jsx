import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import AppFooter from '../components/AppFooter';
import ListSectionBar from '../components/ListSectionBar';
import { canWriteFiles } from '../auth';
import { useAppMessage } from '../context/MessageContext';
import { useAuth } from '../context/AuthContext';
import {
  FILE_CATEGORIES,
  fileCategoryLabel,
  formatTargetMonthLabel,
} from '../utils/fileCategories';
import { buildAttendanceUpdatesForFiles } from '../utils/timesheetImport';
import { buildExpenseUpdatesForFiles } from '../utils/expenseApplicationImport';
import FileUploadDropzone, { FileUploadSettings } from '../components/file/FileUploadPanel';
import TimesheetUploadGuide from '../components/file/TimesheetUploadGuide';
import PageHeader from '../components/PageHeader';
import ExpenseApplicationUploadGuide from '../components/file/ExpenseApplicationUploadGuide';

function formatFileSize(bytes) {
  if (bytes == null || Number.isNaN(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDateTime(value) {
  if (!value) return '—';
  const normalized = value.replace('T', ' ').slice(0, 19);
  const [date, time] = normalized.split(' ');
  if (!date || !time) return normalized;
  return `${date.replace(/-/g, '/')} ${time}`;
}

function getFileIconInfo(filename) {
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
  return map[ext] || { icon: 'bi-file-earmark', tone: 'default' };
}

function categoryBadgeClass(category) {
  const map = {
    TIMESHEET: 'file-category-badge--timesheet',
    CERTIFICATE: 'file-category-badge--certificate',
    CONTRACT: 'file-category-badge--contract',
    PAYROLL: 'file-category-badge--payroll',
    OTHER: 'file-category-badge--other',
  };
  return map[category] || 'file-category-badge--other';
}

export default function FileManagementPage() {
  const { user } = useAuth();
  const { showMessage } = useAppMessage();
  const fileInputRef = useRef(null);
  const uploadingRef = useRef(false);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [appliedCategory, setAppliedCategory] = useState('');
  const [targetMonthFilter, setTargetMonthFilter] = useState('');
  const [appliedTargetMonth, setAppliedTargetMonth] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [description, setDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState('TIMESHEET');
  const [uploadTargetMonth, setUploadTargetMonth] = useState('');
  const [syncAttendance, setSyncAttendance] = useState(true);
  const [syncExpense, setSyncExpense] = useState(true);
  const [uploadResult, setUploadResult] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const writable = canWriteFiles(user);

  const stats = useMemo(() => {
    const totalBytes = files.reduce((sum, file) => sum + (file.sizeBytes || 0), 0);
    return {
      count: files.length,
      totalBytes,
      latestAt: files[0]?.createdAt ?? null,
    };
  }, [files]);

  const loadData = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const params = {};
      const searchKeyword = filters.keyword ?? appliedKeyword;
      const searchCategory = filters.category ?? appliedCategory;
      const searchTargetMonth = filters.targetMonth ?? appliedTargetMonth;
      if (searchKeyword.trim()) params.keyword = searchKeyword.trim();
      if (searchCategory) params.category = searchCategory;
      if (searchTargetMonth) params.targetMonth = searchTargetMonth;
      setFiles(await api.listFiles(params));
    } catch (e) {
      showMessage(e.message, 'danger');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [appliedKeyword, appliedCategory, appliedTargetMonth, showMessage]);

  useEffect(() => {
    loadData({
      keyword: appliedKeyword,
      category: appliedCategory,
      targetMonth: appliedTargetMonth,
    });
  }, [appliedKeyword, appliedCategory, appliedTargetMonth, loadData]);

  function handleSearch(event) {
    event?.preventDefault?.();
    setAppliedKeyword(keyword.trim());
    setAppliedCategory(categoryFilter);
    setAppliedTargetMonth(targetMonthFilter);
  }

  function handleClearFilters() {
    setKeyword('');
    setCategoryFilter('');
    setTargetMonthFilter('');
    setAppliedKeyword('');
    setAppliedCategory('');
    setAppliedTargetMonth('');
  }

  const hasActiveFilters = appliedKeyword || appliedCategory || appliedTargetMonth;
  const isTimesheetUpload = uploadCategory === 'TIMESHEET';
  const isExpenseApplicationUpload = uploadCategory === 'APPLICATION';

  function mergeSelectedFiles(incomingFiles) {
    const list = Array.from(incomingFiles ?? []).filter(Boolean);
    if (!list.length) return;
    setSelectedFiles((prev) => {
      const map = new Map(prev.map((file) => [`${file.name}:${file.size}`, file]));
      list.forEach((file) => map.set(`${file.name}:${file.size}`, file));
      return Array.from(map.values());
    });
    setUploadResult(null);
  }

  function handleFileChange(event) {
    mergeSelectedFiles(event.target.files);
    event.target.value = '';
  }

  function handleDragEnter(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!writable || uploading) return;
    setDragActive(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setDragActive(false);
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (!writable || uploading) return;
    mergeSelectedFiles(event.dataTransfer.files);
  }

  function removeSelectedFile(index) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadResult(null);
  }

  function clearSelectedFiles() {
    setSelectedFiles([]);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function summarizeUploadResult(result, prepWarnings = []) {
    const uploadedCount = result.uploaded?.length ?? 0;
    const failedCount = result.failures?.length ?? 0;
    const updatedCount = result.attendanceResults?.filter((item) => item.status === 'UPDATED').length ?? 0;
    const expenseUpdatedCount = result.expenseResults?.filter((item) => item.status === 'UPDATED').length ?? 0;
    const attendanceIssueCount = (result.attendanceResults?.length ?? 0) - updatedCount + prepWarnings.length;
    const expenseIssueCount = (result.expenseResults?.length ?? 0) - expenseUpdatedCount;

    if (uploadedCount && !failedCount && !attendanceIssueCount && !expenseIssueCount) {
      const syncParts = [];
      if (updatedCount) syncParts.push(`勤怠 ${updatedCount} 件`);
      if (expenseUpdatedCount) syncParts.push(`経費 ${expenseUpdatedCount} 件`);
      showMessage(
        `${uploadedCount} 件をアップロードしました${syncParts.length ? `（${syncParts.join('、')}更新）` : ''}`,
        'success'
      );
      return;
    }
    if (uploadedCount) {
      showMessage(`${uploadedCount} 件をアップロードしました。詳細は結果を確認してください`, uploadedCount && failedCount ? 'warning' : 'success');
    } else {
      showMessage('アップロードに失敗しました', 'danger');
    }
  }

  async function handleUpload(event) {
    event.preventDefault();
    if (uploadingRef.current) {
      return;
    }
    if (!selectedFiles.length) {
      showMessage('ファイルを選択してください', 'warning');
      return;
    }
    if (syncAttendance && isTimesheetUpload && !uploadTargetMonth) {
      showMessage('勤怠反映には対象年月を指定してください', 'warning');
      return;
    }

    uploadingRef.current = true;
    setUploading(true);
    setUploadResult(null);

    try {
      let attendanceUpdates = [];
      let expenseUpdates = [];
      let prepWarnings = [];
      if (syncAttendance && isTimesheetUpload) {
        const prepared = await buildAttendanceUpdatesForFiles(selectedFiles, uploadTargetMonth);
        attendanceUpdates = prepared.updates;
        prepWarnings = prepared.warnings;
      }
      if (syncExpense && isExpenseApplicationUpload) {
        const prepared = await buildExpenseUpdatesForFiles(selectedFiles);
        expenseUpdates = prepared.updates;
        prepWarnings = [...prepWarnings, ...prepared.warnings];
      }

      const result = await api.uploadFilesBatch(selectedFiles, {
        description,
        category: uploadCategory || undefined,
        targetMonth: uploadTargetMonth || undefined,
        syncAttendance: syncAttendance && isTimesheetUpload,
        attendanceUpdates,
        syncExpense: syncExpense && isExpenseApplicationUpload,
        expenseUpdates,
      });

      setUploadResult({ ...result, prepWarnings });
      summarizeUploadResult(result, prepWarnings);
      clearSelectedFiles();
      setDescription('');
      setUploadTargetMonth('');
    } catch (e) {
      showMessage(e.message || 'アップロードに失敗しました', 'danger');
    } finally {
      uploadingRef.current = false;
      setUploading(false);
      await loadData({
        keyword: appliedKeyword,
        category: appliedCategory,
        targetMonth: appliedTargetMonth,
      });
    }
  }

  async function handleDownload(file) {
    setDownloadingId(file.id);
    try {
      await api.downloadFile(file.id, file.originalName);
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(file) {
    if (!window.confirm(`「${file.originalName}」を削除しますか？`)) {
      return;
    }
    setDeletingId(file.id);
    try {
      await api.deleteFile(file.id);
      showMessage('ファイルを削除しました', 'success');
      await loadData({
        keyword: appliedKeyword,
        category: appliedCategory,
        targetMonth: appliedTargetMonth,
      });
    } catch (e) {
      showMessage(e.message || '削除に失敗しました', 'danger');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="container-fluid py-4 px-3 px-lg-5 list-page file-management-page">
      <PageHeader
        guideId="file-management"
        icon="bi-folder2-open"
        iconClassName="file-management-page-icon"
        title="ファイル管理"
        lead="共有ファイルのアップロードとダウンロード"
      />

      <div className="file-mgmt-summary row g-3 mb-4">
        <div className="col-md-4">
          <div className="file-mgmt-summary-card">
            <div className="file-mgmt-summary-icon file-mgmt-summary-icon--count" aria-hidden="true">
              <i className="bi bi-files" />
            </div>
            <div>
              <span className="file-mgmt-summary-label">登録ファイル数</span>
              <strong className="file-mgmt-summary-value">{loading ? '…' : stats.count}</strong>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="file-mgmt-summary-card">
            <div className="file-mgmt-summary-icon file-mgmt-summary-icon--size" aria-hidden="true">
              <i className="bi bi-hdd-stack" />
            </div>
            <div>
              <span className="file-mgmt-summary-label">合計サイズ</span>
              <strong className="file-mgmt-summary-value">
                {loading ? '…' : formatFileSize(stats.totalBytes)}
              </strong>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="file-mgmt-summary-card">
            <div className="file-mgmt-summary-icon file-mgmt-summary-icon--latest" aria-hidden="true">
              <i className="bi bi-clock-history" />
            </div>
            <div>
              <span className="file-mgmt-summary-label">最新アップロード</span>
              <strong className="file-mgmt-summary-value file-mgmt-summary-value--date">
                {loading ? '…' : formatDateTime(stats.latestAt)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {writable && (
        <section className="list-section-panel file-upload-section mb-4" data-guide="file-upload">
          <ListSectionBar icon="bi-cloud-upload" title="ファイルを追加" />
          <div className="list-section-body file-upload-body">
            <form
              className={`file-upload-form${uploading ? ' is-uploading' : ''}`}
              onSubmit={handleUpload}
              aria-busy={uploading}
            >
              <fieldset className="file-upload-fieldset" disabled={uploading}>
              <div className="file-upload-card">
                <div className="file-upload-card-layout">
                  <FileUploadSettings
                    uploadCategory={uploadCategory}
                    onCategoryChange={(value) => {
                      setUploadCategory(value);
                      if (value !== 'TIMESHEET') {
                        setSyncAttendance(false);
                      } else {
                        setSyncAttendance(true);
                      }
                    }}
                    uploadTargetMonth={uploadTargetMonth}
                    onTargetMonthChange={setUploadTargetMonth}
                    description={description}
                    onDescriptionChange={setDescription}
                    isTimesheetUpload={isTimesheetUpload}
                    syncAttendance={syncAttendance}
                    uploading={uploading}
                    selectedCount={selectedFiles.length}
                  />
                  <div className="file-upload-drop-wrap">
                    <p className="file-upload-drop-label">
                      <i className="bi bi-paperclip" aria-hidden="true" />
                      ファイル
                    </p>
                    <FileUploadDropzone
                      selectedFiles={selectedFiles}
                      dragActive={dragActive}
                      uploading={uploading}
                      fileInputRef={fileInputRef}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onFileChange={handleFileChange}
                      onRemoveFile={removeSelectedFile}
                      onClearFiles={clearSelectedFiles}
                      onBrowse={() => {
                        if (!uploading && !uploadingRef.current) {
                          fileInputRef.current?.click();
                        }
                      }}
                      getFileIconInfo={getFileIconInfo}
                      formatFileSize={formatFileSize}
                    />
                  </div>
                </div>
              </div>

              {isTimesheetUpload && (
                <TimesheetUploadGuide
                  syncAttendance={syncAttendance}
                  onSyncChange={setSyncAttendance}
                  disabled={uploading}
                />
              )}

              {isExpenseApplicationUpload && (
                <ExpenseApplicationUploadGuide
                  syncExpense={syncExpense}
                  onSyncChange={setSyncExpense}
                  disabled={uploading}
                />
              )}

              {uploadResult && (
                <div className="file-upload-result mt-3">
                  <h3 className="h6 mb-2">直近のアップロード結果</h3>
                  <ul className="file-upload-result-list mb-0">
                    {(uploadResult.uploaded ?? []).map((file) => (
                      <li key={file.id} className="file-upload-result-item file-upload-result-item--success">
                        <i className="bi bi-check-circle-fill" aria-hidden="true" />
                        {file.originalName}
                      </li>
                    ))}
                    {(uploadResult.failures ?? []).map((item) => (
                      <li key={`fail-${item.fileName}`} className="file-upload-result-item file-upload-result-item--danger">
                        <i className="bi bi-x-circle-fill" aria-hidden="true" />
                        {item.fileName}：{item.error}
                      </li>
                    ))}
                    {(uploadResult.prepWarnings ?? []).map((item) => (
                      <li key={`warn-${item.fileName}`} className="file-upload-result-item file-upload-result-item--warning">
                        <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
                        {item.fileName}：{item.message}
                      </li>
                    ))}
                    {(uploadResult.attendanceResults ?? []).map((item) => (
                      <li
                        key={`att-${item.fileName}-${item.employeeCode}`}
                        className={`file-upload-result-item file-upload-result-item--${
                          item.status === 'UPDATED' ? 'success' : 'warning'
                        }`}
                      >
                        <i
                          className={`bi ${
                            item.status === 'UPDATED' ? 'bi-person-check-fill' : 'bi-person-exclamation'
                          }`}
                          aria-hidden="true"
                        />
                        {item.fileName} / {item.employeeCode || '—'}：{item.message}
                      </li>
                    ))}
                    {(uploadResult.expenseResults ?? []).map((item) => (
                      <li
                        key={`exp-${item.fileName}-${item.employeeCode}`}
                        className={`file-upload-result-item file-upload-result-item--${
                          item.status === 'UPDATED' ? 'success' : 'warning'
                        }`}
                      >
                        <i
                          className={`bi ${
                            item.status === 'UPDATED' ? 'bi-wallet2' : 'bi-exclamation-circle-fill'
                          }`}
                          aria-hidden="true"
                        />
                        {item.fileName} / {item.employeeCode || '—'}：{item.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              </fieldset>
            </form>
          </div>
        </section>
      )}

      <section className="table-section list-section-panel file-list-section">
        <ListSectionBar icon="bi-files" title="ファイル一覧" count={files.length} hideCount={loading} />
        <div className="list-section-body file-list-body">
          <div className="file-list-toolbar">
            <form className="file-list-filter-form" onSubmit={handleSearch}>
              <div className="file-list-filter-row">
                <div className="input-group file-list-search">
                  <span className="input-group-text">
                    <i className="bi bi-search" aria-hidden="true" />
                  </span>
                  <input
                    type="search"
                    className="form-control"
                    placeholder="ファイル名・説明で検索"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                </div>
                <select
                  className="form-select file-list-filter-select"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label="分類で絞り込み"
                >
                  <option value="">すべての分類</option>
                  {FILE_CATEGORIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <input
                  type="month"
                  className="form-control file-list-filter-month"
                  value={targetMonthFilter}
                  onChange={(e) => setTargetMonthFilter(e.target.value)}
                  aria-label="対象年月で絞り込み"
                />
                <button type="submit" className="btn btn-primary app-btn file-list-filter-submit">
                  検索
                </button>
                {hasActiveFilters && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary app-btn file-list-filter-clear"
                    onClick={handleClearFilters}
                  >
                    クリア
                  </button>
                )}
              </div>
            </form>
          </div>

          {loading ? (
            <div className="page-state-panel file-list-state">
              <div className="spinner-border text-primary" role="status" />
              <p className="mt-3 mb-0">読み込み中…</p>
            </div>
          ) : files.length === 0 ? (
            <div className="page-state-panel file-list-state">
              <i className="bi bi-inbox page-state-panel-icon" aria-hidden="true" />
              <p className="mb-0 fw-semibold">ファイルがありません</p>
              {writable && (
                <p className="text-muted small mb-0 mt-1">上のエリアからファイルを追加できます</p>
              )}
            </div>
          ) : (
            <div className="file-card-grid">
              {files.map((file) => {
                const iconInfo = getFileIconInfo(file.originalName);
                return (
                  <article key={file.id} className="file-card">
                    <div className={`file-card-icon file-type-icon file-type-icon--${iconInfo.tone}`} aria-hidden="true">
                      <i className={`bi ${iconInfo.icon}`} />
                    </div>
                    <div className="file-card-main">
                      <div className="file-card-badges">
                        {file.category ? (
                          <span className={`file-category-badge ${categoryBadgeClass(file.category)}`}>
                            {fileCategoryLabel(file.category)}
                          </span>
                        ) : (
                          <span className="file-category-badge file-category-badge--unset">未分類</span>
                        )}
                        {file.targetMonth && (
                          <span className="file-target-month-badge">
                            <i className="bi bi-calendar3" aria-hidden="true" />
                            {formatTargetMonthLabel(file.targetMonth)}
                          </span>
                        )}
                      </div>
                      <h3 className="file-card-name" title={file.originalName}>
                        {file.originalName}
                      </h3>
                      {file.description ? (
                        <p className="file-card-desc">{file.description}</p>
                      ) : (
                        <p className="file-card-desc file-card-desc--empty">説明なし</p>
                      )}
                      <div className="file-card-meta">
                        <span>
                          <i className="bi bi-hdd" aria-hidden="true" />
                          {formatFileSize(file.sizeBytes)}
                        </span>
                        <span>
                          <i className="bi bi-person" aria-hidden="true" />
                          {file.uploadedByName || '—'}
                        </span>
                        <span>
                          <i className="bi bi-calendar3" aria-hidden="true" />
                          {formatDateTime(file.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="file-card-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary app-btn file-card-download"
                        onClick={() => handleDownload(file)}
                        disabled={downloadingId === file.id || deletingId === file.id}
                      >
                        {downloadingId === file.id ? (
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        ) : (
                          <>
                            <i className="bi bi-download" aria-hidden="true" />
                            <span className="file-card-download-label">ダウンロード</span>
                          </>
                        )}
                      </button>
                      {writable && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger app-btn file-card-delete"
                          onClick={() => handleDelete(file)}
                          disabled={deletingId === file.id || downloadingId === file.id}
                        >
                          {deletingId === file.id ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                          ) : (
                            <>
                              <i className="bi bi-trash" aria-hidden="true" />
                              <span className="file-card-delete-label">削除</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <AppFooter />
    </div>
  );
}
