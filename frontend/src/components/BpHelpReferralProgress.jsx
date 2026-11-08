import { Fragment } from 'react';

export const BP_REFERRAL_PROGRESS_STEPS = [
  { key: 'PENDING', label: '担当確認', shortLabel: '担当確認', icon: 'bi-person-check' },
  { key: 'APPROVED', label: '社内承認', shortLabel: '社内承認', icon: 'bi-check2-circle' },
  { key: 'SUBMITTED', label: '顧客提出', shortLabel: '顧客提出', icon: 'bi-send' },
  { key: 'INTERVIEW', label: '面談', shortLabel: '面談', icon: 'bi-calendar-event' },
  { key: 'HIRED', label: '採用確定', shortLabel: '採用確定', icon: 'bi-trophy' },
];

export const BP_REFERRAL_STATUS_LABELS = {
  PENDING: '担当確認待ち',
  APPROVED: '社内承認済',
  REJECTED: '却下',
  SUBMITTED: '顧客提出済',
  INTERVIEW_SCHEDULED: '面談調整中',
  INTERVIEWING: '面談結果待ち',
  HIRED: '採用確定',
  CLIENT_REJECTED: '顧客不採用',
  DECLINED: '辞退',
  WITHDRAWN: '取下げ',
};

export function bpReferralStatusLabel(status) {
  return BP_REFERRAL_STATUS_LABELS[status] ?? status ?? '—';
}

export function isBpReferralTerminalClosed(status) {
  return status === 'REJECTED'
    || status === 'WITHDRAWN'
    || status === 'CLIENT_REJECTED'
    || status === 'DECLINED';
}

export function getBpReferralProgressIndex(status) {
  switch (status) {
    case 'PENDING':
    case 'REJECTED':
    case 'WITHDRAWN':
      return 0;
    case 'APPROVED':
      return 1;
    case 'SUBMITTED':
      return 2;
    case 'INTERVIEW_SCHEDULED':
    case 'INTERVIEWING':
    case 'CLIENT_REJECTED':
    case 'DECLINED':
      return 3;
    case 'HIRED':
      return 4;
    default:
      return -1;
  }
}

function stepState(index, status, currentIndex) {
  if (status === 'HIRED') return 'completed';
  if (isBpReferralTerminalClosed(status)) return 'closed';
  if (index < currentIndex) return 'completed';
  if (index === currentIndex) return 'current';
  return 'upcoming';
}

function connectorDone(index, status, currentIndex) {
  if (status === 'HIRED') return true;
  if (isBpReferralTerminalClosed(status)) {
    return index <= currentIndex && currentIndex >= 0;
  }
  return index <= currentIndex && currentIndex >= 0;
}

export default function BpHelpReferralProgress({ status, compact = true }) {
  const currentIndex = getBpReferralProgressIndex(status);
  const isClosed = isBpReferralTerminalClosed(status);
  const isHired = status === 'HIRED';
  const showChip = currentIndex >= 0 || isHired || isClosed;

  return (
    <div className="candidate-progress-wrap bp-referral-progress-wrap">
      <div
        className={[
          'candidate-progress',
          compact && 'candidate-progress--compact',
          isHired && 'candidate-progress--confirmed',
          isClosed && 'candidate-progress--closed',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="candidate-progress__chip-slot" aria-hidden={!showChip}>
          {showChip ? (
            <div
              className={[
                'candidate-progress__chip',
                isHired && 'is-success',
                isClosed && 'is-muted',
                !isHired && !isClosed && 'is-active',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {bpReferralStatusLabel(status)}
            </div>
          ) : null}
        </div>

        <div
          className="candidate-progress__flow"
          role="group"
          aria-label={`臨時候補進捗: ${bpReferralStatusLabel(status)}`}
        >
          {BP_REFERRAL_PROGRESS_STEPS.map((step, index) => {
            const state = stepState(index, status, currentIndex);
            const doneConnector = index > 0 && connectorDone(index, status, currentIndex);

            return (
              <Fragment key={step.key}>
                {index > 0 && (
                  <span
                    className={`candidate-progress__connector${doneConnector ? ' is-done' : ''}`}
                    aria-hidden="true"
                  />
                )}
                <div className={`candidate-progress__item is-${state}`} title={step.label}>
                  <span className="candidate-progress__marker" aria-hidden="true">
                    {state === 'completed' || isHired ? (
                      <i className="bi bi-check-lg" />
                    ) : state === 'current' ? (
                      <i className={`bi ${step.icon}`} />
                    ) : (
                      <span className="candidate-progress__marker-dot" />
                    )}
                  </span>
                  <span className="candidate-progress__text">{step.shortLabel}</span>
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
