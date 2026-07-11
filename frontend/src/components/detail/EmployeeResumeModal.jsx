import { useEffect, useMemo, useRef } from 'react';
import { buildResumeHtml, downloadEmployeeResumeHtml } from '../../utils/resume';

export default function EmployeeResumeModal({ employee, onClose }) {
  const iframeRef = useRef(null);
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
    if (!win) return;
    win.focus();
    win.print();
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
            <div className="modal-footer py-2 flex-wrap gap-2">
              <button type="button" className="btn btn-primary app-btn" onClick={handlePrint}>
                <i className="bi bi-printer" aria-hidden="true" />
                印刷 / PDF保存
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
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}
