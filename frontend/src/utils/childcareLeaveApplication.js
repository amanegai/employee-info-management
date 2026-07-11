import { detailToForm, formToSavePayload } from '../utils';
import { formatWarekiDate } from './japaneseEra';
import { renderHtmlToPdfBlob } from './htmlToPdf';

export const CHILDCARE_FORM_TYPES = [
  {
    value: 'MALE_CHILDCARE',
    label: '育児休業申出書（男性社員必須）',
    shortLabel: '育児休業申出書',
    icon: 'bi-person-standing',
    desc: '男性社員向け育児休業申出',
  },
  {
    value: 'BIRTH_CHILDCARE',
    label: '（出生時）育児休業申出書',
    shortLabel: '出生時育児休業申出書',
    icon: 'bi-heart-pulse',
    desc: '出生時育児休業（産後パパ育休）',
  },
];

export function formTypeLabel(formType) {
  return CHILDCARE_FORM_TYPES.find((item) => item.value === formType)?.shortLabel ?? '申請書';
}

export function createInitialChildcareForm(formType = 'MALE_CHILDCARE') {
  return {
    formType,
    submitDate: new Date().toISOString().slice(0, 10),
    recipientName: '',
    department: '',
    section: '',
    applicantName: '',
    childName: '',
    childBirthDate: '',
    relationship: '',
    expectedBirthDate: '',
    expectedParentName: '',
    expectedParentRelationship: '',
    leaveStartDate: '',
    leaveEndDate: '',
    returnWorkDate: '',
    leaveStartDate2: '',
    leaveEndDate2: '',
    returnWorkDate2: '',
    adoptionDate: '',
    fosterCareProcedureDate: '',
    lateReason: '',
    birthLeavePriorCount: '',
    birthLeaveWithdrawCount: '',
    under1LeaveStartDate: '',
    under1LeaveEndDate: '',
    under1ReturnWorkDate: '',
    under1LeaveStartDate2: '',
    under1LeaveEndDate2: '',
    under1ReturnWorkDate2: '',
    under1LateReason: '',
    previousLeaveReason: '',
    withdrawalReason: '',
    spouseLeaveStartDate: '',
    over1LeaveStartDate: '',
    over1LeaveEndDate: '',
    over1ReturnWorkDate: '',
    over1LateReason: '',
    over1PriorLeaveReason: '',
    over1WithdrawalReason: '',
    leaveReasonOver1: '',
    spouseOnLeave: '',
    spouseLeaveExpectedDate: '',
    remarks: '',
  };
}

/** 申請内容の修正フォーム定義（テンプレートの入力欄と一致） */
export const CHILDCARE_EDIT_SECTIONS = {
  MALE_CHILDCARE: [
    {
      id: 'header',
      title: 'ヘッダー',
      description: '申出日・所属・申出者',
      fields: [
        { key: 'submitDate', label: '申出日', type: 'date', required: true },
        { key: 'department', label: '所属（部）', type: 'text' },
        { key: 'section', label: '課', type: 'text' },
        { key: 'applicantName', label: '氏名', type: 'text' },
      ],
    },
    {
      id: 'sec-1',
      title: '1　休業に係る子の状況',
      description: '対象となる子の基本情報',
      fields: [
        { key: 'childName', label: '（1）氏名', type: 'text' },
        { key: 'childBirthDate', label: '（2）生年月日', type: 'date' },
        { key: 'relationship', label: '（3）本人との続柄', type: 'text', placeholder: '例：長男' },
        { key: 'adoptionDate', label: '（4）養子の場合、縁組成立の年月日', type: 'date' },
      ],
    },
    {
      id: 'sec-2',
      title: '2　出産予定者の状況',
      description: '子が未出生の場合に記入',
      fields: [
        { key: 'expectedParentName', label: '（1）氏名', type: 'text' },
        { key: 'expectedBirthDate', label: '（2）出産予定日', type: 'date' },
        { key: 'expectedParentRelationship', label: '（3）本人との続柄', type: 'text' },
      ],
    },
    {
      id: 'sec-3',
      title: '3　休業の期間',
      description: '育児休業の開始・終了・復帰予定',
      fields: [
        { key: 'leaveStartDate', label: '開始日', type: 'date' },
        { key: 'leaveEndDate', label: '終了日', type: 'date' },
        {
          key: 'returnWorkDate',
          label: '職場復帰予定日',
          type: 'date',
          required: true,
          hint: '社員詳細に反映されます',
        },
      ],
    },
    {
      id: 'sec-4',
      title: '4　申出に係る状況',
      description: '申出の経緯・配偶者の休業等',
      fields: [
        { key: 'lateReason', label: '（1）申出が遅れた理由', type: 'textarea' },
        { key: 'previousLeaveReason', label: '（2）再度申出の理由', type: 'textarea' },
        { key: 'withdrawalReason', label: '（3）再度休業の理由', type: 'textarea' },
        { key: 'spouseLeaveStartDate', label: '（4）配偶者の休業開始（予定）日', type: 'date' },
        { key: 'leaveReasonOver1', label: '（5）休業が必要な理由', type: 'textarea' },
        {
          key: 'spouseOnLeave',
          label: '（6）配偶者が休業',
          type: 'select',
          options: [
            { value: '', label: '—' },
            { value: 'している', label: 'している' },
            { value: 'していない', label: 'していない' },
          ],
        },
      ],
    },
  ],
  BIRTH_CHILDCARE: [
    {
      id: 'header',
      title: 'ヘッダー',
      description: '申出日・宛先・申出者',
      fields: [
        { key: 'submitDate', label: '申出日', type: 'date', required: true },
        { key: 'recipientName', label: '宛先（殿の前）', type: 'text', placeholder: '例：人事部長' },
        { key: 'department', label: '所属', type: 'text' },
        { key: 'applicantName', label: '氏名', type: 'text' },
      ],
    },
    {
      id: 'sec-1',
      title: '1　休業に係る子の状況',
      description: '対象となる子の基本情報',
      fields: [
        { key: 'childName', label: '（1）氏名', type: 'text' },
        { key: 'childBirthDate', label: '（2）生年月日', type: 'date' },
        { key: 'relationship', label: '（3）本人との続柄', type: 'text', placeholder: '例：長男' },
        { key: 'adoptionDate', label: '（4）養子の場合、縁組成立の年月日', type: 'date' },
        {
          key: 'fosterCareProcedureDate',
          label: '（5）里子・養親等／特別養子縁組等の手続完了日',
          type: 'date',
          wide: true,
          hint: '（5）（1）の子が、特別養子縁組の監護期間中の子・養子縁組里親に委託されている子・養育里親として委託された子の場合、その手続きが完了した年月日',
        },
      ],
    },
    {
      id: 'sec-2',
      title: '2　出産予定者の状況',
      description: '子が未出生の場合に記入',
      fields: [
        { key: 'expectedParentName', label: '氏名', type: 'text' },
        { key: 'expectedBirthDate', label: '出産予定日', type: 'date' },
        { key: 'expectedParentRelationship', label: '本人との続柄', type: 'text' },
      ],
    },
    {
      id: 'sec-3-1',
      title: '3-1　休業の期間',
      description: '出生時育児休業（産後パパ育休）',
      fields: [
        { key: 'leaveStartDate', label: '開始日（1回目）', type: 'date' },
        { key: 'leaveEndDate', label: '終了日（1回目）', type: 'date' },
        {
          key: 'returnWorkDate',
          label: '職場復帰予定日（1回目）',
          type: 'date',
          required: true,
          hint: '社員詳細に反映されます',
        },
        { key: 'leaveStartDate2', label: '開始日（2回目・任意）', type: 'date' },
        { key: 'leaveEndDate2', label: '終了日（2回目・任意）', type: 'date' },
        { key: 'returnWorkDate2', label: '職場復帰予定日（2回目・任意）', type: 'date' },
      ],
    },
    {
      id: 'sec-3-2',
      title: '3-2　申出に係る状況',
      description: '出生時育児休業の申出経緯',
      fields: [
        { key: 'lateReason', label: '（1）申出が遅れた理由', type: 'textarea' },
        {
          key: 'birthLeavePriorCount',
          label: '（2）出生時育児休業をした回数',
          type: 'text',
          placeholder: 'ある場合に記入',
        },
        {
          key: 'birthLeaveWithdrawCount',
          label: '（3）出生時育児休業の申出撤回回数',
          type: 'text',
          placeholder: 'ある場合に記入',
        },
      ],
    },
    {
      id: 'sec-4-1',
      title: '4-1　休業の期間（1歳まで）',
      description: '1歳までの育児休業',
      fields: [
        { key: 'under1LeaveStartDate', label: '開始日（1回目）', type: 'date' },
        { key: 'under1LeaveEndDate', label: '終了日（1回目）', type: 'date' },
        { key: 'under1ReturnWorkDate', label: '職場復帰予定日（1回目）', type: 'date' },
        { key: 'under1LeaveStartDate2', label: '開始日（2回目・任意）', type: 'date' },
        { key: 'under1LeaveEndDate2', label: '終了日（2回目・任意）', type: 'date' },
        { key: 'under1ReturnWorkDate2', label: '職場復帰予定日（2回目・任意）', type: 'date' },
      ],
    },
    {
      id: 'sec-4-2',
      title: '4-2　申出に係る状況（1歳まで）',
      description: '1歳までの育児休業の申出経緯',
      fields: [
        { key: 'under1LateReason', label: '（1）申出が遅れた理由', type: 'textarea' },
        { key: 'previousLeaveReason', label: '（2）再度申出の理由', type: 'textarea' },
        { key: 'withdrawalReason', label: '（3）再度休業の理由', type: 'textarea' },
        { key: 'spouseLeaveStartDate', label: '（4）配偶者の休業開始（予定）日', type: 'date' },
      ],
    },
    {
      id: 'sec-5-1',
      title: '5-1　休業の期間（1歳を超える）',
      description: '1歳を超える育児休業',
      fields: [
        { key: 'over1LeaveStartDate', label: '開始日', type: 'date' },
        { key: 'over1LeaveEndDate', label: '終了日', type: 'date' },
        { key: 'over1ReturnWorkDate', label: '職場復帰予定日', type: 'date' },
      ],
    },
    {
      id: 'sec-5-2',
      title: '5-2　申出に係る状況（1歳を超える）',
      description: '1歳を超える育児休業の申出経緯',
      fields: [
        { key: 'over1LateReason', label: '（1）申出が遅れた理由', type: 'textarea' },
        { key: 'over1PriorLeaveReason', label: '（2）休業が必要な理由', type: 'textarea' },
        { key: 'over1WithdrawalReason', label: '（3）再度休業の理由', type: 'textarea' },
        { key: 'leaveReasonOver1', label: '（4）休業が必要な理由', type: 'textarea' },
        {
          key: 'spouseOnLeave',
          label: '（5）配偶者が休業',
          type: 'select',
          options: [
            { value: '', label: '—' },
            { value: 'している', label: 'している' },
            { value: 'していない', label: 'していない' },
          ],
        },
        { key: 'spouseLeaveExpectedDate', label: '（5）配偶者の休業（予定）日', type: 'date' },
      ],
    },
  ],
};

export function getChildcareEditSections(formType) {
  return CHILDCARE_EDIT_SECTIONS[formType] ?? CHILDCARE_EDIT_SECTIONS.MALE_CHILDCARE;
}

function escapeHtml(value) {
  if (value == null || value === '') return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dateLabel(value, emptyEra = '令和') {
  return formatWarekiDate(value, emptyEra);
}

function dateRangeLabel(start, end) {
  const startText = formatWarekiDate(start, '令和');
  const endText = formatWarekiDate(end, '令和');
  return `${startText}から　　${endText}まで`;
}

function reasonBracket(value) {
  const text = value?.trim() ? escapeHtml(value.trim()) : '';
  return `<span class="reason-bracket"><span class="reason-bracket-l">〔</span><span class="reason-bracket-body">${text}</span><span class="reason-bracket-r">〕</span></span>`;
}

/** テキスト入力欄（左ラベルと同じ行・右側に下線） */
function textFill(value) {
  const trimmed = value?.trim();
  if (trimmed) {
    return `<span class="fill-value">${escapeHtml(trimmed)}</span>`;
  }
  return '<span class="fill-blank"></span>';
}

/** 日付欄（行区切り線のみ・セル内に追加の下線なし） */
function dateFill(valueHtml) {
  return `<span class="fill-date">${valueHtml}</span>`;
}

function buildSubRow(label, valueHtml) {
  return `<tr><td class="sub-label">${label}</td><td class="sub-value">${valueHtml}</td></tr>`;
}

function buildInnerTable(rows) {
  return `<table class="inner-table"><colgroup><col class="sub-label-col" /><col class="sub-value-col" /></colgroup>${rows.join('')}</table>`;
}

function buildSituationRow(descHtml, answerHtml) {
  return `<tr><td class="situation-desc">${descHtml}</td><td class="situation-ans">${answerHtml}</td></tr>`;
}

function buildSituationTable(rows) {
  return `<table class="situation-table"><colgroup><col class="situation-desc-col" /><col class="situation-ans-col" /></colgroup>${rows.join('')}</table>`;
}

function buildMaleSituationTable(form) {
  return buildSituationTable([
    buildSituationRow(
      '（1）1歳までの育児休業の場合は休業開始予定日の1か月前、1歳を超えての休業の場合は2週間前に申し出て',
      `<span class="situation-ans-line">いる・いない→申出が遅れた理由</span><span class="situation-input">${reasonBracket(form.lateReason)}</span>`
    ),
    buildSituationRow(
      '（2）1の子について育児休業をしたことが<br /><span class="situation-note">※　1歳を超えての休業の場合は記入の必要はありません</span>',
      `<span class="situation-ans-line">ない・ある→再度申出の理由</span><span class="situation-input">${reasonBracket(form.previousLeaveReason)}</span>`
    ),
    buildSituationRow(
      '（3）1の子について育児休業の申出を撤回したことが',
      `<span class="situation-ans-line">再度休業の理由</span><span class="situation-input">${reasonBracket(form.withdrawalReason)}</span>`
    ),
    buildSituationRow(
      '（4）配偶者も育児休業をしており、規則第2条第2項に基づき１歳を超えて休業しようとする場合',
      `<span class="situation-ans-line">配偶者の休業開始（予定）日</span><span class="situation-input">${dateFill(escapeHtml(dateLabel(form.spouseLeaveStartDate)))}</span>`
    ),
    buildSituationRow(
      '（5）（4）以外で1歳を超えての休業の申出の場合',
      `<span class="situation-ans-line">休業が必要な理由</span><span class="situation-input">${reasonBracket(form.leaveReasonOver1)}</span>`
    ),
    buildSituationRow(
      '（6）1歳を超えての育児休業の申出の場合で申出者が育児休業中でない場合',
      `<span class="situation-ans-line">配偶者が休業　${escapeHtml(form.spouseOnLeave?.trim() || 'している・していない')}</span>`
    ),
  ]);
}

function buildBirthSituationTable32(form) {
  const priorCount = escapeHtml(form.birthLeavePriorCount?.trim() || '　　　');
  const withdrawCount = escapeHtml(form.birthLeaveWithdrawCount?.trim() || '　　　');
  return buildSituationTable([
    buildSituationRow(
      '（1）休業開始予定日の 2 週間前に申し出ている・いない',
      `<span class="situation-ans-line">いる・いない→申出が遅れた理由</span><span class="situation-input">${reasonBracket(form.lateReason)}</span>`
    ),
    buildSituationRow(
      '（2）1 の子について出生時育児休業をしたことが（休業予定含む）',
      `<span class="situation-ans-line">ない・ある（${priorCount}回）</span>`
    ),
    buildSituationRow(
      '（3）1 の子について出生時育児休業の申出を撤回したことが',
      `<span class="situation-ans-line">ない・ある（${withdrawCount}回）</span>`
    ),
  ]);
}

function buildBirthSituationTable42(form) {
  return buildSituationTable([
    buildSituationRow(
      '（1）1歳までの育児休業の場合は休業開始予定日の1か月前、1歳を超えての休業の場合は2週間前に申し出て',
      `<span class="situation-ans-line">いる・いない→申出が遅れた理由</span><span class="situation-input">${reasonBracket(form.under1LateReason)}</span>`
    ),
    buildSituationRow(
      '（2）1の子について育児休業をしたことが（休業予定含む）<br /><span class="situation-note">※　1歳を超えての休業の場合は記入の必要はありません</span>',
      `<span class="situation-ans-line">ない・ある（　　　回）→休業期間</span><span class="situation-input">${reasonBracket('')}</span><span class="situation-ans-line">→再度申出の理由</span><span class="situation-input">${reasonBracket(form.previousLeaveReason)}</span>`
    ),
    buildSituationRow(
      '（3）1の子について育児休業の申出を撤回したことが',
      `<span class="situation-ans-line">ない・ある（　　　回）→再度休業の理由</span><span class="situation-input">${reasonBracket(form.withdrawalReason)}</span>`
    ),
    buildSituationRow(
      '（4）配偶者も育児休業をしており、規則第2条第2項に基づき１歳を超えて休業しようとする場合（パパ・ママ育休プラス）',
      `<span class="situation-ans-line">配偶者の休業開始（予定）日</span><span class="situation-input">${dateFill(escapeHtml(dateLabel(form.spouseLeaveStartDate)))}</span>`
    ),
  ]);
}

function buildBirthSituationTable52(form) {
  const spouseStatus = escapeHtml(form.spouseOnLeave?.trim() || 'している・していない');
  return buildSituationTable([
    buildSituationRow(
      '（1）1歳を超えての育児休業の場合は休業開始予定日の2週間前に申し出て',
      `<span class="situation-ans-line">いる・いない→申出が遅れた理由</span><span class="situation-input">${reasonBracket(form.over1LateReason)}</span>`
    ),
    buildSituationRow(
      '（2）1の子について1歳を超えての育児休業をしたことが（休業予定含む）',
      `<span class="situation-ans-line">ない・ある→休業が必要な理由</span><span class="situation-input">${reasonBracket(form.over1PriorLeaveReason)}</span><span class="situation-ans-line">休業期間</span><span class="situation-input">${dateFill(escapeHtml(dateRangeLabel('', '')))}</span>`
    ),
    buildSituationRow(
      '（3）1の子について1歳を超えての育児休業の申出を撤回したことが',
      `<span class="situation-ans-line">ない・ある→再度休業の理由</span><span class="situation-input">${reasonBracket(form.over1WithdrawalReason)}</span>`
    ),
    buildSituationRow(
      '（4）1歳を超えての休業の申出の場合',
      `<span class="situation-ans-line">休業が必要な理由</span><span class="situation-input">${reasonBracket(form.leaveReasonOver1)}</span>`
    ),
    buildSituationRow(
      '（5）1歳を超えての育児休業の申出の場合で申出者が育児休業中でない場合',
      `<span class="situation-ans-line">配偶者が休業　${spouseStatus}</span><span class="situation-ans-line">配偶者の休業（予定）日</span><span class="situation-input">${dateFill(escapeHtml(dateLabel(form.spouseLeaveExpectedDate)))}</span>`
    ),
  ]);
}

const BIRTH_CHILD_ITEM5_LABEL =
  '（5）（1）の子が、特別養子縁組の監護期間中の子・養子縁組里親に委託されている子・養育里親として委託された子の場合、その手続きが完了した年月日';

function buildBirthSectionFieldRows(sectionNo, titleHtml, rows, titleRowspan = rows.length) {
  return rows
    .map(
      ([label, valueHtml], index) => `
      <tr>
        ${index === 0 ? `<td class="col-no" rowspan="${titleRowspan}">${sectionNo}</td>` : ''}
        ${index === 0 ? `<td class="col-title birth-title-cell" rowspan="${titleRowspan}">${titleHtml}</td>` : ''}
        <td class="birth-field-label">${label}</td>
        <td class="birth-field-value">${valueHtml}</td>
      </tr>`
    )
    .join('');
}

function buildBirthPeriodBlock(start, end, returnDate) {
  return `${escapeHtml(dateRangeLabel(start, end))}<br />（職場復帰予定日　${escapeHtml(dateLabel(returnDate, '令和'))}）`;
}

function buildBirthPeriodInnerTable(period1, period2, note) {
  return `<div class="birth-period-block">
    <div class="birth-period-part">${buildBirthPeriodBlock(period1.start, period1.end, period1.returnDate)}</div>
    <div class="birth-period-note">${escapeHtml(note)}</div>
    <div class="birth-period-part">${buildBirthPeriodBlock(period2.start, period2.end, period2.returnDate)}</div>
  </div>`;
}

function buildBirthHeader(form) {
  const dept = escapeHtml(form.department?.trim() || '');
  const applicant = escapeHtml(form.applicantName?.trim() || '');
  const recipient = escapeHtml(form.recipientName?.trim() || '');
  const recipientHtml = recipient
    ? `<span class="header-recipient-text">${recipient}</span>　殿`
    : '<span class="header-recipient-blank"></span>　殿';
  return `
    <div class="doc-header">
      <div class="doc-header-left birth-header-to">${recipientHtml}</div>
      <div class="doc-header-right">
        <div>［申出日］${escapeHtml(dateLabel(form.submitDate, '令和'))}</div>
        <div>［申出者］所属 ${dept || '　　　　　　'}　氏名 ${applicant || '　　　　　　'}</div>
      </div>
    </div>
    <p class="doc-intro">私は、育児・介護休業等に関する規則（第３条・第７条）に基づき、下記のとおり（出生時）育児休業の申出をします。</p>
    <div class="doc-ki">記</div>
  `;
}

function buildBirthChildcareBody(form) {
  return `
    ${buildBirthHeader(form)}
    <table class="main-form-table birth-form-table">
      <colgroup>
        <col class="birth-col-no" />
        <col class="birth-col-title" />
        <col class="birth-col-sub" />
        <col class="birth-col-body" />
      </colgroup>
      ${buildBirthSectionFieldRows('1', '休業に係る子の状況', [
        ['（1）氏名', textFill(form.childName)],
        ['（2）生年月日', dateFill(escapeHtml(dateLabel(form.childBirthDate, '令和')))],
        ['（3）本人との続柄', textFill(form.relationship)],
        ['（4）養子の場合、縁組成立の年月日', dateFill(escapeHtml(dateLabel(form.adoptionDate, '令和')))],
        [BIRTH_CHILD_ITEM5_LABEL, dateFill(escapeHtml(dateLabel(form.fosterCareProcedureDate, '令和')))],
      ])}
      ${buildBirthSectionFieldRows('2', '1の子が生まれていない場合の<br />出産予定者の状況', [
        ['氏名', textFill(form.expectedParentName)],
        ['出産予定日', dateFill(escapeHtml(dateLabel(form.expectedBirthDate, '令和')))],
        ['本人との続柄', textFill(form.expectedParentRelationship)],
      ])}
      <tr>
        <td class="col-no" rowspan="2">3</td>
        <td class="col-title birth-title-cell" rowspan="2">出生時育児休業<br />（産後パパ育休）</td>
        <td class="birth-sub-label">3-1<br />休業の期間</td>
        <td class="birth-period-wrap">
          ${buildBirthPeriodInnerTable(
            { start: form.leaveStartDate, end: form.leaveEndDate, returnDate: form.returnWorkDate },
            { start: form.leaveStartDate2, end: form.leaveEndDate2, returnDate: form.returnWorkDate2 },
            '※　出生時育児休業を２回に分割取得する場合は、１回目と２回目を一括で申し出ること'
          )}
        </td>
      </tr>
      <tr>
        <td class="birth-sub-label">3-2<br />申出に係る状況</td>
        <td class="situation-cell birth-situation-cell">${buildBirthSituationTable32(form)}</td>
      </tr>
      <tr>
        <td class="col-no" rowspan="2">4</td>
        <td class="col-title birth-title-cell" rowspan="2">1歳までの<br />育児休業</td>
        <td class="birth-sub-label">4-1<br />休業の期間</td>
        <td class="birth-period-wrap">
          ${buildBirthPeriodInnerTable(
            {
              start: form.under1LeaveStartDate,
              end: form.under1LeaveEndDate,
              returnDate: form.under1ReturnWorkDate,
            },
            {
              start: form.under1LeaveStartDate2,
              end: form.under1LeaveEndDate2,
              returnDate: form.under1ReturnWorkDate2,
            },
            '※　１回目と２回目を一括で申し出る場合と、２回目を後日申出する場合がある'
          )}
        </td>
      </tr>
      <tr>
        <td class="birth-sub-label">4-2<br />申出に係る状況</td>
        <td class="situation-cell birth-situation-cell">${buildBirthSituationTable42(form)}</td>
      </tr>
    </table>
    <div class="birth-page-break"></div>
    <table class="main-form-table birth-form-table birth-form-table-page2">
      <colgroup>
        <col class="birth-col-no" />
        <col class="birth-col-title" />
        <col class="birth-col-sub" />
        <col class="birth-col-body" />
      </colgroup>
      <tr>
        <td class="col-no" rowspan="2">5</td>
        <td class="col-title birth-title-cell" rowspan="2">1歳を超える<br />育児休業</td>
        <td class="birth-sub-label">5-1<br />休業の期間</td>
        <td class="period-cell birth-period-cell">${buildBirthPeriodBlock(form.over1LeaveStartDate, form.over1LeaveEndDate, form.over1ReturnWorkDate)}</td>
      </tr>
      <tr>
        <td class="birth-sub-label">5-2<br />申出に係る状況</td>
        <td class="situation-cell birth-situation-cell">${buildBirthSituationTable52(form)}</td>
      </tr>
    </table>
    <p class="doc-footnote birth-legal-note">（注）［第1項なお書き］（出生時）育児休業を2回に分割取得する場合は、2回目は2つの項目までしか申出できません。</p>
    <p class="doc-footnote birth-legal-note">（注）［第3項］1歳を超えての育児休業は、原則として1回のみです。1歳6か月まで延長する場合は、保育所等に入所できない等の事情が必要です。</p>
    <p class="doc-footnote">＜提出先＞直接提出や郵送のほか、電子メールでの提出も可能です。<br />人事部　メールアドレス：jinji@bitcross.co.jp</p>
  `;
}

const DOCUMENT_STYLES = `
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body {
    font-family: "MS Mincho", "Yu Mincho", "Yu Mincho UI", "Hiragino Mincho ProN", "Meiryo", serif;
    color: #000;
    margin: 0;
    font-size: 10.5pt;
    line-height: 1.5;
    padding: 0;
    background: #fff;
  }
  .page {
    width: 100%;
    max-width: 720px;
    margin: 0 auto;
    padding: 16mm 14mm 18mm;
    background: #fff;
    --form-split-col: 15.2em;
  }
  .doc-title {
    text-align: center;
    font-size: 15pt;
    font-weight: 700;
    letter-spacing: 0.2em;
    margin: 0 0 16px;
  }
  .doc-header {
    display: table;
    width: 100%;
    margin-bottom: 12px;
  }
  .doc-header-left,
  .doc-header-right {
    display: table-cell;
    vertical-align: top;
  }
  .doc-header-left { width: 40%; padding-top: 2px; }
  .doc-header-right { width: 60%; text-align: right; line-height: 1.75; }
  .birth-header-to {
    line-height: 1.75;
    white-space: nowrap;
  }
  .header-recipient-blank {
    display: inline-block;
    min-width: 14em;
    min-height: 1.2em;
    vertical-align: bottom;
  }
  .header-recipient-text {
    display: inline-block;
    min-height: 1.2em;
    vertical-align: bottom;
  }
  .doc-intro { margin: 0 0 8px; text-indent: 1em; }
  .doc-ki { text-align: center; font-weight: 700; margin: 6px 0 10px; letter-spacing: 0.5em; }
  .main-form-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .main-form-table td,
  .main-form-table th {
    border: 1px solid #000;
    vertical-align: top;
  }
  .main-form-table .col-no {
    width: 26px;
    text-align: center;
    vertical-align: middle;
    padding: 8px 2px;
    font-size: 10pt;
  }
  .main-form-table .col-title {
    width: 92px;
    vertical-align: middle;
    font-weight: 400;
    font-size: 9.5pt;
    line-height: 1.45;
    text-align: center;
    padding: 8px 4px;
  }
  .main-form-table .content-cell,
  .main-form-table .situation-cell {
    padding: 0;
    vertical-align: top;
    position: relative;
  }
  .main-form-table .content-cell::after,
  .main-form-table .situation-cell::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: var(--form-split-col);
    border-left: 1px solid #000;
    pointer-events: none;
  }
  .inner-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin: 0;
  }
  .inner-table col.sub-label-col {
    width: var(--form-split-col);
  }
  .inner-table col.sub-value-col {
    width: auto;
  }
  .inner-table td {
    border-top: none;
    border-left: none;
    border-right: none;
    border-bottom: 1px solid #000;
    padding: 7px 0;
    vertical-align: middle;
    height: auto;
  }
  .inner-table td.sub-label {
    width: var(--form-split-col);
    max-width: var(--form-split-col);
  }
  .inner-table td.sub-value {
    width: auto;
  }
  .inner-table tr:last-child td {
    border-bottom: none;
  }
  .sub-label {
    padding: 0 8px 0 10px;
    font-size: 10pt;
    line-height: 1.35;
    vertical-align: middle;
  }
  .sub-value {
    padding: 0 10px;
    font-size: 10pt;
    line-height: 1.35;
    vertical-align: middle;
  }
  .fill-blank {
    display: inline-block;
    width: 100%;
    min-height: 1.2em;
    vertical-align: middle;
  }
  .fill-value {
    display: inline-block;
    width: 100%;
    line-height: 1.35;
    vertical-align: middle;
  }
  .fill-date {
    display: inline;
    line-height: 1.35;
    vertical-align: middle;
  }
  .period-cell {
    padding: 10px 12px !important;
    line-height: 1.85;
    min-height: 56px;
    font-size: 10pt;
  }
  .situation-cell {
    padding: 0 !important;
    vertical-align: top;
  }
  .situation-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin: 0;
  }
  .situation-table col.situation-desc-col {
    width: var(--form-split-col);
  }
  .situation-table col.situation-ans-col {
    width: auto;
  }
  .situation-table td {
    border-top: none;
    border-left: none;
    border-right: none;
    border-bottom: 1px solid #000;
    padding: 6px 8px;
    vertical-align: top;
    font-size: 9.5pt;
    line-height: 1.45;
  }
  .situation-table td.situation-desc {
    width: var(--form-split-col);
    max-width: var(--form-split-col);
  }
  .situation-table tr:last-child td {
    border-bottom: none;
  }
  .situation-desc {
    vertical-align: top;
  }
  .situation-ans {
    overflow: hidden;
    word-wrap: break-word;
    overflow-wrap: anywhere;
  }
  .situation-note {
    display: block;
    font-size: 9pt;
    line-height: 1.4;
    margin-top: 2px;
  }
  .situation-ans-line {
    display: block;
    margin: 0;
    line-height: 1.45;
  }
  .situation-ans-line + .situation-ans-line {
    margin-top: 2px;
  }
  .situation-input {
    display: block;
    margin-top: 4px;
    max-width: 100%;
    overflow: hidden;
  }
  .reason-bracket {
    display: flex;
    width: 100%;
    max-width: 100%;
    align-items: flex-end;
    line-height: 1.35;
    box-sizing: border-box;
  }
  .reason-bracket-l,
  .reason-bracket-r {
    flex: 0 0 auto;
  }
  .reason-bracket-body {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 1.2em;
    border-bottom: 1px solid #000;
    padding-bottom: 1px;
  }
  .doc-footnote { margin-top: 10px; font-size: 9pt; line-height: 1.6; }
  .birth-doc-all { max-width: none; padding: 12mm 10mm 14mm; overflow: visible; }
  .birth-form-table col.birth-col-no { width: 26px; }
  .birth-form-table col.birth-col-title { width: 72px; }
  .birth-form-table {
    --form-field-label-col: 10em;
    --form-split-body: 15.2em;
  }
  .birth-form-table col.birth-col-sub { width: var(--form-field-label-col); }
  .birth-form-table col.birth-col-body { width: auto; }
  .birth-form-table .birth-title-cell {
    text-align: center;
    vertical-align: middle;
    font-size: 9pt;
    line-height: 1.4;
    padding: 6px 3px;
  }
  .birth-form-table .birth-field-label {
    padding: 6px 4px 6px 6px;
    font-size: 9.5pt;
    line-height: 1.4;
    vertical-align: top;
  }
  .birth-form-table .birth-field-value {
    padding: 6px 10px 6px 12px;
    font-size: 10pt;
    line-height: 1.35;
    vertical-align: middle;
  }
  .birth-form-table .birth-sub-label {
    text-align: center;
    vertical-align: middle;
    font-size: 9pt;
    line-height: 1.35;
    padding: 6px 3px;
    font-weight: 400;
  }
  .birth-form-table .birth-period-wrap {
    padding: 8px 10px !important;
    vertical-align: top;
    line-height: 1.8;
    font-size: 10pt;
  }
  .birth-period-block {
    margin: 0;
    padding: 0;
  }
  .birth-period-block .birth-period-part {
    margin: 0;
    padding: 0;
    line-height: 1.8;
  }
  .birth-period-block .birth-period-part + .birth-period-note {
    margin: 0 -10px;
    padding: 6px 10px 0;
    border-top: 1px solid #000;
  }
  .birth-period-block .birth-period-note + .birth-period-part {
    margin-top: 6px;
  }
  .birth-period-block .birth-period-note {
    margin: 0;
    font-size: 8.5pt;
    line-height: 1.45;
  }
  .birth-form-table .birth-period-cell {
    padding: 8px 10px !important;
    line-height: 1.8;
    min-height: 48px;
  }
  .birth-form-table .birth-situation-cell {
    padding: 0 !important;
    position: relative;
  }
  .birth-form-table .birth-situation-cell::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: var(--form-split-body);
    border-left: 1px solid #000;
    pointer-events: none;
  }
  .birth-form-table .birth-situation-cell .situation-table col.situation-desc-col {
    width: var(--form-split-body);
  }
  .birth-form-table .birth-situation-cell .situation-table td.situation-desc {
    width: var(--form-split-body);
    max-width: var(--form-split-body);
  }
  .birth-form-table-page2 { margin-top: 0; }
  .birth-page-break {
    page-break-before: always;
    break-before: page;
    height: 0;
    margin: 0;
  }
  .birth-legal-note { margin-top: 6px; }
  .birth-continued-no,
  .birth-continued-title {
    border-top: none;
    padding: 0;
    background: #fff;
  }
  @media screen {
    html, body {
      height: auto;
      min-height: 0;
      overflow: hidden;
    }
    .birth-doc-all {
      padding-bottom: 8mm;
    }
    .birth-page-break {
      page-break-before: auto;
      break-before: auto;
    }
  }
  @media print {
    body { padding: 0; }
    .page { padding: 12mm 10mm; max-width: none; }
    .birth-page-break { page-break-before: always; break-before: page; }
  }
`;

function formatDeptSection(department, section) {
  const dept = department?.trim() || '　　　　';
  const sec = section?.trim() || '　　　　';
  const deptSuffix = dept.endsWith('部') ? '' : '部';
  return `${escapeHtml(dept)}${deptSuffix}　${escapeHtml(sec)}課`;
}

function buildMaleChildcareBody(form) {
  const applicant = escapeHtml(form.applicantName?.trim() || '');

  return `
    <div class="doc-header">
      <div class="doc-header-left">人事部長　殿</div>
      <div class="doc-header-right">
        <div>［申出日］${escapeHtml(dateLabel(form.submitDate, '令和'))}</div>
        <div>［申出者］${formatDeptSection(form.department, form.section)}</div>
        <div>氏　名　${applicant || '　　　　　　　'}</div>
      </div>
    </div>
    <p class="doc-intro">私は、育児・介護休業等に関する規則（第3条）に基づき、下記のとおり育児休業の申出をします。</p>
    <div class="doc-ki">記</div>
    <table class="main-form-table">
      <tr>
        <td class="col-no">1</td>
        <td class="col-title">休業に係る子の状況</td>
        <td class="content-cell">
          ${buildInnerTable([
            buildSubRow('（1）氏名', textFill(form.childName)),
            buildSubRow('（2）生年月日', dateFill(escapeHtml(dateLabel(form.childBirthDate, '令和')))),
            buildSubRow('（3）本人との続柄', textFill(form.relationship)),
            buildSubRow('（4）養子の場合、縁組成立の年月日', dateFill(escapeHtml(dateLabel(form.adoptionDate)))),
          ])}
        </td>
      </tr>
      <tr>
        <td class="col-no">2</td>
        <td class="col-title">1の子が生まれていない場合の出産予定者の状況</td>
        <td class="content-cell">
          ${buildInnerTable([
            buildSubRow('（1）氏名', textFill(form.expectedParentName)),
            buildSubRow('（2）出産予定日', dateFill(escapeHtml(dateLabel(form.expectedBirthDate, '令和')))),
            buildSubRow('（3）本人との続柄', textFill(form.expectedParentRelationship)),
          ])}
        </td>
      </tr>
      <tr>
        <td class="col-no">3</td>
        <td class="col-title">休業の期間</td>
        <td class="period-cell">
          ${escapeHtml(dateRangeLabel(form.leaveStartDate, form.leaveEndDate))}<br />
          （職場復帰予定日　${escapeHtml(dateLabel(form.returnWorkDate, '令和'))}）
        </td>
      </tr>
      <tr>
        <td class="col-no">4</td>
        <td class="col-title">申出に係る状況</td>
        <td class="situation-cell">
          ${buildMaleSituationTable(form)}
        </td>
      </tr>
    </table>
    <p class="doc-footnote">（注）期間契約従業員が「育児・介護休業等に関する規則」第3条第1項なお書きの申出をする場合は、3のみの記入で足ります。</p>
  `;
}

export function buildChildcareLeaveHtml(employee, form) {
  const isBirth = form.formType === 'BIRTH_CHILDCARE';
  const title = isBirth ? '（出生時）育児休業申出書' : '育児休業申出書';
  const body = isBirth ? buildBirthChildcareBody(form) : buildMaleChildcareBody(form);

  const pageClass = isBirth ? 'page birth-doc-all' : 'page';

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)} - ${escapeHtml(employee?.name ?? '')}</title>
  <style>${DOCUMENT_STYLES}</style>
</head>
<body>
  <div class="${pageClass}">
    <h1 class="doc-title">${escapeHtml(title)}</h1>
    ${body}
  </div>
</body>
</html>`;
}
export function extractFirstReturnDate(form) {
  if (form.formType === 'BIRTH_CHILDCARE') {
    const candidates = [form.returnWorkDate, form.returnWorkDate2].filter(Boolean);
    return candidates[0] ?? null;
  }
  return form.returnWorkDate || null;
}

export function detectFormTypeFromFileName(filename = '') {
  const name = filename.toLowerCase();
  if (name.includes('出生時') || name.includes('産後パパ') || name.includes('出生时')) {
    return 'BIRTH_CHILDCARE';
  }
  if (name.includes('男性') || name.includes('育児休業申出')) {
    return 'MALE_CHILDCARE';
  }
  return 'MALE_CHILDCARE';
}

export function detectFormTypeFromText(text = '') {
  if (/（出生時）|出生時育児|産後パパ/.test(text)) {
    return 'BIRTH_CHILDCARE';
  }
  return 'MALE_CHILDCARE';
}

export function isPendingApplicationFile(file) {
  const name = (file?.originalName ?? '').toLowerCase();
  return name.endsWith('.docx');
}

export function applicationFileMatchesEmployee(filename, employee) {
  if (!employee) return false;
  const base = String(filename ?? '').toLowerCase();
  const code = employee.employeeCode?.trim()?.toLowerCase();
  const name = employee.name?.trim();
  if (code && base.includes(code)) return true;
  if (name && base.includes(name.toLowerCase())) return true;
  return false;
}

export function fileMatchesFormType(filename, formType) {
  return detectFormTypeFromFileName(filename) === formType;
}

/** 社員・申請書種別に一致する未処理ファイル（新しい順） */
export function findPendingApplicationsForEmployee(pendingFiles, employee, formType) {
  if (!employee || !formType) return [];
  return (pendingFiles ?? [])
    .filter(
      (file) =>
        applicationFileMatchesEmployee(file.originalName, employee) &&
        fileMatchesFormType(file.originalName, formType)
    )
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
}

function parseIsoDateFromText(text, afterKeyword, { maxLen = 48 } = {}) {
  const idx = text.indexOf(afterKeyword);
  if (idx < 0) return '';
  let slice = text.slice(idx + afterKeyword.length, idx + afterKeyword.length + maxLen);
  slice = slice.split(/[\n\r（(]/)[0] ?? '';
  const iso = slice.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (iso) {
    return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`;
  }
  return '';
}

function parseReturnDatesFromText(text) {
  const dates = [];
  const re = /職場復帰予定日[^\d]{0,20}(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    dates.push(
      `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`
    );
  }
  return dates;
}

/** docx からフォームへ可能な限り値を抽出 */
export function parseTextToChildcareForm(text, formType, employee) {
  const resolvedType = detectFormTypeFromText(text) || formType;
  const form = createInitialChildcareForm(resolvedType);
  if (employee) {
    form.applicantName = employee.name ?? '';
    form.department = employee.departmentName ?? '';
  }

  const returnDates = parseReturnDatesFromText(text);
  if (returnDates[0]) form.returnWorkDate = returnDates[0];
  if (resolvedType === 'BIRTH_CHILDCARE' && returnDates[1]) form.returnWorkDate2 = returnDates[1];

  const submit = parseIsoDateFromText(text, '申出日');
  if (submit) form.submitDate = submit;

  const childBirth = parseIsoDateFromText(text, '生年月日');
  if (childBirth) form.childBirthDate = childBirth;

  const expectedBirth = parseIsoDateFromText(text, '出産予定日');
  if (expectedBirth && expectedBirth !== form.returnWorkDate) {
    form.expectedBirthDate = expectedBirth;
  }

  if (resolvedType === 'MALE_CHILDCARE') {
    form.leaveStartDate2 = '';
    form.leaveEndDate2 = '';
    form.returnWorkDate2 = '';
  }

  const adoption = parseIsoDateFromText(text, '縁組成立の年月日');
  if (adoption) form.adoptionDate = adoption;

  const spouseLeave = parseIsoDateFromText(text, '配偶者の休業開始（予定）日');
  if (spouseLeave) form.spouseLeaveStartDate = spouseLeave;

  return form;
}

export async function parseDocxBlobToForm(blob, formType, employee) {
  const { default: mammoth } = await import('mammoth');
  const arrayBuffer = await blob.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value ?? '';
  const resolvedType = detectFormTypeFromText(text) || formType;
  return { ...parseTextToChildcareForm(text, resolvedType, employee) };
}

export function prefillChildcareFormFromEmployee(form, employee) {
  if (!employee) return form;
  return {
    ...form,
    applicantName: form.applicantName || employee.name || '',
    department: form.department || employee.departmentName || '',
  };
}

export function buildChildcareLeaveFileName(employee, form) {
  const code = employee?.employeeCode?.trim() || 'employee';
  return `${code}_${formTypeLabel(form.formType)}.pdf`;
}

export async function finalizeChildcareLeaveApplication(api, { employee, form, sourceFileId }) {
  if (!employee?.id) {
    throw new Error('対象社員を特定できません');
  }
  const returnDate = extractFirstReturnDate(form);
  if (!returnDate) {
    throw new Error('職場復帰予定日を入力してください');
  }

  const html = buildChildcareLeaveHtml(employee, form);
  const fileName = buildChildcareLeaveFileName(employee, form);
  const pdfSelector = form.formType === 'BIRTH_CHILDCARE' ? '.birth-doc-all' : '.page';
  const pdfBlob = await renderHtmlToPdfBlob(html, { selector: pdfSelector });
  const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

  await api.uploadFile(file, {
    category: 'APPLICATION',
    description: `${employee.name} ${formTypeLabel(form.formType)}`,
  });

  const detail = await api.getEmployeeDetail(employee.id);
  const payload = formToSavePayload({
    ...detailToForm(detail),
    workStatus: '休業',
    endDate: returnDate,
  });
  await api.updateEmployee(employee.id, payload);

  if (sourceFileId) {
    await api.deleteFile(sourceFileId);
  }

  return { returnDate, fileName };
}
