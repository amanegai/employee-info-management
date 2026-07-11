import { formatYearsInJapan, CAREER_PHASE_OPTIONS, CAREER_PHASE_ALIASES, sortCareersByNewestFirst } from '../utils';
import {
  TECHNICAL_SKILL_TEMPLATE,
  TECHNICAL_SKILL_COLUMNS,
  technicalSkillKey,
  chunkItems,
  technicalSkillsToMap,
  technicalCategoryLabelParts,
} from '../constants/technicalSkillTemplate';

function escapeHtml(value) {
  if (value == null || value === '') return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cell(value) {
  return value == null || value === '' ? '' : escapeHtml(value);
}

function nl2br(value) {
  if (value == null || value === '') return '';
  return escapeHtml(value).replace(/\n/g, '<br/>');
}

function creationDateLabel() {
  const now = new Date();
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
}

function formatYearMonth(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return escapeHtml(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatCareerDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return escapeHtml(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

function careerStart(c) {
  if (c.startDate) return formatCareerDate(c.startDate);
  if (c.period) {
    const part = c.period.split('～')[0]?.trim();
    return part ? escapeHtml(part) : '';
  }
  return '';
}

function careerEnd(c) {
  if (c.endDate) return formatCareerDate(c.endDate);
  if (c.period) {
    const parts = c.period.split('～');
    if (parts.length > 1) {
      const end = parts[1]?.trim();
      return end && end !== '現在' ? escapeHtml(end) : '';
    }
  }
  return '';
}

function careerMonths(c) {
  if (c.months != null && c.months !== '') return escapeHtml(c.months);
  return '';
}

function genderLabel(gender) {
  if (!gender) return '';
  return gender.replace('性', '');
}

function normalizePhases(c) {
  const raw = c.phases
    ? typeof c.phases === 'string'
      ? c.phases.split(',').map((s) => s.trim()).filter(Boolean)
      : c.phases
    : [];
  return raw.map((phase) => CAREER_PHASE_ALIASES[phase] || phase);
}

function phaseMark(c, phase) {
  return normalizePhases(c).includes(phase) ? '●' : '';
}

function formatTechnicalCategoryHtml(category) {
  return technicalCategoryLabelParts(category).map((part) => escapeHtml(part)).join('<br/>');
}

function buildQualificationBlock(qualifications) {
  if (!qualifications?.length) return '';
  return qualifications.map((q) => nl2br(q.description)).join('<br/>');
}

function buildSectionGap() {
  return '<div class="section-gap" aria-hidden="true"></div>';
}

function buildPersonalHeader(employee, p) {
  const ageLabel = p.age != null ? `${p.age}歳` : '';
  return `
    <table class="sheet header-sheet">
      <colgroup>
        <col class="col-section-side" />
        <col class="col-main" span="4" />
        <col class="col-xs" span="4" />
        <col class="col-station" />
        <col class="col-it" />
        <col class="col-ym" />
        <col class="col-stay" />
      </colgroup>
      <tr>
        <td class="label side">フリガナ</td>
        <td class="value main-value center" colspan="4">${cell(p.furigana)}</td>
        <td class="label mini">性別</td>
        <td class="label mini">国籍</td>
        <td class="label mini">年齢</td>
        <td class="label mini">結婚</td>
        <td class="label wide-label">最寄駅</td>
        <td class="label wide-label">IT業界経験年数</td>
        <td class="label">来日年月</td>
        <td class="label">日本滞在年数</td>
      </tr>
      <tr>
        <td class="label side">氏　名</td>
        <td class="value main-value name-value center" colspan="4">${cell(employee.name)}</td>
        <td class="value mini center">${cell(genderLabel(p.gender))}</td>
        <td class="value mini center">${cell(p.nationality)}</td>
        <td class="value mini center">${cell(ageLabel)}</td>
        <td class="value mini center">${cell(p.maritalStatus)}</td>
        <td class="value wide-value center">${cell(p.nearestStation)}</td>
        <td class="value center">${p.itIndustryYears != null ? escapeHtml(p.itIndustryYears) : ''}</td>
        <td class="value center">${formatYearMonth(p.japanArrivalDate)}</td>
        <td class="value center">${formatYearsInJapan(p.japanArrivalDate)}</td>
      </tr>
      <tr>
        <td class="label side">最終学歴</td>
        <td class="value center degree-value" colspan="4">${cell(p.educationDegree)}</td>
        <td class="label" colspan="4">学校名</td>
        <td class="value school-value center">${cell(p.schoolName)}</td>
        <td class="label">専攻学科</td>
        <td class="value major-value center" colspan="2">${cell(p.major)}</td>
      </tr>
    </table>`;
}

function buildQualificationSection(employee) {
  return `
    <table class="sheet qual-sheet">
      <colgroup>
        <col class="col-section-side" />
        <col />
      </colgroup>
      <tr>
        <td class="label side qual-side">資　格</td>
        <td class="value qual-body">${buildQualificationBlock(employee.qualifications)}</td>
      </tr>
    </table>`;
}

function buildLanguageSection(p) {
  return `
    <table class="sheet language-sheet">
      <colgroup>
        <col class="col-section-side" />
        <col class="col-lang-conv" />
        <col class="col-lang-read" />
        <col class="col-lang-write" />
        <col class="col-lang-note" />
      </colgroup>
      <tr class="section-title-row">
        <td class="section-side">語学</td>
        <td colspan="3" class="section-title-blank"></td>
        <td class="lang-note"></td>
      </tr>
      <tr class="lang-header-row">
        <td class="label center">言語種別</td>
        <td class="label center">会話レベル</td>
        <td class="label center">仕様書解読</td>
        <td class="label center lang-field-last">仕様書作成</td>
        <td class="lang-note"></td>
      </tr>
      <tr class="lang-data-row">
        <td class="label center">日本語</td>
        <td class="value center">${cell(p.japaneseLevel)}</td>
        <td class="value center">${cell(p.japaneseReading)}</td>
        <td class="value center lang-field-last">${cell(p.japaneseWriting)}</td>
        <td class="lang-note">【A：ネイティブ同等、B：流暢、C：一人称、D：簡単会話】</td>
      </tr>
      <tr class="lang-data-row">
        <td class="label center">英語</td>
        <td class="value center">${cell(p.englishLevel)}</td>
        <td class="value center">${cell(p.englishReading)}</td>
        <td class="value center lang-field-last">${cell(p.englishWriting)}</td>
        <td class="lang-note">【◎：問題なし、〇：ほぼ問題なし、△：若干不足気味】</td>
      </tr>
    </table>`;
}

function buildTechnicalMatrixHtml(technicalSkills) {
  const values = technicalSkillsToMap(technicalSkills);
  let html = `<table class="sheet technical-matrix"><colgroup><col class="col-section-side" /><col span="${TECHNICAL_SKILL_COLUMNS}" /></colgroup>`;
  html += `<tr>
    <td class="section-side">技術</td>
    <td class="technical-skill-legend" colspan="${TECHNICAL_SKILL_COLUMNS}">「◎：豊富な経験あり、〇：実務経験あり、△：知識あり」</td>
  </tr>`;

  for (const { category, items } of TECHNICAL_SKILL_TEMPLATE) {
    const chunks = chunkItems(items, TECHNICAL_SKILL_COLUMNS);
    const rowSpan = chunks.length * 2;
    chunks.forEach((chunk, chunkIndex) => {
      html += '<tr>';
      if (chunkIndex === 0) {
        html += `<td class="label technical-cat" rowspan="${rowSpan}">${formatTechnicalCategoryHtml(category)}</td>`;
      }
      chunk.forEach((item) => {
        html += `<td class="technical-item-name center">${escapeHtml(item)}</td>`;
      });
      for (let i = chunk.length; i < TECHNICAL_SKILL_COLUMNS; i += 1) {
        html += '<td></td>';
      }
      html += '</tr><tr class="technical-level-row">';
      chunk.forEach((item) => {
        const level = values[technicalSkillKey(category, item)] || '';
        html += `<td class="center technical-level">${cell(level)}</td>`;
      });
      for (let i = chunk.length; i < TECHNICAL_SKILL_COLUMNS; i += 1) {
        html += '<td class="technical-level"></td>';
      }
      html += '</tr>';
    });
  }

  html += '</table>';
  return html;
}

function buildSpecialtySection(p) {
  return `
    <table class="sheet specialty-sheet">
      <colgroup>
        <col class="col-section-side" />
        <col span="8" />
      </colgroup>
      <tr class="section-title-row">
        <td class="section-side">得意分野</td>
        <td colspan="8" class="section-title-blank"></td>
      </tr>
      <tr>
        <td class="label">開発技術</td>
        <td colspan="8" class="value">${nl2br(p.specialtyDev)}</td>
      </tr>
      <tr>
        <td class="label">業務知識</td>
        <td colspan="8" class="value">${nl2br(p.specialtyBusiness)}</td>
      </tr>
      <tr>
        <td class="label">自己PR</td>
        <td colspan="8" class="value">${nl2br(p.selfPr)}</td>
      </tr>
    </table>`;
}

function buildCareerRows(careers) {
  if (!careers?.length) {
    return `<tr><td colspan="18" class="center empty"> </td></tr>`;
  }
  return careers
    .map(
      (c, i) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td class="center">${careerStart(c)}</td>
        <td class="center">-</td>
        <td class="center">${careerEnd(c)}</td>
        <td class="center">${careerMonths(c)}</td>
        <td class="career-content">${nl2br(c.roleOverview)}</td>
        <td class="center">${cell(c.workplace)}</td>
        <td class="center">${cell(c.role)}</td>
        <td class="career-small">${nl2br(c.osDb)}</td>
        <td class="career-small">${nl2br(c.languages)}</td>
        <td class="career-small">${nl2br(c.fwTools)}</td>
        ${CAREER_PHASE_OPTIONS.map((ph) => `<td class="center phase-mark">${phaseMark(c, ph)}</td>`).join('')}
      </tr>`
    )
    .join('');
}

function buildCareerSection(careers) {
  return `
    <p class="role-note">＜役割＞PM：ﾏﾈｰｼﾞｬｰ、PL：ﾘｰﾀﾞｰ、SL：ｻﾌﾞﾘｰﾀﾞｰ、SE：ｼｽﾃﾑｴﾝｼﾞﾆｱ、BSE：ﾌﾞﾘｯｼﾞSE、PG：ﾌﾟﾛｸﾞﾗﾏ</p>
    <table class="sheet career-table">
      <thead>
        <tr>
          <th rowspan="2" class="col-no">項<br/>番</th>
          <th colspan="4">期間</th>
          <th rowspan="2" class="col-content">業務内容</th>
          <th rowspan="2" class="col-place">作業<br/>場所</th>
          <th rowspan="2" class="col-role">役割</th>
          <th rowspan="2" class="col-os">OS/DB</th>
          <th rowspan="2" class="col-lang">仕様言語</th>
          <th rowspan="2" class="col-fw">FW・MW<br/>ツール等</th>
          ${CAREER_PHASE_OPTIONS.map((ph) => `<th rowspan="2" class="col-phase">${escapeHtml(ph)}</th>`).join('')}
        </tr>
        <tr>
          <th>開始</th>
          <th></th>
          <th>終了</th>
          <th>月</th>
        </tr>
      </thead>
      <tbody>${buildCareerRows(careers)}</tbody>
      <tfoot>
        <tr>
          <td class="label">備考</td>
          <td colspan="17"></td>
        </tr>
      </tfoot>
    </table>`;
}

function buildResumeHtml(employee, { embedded = false } = {}) {
  const p = employee.personal ?? {};

  const toolbar = embedded
    ? ''
    : `<div class="toolbar no-print">
    <button type="button" onclick="window.print()">印刷 / PDF保存</button>
    <button type="button" class="secondary" onclick="window.close()">閉じる</button>
  </div>`;

  const bodyStyle = embedded
    ? 'padding: 12px; background: #fff;'
    : 'padding: 20px; background: #e8e8e8;';

  const pageStyle = embedded
    ? 'box-shadow: none; padding: 4px 0;'
    : 'box-shadow: 0 2px 8px rgba(0,0,0,.12); padding: 20px 24px;';

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <title>技術履歴書 - ${escapeHtml(employee.name)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "MS PGothic", "Yu Gothic UI", "Meiryo", sans-serif;
      color: #000;
      margin: 0;
      font-size: 12px;
      line-height: 1.45;
      ${bodyStyle}
    }
    .toolbar {
      max-width: 1100px;
      margin: 0 auto 12px;
      display: flex;
      gap: 8px;
    }
    .toolbar button {
      padding: 8px 16px;
      border: 1px solid #333;
      background: #333;
      color: #fff;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }
    .toolbar button.secondary { background: #fff; color: #333; }
    .page {
      max-width: 1100px;
      margin: 0 auto;
      background: #fff;
      --resume-side-col: 10.16%;
      --resume-main-col: 3.02%;
      --resume-xs-col: 4.25%;
      --resume-station-col: 24.75%;
      --resume-it-col: 20%;
      --resume-ym-col: 7.75%;
      --resume-stay-col: 7.75%;
      --resume-lang-conv: 14.58%;
      --resume-lang-read: 9.9%;
      --resume-lang-write: 9.9%;
      ${pageStyle}
    }
    h1 {
      text-align: center;
      font-size: 20px;
      letter-spacing: 0.35em;
      margin: 0 0 2px;
      font-weight: 700;
    }
    .resume-top {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 2px;
    }
    .created-date {
      font-size: 12px;
    }
    table.sheet {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-bottom: 0;
    }
    .section-gap {
      height: 14px;
      background: #fff;
    }
    col.col-section-side { width: var(--resume-side-col); }
    col.col-main { width: var(--resume-main-col); }
    col.col-xs { width: var(--resume-xs-col); }
    col.col-station { width: var(--resume-station-col); }
    col.col-it { width: var(--resume-it-col); }
    col.col-ym { width: var(--resume-ym-col); }
    col.col-stay { width: var(--resume-stay-col); }
    col.col-lang-conv { width: var(--resume-lang-conv); }
    col.col-lang-read { width: var(--resume-lang-read); }
    col.col-lang-write { width: var(--resume-lang-write); }
    col.col-lang-note { width: auto; }
    table.sheet th,
    table.sheet td {
      border: 1px solid #000;
      padding: 4px 5px;
      vertical-align: middle;
      word-break: break-word;
      font-size: 11px;
    }
    table.sheet .label {
      background: #c5d9f1;
      font-weight: 600;
      text-align: center;
      white-space: nowrap;
    }
    table.header-sheet .label.side,
    table.qual-sheet .label.side,
    table.sheet .section-side,
    .technical-matrix .technical-cat {
      width: var(--resume-side-col);
      max-width: var(--resume-side-col);
      box-sizing: border-box;
    }
    table.header-sheet .label.side,
    table.qual-sheet .label.side {
      background: #c5d9f1;
      font-size: 10px;
      padding: 2px 3px;
      line-height: 1.25;
      white-space: normal;
      text-align: center;
    }
    table.sheet .section-side {
      background: #c5d9f1;
      font-size: 10px;
      padding: 2px 1px;
      line-height: 1.25;
      white-space: normal;
      font-weight: 700;
      text-align: center;
      vertical-align: middle;
    }
    table.sheet .label.mini { font-size: 10px; }
    table.sheet .label.wide-label { font-size: 10px; }
    table.sheet .value {
      background: #fff;
      text-align: center;
    }
    table.sheet .value.center { text-align: center; }
    table.sheet .value.mini { font-size: 11px; }
    table.sheet .main-value { font-size: 12px; }
    table.sheet .name-value { font-size: 13px; font-weight: 700; }
    table.sheet .degree-value { font-size: 11px; }
    table.sheet .qual-side { vertical-align: middle; }
    table.sheet .qual-body {
      min-height: 3em;
      vertical-align: top;
      line-height: 1.45;
      white-space: pre-wrap;
      font-size: 11px;
      text-align: left;
    }
    table.specialty-sheet td.value {
      text-align: left;
    }
    table.header-sheet .wide-value { font-size: 11px; }
    table.header-sheet tr:last-child td {
      border-bottom: none;
    }
    table.sheet .section-title-row .section-title-blank {
      background: #fff;
      border-left: none;
      border-top: none;
      border-right: none;
      border-bottom: none;
    }
    table.sheet .section-title-row .section-side {
      border-right: none;
    }
    table.sheet .section-title-row td {
      border-bottom: 1px solid #000;
    }
    table.language-sheet .section-title-row .section-side {
      border-right: 1px solid #000;
    }
    table.language-sheet td.lang-field-last {
      border-right: 1px solid #000;
    }
    table.language-sheet td.lang-note {
      border: none !important;
      font-size: 10px;
      color: #333;
      vertical-align: middle;
      background: #fff;
      white-space: nowrap;
      word-break: keep-all;
      padding: 10px 5px !important;
      height: 32px;
      box-sizing: border-box;
    }
    table.language-sheet .section-side {
      padding: 10px 5px !important;
    }
    table.language-sheet tr.section-title-row td {
      height: 28px;
      padding: 8px 5px !important;
      box-sizing: border-box;
    }
    table.language-sheet tr.lang-header-row td:not(.lang-note),
    table.language-sheet tr.lang-data-row td:not(.lang-note) {
      padding: 10px 5px !important;
      height: 32px;
      box-sizing: border-box;
    }
    table.language-sheet tr.lang-header-row td:not(.lang-note) {
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
    }
    table.language-sheet tr.lang-header-row td.lang-note {
      border-top: none !important;
      border-bottom: none !important;
    }
    table.language-sheet tr.lang-data-row td.lang-note {
      border-top: none !important;
    }
    table.specialty-sheet .section-title-row .section-side {
      border-right: 1px solid #000;
    }
    table.specialty-sheet .section-side {
      padding: 10px 5px !important;
    }
    table.specialty-sheet tr.section-title-row td {
      height: 28px;
      padding: 8px 5px !important;
      box-sizing: border-box;
    }
    table.specialty-sheet tr:not(.section-title-row) td.label {
      padding: 10px 5px !important;
      height: 36px;
      box-sizing: border-box;
    }
    table.specialty-sheet tr:not(.section-title-row) td.value {
      padding: 10px 8px !important;
      min-height: 4em;
      vertical-align: top;
      box-sizing: border-box;
    }
    .center { text-align: center; }
    .note { font-size: 10px; color: #333; vertical-align: middle; }
    .name-value { font-size: 15px; font-weight: 700; }
    .technical-matrix .technical-skill-legend {
      font-size: 10px;
      font-weight: 700;
      color: #000;
      vertical-align: middle;
    }
    .technical-matrix .technical-cat {
      font-size: 12px;
      font-weight: 700;
      vertical-align: middle;
      white-space: normal;
      line-height: 1.25;
      word-break: keep-all;
      overflow-wrap: anywhere;
      padding: 6px 3px;
      text-align: center;
    }
    .technical-matrix .technical-item-name {
      font-size: 10px;
      font-weight: 700;
      color: #000;
      background: #fafafa;
      padding-top: 7px;
      padding-bottom: 7px;
      min-height: 26px;
      text-align: center;
    }
    .technical-matrix .technical-level-row td,
    .technical-matrix td.technical-level {
      padding-top: 8px;
      padding-bottom: 8px;
      min-height: 28px;
      height: auto;
      line-height: 1.2;
      vertical-align: middle;
    }
    .technical-matrix tr:first-child td {
      padding: 8px 5px;
      min-height: 26px;
    }
    .technical-matrix td {
      padding: 7px 4px;
    }
    .role-note {
      font-size: 10px;
      margin: 6px 0 2px;
      color: #333;
    }
    .career-table thead th {
      background: #d9d9d9;
      font-size: 11px;
      text-align: center;
      font-weight: 600;
      vertical-align: middle;
    }
    .career-table .col-no { width: 3.5em; min-width: 3.5em; }
    .career-table .col-content { width: 24%; }
    .career-table .col-place { width: 5em; }
    .career-table .col-role { width: 3em; }
    .career-table .col-os,
    .career-table .col-lang,
    .career-table .col-fw { width: 8%; }
    .career-table .col-phase { width: 2.2em; font-size: 9px; }
    .career-table td { vertical-align: top; font-size: 11px; text-align: center; }
    .career-table .career-content { font-size: 10px; line-height: 1.4; text-align: left; }
    .career-table .career-small { font-size: 10px; text-align: left; }
    .career-table .phase-mark { font-size: 12px; vertical-align: middle; }
    @media print {
      body { background: #fff; padding: 0; }
      .toolbar { display: none !important; }
      .page { box-shadow: none; padding: 0; max-width: none; }
    }
  </style>
</head>
<body>
  ${toolbar}
  <article class="page">
    <h1>技　術　履　歴　書</h1>
    <div class="resume-top">
      <div class="created-date">作成日：${creationDateLabel()}</div>
    </div>

    ${buildPersonalHeader(employee, p)}

    ${buildQualificationSection(employee)}

    ${buildSectionGap()}

    ${buildLanguageSection(p)}

    ${buildSectionGap()}

    ${buildTechnicalMatrixHtml(employee.technicalSkills)}

    ${buildSectionGap()}

    ${buildSpecialtySection(p)}

    ${buildCareerSection(sortCareersByNewestFirst(employee.careers))}
  </article>
</body>
</html>`;
}

export { buildResumeHtml };

function resumeFilename(employee) {
  const code = employee.employeeCode || 'employee';
  return `技術履歴書_${code}.html`;
}

export function downloadEmployeeResumeHtml(employee) {
  const html = buildResumeHtml(employee);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = resumeFilename(employee);
  link.click();
  URL.revokeObjectURL(url);
}
