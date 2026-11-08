import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api';
import { useAppMessage } from '../../context/MessageContext';
import { buildResumeHtml, downloadEmployeeResumeHtml, resumeDocumentTitle } from '../../utils/resume';

export default function EmployeeResumeModal({ employee, onClose }) {
  const iframeRef = useRef(null);
  const { showMessage } = useAppMessage();
  const [excelDownloading, setExcelDownloading] = useState(false);
  const html = useMemo(() => buildResumeHtml(employee, { embedded: true }), [employee]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  function handlePrint() {
    const win = iframeRef.current?.contentWindow;
    const doc = iframeRef.current?.contentDocument;
    if (!win) return;
    const title = resumeDocumentTitle(employee);
    if (doc) doc.title = title;
    const previousTitle = document.title;
    document.title = title;
    win.focus();
    win.print();
    window.setTimeout(() => {
      document.title = previousTitle;
    }, 500);
  }

  async function handleExcelDownload() {
    if (!employee?.id) {
      showMessage('社員情報を取得できません', 'danger');
      return;
    }
    setExcelDownloading(true);
    try {
      // ファイル名は API の Content-Disposition（【会社略称】技術者履歴書_氏名.xlsx）に従う
      await api.downloadEmployeeResumeExcel(employee.id);
    } catch (e) {
      showMessage(e.message || 'Excelのダウンロードに失敗しました', 'danger');
    } finally {
      setExcelDownloading(false);
    }
  }

  return (
    <>
      <div
        className="modal fade show d-block employee-resume-modal-root"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="employeeResumeModalTitle"
      >
        <div className="modal-dialog modal-xl modal-dialog-scrollable employee-resume-modal">
          <div className="modal-content">
            <div className="modal-header py-2">
              <h2 className="modal-title fs-6" id="employeeResumeModalTitle">
                技術履歴書 — {employee.name}
              </h2>
              <button type="button" className="btn-close" aria-label="閉じる" onClick={onClose} />
            </div>
            <div className="modal-body p-0">
              <iframe
                ref={iframeRef}
                title={`${employee.name}の技術履歴書`}
                className="employee-resume-iframe"
              />
            </div>
            <div className="modal-footer py-2 flex-wrap gap-2 align-items-center">
              <button type="button" className="btn btn-primary app-btn" onClick={handlePrint}>
                <i className="bi bi-printer" aria-hidden="true" />
                印刷 / PDF保存
              </button>
              <button
                type="button"
                className="btn btn-outline-success app-btn"
                onClick={handleExcelDownload}
                disabled={excelDownloading}
              >
                <i className="bi bi-file-earmark-excel" aria-hidden="true" />
                {excelDownloading ? 'Excel出力中…' : 'Excelダウンロード'}
              </button>
              <button
                type="button"
                className="btn btn-outline-primary app-btn"
                onClick={() => downloadEmployeeResumeHtml(employee)}
              >
                <i className="bi bi-download" aria-hidden="true" />
                HTMLをダウンロード
              </button>
              <button type="button" className="btn btn-outline-secondary app-btn" onClick={onClose}>
                閉じる
              </button>
              <span className="text-muted small ms-auto">
                印刷時は「ヘッダーとフッター」をオフ推奨（URL除去）
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}
