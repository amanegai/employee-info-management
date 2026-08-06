/**
 * Merge sales / sales-zh markdown chapters and export PDFs via md-to-pdf.
 *
 * Usage (from repo root or this directory):
 *   node build-pdf.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mdToPdf } from 'md-to-pdf';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const OUT_DIR = path.join(ROOT, 'pdf');
const TMP_DIR = path.join(OUT_DIR, '.tmp');

const MANUALS = [
  {
    id: 'sales',
    title: '社員情報管理システム — 営業向け操作マニュアル',
    lang: 'ja',
    dir: path.join(ROOT, 'sales'),
    files: [
      'README.md',
      '00-権限とメニュー.md',
      '01-ログインと画面.md',
      '02-社員管理.md',
      '03-案件業務.md',
      '04-取引先と顧客活動.md',
      '05-ファイル管理.md',
      '06-会議室予約.md',
      '07-日常業務とFAQ.md',
    ],
    outName: '営業向け操作マニュアル.pdf',
  },
  {
    id: 'sales-zh',
    title: '社员情报管理系统 — 营业操作手册',
    lang: 'zh',
    dir: path.join(ROOT, 'sales-zh'),
    files: [
      'README.md',
      '00-权限与菜单.md',
      '01-登录与界面.md',
      '02-社员管理.md',
      '03-案件业务.md',
      '04-取引先与客户活动.md',
      '05-文件管理.md',
      '06-会议室预约.md',
      '07-日常工作与FAQ.md',
    ],
    outName: '营业操作手册.pdf',
  },
];

const SHARED_CSS = `
@page {
  margin: 18mm 16mm 20mm 16mm;
}
html {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
body {
  font-family: "Yu Gothic", "YuGothic", "Meiryo", "Microsoft YaHei", "Noto Sans SC",
    "Noto Sans JP", "Segoe UI", sans-serif;
  font-size: 11pt;
  line-height: 1.65;
  color: #1a1a1a;
}
body.lang-zh {
  font-family: "Microsoft YaHei", "Microsoft YaHei UI", "Noto Sans SC", "SimSun",
    "Yu Gothic", "Meiryo", sans-serif;
}
h1 {
  font-size: 20pt;
  border-bottom: 2px solid #1f4e79;
  padding-bottom: 0.25em;
  margin-top: 0;
  color: #1f4e79;
  page-break-before: always;
}
h1:first-of-type {
  page-break-before: avoid;
}
h2 {
  font-size: 14pt;
  color: #1f4e79;
  margin-top: 1.4em;
  border-bottom: 1px solid #c5d4e8;
  padding-bottom: 0.15em;
  page-break-after: avoid;
}
h3 {
  font-size: 12pt;
  color: #2c5f8a;
  margin-top: 1.1em;
  page-break-after: avoid;
}
p, li {
  orphans: 3;
  widows: 3;
}
table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.8em 0 1.2em;
  font-size: 9.5pt;
  page-break-inside: avoid;
}
th, td {
  border: 1px solid #b0bec5;
  padding: 6px 8px;
  vertical-align: top;
  text-align: left;
}
th {
  background: #e8f0f7;
  font-weight: 600;
  color: #1f4e79;
}
tr:nth-child(even) td {
  background: #f7fafc;
}
code, pre {
  font-family: "Consolas", "Courier New", monospace;
  font-size: 9pt;
}
pre {
  background: #f4f6f8;
  border: 1px solid #d0d7de;
  border-radius: 4px;
  padding: 10px 12px;
  white-space: pre-wrap;
  word-break: break-word;
  page-break-inside: avoid;
}
blockquote {
  border-left: 4px solid #1f4e79;
  margin: 0.8em 0;
  padding: 0.4em 0.9em;
  background: #f0f5fa;
  color: #333;
}
hr {
  border: none;
  border-top: 1px solid #cfd8dc;
  margin: 1.5em 0;
}
a {
  color: #1f4e79;
  text-decoration: none;
}
.cover {
  text-align: center;
  padding: 4em 1em 2em;
  page-break-after: always;
}
.cover h1 {
  border: none;
  font-size: 26pt;
  page-break-before: avoid;
}
.cover .meta {
  margin-top: 2em;
  font-size: 11pt;
  color: #455a64;
}
.chapter-sep {
  height: 0;
  margin: 0;
  border: none;
}
`;

function stripNavLinks(md) {
  return md
    .replace(/^\[(?:←|← |→|下一章|次の章|上一章|返回|目次|中文版|日文版|権限|登录|登录与|社員|社员|案件|取引先|文件|文件管理|会議室|会议室|日常|ファイル).*\]\([^)]+\)\s*(?:　\|\　|[|｜]\s*)?/gm, '')
    .replace(/^\[[^\]]+\]\([^)]+\.md\)\s*(?:　\|\　|[|｜]\s*)?\[?[^\]]*\]?\([^)]*\.md\)?\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function rewriteInternalMdLinks(md) {
  // Keep link text, drop .md destinations (single-file PDF has no separate chapters).
  return md.replace(/\[([^\]]+)\]\((?:\.\.\/)?[^)]+\.md(?:#[^)]*)?\)/g, '$1');
}

function buildMergedMarkdown(manual) {
  const parts = [];
  const date = new Date().toISOString().slice(0, 10);

  parts.push(`<div class="cover">
<h1>${manual.title}</h1>
<p class="meta">版本 1.1 ／ 生成日 ${date}<br/>对象角色：営業（SALES_HEAD）</p>
</div>
`);

  for (const file of manual.files) {
    const full = path.join(manual.dir, file);
    if (!fs.existsSync(full)) {
      throw new Error(`Missing file: ${full}`);
    }
    let body = fs.readFileSync(full, 'utf8');
    body = stripNavLinks(body);
    body = rewriteInternalMdLinks(body);

    // Avoid double title page from README: keep README content but without forcing another cover.
    if (file === 'README.md') {
      parts.push(`<div class="chapter-sep"></div>\n\n${body}\n`);
    } else {
      parts.push(`\n\n<div class="chapter-sep"></div>\n\n${body}\n`);
    }
  }

  return parts.join('\n');
}

async function exportPdf(manual) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(TMP_DIR, { recursive: true });

  const mergedPath = path.join(TMP_DIR, `${manual.id}-merged.md`);
  const cssPath = path.join(TMP_DIR, `${manual.id}.css`);
  const pdfPath = path.join(OUT_DIR, manual.outName);

  const merged = buildMergedMarkdown(manual);
  fs.writeFileSync(mergedPath, merged, 'utf8');
  fs.writeFileSync(cssPath, SHARED_CSS, 'utf8');

  console.log(`Generating: ${manual.outName} ...`);

  const pdf = await mdToPdf(
    { path: mergedPath },
    {
      dest: pdfPath,
      stylesheet: [cssPath],
      body_class: [`lang-${manual.lang}`],
      pdf_options: {
        format: 'A4',
        printBackground: true,
        margin: { top: '16mm', right: '14mm', bottom: '18mm', left: '14mm' },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="width:100%;font-size:8pt;color:#607d8b;padding:0 16mm;display:flex;justify-content:space-between;">
            <span>${manual.title}</span>
            <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
          </div>`,
      },
      launch_options: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    }
  );

  if (!pdf?.filename) {
    throw new Error(`Failed to generate PDF for ${manual.id}`);
  }
  console.log(`OK: ${pdfPath}`);
  return pdfPath;
}

async function main() {
  const results = [];
  for (const manual of MANUALS) {
    results.push(await exportPdf(manual));
  }
  console.log('\nDone.');
  for (const p of results) console.log(` - ${p}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
