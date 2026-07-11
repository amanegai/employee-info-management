import { CAREER_PHASE_OPTIONS, CAREER_PHASE_ALIASES } from '../utils';
import { LANGUAGE_CONVERSATION_MEANINGS } from '../constants/languageLegend';
import { TECHNICAL_SKILL_TEMPLATE } from '../constants/technicalSkillTemplate';
import { isCandidateInPipeline, resolvePersonalSummaryProgress } from './projectWorkflow';

export const PERSONAL_SUMMARY_WORK_STATUSES = new Set(['待機中', '案件終了間近']);

export function canShowPersonalSummary(workStatus) {
  return PERSONAL_SUMMARY_WORK_STATUSES.has(workStatus);
}

export const PERSONAL_INFO_SUMMARY_FIELDS = [
  { key: 'name', label: '名前', copyLabel: '名\u3000\u3000前' },
  { key: 'nationality', label: '国籍', copyLabel: '国\u3000\u3000籍' },
  { key: 'gender', label: '性別', copyLabel: '性\u3000\u3000別' },
  { key: 'affiliation', label: '所属', copyLabel: '所\u3000\u3000属' },
  { key: 'age', label: '年齢', copyLabel: '年\u3000\u3000齢' },
  { key: 'nearestStation', label: '最寄り駅', copyLabel: '最寄り駅' },
  { key: 'japanese', label: '日本語', copyLabel: '日本\u3000語' },
  { key: 'english', label: '英語', copyLabel: '英\u3000\u3000語' },
  { key: 'experienceYears', label: '経験年数', copyLabel: '経験年数' },
  { key: 'engineeringPhase', label: '対応工程', copyLabel: '対応工程' },
  { key: 'specialtyLanguages', label: '得意言語', copyLabel: '得意言語' },
  { key: 'unitPrice', label: '単価', copyLabel: '単\u3000\u3000価' },
  { key: 'workStart', label: '稼働開始', copyLabel: '稼働開始' },
  { key: 'salesStatus', label: '営業状況', copyLabel: '営業状況' },
  { key: 'progress', label: '進捗', copyLabel: '進\u3000\u3000捗' },
];

function shortGender(gender) {
  if (!gender) return '';
  return gender.replace('性', '');
}

function normalizePhases(career) {
  const raw = career.phases
    ? typeof career.phases === 'string'
      ? career.phases.split(',').map((s) => s.trim()).filter(Boolean)
      : career.phases
    : [];
  return raw.map((phase) => CAREER_PHASE_ALIASES[phase] || phase);
}

function collectCareerPhases(careers) {
  const allPhases = new Set();
  for (const career of careers || []) {
    normalizePhases(career).forEach((phase) => allPhases.add(phase));
  }
  return allPhases;
}

export function resolveEngineeringPhase(careers) {
  const allPhases = collectCareerPhases(careers);
  for (const phase of CAREER_PHASE_OPTIONS) {
    if (allPhases.has(phase)) {
      return `${phase}から`;
    }
  }
  return '';
}

export function buildSpecialtyLanguages(technicalSkills) {
  const byCategory = new Map();
  const categoryOrder = TECHNICAL_SKILL_TEMPLATE.map((group) => group.category);

  for (const skill of technicalSkills || []) {
    if (skill.level !== '◎') continue;
    const category = skill.category;
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category).push(skill.itemName);
  }

  return categoryOrder
    .filter((category) => byCategory.has(category))
    .map((category) => `${category}：${byCategory.get(category).join('，')}`)
    .join(' ');
}

function conversationLevelLabel(level) {
  const key = String(level || '').trim().toUpperCase();
  return LANGUAGE_CONVERSATION_MEANINGS[key] || '';
}

function documentAbilityShort(reading, writing) {
  const readOk = reading === '◎' || reading === '〇';
  const writeOk = writing === '◎' || writing === '〇';
  if (readOk && writeOk) return '読み書き';
  if (readOk) return '読み取り';
  if (writeOk) return '書き取り';
  if (reading === '△' || writing === '△') return '若干不足';
  return '';
}

function findJapaneseQualification(qualifications) {
  for (const q of qualifications || []) {
    const desc = (q.description || '').trim();
    if (!desc) continue;
    if (!/日本語|JLPT|日本語能力|実用日本語|N[1-5]/i.test(desc)) continue;
    const nMatch = desc.match(/N[1-5]/i);
    if (nMatch) return nMatch[0].toUpperCase();
    return desc.split(/[\n、，]/)[0].trim();
  }
  return '';
}

function findEnglishQualification(qualifications) {
  for (const q of qualifications || []) {
    const desc = (q.description || '').trim();
    if (!desc) continue;
    if (!/英|TOEIC|TOEFL|IELTS|英検|実用英語/i.test(desc)) continue;
    const eiken = desc.match(/英検\s*(?:準?\d+級|\d+級|1級|2級|3級|4級|5級)/i);
    if (eiken) return eiken[0].replace(/\s+/g, '');
    const toeic = desc.match(/TOEIC\s*\d+/i);
    if (toeic) return toeic[0].replace(/\s+/g, ' ');
    const toefl = desc.match(/TOEFL\s*\d+/i);
    if (toefl) return toefl[0].replace(/\s+/g, ' ');
    const ielts = desc.match(/IELTS\s*[\d.]+/i);
    if (ielts) return ielts[0].replace(/\s+/g, ' ');
    return desc.split(/[\n、，]/)[0].trim();
  }
  return '';
}

export function resolveJapaneseAbility(personal = {}, qualifications = []) {
  const fromQual = findJapaneseQualification(qualifications);
  if (fromQual) return fromQual;
  const conv = conversationLevelLabel(personal.japaneseLevel);
  if (conv) return conv;
  return documentAbilityShort(personal.japaneseReading, personal.japaneseWriting);
}

export function resolveEnglishAbility(personal = {}, qualifications = []) {
  const fromQual = findEnglishQualification(qualifications);
  if (fromQual) return fromQual;
  const conv = conversationLevelLabel(personal.englishLevel);
  if (conv) return conv;
  return documentAbilityShort(personal.englishReading, personal.englishWriting);
}

export function formatBillingUnitPriceManen(price) {
  if (price == null || price === '' || Number(price) <= 0) return '';
  const num = Number(price);
  if (num >= 10000 && num % 10000 === 0) return `${num / 10000}万円`;
  const man = num / 10000;
  const rounded = Math.round(man * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}万円` : `${rounded}万円`;
}

export function resolveWorkStartMonth(employee, referenceDate = new Date()) {
  if (employee.workStatus === '待機中') {
    return `${referenceDate.getMonth() + 1}月`;
  }
  if (employee.workStatus === '案件終了間近' && employee.endDate) {
    const month = parseInt(String(employee.endDate).split('-')[1], 10);
    if (!Number.isNaN(month)) return `${month}月`;
  }
  return '';
}

export function countPipelineCandidates(candidates) {
  return (candidates || []).filter((c) => isCandidateInPipeline(c.stage)).length;
}

export function buildPersonalInfoSummaryFields(employee, { candidates = [], referenceDate = new Date() } = {}) {
  const personal = employee.personal || {};
  const genderShort = shortGender(personal.gender);

  return {
    name: employee.name || '',
    nationality: personal.nationality || '',
    gender: genderShort || personal.gender || '',
    affiliation: employee.employeeType || '',
    age: personal.age != null && personal.age !== '' ? `${personal.age}歳` : '',
    nearestStation: personal.nearestStation || '',
    japanese: resolveJapaneseAbility(personal, employee.qualifications),
    english: resolveEnglishAbility(personal, employee.qualifications),
    experienceYears:
      personal.itIndustryYears != null && personal.itIndustryYears !== ''
        ? `${personal.itIndustryYears}年`
        : '',
    engineeringPhase: resolveEngineeringPhase(employee.careers),
    specialtyLanguages: buildSpecialtyLanguages(employee.technicalSkills),
    unitPrice: formatBillingUnitPriceManen(employee.salary?.billingUnitPrice),
    workStart: resolveWorkStartMonth(employee, referenceDate),
    salesStatus: '並行営業',
    progress: resolvePersonalSummaryProgress(candidates),
  };
}

export function formatPersonalInfoSummaryPlainText(fields) {
  return PERSONAL_INFO_SUMMARY_FIELDS.map(({ key, label, copyLabel }) => {
    const value = fields[key] ?? '';
    return `【${copyLabel ?? label}】：${value}`;
  }).join('\n');
}
