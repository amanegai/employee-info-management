export { assignmentRoleLabel, ASSIGNMENT_ROLE_LABELS } from '../utils';

export const PROJECT_STATUS_LABELS = {
  OPEN: '募集中',
  PARTIALLY_FILLED: '一部確定',
  FILLED: '満員',
  ON_HOLD: '保留',
  CLOSED: '終了',
  CANCELLED: 'キャンセル',
};

export const CANDIDATE_STAGE_LABELS = {
  MATCHED: 'マッチング済',
  PROPOSED: '顧客提案済',
  INTERVIEW_SCHEDULED: '面談設定済み',
  INTERVIEWING: '選考中',
  OFFERED: '内定待ち',
  CONFIRMED: '採用確定',
  REJECTED: '不採用',
  WITHDRAWN: '提案撤回',
  LOST: '他案件確定',
};

export const ACTIVE_CANDIDATE_STAGES = new Set([
  'MATCHED',
  'PROPOSED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEWING',
]);

/** 社員詳細「選考中案件」に表示する進行中ステージ */
export const PIPELINE_CANDIDATE_STAGES = new Set([
  'MATCHED',
  'PROPOSED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEWING',
  'OFFERED',
]);

/** 社員詳細「選考案件履歴」に表示する終了ステージ */
export const HISTORY_CANDIDATE_STAGES = new Set(['CONFIRMED', 'REJECTED', 'WITHDRAWN', 'LOST']);

export const CANDIDATE_CLOSE_REASON_LABELS = {
  CLIENT_REJECTED: '顧客不採用',
  INTERNAL_WITHDRAW: '社内撤回',
  OTHER_CANDIDATE_CONFIRMED: '他案件で採用確定',
  EMPLOYEE_UNAVAILABLE: '社員都合',
  PROJECT_CLOSED: '案件終了',
};

export const CANDIDATE_PROGRESS_STEPS = [
  { key: 'MATCHED', shortLabel: 'マッチング', label: 'マッチング済', icon: 'bi-link-45deg' },
  { key: 'PROPOSED', shortLabel: '顧客提案', label: '顧客提案済', icon: 'bi-send' },
  {
    key: 'INTERVIEW_SCHEDULED',
    shortLabel: '面談設定',
    label: '面談設定済み',
    icon: 'bi-calendar-check',
  },
  { key: 'INTERVIEWING', shortLabel: '選考中', label: '選考中', icon: 'bi-hourglass-split' },
  { key: 'CONFIRMED', shortLabel: '採用確定', label: '採用確定', icon: 'bi-patch-check-fill' },
];

export const PERSONAL_SUMMARY_PROGRESS_BY_STAGE = {
  MATCHED: '提案のみ',
  PROPOSED: '提案のみ',
  INTERVIEW_SCHEDULED: '面談設定済み',
  INTERVIEWING: '結果待ち',
  OFFERED: '結果待ち',
};

/** 旧データに OFFERED が残っている場合も操作可能にする */
export function isCandidateActionable(stage) {
  return ACTIVE_CANDIDATE_STAGES.has(stage) || stage === 'OFFERED';
}

export function isCandidateTerminalClosed(stage) {
  return stage === 'REJECTED' || stage === 'WITHDRAWN' || stage === 'LOST';
}

export function isCandidateInPipeline(stage) {
  return PIPELINE_CANDIDATE_STAGES.has(stage);
}

export function isCandidateHistory(stage) {
  return HISTORY_CANDIDATE_STAGES.has(stage);
}

export function formatIsoDateOnly(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

export function getCandidateMatchedDate(candidate) {
  return formatIsoDateOnly(candidate?.createdAt);
}

export function getCandidateEndedDate(candidate) {
  if (!candidate) return '';
  if (candidate.stage === 'CONFIRMED') {
    return formatIsoDateOnly(candidate.confirmedAt) || formatIsoDateOnly(candidate.updatedAt);
  }
  return formatIsoDateOnly(candidate.closedAt) || formatIsoDateOnly(candidate.updatedAt);
}

export function candidateCloseReasonLabel(reason) {
  if (!reason) return '';
  return CANDIDATE_CLOSE_REASON_LABELS[reason] ?? reason;
}

export function getCandidateStageRank(stage) {
  switch (stage) {
    case 'MATCHED':
      return 0;
    case 'PROPOSED':
      return 1;
    case 'INTERVIEW_SCHEDULED':
      return 2;
    case 'INTERVIEWING':
    case 'OFFERED':
      return 3;
    default:
      return -1;
  }
}

export function getCandidateProgressIndex(stage) {
  switch (stage) {
    case 'MATCHED':
      return 0;
    case 'PROPOSED':
      return 1;
    case 'INTERVIEW_SCHEDULED':
      return 2;
    case 'INTERVIEWING':
    case 'OFFERED':
      return 3;
    case 'CONFIRMED':
      return 4;
    default:
      return -1;
  }
}

export function resolvePersonalSummaryProgress(candidates) {
  const pipeline = (candidates || []).filter((c) => isCandidateInPipeline(c.stage));
  if (!pipeline.length) return '提案のみ';

  let bestRank = -1;
  let bestStage = null;
  for (const candidate of pipeline) {
    const rank = getCandidateStageRank(candidate.stage);
    if (rank > bestRank) {
      bestRank = rank;
      bestStage = candidate.stage;
    }
  }
  return PERSONAL_SUMMARY_PROGRESS_BY_STAGE[bestStage] ?? '';
}

export function projectStatusLabel(status) {
  return PROJECT_STATUS_LABELS[status] ?? status ?? '—';
}

export function candidateStageLabel(stage) {
  return CANDIDATE_STAGE_LABELS[stage] ?? stage ?? '—';
}

export function candidateStageClass(stage) {
  switch (stage) {
    case 'MATCHED':
      return 'project-candidate-stage-matched';
    case 'PROPOSED':
      return 'project-candidate-stage-proposed';
    case 'INTERVIEW_SCHEDULED':
      return 'project-candidate-stage-interview-scheduled';
    case 'INTERVIEWING':
      return 'project-candidate-stage-interviewing';
    case 'OFFERED':
      return 'project-candidate-stage-offered';
    case 'CONFIRMED':
      return 'project-candidate-stage-confirmed';
    case 'REJECTED':
    case 'WITHDRAWN':
    case 'LOST':
      return 'project-candidate-stage-closed';
    default:
      return 'project-candidate-stage-default';
  }
}

export function nextStageActions(stage) {
  switch (stage) {
    case 'MATCHED':
      return [{ stage: 'PROPOSED', label: '顧客提案済へ' }];
    case 'PROPOSED':
      return [{ stage: 'INTERVIEW_SCHEDULED', label: '面談設定済みへ' }];
    case 'INTERVIEW_SCHEDULED':
      return [{ stage: 'INTERVIEWING', label: '選考中へ' }];
    case 'INTERVIEWING':
    case 'OFFERED':
      return [{ action: 'confirm', label: '採用確定' }];
    default:
      return [];
  }
}

export const ASSIGNMENT_STATUS_LABELS = {
  PLANNED: '開始予定',
  ACTIVE: '稼働中',
  COMPLETED: '完了',
  CANCELLED: '取消',
};

export function assignmentStatusLabel(status) {
  return ASSIGNMENT_STATUS_LABELS[status] ?? status ?? '—';
}

export function assignmentStatusClass(status) {
  switch (status) {
    case 'PLANNED':
      return 'assignment-status-planned';
    case 'ACTIVE':
      return 'assignment-status-active';
    case 'COMPLETED':
      return 'assignment-status-completed';
    case 'CANCELLED':
      return 'assignment-status-cancelled';
    default:
      return 'assignment-status-default';
  }
}

export const RECRUITING_PROJECT_STATUSES = new Set(['OPEN', 'PARTIALLY_FILLED']);

/** 案件マッチング可能なステータス（募集中・一部確定） */
export const MATCHABLE_PROJECT_STATUSES = new Set(['OPEN', 'PARTIALLY_FILLED']);

export function isRecruitingProject(status) {
  return RECRUITING_PROJECT_STATUSES.has(status);
}

export function isMatchableProject(status) {
  return MATCHABLE_PROJECT_STATUSES.has(status);
}

export const HEADCOUNT_MULTIPLE_LABEL = '複数名';

export function isHeadcountUnlimited(project) {
  return Boolean(project?.headcountUnlimited);
}

export function formatParsedHeadcount(parsed) {
  if (parsed?.headcountUnlimited) return HEADCOUNT_MULTIPLE_LABEL;
  if (parsed?.headcountRequired != null) return `${parsed.headcountRequired} 名`;
  return '—';
}

export function formatProjectHeadcountDisplay(project) {
  const filled = project?.headcountFilled ?? 0;
  if (isHeadcountUnlimited(project)) {
    return `${filled}/∞`;
  }
  const required = project?.headcountRequired ?? 0;
  return `${filled}/${required}`;
}

const UNSET_CLIENT_LABEL = '（取引先未設定）';

export function normalizeProjectLabel(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s　]+/g, '');
}

export function isUnsetClientName(name) {
  const normalized = normalizeProjectLabel(name);
  return !normalized || normalized === normalizeProjectLabel(UNSET_CLIENT_LABEL);
}

/** 解析結果の clientName / projectName から既存案件候補を特定（取引先未設定も考慮） */
export function pickExistingProjectMatch(candidates, payload) {
  const targetName = normalizeProjectLabel(payload?.projectName);
  if (!targetName || targetName === normalizeProjectLabel('（案件名未設定）')) {
    return null;
  }
  const exactNameMatches = (candidates ?? []).filter(
    (project) => normalizeProjectLabel(project.projectName) === targetName,
  );
  if (exactNameMatches.length === 0) {
    return null;
  }

  const payloadClientUnset = isUnsetClientName(payload?.clientName);
  const clientKey = normalizeProjectLabel(payload?.clientName);

  if (!payloadClientUnset) {
    const byClient = exactNameMatches.find(
      (project) =>
        !isUnsetClientName(project.clientName) &&
        normalizeProjectLabel(project.clientName) === clientKey,
    );
    if (byClient) {
      return byClient;
    }
  }

  const matchable = exactNameMatches.filter((project) => isMatchableProject(project.status));
  const pool = matchable.length > 0 ? matchable : exactNameMatches;

  if (payloadClientUnset) {
    const unsetClientMatches = pool.filter((project) => isUnsetClientName(project.clientName));
    if (unsetClientMatches.length > 0) {
      return unsetClientMatches[0];
    }
  }

  return pool[0];
}

export function buildProjectSummaryCounts(projects) {
  const counts = {
    OPEN: 0,
    PARTIALLY_FILLED: 0,
    FILLED: 0,
    total: projects.length,
  };
  for (const project of projects) {
    if (counts[project.status] != null) {
      counts[project.status] += 1;
    }
  }
  return counts;
}

/** 案件のスキル文字列を1件ずつに分割（改行・カンマ・読点など） */
export function parseProjectSkills(value) {
  if (!value) return [];
  return value
    .split(/\r?\n|[,、/|]/)
    .map((item) => item.replace(/^[・•\-]\s*/, '').trim())
    .filter(Boolean);
}

/** 案件詳細・一覧向け：請求単価ラベル優先、なければ数値を万円表記 */
export function formatProjectBillingPrice(price, label) {
  if (label?.trim()) return label.trim();
  if (!price || price <= 0) return '—';
  if (price >= 10000 && price % 10000 === 0) {
    return `${price / 10000}万円`;
  }
  return `${price.toLocaleString()}円`;
}

export function isSkillBasedBillingLabel(label) {
  if (!label) return false;
  return label.replace(/\s+/g, '').includes('スキル見合');
}
