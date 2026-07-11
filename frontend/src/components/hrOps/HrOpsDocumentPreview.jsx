import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

function measureIframeContentHeight(doc) {
  const root = doc.querySelector('.birth-doc-all, .page');
  if (root) {
    const rootRect = root.getBoundingClientRect();
    let contentBottom = rootRect.bottom;
    root.querySelectorAll('*').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.height > 0) contentBottom = Math.max(contentBottom, rect.bottom);
    });
    return Math.ceil(contentBottom - rootRect.top);
  }
  const body = doc.body;
  return body ? Math.ceil(body.getBoundingClientRect().height) : 0;
}

function resizeIframeToContent(iframe, extra = 0) {
  const doc = iframe.contentDocument;
  if (!doc) return;
  const height = measureIframeContentHeight(doc);
  if (height > 0) {
    iframe.style.height = `${height + extra}px`;
  }
}

const HrOpsDocumentPreview = forwardRef(function HrOpsDocumentPreview(
  { html, title, fitContent = false, fitContentExtra = 0, iframeScrolling },
  ref
) {
  const scrollAttr = iframeScrolling ?? (fitContent ? 'no' : undefined);
  const iframeRef = useRef(null);

  useImperativeHandle(ref, () => iframeRef.current);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !html) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();

    if (!fitContent) return;

    const handleResize = () => resizeIframeToContent(iframe, fitContentExtra);
    handleResize();
    iframe.addEventListener('load', handleResize);

    const timers = [50, 150, 400, 900].map((ms) => window.setTimeout(handleResize, ms));

    let observer;
    const observeTarget = () => {
      const innerDoc = iframe.contentDocument;
      if (!innerDoc?.body) return;
      observer?.disconnect();
      observer = new ResizeObserver(handleResize);
      const root = innerDoc.querySelector('.birth-doc-all, .page') ?? innerDoc.body;
      observer.observe(root);
    };
    observeTarget();
    iframe.addEventListener('load', observeTarget);

    return () => {
      iframe.removeEventListener('load', handleResize);
      iframe.removeEventListener('load', observeTarget);
      timers.forEach((id) => window.clearTimeout(id));
      observer?.disconnect();
      iframe.style.height = '';
    };
  }, [html, fitContent, fitContentExtra]);

  if (!html) {
    return (
      <div className="hr-ops-preview-empty">
        <i className="bi bi-file-earmark-text" aria-hidden="true" />
        <p className="mb-0 text-muted small">条件を入力するとプレビューが表示されます</p>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      title={title}
      className={`hr-ops-document-iframe${fitContent ? ' hr-ops-document-iframe--fit-content' : ''}`}
      scrolling={scrollAttr}
    />
  );
});

export default HrOpsDocumentPreview;
