/** html2pdf.js で要素を PDF Blob に変換（共通） */
async function elementToPdfBlob(element, { width = 794, margin = [10, 10, 10, 10] } = {}) {
  if (!element) {
    throw new Error('PDF生成対象の要素が見つかりません');
  }

  const ownerWindow = element.ownerDocument?.defaultView ?? window;
  ownerWindow.scrollTo(0, 0);

  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  await new Promise((resolve) => setTimeout(resolve, 250));

  const { default: html2pdf } = await import('html2pdf.js');

  return html2pdf()
    .set({
      margin,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        width: element.scrollWidth || width,
        windowWidth: width,
        scrollX: 0,
        scrollY: 0,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll('table').forEach((table) => {
            table.style.borderCollapse = 'separate';
            table.style.borderSpacing = '0';
            table.style.tableLayout = 'fixed';
          });
          clonedDoc.querySelectorAll('td, th').forEach((cell) => {
            if (cell.closest('[data-payroll-no-border="true"]') || cell.classList.contains('payroll-title-cell')) {
              return;
            }
            cell.style.border = '1px solid #000';
            if (!cell.style.backgroundColor) {
              cell.style.backgroundColor = cell.classList.contains('payroll-head')
                || cell.classList.contains('payroll-info-label')
                || cell.classList.contains('payroll-total-label')
                ? '#dce6f1'
                : '#ffffff';
            }
          });
          clonedDoc.querySelectorAll('.payroll-remarks-box').forEach((el) => {
            el.style.border = '1px solid #000';
            el.style.boxSizing = 'border-box';
          });
          clonedDoc.querySelectorAll('.payroll-company-box').forEach((el) => {
            el.style.border = '1px solid #000';
            el.style.textAlign = 'center';
          });
          clonedDoc.querySelectorAll('.payroll-title-wrap').forEach((el) => {
            el.style.margin = '32px auto 14px';
          });
          clonedDoc.querySelectorAll('.payroll-title-cell').forEach((el) => {
            el.style.textAlign = 'center';
            el.style.border = 'none';
            el.style.backgroundColor = 'transparent';
          });
          clonedDoc.querySelectorAll('.payroll-header-table-narrow').forEach((el) => {
            el.style.marginTop = '22px';
          });
        },
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(element)
    .outputPdf('blob');
}

/** 画面上の要素（プレビュー iframe 内など）から PDF を生成 */
export async function renderElementToPdfBlob(element, options = {}) {
  return elementToPdfBlob(element, options);
}

/** HTML 文字列を iframe に描画し PDF Blob を生成 */
export async function renderHtmlToPdfBlob(html, { selector = '.page', width = 794, margin = [10, 10, 10, 10] } = {}) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    `width:${width}px`,
    'height:1400px',
    'border:0',
    'opacity:0',
    'pointer-events:none',
    'z-index:-1',
  ].join(';');
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    doc.open();
    doc.write(html);
    doc.close();

    await new Promise((resolve) => {
      iframe.onload = resolve;
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
    if (doc.documentElement) {
      doc.documentElement.style.width = `${width}px`;
      doc.documentElement.style.background = '#fff';
    }
    if (doc.body) {
      doc.body.style.width = `${width}px`;
      doc.body.style.background = '#fff';
    }

    const element = doc.querySelector(selector);
    if (!element) {
      throw new Error('PDF生成対象の要素が見つかりません');
    }

    return elementToPdfBlob(element, { width, margin });
  } finally {
    document.body.removeChild(iframe);
  }
}
