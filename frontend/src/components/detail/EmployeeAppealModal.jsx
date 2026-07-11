import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildInterviewAppealHtml,
  buildInterviewAppealPlainText,
  downloadInterviewAppealHtml,
} from '../../utils/interviewAppeal';
import { useAppMessage } from '../../context/MessageContext';

export default function EmployeeAppealModal({ employee, onClose }) {
  const iframeRef = useRef(null);
  const { showMessage } = useAppMessage();
  const [copying, setCopying] = useState(false);
  const html = useMemo(() => buildInterviewAppealHtml(employee, { embedded: true }), [employee]);
  const plainText = useMemo(() => buildInterviewAppealPlainText(employee), [employee]);

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

  async function handleCopy() {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(plainText);
      showMessage('アピール文書をクリップボードにコピーしました', 'success');
    } catch {
      showMessage('コピーに失敗しました', 'danger');
    } finally {
      setCopying(false);
    }
  }

  return (
    <>
      <div
        className="modal fade show d-block employee-resume-modal-root"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="employeeAppealModalTitle"
      >
        <div className="modal-dialog modal-xl modal-dialog-scrollable employee-resume-modal">
          <div className="modal-content">
            <div className="modal-header py-2">
              <h2 className="modal-title fs-6" id="employeeAppealModalTitle">
                面接用アピール文書 — {employee.name}
              </h2>
              <button type="button" className="btn-close" aria-label="閉じる" onClick={onClose} />
            </div>
            <div className="modal-body p-0">
              <iframe
                ref={iframeRef}
                title={`${employee.name}の面接用アピール文書`}
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
                onClick={() => downloadInterviewAppealHtml(employee)}
              >
                <i className="bi bi-download" aria-hidden="true" />
                HTMLをダウンロード
              </button>
              <button
                type="button"
                className="btn btn-outline-primary app-btn"
                onClick={handleCopy}
                disabled={copying}
              >
                <i className="bi bi-clipboard" aria-hidden="true" />
                {copying ? 'コピー中…' : 'テキストをコピー'}
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
