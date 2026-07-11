import {
  TECHNICAL_SKILL_TEMPLATE,
  technicalSkillKey,
  technicalSkillsToMap,
} from '../constants/technicalSkillTemplate';
import { buildLanguageAppealParagraph } from '../constants/languageLegend';
import { formatJapaneseDate, formatYearsInJapan, sortCareersByNewestFirst } from '../utils';

const LEVEL_PRIORITY = { '◎': 3, '〇': 2, '△': 1 };

function escapeHtml(value) {
  if (value == null || value === '') return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function creationDateLabel() {
  const now = new Date();
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
}

function joinParts(parts, separator = '、') {
  return parts.filter(Boolean).join(separator);
}

function formatCareerPeriodPlain(c) {
  const start = c.startDate ? formatJapaneseDate(c.startDate) : '';
  const end = c.endDate ? formatJapaneseDate(c.endDate) : '現在';
  if (!start && c.period) return c.period;
  if (!start) return '';
  const months = c.months != null && c.months !== '' ? `${c.months}ヶ月` : '';
  return months ? `${start}から${end}まで（${months}）` : `${start}から${end}まで`;
}

function collectTechnicalHighlights(technicalSkills) {
  const values = technicalSkillsToMap(technicalSkills);
  const groups = [];

  for (const { category, items } of TECHNICAL_SKILL_TEMPLATE) {
    const entries = items
      .map((item) => {
        const level = values[technicalSkillKey(category, item)];
        return level ? { item, level, priority: LEVEL_PRIORITY[level] || 0 } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.priority - a.priority || a.item.localeCompare(b.item, 'ja'));

    if (entries.length) groups.push({ category, entries });
  }

  return groups;
}

function buildOpeningParagraph(employee, p) {
  const parts = [];
  if (employee.name) {
    parts.push(`はじめまして。${employee.name}と申します。`);
  } else {
    parts.push('はじめまして。');
  }

  const profile = [];
  if (p.age != null) profile.push(`${p.age}歳`);
  if (p.nationality) profile.push(`${p.nationality}籍`);
  if (profile.length) {
    parts.push(`${joinParts(profile)}でございます。`);
  }

  if (p.itIndustryYears != null && p.itIndustryYears !== '') {
    parts.push(`IT業界において約${p.itIndustryYears}年間、実務に携わってまいりました。`);
  }

  return parts.join('');
}

function buildBackgroundParagraph(p) {
  const sentences = [];
  const education = [p.schoolName, p.educationDegree, p.major].filter(Boolean);
  if (education.length) {
    sentences.push(`${education.join(' ')}を卒業しております。`);
  }

  const langParagraph = buildLanguageAppealParagraph(p);
  if (langParagraph) {
    sentences.push(langParagraph);
  }

  if (p.japanArrivalDate) {
    const stayYears = formatYearsInJapan(p.japanArrivalDate);
    if (stayYears) {
      sentences.push(
        `${formatJapaneseDate(p.japanArrivalDate)}に来日し、現在まで日本で約${stayYears}の業務経験を積んでおります。`
      );
    } else {
      sentences.push(`${formatJapaneseDate(p.japanArrivalDate)}に来日しております。`);
    }
  }

  if (p.nearestStation) {
    sentences.push(`通勤面では${p.nearestStation}が最寄駅となっております。`);
  }

  return sentences.join('');
}

function buildTechnicalParagraph(technicalSkills) {
  const groups = collectTechnicalHighlights(technicalSkills);
  if (!groups.length) return '';

  const categoryTexts = groups.map(({ category, entries }) => {
    const strong = entries.filter((e) => e.level === '◎' || e.level === '〇');
    const moderate = entries.filter((e) => e.level === '△');

    if (strong.length && moderate.length) {
      return `${category}では${strong.map((e) => e.item).join('、')}などの実務経験に加え、${moderate.map((e) => e.item).join('、')}の基礎知識`;
    }
    if (strong.length) {
      return `${category}では${strong.map((e) => e.item).join('、')}などの実務経験`;
    }
    return `${category}では${entries.map((e) => e.item).join('、')}など`;
  });

  return `技術面では、${categoryTexts.join('、')}を有しており、これらの技術を組み合わせながら日々の開発業務に取り組んでまいりました。`;
}

function buildQualificationParagraph(qualifications) {
  if (!qualifications?.length) return '';
  const names = qualifications.map((q) => q.description?.trim()).filter(Boolean);
  if (!names.length) return '';

  if (names.length === 1) {
    return `資格面では${names[0]}を保有しており、専門知識の裏付けとして活かしてまいりました。`;
  }
  const head = names.slice(0, -1).join('、');
  const tail = names[names.length - 1];
  return `資格面では${head}、ならびに${tail}を保有しており、幅広い知識と専門性を兼ね備えております。`;
}

function buildCareerIntroParagraph(careers) {
  if (!careers?.length) return '';
  return `これまで${careers.length}件のプロジェクトに参画し、下記のとおり実務経験を積んでまいりました。`;
}

function buildCareerParagraph(c, index, total) {
  const period = formatCareerPeriodPlain(c);
  const parts = [];

  if (period) {
    parts.push(`${period}、`);
  } else if (index === 0) {
    parts.push('直近のプロジェクトでは、');
  } else {
    parts.push(`その以前（${total - index}件目）のプロジェクトでは、`);
  }

  if (c.organization) {
    parts.push(`${c.organization}において`);
  }

  if (c.role) {
    parts.push(`${c.role}として`);
  }

  parts.push('参画いたしました。');

  if (c.roleOverview) {
    const overview = c.roleOverview.trim().replace(/\n+/g, ' ');
    parts.push(`業務内容としては、${overview.endsWith('。') ? overview : `${overview}。`}`);
  }

  const techParts = [];
  if (c.languages) techParts.push(`${c.languages}を用いた開発`);
  if (c.osDb) techParts.push(`${c.osDb}環境での構築・運用`);
  if (c.fwTools) techParts.push(`${c.fwTools}などのフレームワークやツールの活用`);
  if (techParts.length) {
    parts.push(`この案件では${joinParts(techParts)}を中心に担当し、`);
    parts.push('要件定義から実装、テストに至るまで一連の工程に携わる経験を積んでおります。');
  }

  if (c.workplace) {
    parts.push(`作業場所は${c.workplace}でした。`);
  }

  return parts.join('');
}

function buildSpecialtyParagraph(p) {
  const parts = [];
  if (p.specialtyDev) {
    const text = p.specialtyDev.trim().replace(/\n+/g, ' ');
    parts.push(`開発面では${text.endsWith('。') ? text : `${text}。`}`);
  }
  if (p.specialtyBusiness) {
    const text = p.specialtyBusiness.trim().replace(/\n+/g, ' ');
    parts.push(`業務面では${text.endsWith('。') ? text : `${text}。`}`);
  }
  return parts.join('');
}

function buildClosingParagraph(p, employee) {
  if (p.selfPr) {
    const text = p.selfPr.trim().replace(/\n+/g, ' ');
    return text.endsWith('。') ? text : `${text}。`;
  }

  const name = employee.name ? `${employee.name}は、` : '私は、';
  const itYears =
    p.itIndustryYears != null && p.itIndustryYears !== ''
      ? `約${p.itIndustryYears}年にわたる`
      : 'これまでの';
  return `${name}${itYears}経験を活かし、御社のプロジェクトにおいても即戦力として貢献できる自信がございます。ご検討のほど、何卒よろしくお願い申し上げます。`;
}

function buildAppealArticle(employee) {
  const p = employee.personal ?? {};
  const careers = sortCareersByNewestFirst(employee.careers || []).slice().reverse();
  const paragraphs = [];

  const opening = buildOpeningParagraph(employee, p);
  if (opening) paragraphs.push(opening);

  const background = buildBackgroundParagraph(p);
  if (background) paragraphs.push(background);

  const technical = buildTechnicalParagraph(employee.technicalSkills);
  if (technical) paragraphs.push(technical);

  const qualification = buildQualificationParagraph(employee.qualifications);
  if (qualification) paragraphs.push(qualification);

  const careerIntro = buildCareerIntroParagraph(careers);
  if (careerIntro) paragraphs.push(careerIntro);

  careers.forEach((c, index) => {
    paragraphs.push(buildCareerParagraph(c, index, careers.length));
  });

  const specialty = buildSpecialtyParagraph(p);
  if (specialty) paragraphs.push(specialty);

  paragraphs.push(buildClosingParagraph(p, employee));

  return paragraphs.filter(Boolean);
}

export function buildInterviewAppealPlainText(employee) {
  const p = employee.personal ?? {};
  const paragraphs = buildAppealArticle(employee);
  return [
    `面接用アピール文書 — ${employee.name || ''}`,
    `作成日：${creationDateLabel()}`,
    '',
    ...paragraphs,
  ].join('\n\n');
}

export function buildInterviewAppealHtml(employee, { embedded = false } = {}) {
  const p = employee.personal ?? {};
  const paragraphs = buildAppealArticle(employee);
  const bodyHtml = paragraphs.map((text) => `<p class="appeal-paragraph">${escapeHtml(text)}</p>`).join('\n');

  const toolbar = embedded
    ? ''
    : `<div class="toolbar no-print">
    <button type="button" onclick="window.print()">印刷 / PDF保存</button>
    <button type="button" class="secondary" onclick="window.close()">閉じる</button>
  </div>`;

  const bodyStyle = embedded ? 'padding: 16px; background: #fff;' : 'padding: 24px; background: #eef2f7;';
  const pageStyle = embedded ? 'box-shadow: none;' : 'box-shadow: 0 2px 12px rgba(15, 23, 42, 0.08);';

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <title>面接用アピール文書 - ${escapeHtml(employee.name)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Yu Mincho", "Yu Mincho Demibold", "Hiragino Mincho ProN", "MS PMincho", "Yu Gothic UI", serif;
      color: #1a1a1a;
      margin: 0;
      font-size: 15px;
      line-height: 2;
      letter-spacing: 0.04em;
      ${bodyStyle}
    }
    .toolbar {
      max-width: 720px;
      margin: 0 auto 12px;
      display: flex;
      gap: 8px;
      font-family: "Yu Gothic UI", "Meiryo", sans-serif;
    }
    .toolbar button {
      padding: 8px 16px;
      border: 1px solid #334155;
      background: #334155;
      color: #fff;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
    }
    .toolbar button.secondary { background: #fff; color: #334155; }
    .page {
      max-width: 720px;
      margin: 0 auto;
      background: #fff;
      border-radius: 4px;
      padding: 48px 52px;
      ${pageStyle}
    }
    h1 {
      text-align: center;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: 0.2em;
      margin: 0 0 12px;
      color: #0f172a;
    }
    .appeal-meta {
      text-align: center;
      color: #64748b;
      font-size: 13px;
      margin-bottom: 36px;
      padding-bottom: 20px;
      border-bottom: 1px solid #cbd5e1;
      font-family: "Yu Gothic UI", "Meiryo", sans-serif;
    }
    .appeal-body {
      text-align: justify;
    }
    .appeal-paragraph {
      margin: 0 0 1.4em;
      text-indent: 1em;
      hanging-punctuation: allow-end;
    }
    .appeal-paragraph:last-child {
      margin-bottom: 0;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .toolbar { display: none !important; }
      .page { box-shadow: none; border-radius: 0; padding: 0; max-width: none; }
    }
  </style>
</head>
<body>
  ${toolbar}
  <article class="page">
    <h1>面接用アピール文書</h1>
    <div class="appeal-meta">
      <div>${escapeHtml(employee.name || '')}${p.furigana ? `（${escapeHtml(p.furigana)}）` : ''}</div>
      <div>作成日：${creationDateLabel()}</div>
    </div>
    <div class="appeal-body">
      ${bodyHtml}
    </div>
  </article>
</body>
</html>`;
}

function appealFilename(employee) {
  const code = employee.employeeCode || 'employee';
  return `面接用アピール文書_${code}.html`;
}

export function downloadInterviewAppealHtml(employee) {
  const html = buildInterviewAppealHtml(employee);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = appealFilename(employee);
  link.click();
  URL.revokeObjectURL(url);
}
