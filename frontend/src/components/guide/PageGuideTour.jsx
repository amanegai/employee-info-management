import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePageGuide } from '../../context/PageGuideContext';
import { PAGE_GUIDES } from '../../guide/pageGuides';
import {
  clearTargetScrollMargin,
  computePopoverStyle,
  measureElementRect,
  scrollTargetIntoView,
} from './pageGuideScroll';

const EMPTY_RECT = { top: 0, left: 0, width: 0, height: 0 };
const REMEASURE_DELAYS = [0, 80, 200, 450, 750];

export default function PageGuideTour() {
  const { isActive, activeGuideId, stepIndex, steps, closeGuide, nextStep, prevStep } = usePageGuide();
  const [spotlight, setSpotlight] = useState(null);
  const targetRef = useRef(null);
  const timersRef = useRef([]);

  const step = steps[stepIndex];
  const guideTitle = activeGuideId ? PAGE_GUIDES[activeGuideId]?.title : '';
  const isLast = stepIndex >= steps.length - 1;
  const isFirst = stepIndex === 0;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const updateSpotlight = useCallback(() => {
    if (!step) {
      setSpotlight(null);
      return;
    }
    setSpotlight(measureElementRect(step.target));
  }, [step]);

  const focusTarget = useCallback(() => {
    clearTimers();
    if (targetRef.current) {
      clearTargetScrollMargin(targetRef.current);
      targetRef.current = null;
    }

    if (!isActive || !step?.target) {
      updateSpotlight();
      return;
    }

    const el = document.querySelector(step.target);
    if (!el) {
      targetRef.current = null;
      setSpotlight(null);
      return;
    }

    targetRef.current = el;
    scrollTargetIntoView(el, { behavior: 'smooth' });

    REMEASURE_DELAYS.forEach((delay) => {
      const id = window.setTimeout(() => {
        setSpotlight(measureElementRect(step.target));
      }, delay);
      timersRef.current.push(id);
    });
  }, [isActive, step, updateSpotlight, clearTimers]);

  useLayoutEffect(() => {
    focusTarget();
    return () => clearTimers();
  }, [focusTarget, stepIndex, clearTimers]);

  useEffect(() => {
    if (!isActive) return undefined;
    function onResize() {
      updateSpotlight();
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [isActive, updateSpotlight]);

  useEffect(() => {
    if (!isActive) {
      if (targetRef.current) {
        clearTargetScrollMargin(targetRef.current);
        targetRef.current = null;
      }
      return undefined;
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        closeGuide();
      } else if (event.key === 'ArrowRight' && !isLast) {
        nextStep();
      } else if (event.key === 'ArrowLeft' && !isFirst) {
        prevStep();
      }
    }

    document.body.classList.add('page-guide-is-open');
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('page-guide-is-open');
      window.removeEventListener('keydown', onKeyDown);
      if (targetRef.current) {
        clearTargetScrollMargin(targetRef.current);
        targetRef.current = null;
      }
    };
  }, [isActive, closeGuide, nextStep, prevStep, isFirst, isLast]);

  if (!isActive || !step) return null;

  const pad = 8;
  const spot = spotlight ?? EMPTY_RECT;
  const hasSpotlight = Boolean(spotlight && step.target);
  const popoverStyle = hasSpotlight ? computePopoverStyle(spot) : undefined;

  return createPortal(
    <div className="page-guide-root" role="presentation">
      <button
        type="button"
        className="page-guide-backdrop"
        aria-label="ガイドを閉じる"
        onClick={closeGuide}
      />
      {hasSpotlight && (
        <div
          className="page-guide-spotlight"
          style={{
            top: spot.top - pad,
            left: spot.left - pad,
            width: spot.width + pad * 2,
            height: spot.height + pad * 2,
          }}
          aria-hidden="true"
        />
      )}
      <div
        className={`page-guide-popover${hasSpotlight ? '' : ' is-centered'}`}
        style={popoverStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="page-guide-title"
      >
        <div className="page-guide-popover-header">
          <span className="page-guide-popover-badge">
            {stepIndex + 1} / {steps.length}
          </span>
          {guideTitle && <span className="page-guide-popover-guide-title">{guideTitle}</span>}
          <button
            type="button"
            className="btn-close page-guide-popover-close"
            aria-label="ガイドを終了"
            onClick={closeGuide}
          />
        </div>
        <h2 id="page-guide-title" className="page-guide-popover-title">
          {step.title}
        </h2>
        <div className="page-guide-popover-body">
          {step.body.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        {!hasSpotlight && step.target && (
          <p className="page-guide-popover-missing small text-muted mb-2">
            該当する画面要素が見つかりません。表示を確認してから次へ進んでください。
          </p>
        )}
        <div className="page-guide-popover-footer">
          <button type="button" className="btn btn-link btn-sm page-guide-skip" onClick={closeGuide}>
            スキップ
          </button>
          <div className="page-guide-popover-nav">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm app-btn"
              disabled={isFirst}
              onClick={prevStep}
            >
              戻る
            </button>
            <button type="button" className="btn btn-primary btn-sm app-btn" onClick={nextStep}>
              {isLast ? '完了' : '次へ'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
