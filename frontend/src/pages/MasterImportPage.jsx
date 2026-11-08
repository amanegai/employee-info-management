import { useRef, useState } from 'react';
import { api } from '../api';
import AppFooter from '../components/AppFooter';
import PageHeader from '../components/PageHeader';
import { useAppMessage } from '../context/MessageContext';

const EMPLOYEE_TEMPLATE = '/templates/社員マスタ_登録テンプレート.xlsx';
const CLIENT_TEMPLATE = '/templates/取引先マスタ_登録テンプレート.xlsx';

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isExcelFile(file) {
  if (!file) return false;
  const name = file.name?.toLowerCase() ?? '';
  return name.endsWith('.xlsx');
}

function ImportPanel({
  tone,
  title,
  icon,
  description,
  templateHref,
  templateName,
  file,
  onFileChange,
  result,
  busy,
  onPreview,
  onCommit,
}) {
  const { showMessage } = useAppMessage();
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const canCommit = Boolean(file && result && result.dryRun && result.errorRows === 0 && result.validRows > 0);

  function pickFile(nextFile) {
    if (!nextFile) {
      onFileChange(null);
      return;
    }
    if (!isExcelFile(nextFile)) {
      showMessage('Excelファイル（.xlsx）を選択してください', 'warning');
      return;
    }
    onFileChange(nextFile);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);
    if (busy) return;
    pickFile(event.dataTransfer.files?.[0] ?? null);
  }

  return (
    <section className={`master-import-card master-import-card--${tone}`}>
      <header className="master-import-card-head">
        <div className="master-import-card-identity">
          <span className="master-import-card-icon" aria-hidden="true">
            <i className={`bi ${icon}`} />
          </span>
          <div>
            <h2 className="master-import-card-title">{title}</h2>
            <p className="master-import-card-lead">{description}</p>
          </div>
        </div>
        <a className="master-import-template-link" href={templateHref} download={templateName}>
          <i className="bi bi-download" aria-hidden="true" />
          テンプレート
        </a>
      </header>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        hidden
        onChange={(event) => {
          pickFile(event.target.files?.[0] ?? null);
          event.target.value = '';
        }}
      />

      {file ? (
        <div className="master-import-file">
          <div className="master-import-file-main">
            <span className="master-import-file-icon" aria-hidden="true">
              <i className="bi bi-file-earmark-excel" />
            </span>
            <div className="master-import-file-meta">
              <strong className="master-import-file-name" title={file.name}>{file.name}</strong>
              <span className="master-import-file-size">{formatFileSize(file.size)}</span>
            </div>
          </div>
          <div className="master-import-file-actions">
            <button
              type="button"
              className="master-import-file-change"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              変更
            </button>
            <button
              type="button"
              className="master-import-file-clear"
              onClick={() => onFileChange(null)}
              disabled={busy}
              aria-label="添付を取り消す"
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`master-import-dropzone${dragActive ? ' is-dragover' : ''}`}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!busy) setDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!busy) setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragActive(false);
          }}
          onDrop={handleDrop}
        >
          <span className="master-import-dropzone-icon" aria-hidden="true">
            <i className="bi bi-cloud-arrow-up" />
          </span>
          <strong>Excelをドロップ</strong>
          <span>またはクリックして .xlsx を選択</span>
        </button>
      )}

      <div className="master-import-submit">
        <button type="button" className="btn btn-outline-primary app-btn" onClick={onPreview} disabled={!file || busy}>
          <i className="bi bi-search" aria-hidden="true" />
          {busy ? '確認中…' : '内容を確認'}
        </button>
        <button type="button" className="btn btn-primary app-btn" onClick={onCommit} disabled={!canCommit || busy}>
          <i className="bi bi-check2-circle" aria-hidden="true" />
          {busy ? '登録中…' : '登録する'}
        </button>
      </div>

      {result && <ImportResult result={result} />}
    </section>
  );
}

function ImportResult({ result }) {
  const hasErrors = result.errorRows > 0;
  const committed = !result.dryRun && result.createdCount > 0;

  return (
    <div className={`master-import-result ${hasErrors ? 'is-error' : committed ? 'is-done' : 'is-ok'}`}>
      <div className="master-import-counts">
        <span><em>{result.totalRows}</em>対象</span>
        <span><em>{result.skippedRows}</em>記入例</span>
        <span><em>{result.validRows}</em>登録可能</span>
        <span className={hasErrors ? 'is-bad' : ''}><em>{result.errorRows}</em>エラー</span>
        {!result.dryRun && <span className="is-done"><em>{result.createdCount}</em>登録済み</span>}
      </div>
      {result.previewNames?.length > 0 && !hasErrors && (
        <p className="master-import-preview">
          {result.previewNames.join('、')}
          {result.validRows > result.previewNames.length ? ' ほか' : ''}
        </p>
      )}
      {hasErrors && (
        <div className="table-responsive">
          <table className="table table-sm master-import-error-table mb-0">
            <thead>
              <tr>
                <th>シート</th>
                <th>行</th>
                <th>項目</th>
                <th>内容</th>
              </tr>
            </thead>
            <tbody>
              {result.errors.map((error, index) => (
                <tr key={`${error.sheet || ''}-${error.row}-${error.field}-${index}`}>
                  <td>{error.sheet || '—'}</td>
                  <td>{error.row}</td>
                  <td>{error.field}</td>
                  <td>{error.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="master-import-result-note is-bad">エラーがあるため登録しません。修正してから再度確認してください。</p>
        </div>
      )}
      {committed && (
        <p className="master-import-result-note is-done">{result.createdCount} 件を登録しました。</p>
      )}
    </div>
  );
}

export default function MasterImportPage() {
  const { showMessage } = useAppMessage();
  const [employeeFile, setEmployeeFile] = useState(null);
  const [clientFile, setClientFile] = useState(null);
  const [employeeResult, setEmployeeResult] = useState(null);
  const [clientResult, setClientResult] = useState(null);
  const [busyKey, setBusyKey] = useState('');

  async function runImport(kind, file, dryRun) {
    if (!file) {
      showMessage('Excelファイルを選択してください', 'warning');
      return;
    }
    setBusyKey(kind);
    try {
      const result = kind === 'employee'
        ? await api.importMasterEmployees(file, dryRun)
        : await api.importMasterClients(file, dryRun);
      if (kind === 'employee') setEmployeeResult(result);
      else setClientResult(result);
      if (result.errorRows > 0) {
        showMessage(`${result.errorRows} 行にエラーがあります`, 'warning');
      } else if (dryRun) {
        showMessage(`${result.validRows} 件を登録できます。問題なければ「登録する」を押してください`, 'success');
      } else {
        showMessage(`${result.createdCount} 件を登録しました`, 'success');
      }
    } catch (e) {
      showMessage(e.message || '取り込みに失敗しました', 'danger');
    } finally {
      setBusyKey('');
    }
  }

  function handleEmployeeFile(file) {
    setEmployeeFile(file);
    setEmployeeResult(null);
  }

  function handleClientFile(file) {
    setClientFile(file);
    setClientResult(null);
  }

  function confirmCommit(kind, file, validRows) {
    const label = kind === 'employee' ? '社員' : '取引先';
    if (!window.confirm(`${validRows} 件の${label}を登録します。よろしいですか？`)) return;
    void runImport(kind, file, false);
  }

  return (
    <div className="container-fluid py-4 px-3 px-lg-5 list-page master-import-page">
      <PageHeader
        guideId="master-import"
        icon="bi-database-up"
        title="マスタ一括登録"
        lead="社員（基本情報・資格・関連技術・職務経歴）と取引先をExcelテンプレートから登録します（管理者専用）"
      />

      <ol className="master-import-steps" aria-label="登録の流れ">
        <li><span>1</span>テンプレートをダウンロード</li>
        <li><span>2</span>Excelを添付</li>
        <li><span>3</span>内容を確認</li>
        <li><span>4</span>登録する</li>
      </ol>

      <div className="master-import-grid">
        <ImportPanel
          tone="employee"
          title="社員マスタ"
          icon="bi-people"
          description="最新テンプレート必須です。「社員」「保有資格」「関連技術」「職務経歴」の各シートに記入し、社員IDで紐づけます。5行目の記入例は参照専用（編集・削除不可）で取込時に自動スキップされます。実データは6行目から記入してください。"
          templateHref={EMPLOYEE_TEMPLATE}
          templateName="社員マスタ_登録テンプレート.xlsx"
          file={employeeFile}
          onFileChange={handleEmployeeFile}
          result={employeeResult}
          busy={busyKey === 'employee'}
          onPreview={() => runImport('employee', employeeFile, true)}
          onCommit={() => confirmCommit('employee', employeeFile, employeeResult?.validRows)}
        />
        <ImportPanel
          tone="client"
          title="取引先マスタ"
          icon="bi-building"
          description="取引先基本情報を一括登録します。5行目の記入例は参照専用（編集・削除不可）で、取込時に自動スキップされます。実データは6行目から記入してください。"
          templateHref={CLIENT_TEMPLATE}
          templateName="取引先マスタ_登録テンプレート.xlsx"
          file={clientFile}
          onFileChange={handleClientFile}
          result={clientResult}
          busy={busyKey === 'client'}
          onPreview={() => runImport('client', clientFile, true)}
          onCommit={() => confirmCommit('client', clientFile, clientResult?.validRows)}
        />
      </div>

      <AppFooter />
    </div>
  );
}
