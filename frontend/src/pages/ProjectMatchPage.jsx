import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import AppFooter from '../components/AppFooter';
import PageHeader from '../components/PageHeader';
import ListSectionBar from '../components/ListSectionBar';
import ProjectStatusBadge from '../components/ProjectStatusBadge';
import ProjectWorkflowHint from '../components/ProjectWorkflowHint';
import { canWriteProjectFeatures } from '../auth';
import { useAuth } from '../context/AuthContext';
import { workStatusClass } from '../utils';
import { buildProjectMatchState, readInitialMatchState } from '../utils/projectMatchState';
import { useAppMessage } from '../context/MessageContext';
import { isMatchableProject, isSkillBasedBillingLabel, assignmentRoleLabel, formatParsedHeadcount, formatProjectHeadcountDisplay, isHeadcountUnlimited, HEADCOUNT_MULTIPLE_LABEL, pickExistingProjectMatch } from '../utils/projectWorkflow';

const MATCHABLE_PROJECT_ONLY_MESSAGE = '募集中・一部確定の案件のみマッチングできます';

function normalizeMatchResponse(data) {
  if (Array.isArray(data)) {
    return { parsed: null, results: data };
  }
  return {
    parsed: data?.parsed ?? null,
    results: Array.isArray(data?.results) ? data.results : [],
  };
}

function appendBracketSection(lines, keyword, value) {
  const text = value == null ? '' : String(value).trim();
  if (!text) return;
  lines.push('');
  lines.push(`【${keyword}】`);
  lines.push(text);
}

function hasBracketSection(text, keyword) {
  if (!text) return false;
  const escaped = keyword.replace(/\s+/g, '\\s*');
  return new RegExp(`【\\s*${escaped}\\s*】`).test(text);
}

function appendProjectStructuredFields(lines, project) {
  const text = project.projectText?.trim() ?? '';
  if (!text) return;

  if (
    !hasBracketSection(text, '人数')
    && !hasBracketSection(text, '人　数')
    && !isHeadcountUnlimited(project)
    && project.headcountRequired > 0
  ) {
    appendBracketSection(lines, '人数', `${project.headcountRequired}名`);
  }
  if (
    !hasBracketSection(text, '人数')
    && !hasBracketSection(text, '人　数')
    && isHeadcountUnlimited(project)
  ) {
    appendBracketSection(lines, '人数', HEADCOUNT_MULTIPLE_LABEL);
  }
  if (
    !hasBracketSection(text, '就業場所')
    && !hasBracketSection(text, '勤務地')
    && project.workLocation?.trim()
  ) {
    appendBracketSection(lines, '就業場所', project.workLocation.trim());
  }
  if (!hasBracketSection(text, '期間') && !hasBracketSection(text, '期　　間')) {
    if (project.expectedStartDate) {
      const period = project.periodNotes?.trim()
        ? `${project.expectedStartDate}（${project.periodNotes.trim()}）`
        : project.expectedStartDate;
      appendBracketSection(lines, '期間', period);
    } else if (project.periodNotes?.trim()) {
      appendBracketSection(lines, '期間', project.periodNotes.trim());
    }
  }
  if (!hasBracketSection(text, '役割') && project.projectRole?.trim()) {
    appendBracketSection(lines, '役割', project.projectRole.trim());
  }
}

function buildProjectMatchText(project) {
  const lines = [];
  if (project.projectText?.trim()) {
    lines.push(project.projectText.trim());
    appendProjectStructuredFields(lines, project);
  } else {
    if (project.projectName) lines.push(`案件名: ${project.projectName}`);
    if (project.clientName) lines.push(`取引先: ${project.clientName}`);
    if (project.workLocation) lines.push(`勤務地: ${project.workLocation}`);
    if (project.expectedStartDate) lines.push(`開始予定: ${project.expectedStartDate}`);
    if (project.expectedEndDate) lines.push(`終了予定: ${project.expectedEndDate}`);
  }
  if (project.requiredSkills?.trim()) {
    lines.push('');
    lines.push('【必須スキル】');
    lines.push(project.requiredSkills.trim());
  }
  if (project.optionalSkills?.trim()) {
    lines.push('');
    lines.push('【任意スキル】');
    lines.push(project.optionalSkills.trim());
  }
  if (project.billingPriceLabel?.trim()) {
    lines.push('');
    lines.push('【希望単金】');
    lines.push(project.billingPriceLabel.trim());
  } else if (project.billingUnitPrice > 0) {
    lines.push('');
    lines.push('【単価】');
    if (project.billingUnitPrice >= 10000 && project.billingUnitPrice % 10000 === 0) {
      lines.push(`${project.billingUnitPrice / 10000}万円`);
    } else {
      lines.push(`${project.billingUnitPrice.toLocaleString()}円`);
    }
  }
  if (project.interviewRounds?.trim()) {
    lines.push('');
    lines.push('【面談回数】');
    lines.push(project.interviewRounds.trim());
  }
  if (project.notes?.trim() && !project.projectText?.trim()) {
    lines.push('');
    lines.push('備考:');
    lines.push(project.notes.trim());
  }
  return lines.join('\n');
}

function buildProjectPayloadFromParsed(parsed, text) {
  let clientName = '（取引先未設定）';
  let projectName = parsed?.projectName?.trim() || '（案件名未設定）';
  if (parsed?.projectName) {
    const towardMatch = parsed.projectName.match(/^(.+?)向け\s*(.+)$/);
    if (towardMatch) {
      clientName = towardMatch[1].trim() || clientName;
      projectName = towardMatch[2].trim() || projectName;
    }
  }
  const skillBased = parsed?.skillBasedPrice || isSkillBasedBillingLabel(parsed?.billingPriceLabel);
  return {
    clientName,
    projectName,
    projectText: parsed?.workSummary?.trim() || text.trim() || null,
    workLocation: parsed?.workLocation?.trim() || null,
    requiredSkills: parsed?.requiredSkills?.length ? parsed.requiredSkills.join('\n') : null,
    optionalSkills: parsed?.optionalSkills?.length ? parsed.optionalSkills.join('\n') : null,
    headcountRequired: parsed?.headcountUnlimited ? 0 : (parsed?.headcountRequired ?? 1),
    headcountUnlimited: parsed?.headcountUnlimited ?? false,
    billingUnitPrice: skillBased ? null : (parsed?.maxUnitPrice ?? null),
    billingPriceLabel: skillBased
      ? (parsed?.billingPriceLabel?.trim() || 'スキル見合い')
      : (parsed?.billingPriceLabel?.trim() || null),
    interviewRounds: parsed?.interviewRounds?.trim() || null,
    expectedStartDate: parsed?.expectedStartDate || null,
    periodNotes: parsed?.periodNotes?.trim() || null,
    projectRole: parsed?.projectRole?.trim() || null,
    notes: parsed?.notes?.trim() || null,
  };
}

async function findExistingProjectForParsed(parsed, text, localProjects = []) {
  if (!parsed) return null;
  const payload = buildProjectPayloadFromParsed(parsed, text);
  const projectName = payload.projectName?.trim();
  if (!projectName || projectName === '（案件名未設定）') {
    return null;
  }
  const [openList, partialList] = await Promise.all([
    api.searchProjects({ keyword: projectName, status: 'OPEN' }),
    api.searchProjects({ keyword: projectName, status: 'PARTIALLY_FILLED' }),
  ]);
  const seen = new Set();
  const combined = [...openList, ...partialList, ...localProjects].filter((project) => {
    if (seen.has(project.id)) return false;
    seen.add(project.id);
    return true;
  });
  return pickExistingProjectMatch(combined, payload);
}

function ActiveProjectRow({ project, matchingProjectId, matching, onOpen, onMatch }) {
  const isMatching = matching && String(project.id) === String(matchingProjectId);

  return (
    <tr className="project-match-active-row" onClick={() => onOpen(project)}>
      <td className="project-match-active-cell-project">
        <div className="project-match-active-name">{project.projectName}</div>
        <div className="project-match-active-client">{project.clientName}</div>
      </td>
      <td className="project-match-active-cell-meta">
        <ProjectStatusBadge status={project.status} />
      </td>
      <td className="project-match-active-cell-meta">
        <span className="project-match-active-count">
          {formatProjectHeadcountDisplay(project)}
        </span>
      </td>
      <td className="project-match-active-cell-meta">{project.expectedStartDate || '—'}</td>
      <td className="project-match-active-cell-meta project-match-active-cell-location">
        {project.workLocation || '—'}
      </td>
      <td className="project-match-active-cell-action" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={`btn btn-sm app-btn ${isMatching ? 'btn-primary' : 'btn-outline-primary'}`}
          disabled={matching}
          onClick={() => onMatch(project)}
        >
          {isMatching ? 'マッチング中…' : 'マッチング'}
        </button>
      </td>
    </tr>
  );
}

function ActiveProjectList({ projects, loading, matchingProjectId, matching, onOpen, onMatch }) {
  if (loading) {
    return (
      <div className="page-state-panel py-4">
        <div className="spinner-border spinner-border-sm text-primary" role="status" />
        <span className="ms-2 text-muted small">案件を読み込んでいます…</span>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <p className="text-muted mb-0 small">
        現在募集中・一部確定の案件はありません。下の入力欄に案件情報を貼り付けて検索してください。
      </p>
    );
  }

  return (
    <div className="project-match-active-table-wrap">
      <table className="table table-hover align-middle mb-0 project-match-active-table project-workflow-table">
        <colgroup>
          <col className="project-match-col-project" />
          <col className="project-match-col-status" />
          <col className="project-match-col-count" />
          <col className="project-match-col-date" />
          <col className="project-match-col-location" />
          <col className="project-match-col-action" />
        </colgroup>
        <thead className="table-light">
          <tr>
            <th className="project-match-th-project">案件</th>
            <th className="project-match-th-meta">ステータス</th>
            <th className="project-match-th-meta">確定/必要</th>
            <th className="project-match-th-meta">開始予定</th>
            <th className="project-match-th-meta">勤務地</th>
            <th className="project-match-th-action">操作</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <ActiveProjectRow
              key={project.id}
              project={project}
              matchingProjectId={matchingProjectId}
              matching={matching}
              onOpen={onOpen}
              onMatch={onMatch}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function scoreTier(score) {
  if (score >= 80) return 'high';
  if (score >= 60) return 'mid';
  if (score >= 40) return 'low';
  return 'base';
}

function formatUnitPrice(price) {
  if (!price || price <= 0) return '—';
  if (price >= 10000 && price % 10000 === 0) {
    return `${price / 10000}万`;
  }
  return `${price.toLocaleString()}円`;
}

function MatchSkillGroup({ label, icon, items, variant }) {
  return (
    <div className={`match-skill-group match-skill-group-${variant}`}>
      <div className="match-skill-group-label">
        <i className={`bi bi-${icon}`} aria-hidden="true" />
        {label}
        {items?.length > 0 && <span className="match-skill-group-count">{items.length}</span>}
      </div>
      {items?.length ? (
        <div className="match-skill-tags">
          {items.map((skill) => (
            <span key={skill} className="match-skill-tag" title={skill}>
              {skill}
            </span>
          ))}
        </div>
      ) : (
        <span className="match-skill-empty">なし</span>
      )}
    </div>
  );
}

function MatchResultCard({ row, canEdit, selectedProjectId, addingId, linkingProject, onOpen, onAdd }) {
  const hasSkills =
    row.matchedSkills?.length ||
    row.missingSkills?.length ||
    row.matchedOptionalSkills?.length;

  return (
    <article className="match-result-card">
      <div
        className="match-result-main match-result-main-clickable"
        onClick={() => onOpen(row.employeeId)}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onOpen(row.employeeId);
        }}
      >
        <div className={`match-score-ring match-score-${scoreTier(row.matchScore)}`}>
          <span className="match-score-value">{row.matchScore}</span>
          <span className="match-score-unit">%</span>
        </div>

        <div className="match-result-body">
          <div className="match-result-head">
            <span className="match-result-name">{row.name}</span>
            <span className={`badge status-badge ${workStatusClass(row.workStatus)}`}>
              {row.workStatus}
            </span>
            {row.activeCandidateCount > 0 && (
              <span className="match-candidate-count-badge">選考中 {row.activeCandidateCount}</span>
            )}
          </div>
          <div className="match-result-dept">{row.departmentName || '—'}</div>
        </div>

        <div className="match-result-meta">
          <div className="match-meta-item">
            <span className="match-meta-label">終了日</span>
            <span className="match-meta-value">{row.endDate || '—'}</span>
          </div>
          <div className="match-meta-item">
            <span className="match-meta-label">請求単価</span>
            <span className="match-meta-value">{formatUnitPrice(row.unitPrice)}</span>
          </div>
          <div className="match-meta-item">
            <span className="match-meta-label">評価</span>
            <span className="match-meta-value">{row.evaluation || '—'}</span>
          </div>
        </div>

        <div className="match-result-arrow" aria-hidden="true">
          <i className="bi bi-chevron-right" />
        </div>
      </div>

      {canEdit && (
        <div className="match-result-footer">
          {!selectedProjectId ? (
            <button
              type="button"
              className="btn btn-sm btn-primary app-btn match-add-create-btn"
              disabled={addingId === row.employeeId || linkingProject}
              onClick={(e) => {
                e.stopPropagation();
                onAdd(row);
              }}
            >
              {addingId === row.employeeId
                ? '追加中…'
                : linkingProject
                  ? '案件作成中…'
                  : '案件を作成して追加'}
            </button>
          ) : row.alreadyAdded ? (
            <span className="match-added-badge">
              <i className="bi bi-check-circle-fill" aria-hidden="true" />
              追加済
            </span>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-outline-primary app-btn match-add-create-btn"
              disabled={addingId === row.employeeId}
              onClick={(e) => {
                e.stopPropagation();
                onAdd(row);
              }}
            >
              {addingId === row.employeeId ? '追加中…' : '候補に追加'}
            </button>
          )}
        </div>
      )}

      {hasSkills ? (
        <div className="match-result-skills">
          <MatchSkillGroup
            label="必須一致"
            icon="check-circle-fill"
            items={row.matchedSkills}
            variant="matched"
          />
          <MatchSkillGroup
            label="不足"
            icon="dash-circle"
            items={row.missingSkills}
            variant="missing"
          />
          <MatchSkillGroup
            label="任意一致"
            icon="plus-circle-fill"
            items={row.matchedOptionalSkills}
            variant="optional"
          />
        </div>
      ) : null}
    </article>
  );
}

function formatPriceLimit(min, max, label, skillBased) {
  if (skillBased || isSkillBasedBillingLabel(label)) {
    const display = label?.trim() || 'スキル見合い';
    return `${display}（条件対象外）`;
  }
  if (label?.trim()) return label.trim();
  if (min && max) {
    return `${min / 10000}〜${max / 10000} 万円`;
  }
  if (max) {
    if (max >= 10000 && max % 10000 === 0) {
      return `〜${max / 10000} 万円`;
    }
    return `〜${max.toLocaleString()} 円`;
  }
  if (min) {
    if (min >= 10000 && min % 10000 === 0) {
      return `${min / 10000} 万円〜`;
    }
    return `${min.toLocaleString()} 円〜`;
  }
  return '—';
}

function ParsedStat({ icon, label, value, accent }) {
  return (
    <div className={`parsed-stat parsed-stat-${accent}`}>
      <div className="parsed-stat-icon" aria-hidden="true">
        <i className={`bi ${icon}`} />
      </div>
      <div className="parsed-stat-body">
        <div className="parsed-stat-label">{label}</div>
        <div className="parsed-stat-value">{value}</div>
      </div>
    </div>
  );
}

function splitWorkSummaryParagraphs(text) {
  if (!text?.trim()) return [];
  return text.trim().split(/\n+/).map((line) => line.trim()).filter(Boolean);
}

function ParsedWorkSummary({ text }) {
  const paragraphs = splitWorkSummaryParagraphs(text);
  if (!paragraphs.length) return null;

  return (
    <section className="parsed-summary-work" aria-label="作業概要">
      <div className="parsed-summary-work-header">
        <div className="parsed-summary-work-header-icon" aria-hidden="true">
          <i className="bi bi-file-earmark-text" />
        </div>
        <div className="parsed-summary-work-header-text">
          <h3 className="parsed-summary-work-title">作業概要（案件内容）</h3>
          <p className="parsed-summary-work-lead mb-0">案件票から抽出した業務内容</p>
        </div>
      </div>
      <div className="parsed-summary-work-body">
        {paragraphs.map((paragraph, index) => (
          <p key={`${index}-${paragraph.slice(0, 24)}`} className="parsed-summary-work-paragraph">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}

function SkillItemList({ items, variant = 'required' }) {
  if (!items?.length) {
    return <span className="parsed-empty">—</span>;
  }
  return (
    <ul className={`parsed-skill-list parsed-skill-list--${variant}`}>
      {items.map((skill) => (
        <li key={skill} className="parsed-skill-list-item">
          <span className="parsed-skill-list-marker" aria-hidden="true">
            {variant === 'required' ? '●' : '○'}
          </span>
          <span className="parsed-skill-list-text">{skill}</span>
        </li>
      ))}
    </ul>
  );
}

function ParsedSummary({
  parsed,
  resultCount,
  linkedProject,
  detectedExistingProject,
  canEdit,
  linking,
  onCreateAndLink,
}) {
  if (!parsed) return null;

  const keywordCount = parsed.keywords?.length ?? 0;
  const hasExisting = !linkedProject && detectedExistingProject;

  return (
    <section className="parsed-summary" aria-label="解析結果">
      <div className="parsed-summary-header">
        <div className="parsed-summary-header-main">
          <span className="parsed-summary-badge">
            <i className="bi bi-magic" aria-hidden="true" />
            解析結果
          </span>
          <h2 className="parsed-summary-title">{parsed.projectName || '（案件名なし）'}</h2>
          {linkedProject ? (
            <p className="parsed-summary-linked mb-0">
              <i className="bi bi-link-45deg" aria-hidden="true" />
              紐づけ案件: {linkedProject.clientName} — {linkedProject.projectName}
            </p>
          ) : hasExisting ? (
            <p className="parsed-summary-existing mb-0">
              <i className="bi bi-exclamation-circle" aria-hidden="true" />
              同名の既存案件があります（
              {detectedExistingProject.clientName || '（取引先未設定）'} —{' '}
              {detectedExistingProject.projectName}
              ）。上の一覧から「マッチング」を実行してください。
            </p>
          ) : canEdit ? (
            <p className="parsed-summary-unlinked mb-0">
              候補追加には案件への紐づけが必要です。下のボタンで案件を作成できます。
            </p>
          ) : null}
        </div>
        {resultCount != null && (
          <div className="parsed-summary-count">
            <span className="parsed-summary-count-num">{resultCount}</span>
            <span className="parsed-summary-count-label">件の候補</span>
          </div>
        )}
      </div>

      {!linkedProject && !hasExisting && canEdit && onCreateAndLink && (
        <div className="parsed-summary-action">
          <button
            type="button"
            className="btn btn-outline-primary app-btn"
            disabled={linking}
            onClick={onCreateAndLink}
          >
            <i className="bi bi-plus-lg" aria-hidden="true" />
            {linking ? '案件作成中…' : '案件を作成して紐づけ'}
          </button>
        </div>
      )}

      <div className="parsed-summary-stats">
        <ParsedStat
          icon="bi-currency-yen"
          label="請求単価"
          value={formatPriceLimit(
            parsed.minUnitPrice,
            parsed.maxUnitPrice,
            parsed.billingPriceLabel,
            parsed.skillBasedPrice,
          )}
          accent="price"
        />
        <ParsedStat
          icon="bi-people"
          label="必要人数"
          value={formatParsedHeadcount(parsed)}
          accent="headcount"
        />
        <ParsedStat
          icon="bi-geo-alt"
          label="勤務地"
          value={parsed.workLocation?.trim() || '—'}
          accent="location"
        />
        <ParsedStat
          icon="bi-calendar-event"
          label="開始予定"
          value={parsed.expectedStartDate ? parsed.expectedStartDate.replace(/-/g, '/') : '—'}
          accent="schedule"
        />
        <ParsedStat
          icon="bi-person-workspace"
          label="役割"
          value={assignmentRoleLabel(parsed.projectRole) || '—'}
          accent="role"
        />
        <ParsedStat
          icon="bi-chat-dots"
          label="面談回数"
          value={parsed.interviewRounds?.trim() || '—'}
          accent="interview"
        />
        <ParsedStat
          icon="bi-briefcase"
          label="経験年数下限"
          value={parsed.minItYears != null ? `${parsed.minItYears} 年` : '—'}
          accent="exp"
        />
        <ParsedStat
          icon="bi-tags"
          label="抽出キーワード"
          value={keywordCount > 0 ? `${keywordCount} 件` : '—'}
          accent="keyword"
        />
      </div>

      {parsed.periodNotes?.trim() && (
        <div className="parsed-summary-period-note">
          <span className="parsed-summary-period-note-label">期間備考</span>
          <span className="parsed-summary-period-note-value">{parsed.periodNotes.trim()}</span>
        </div>
      )}

      {parsed.workSummary?.trim() && <ParsedWorkSummary text={parsed.workSummary} />}

      <div className="parsed-summary-skills">
        <div className="parsed-skill-block">
          <div className="parsed-skill-block-head">
            <i className="bi bi-check-circle-fill text-danger" aria-hidden="true" />
            <span>必須スキル</span>
            {parsed.requiredSkills?.length > 0 && (
              <span className="parsed-skill-count">{parsed.requiredSkills.length}</span>
            )}
          </div>
          <SkillItemList items={parsed.requiredSkills} variant="required" />
        </div>
        <div className="parsed-skill-block">
          <div className="parsed-skill-block-head">
            <i className="bi bi-plus-circle-fill text-primary" aria-hidden="true" />
            <span>任意スキル</span>
            <span className="parsed-skill-alias">（尚可スキル含む）</span>
            {parsed.optionalSkills?.length > 0 && (
              <span className="parsed-skill-count">{parsed.optionalSkills.length}</span>
            )}
          </div>
          <SkillItemList items={parsed.optionalSkills} variant="optional" />
        </div>
      </div>
    </section>
  );
}

export default function ProjectMatchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const canEdit = canWriteProjectFeatures(user);
  const { showMessage } = useAppMessage();
  const initialRef = useRef(null);
  if (!initialRef.current) {
    initialRef.current = readInitialMatchState(location.state);
  }
  const initial = initialRef.current;
  const [projectText, setProjectText] = useState(initial.projectText);
  const [parsed, setParsed] = useState(initial.parsed);
  const [results, setResults] = useState(initial.results);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(initial.searched);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState(initial.selectedProjectId ?? '');
  const [matchingProjectId, setMatchingProjectId] = useState('');
  const [addingId, setAddingId] = useState(null);
  const [linkingProject, setLinkingProject] = useState(false);
  const [detectedExistingProject, setDetectedExistingProject] = useState(null);
  const [inputExpanded, setInputExpanded] = useState(false);
  const focusHandledRef = useRef(false);
  const focusProjectId = location.state?.focusProjectId;

  const matchedProject = projects.find((p) => String(p.id) === String(selectedProjectId)) ?? null;

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const [openList, partialList] = await Promise.all([
        api.searchProjects({ status: 'OPEN' }),
        api.searchProjects({ status: 'PARTIALLY_FILLED' }),
      ]);
      const merged = [...openList, ...partialList].sort((a, b) => {
        const aTime = a.updatedAt || a.createdAt || '';
        const bTime = b.updatedAt || b.createdAt || '';
        return bTime.localeCompare(aTime);
      });
      setProjects(merged);
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setProjectsLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  async function runMatch(text, projectId = selectedProjectId) {
    const trimmed = text.trim();
    if (!trimmed) {
      showMessage('案件情報を入力してください', 'warning');
      return;
    }
    if (projectId) {
      const linked = projects.find((p) => String(p.id) === String(projectId));
      if (linked && !isMatchableProject(linked.status)) {
        showMessage(MATCHABLE_PROJECT_ONLY_MESSAGE, 'warning');
        return;
      }
    }
    setLoading(true);
    setSearched(true);
    try {
      const data = await api.matchProject({
        projectText: trimmed,
        projectId: projectId ? Number(projectId) : null,
      });
      const { parsed: parsedResult, results: matchResults } = normalizeMatchResponse(data);
      setParsed(parsedResult);
      setResults(matchResults);
      if (projectId) {
        setDetectedExistingProject(null);
      } else {
        const existing = await findExistingProjectForParsed(parsedResult, trimmed, projects);
        setDetectedExistingProject(existing);
      }
      showMessage(`${matchResults.length} 件の候補者が見つかりました`);
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(event) {
    event.preventDefault();
    await runMatch(projectText);
  }

  function buildCurrentMatchState() {
    return buildProjectMatchState({
      projectText,
      parsed,
      results,
      searched,
      selectedProjectId,
    });
  }

  function handleOpenProject(project) {
    navigate(`/projects/${project.id}`, {
      state: {
        from: '/project-match',
        fromLabel: '案件マッチングに戻る',
        matchState: buildCurrentMatchState(),
      },
    });
  }

  async function handleMatchProject(project) {
    if (!isMatchableProject(project.status)) {
      showMessage(MATCHABLE_PROJECT_ONLY_MESSAGE, 'warning');
      return;
    }
    const text = buildProjectMatchText(project);
    setMatchingProjectId(String(project.id));
    setSelectedProjectId(String(project.id));
    setDetectedExistingProject(null);
    try {
      await runMatch(text, project.id);
    } finally {
      setMatchingProjectId('');
    }
  }

  useEffect(() => {
    if (!focusProjectId || focusHandledRef.current || projectsLoading || projects.length === 0) return;
    const project = projects.find((p) => String(p.id) === String(focusProjectId));
    if (!project) return;
    focusHandledRef.current = true;
    handleMatchProject(project);
  }, [focusProjectId, projects, projectsLoading]);

  async function ensureProjectForMatch() {
    if (selectedProjectId) {
      const linked = projects.find((p) => String(p.id) === String(selectedProjectId));
      if (linked && !isMatchableProject(linked.status)) {
        throw new Error(MATCHABLE_PROJECT_ONLY_MESSAGE);
      }
      return Number(selectedProjectId);
    }
    if (!canEdit) {
      throw new Error('候補を追加する権限がありません');
    }
    if (!projectText.trim()) {
      throw new Error('案件情報を入力してください');
    }

    const existing =
      detectedExistingProject ?? (await findExistingProjectForParsed(parsed, projectText, projects));
    if (existing) {
      throw new Error(
        `同名の既存案件「${existing.projectName}」があります。上の一覧から「マッチング」を実行してください。`,
      );
    }

    setLinkingProject(true);
    try {
      const created = await api.createProject(buildProjectPayloadFromParsed(parsed, projectText));
      await loadProjects();
      setSelectedProjectId(String(created.id));
      setDetectedExistingProject(null);
      const data = await api.matchProject({
        projectText: projectText.trim(),
        projectId: created.id,
      });
      const { parsed: parsedResult, results: matchResults } = normalizeMatchResponse(data);
      setParsed(parsedResult);
      setResults(matchResults);
      showMessage(`案件「${created.projectName}」を作成し、検索結果を紐づけました`);
      return created.id;
    } finally {
      setLinkingProject(false);
    }
  }

  async function handleLinkProject() {
    try {
      await ensureProjectForMatch();
    } catch (e) {
      showMessage(e.message, 'danger');
    }
  }

  async function handleAddCandidate(row) {
    setAddingId(row.employeeId);
    try {
      const projectId = await ensureProjectForMatch();
      await api.addProjectCandidate(projectId, {
        employeeId: row.employeeId,
        matchScore: row.matchScore,
        matchedSkills: row.matchedSkills,
      });
      setResults((prev) =>
        prev.map((item) =>
          item.employeeId === row.employeeId ? { ...item, alreadyAdded: true } : item
        )
      );
      showMessage(`「${row.name}」を候補に追加しました`);
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setAddingId(null);
    }
  }

  function handleReset() {
    setProjectText('');
    setParsed(null);
    setResults([]);
    setSearched(false);
    setSelectedProjectId('');
  }

  return (
    <div className="container-fluid py-4 px-3 px-lg-5 list-page">
      <PageHeader
        guideId="project-match"
        icon="bi-diagram-3-fill"
        title="案件マッチング"
        lead="募集中案件から候補者を探すか、案件内容を貼り付けて検索します。次案件確定済の社員は対象外です。"
        className="mb-3"
      />

      <ProjectWorkflowHint />

      <section className="table-section list-section-panel mt-3" aria-label="募集中案件" data-guide="project-match-list">
        <ListSectionBar icon="bi-briefcase-fill" title="募集中案件" count={projects.length} />
        <div className="list-section-body list-section-body-padded project-match-active-body">
          <p className="project-match-active-lead">
            行をクリックで案件詳細、「マッチング」で候補者検索。
            {canEdit && ' 候補追加はマッチング実行時に案件へ自動紐づけされます。'}
          </p>
          <ActiveProjectList
            projects={projects}
            loading={projectsLoading}
            matchingProjectId={matchingProjectId}
            matching={loading}
            onOpen={handleOpenProject}
            onMatch={handleMatchProject}
          />
        </div>
      </section>

      <section className="table-section list-section-panel mt-3" aria-label="案件内容入力">
        <button
          type="button"
          className="search-section-toggle project-match-paste-toggle"
          onClick={() => setInputExpanded((v) => !v)}
          aria-expanded={inputExpanded}
          aria-controls="project-match-input-panel"
        >
          <span className="h6 text-muted mb-0">案件内容を貼り付けて検索</span>
          <span className="search-toggle-icon" aria-hidden="true">
            {inputExpanded ? '▲' : '▼'}
          </span>
        </button>
        {inputExpanded && (
          <div id="project-match-input-panel" className="search-form-panel project-match-paste-panel">
            <form onSubmit={handleSearch} className="project-match-form">
              <p className="project-match-form-lead mb-2">
                【必須スキル】【尚可スキル】【月額報酬】、■必須 などの形式に対応しています。
              </p>
              <textarea
                id="projectText"
                className="form-control project-match-textarea"
                rows={8}
                placeholder="案件内容を貼り付けまたは入力してください"
                value={projectText}
                onChange={(e) => setProjectText(e.target.value)}
              />
              <div className="project-match-form-actions mt-2">
                <button type="submit" className="btn btn-primary app-btn" disabled={loading}>
                  <i className="bi bi-search" aria-hidden="true" />
                  {loading ? '検索中…' : '候補者を検索'}
                </button>
                <button type="button" className="btn btn-outline-secondary app-btn" onClick={handleReset}>
                  <i className="bi bi-x-circle" aria-hidden="true" />
                  クリア
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      {searched && !loading && (
        <div className="project-match-parsed-section mt-3">
          <ParsedSummary
            parsed={parsed}
            resultCount={(results ?? []).length}
            linkedProject={matchedProject}
            detectedExistingProject={detectedExistingProject}
            canEdit={canEdit}
            linking={linkingProject}
            onCreateAndLink={handleLinkProject}
          />
        </div>
      )}

      <section className="table-section list-section-panel mt-3" aria-label="マッチング結果" data-guide="project-match-results">
        {loading ? (
          <div className="page-state-panel">
            <div className="spinner-border text-primary" role="status" />
            <p className="mt-3 mb-0">候補者を検索しています…</p>
          </div>
        ) : !searched ? (
          <div className="list-section-body list-section-body-padded">
            <p className="text-muted mb-0">募集中・一部確定案件の「マッチング」を実行するか、案件内容を貼り付けて検索してください。</p>
          </div>
        ) : (results ?? []).length === 0 ? (
          <div className="list-section-body list-section-body-padded">
            <p className="text-muted mb-0">条件に合致する社員が見つかりませんでした。</p>
          </div>
        ) : (
          <>
            <ListSectionBar
              icon="bi-people-fill"
              title="候補者一覧"
              count={(results ?? []).length}
              badge={
                matchedProject ? (
                  <span className="project-match-context-badge">
                    <i className="bi bi-link-45deg" aria-hidden="true" />
                    {matchedProject.clientName} — {matchedProject.projectName}
                  </span>
                ) : null
              }
            />
            <div className="list-section-body list-section-body-padded">
              <div className="match-result-list">
                {(results ?? []).map((row) => (
                  <MatchResultCard
                    key={row.employeeId}
                    row={row}
                    canEdit={canEdit}
                    selectedProjectId={selectedProjectId}
                    addingId={addingId}
                    linkingProject={linkingProject}
                    onAdd={handleAddCandidate}
                    onOpen={(employeeId) =>
                      navigate(`/employees/${employeeId}`, {
                        state: {
                          from: '/project-match',
                          fromLabel: '案件マッチングに戻る',
                          matchState: buildProjectMatchState({
                            projectText,
                            parsed,
                            results,
                            searched,
                            selectedProjectId,
                          }),
                        },
                      })
                    }
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      <AppFooter />
    </div>
  );
}
