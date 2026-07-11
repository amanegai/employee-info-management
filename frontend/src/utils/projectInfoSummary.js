import {
  HEADCOUNT_MULTIPLE_LABEL,
  isHeadcountUnlimited,
  parseProjectSkills,
} from './projectWorkflow';

export const PROJECT_INFO_SUMMARY_FIELDS = [
  { key: 'projectName', label: '案件名', copyLabel: '案件名' },
  { key: 'location', label: '場所', copyLabel: '場\u3000所' },
  { key: 'recruitment', label: '募集', copyLabel: '募\u3000集' },
  { key: 'requiredSkills', label: '必須', copyLabel: '必\u3000須' },
  { key: 'optionalSkills', label: '歓迎', copyLabel: '歓\u3000迎' },
];

function formatSkillsList(skills) {
  return skills.join('、');
}

function formatRecruitment(project) {
  const role = project.projectRole?.trim().toUpperCase() || '';
  if (isHeadcountUnlimited(project)) {
    return role ? `${role} ${HEADCOUNT_MULTIPLE_LABEL}` : HEADCOUNT_MULTIPLE_LABEL;
  }
  const count = project.headcountRequired;
  if (count == null || count < 1) {
    return role;
  }
  return role ? `${role} ${count}名` : `${count}名`;
}

export function buildProjectInfoSummaryFields(project) {
  const required = parseProjectSkills(project.requiredSkills);
  const optional = parseProjectSkills(project.optionalSkills);

  return {
    projectName: project.projectName?.trim() || '',
    location: project.workLocation?.trim() || '',
    recruitment: formatRecruitment(project),
    requiredSkills: formatSkillsList(required),
    optionalSkills: formatSkillsList(optional),
  };
}

export function formatProjectInfoSummaryPlainText(fields) {
  return PROJECT_INFO_SUMMARY_FIELDS.map(({ key, label, copyLabel }) => {
    const value = fields[key] ?? '';
    return `【${copyLabel ?? label}】${value}`;
  }).join('\n');
}
