import { Fragment } from 'react';
import {
  candidateStageLabel,
  getCandidateProgressIndex,
  isCandidateTerminalClosed,
  CANDIDATE_PROGRESS_STEPS,
} from '../utils/projectWorkflow';

function stepState(index, stage, currentIndex) {
  if (stage === 'CONFIRMED') {
    return 'completed';
  }
  if (isCandidateTerminalClosed(stage)) {
    return 'closed';
  }
  if (index < currentIndex) {
    return 'completed';
  }
  if (index === currentIndex) {
    return 'current';
  }
  return 'upcoming';
}

function connectorDone(index, stage, currentIndex) {
  if (stage === 'CONFIRMED') {
    return true;
  }
  if (isCandidateTerminalClosed(stage)) {
    return index <= currentIndex && currentIndex >= 0;
  }
  return index <= currentIndex && currentIndex >= 0;
}

export default function CandidateStageProgress({ stage, compact = false }) {
  const currentIndex = getCandidateProgressIndex(stage);
  const isClosed = isCandidateTerminalClosed(stage);
  const isConfirmed = stage === 'CONFIRMED';
  const showChip = currentIndex >= 0 || isConfirmed || isClosed;

  return (
    <div className="candidate-progress-wrap">
      <div
        className={[
          'candidate-progress',
          compact && 'candidate-progress--compact',
          isConfirmed && 'candidate-progress--confirmed',
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
                isConfirmed && 'is-success',
                isClosed && 'is-muted',
                !isConfirmed && !isClosed && 'is-active',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {candidateStageLabel(stage)}
            </div>
          ) : null}
        </div>

        <div
          className="candidate-progress__flow"
          role="group"
          aria-label={`選考進捗: ${candidateStageLabel(stage)}`}
        >
          {CANDIDATE_PROGRESS_STEPS.map((step, index) => {
            const state = stepState(index, stage, currentIndex);
            const doneConnector = index > 0 && connectorDone(index, stage, currentIndex);

            return (
              <Fragment key={step.key}>
                {index > 0 && (
                  <span
                    className={`candidate-progress__connector${doneConnector ? ' is-done' : ''}`}
                    aria-hidden="true"
                  />
                )}
                <div
                  className={`candidate-progress__item is-${state}`}
                  title={step.label}
                >
                  <span className="candidate-progress__marker" aria-hidden="true">
                    {state === 'completed' || isConfirmed ? (
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
