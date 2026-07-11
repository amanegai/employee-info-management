import { usePageGuide } from '../../context/PageGuideContext';
import { PAGE_GUIDES } from '../../guide/pageGuides';

export default function PageGuideHelpButton({ guideId, className = '' }) {
  const { startGuide, isActive, activeGuideId } = usePageGuide();
  const hasGuide = Boolean(PAGE_GUIDES[guideId]);
  if (!hasGuide) return null;

  const running = isActive && activeGuideId === guideId;

  return (
    <button
      type="button"
      className={`page-guide-help-btn${running ? ' is-active' : ''} ${className}`.trim()}
      onClick={() => startGuide(guideId)}
      aria-label="この画面の操作ガイドを開始"
      title="操作ガイド"
    >
      <i className="bi bi-question-circle" aria-hidden="true" />
      <span className="page-guide-help-btn-label">ガイド</span>
    </button>
  );
}
