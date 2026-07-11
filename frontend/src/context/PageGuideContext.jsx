import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { PAGE_GUIDES } from '../guide/pageGuides';

const PageGuideContext = createContext(null);

export function PageGuideProvider({ children }) {
  const [activeGuideId, setActiveGuideId] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = useMemo(() => {
    if (!activeGuideId) return [];
    return PAGE_GUIDES[activeGuideId]?.steps ?? [];
  }, [activeGuideId]);

  const startGuide = useCallback((guideId) => {
    if (!PAGE_GUIDES[guideId]) {
      console.warn(`[PageGuide] Unknown guide: ${guideId}`);
      return;
    }
    setActiveGuideId(guideId);
    setStepIndex(0);
  }, []);

  const closeGuide = useCallback(() => {
    setActiveGuideId(null);
    setStepIndex(0);
  }, []);

  const nextStep = useCallback(() => {
    setStepIndex((index) => {
      if (index >= steps.length - 1) {
        setActiveGuideId(null);
        return 0;
      }
      return index + 1;
    });
  }, [steps.length]);

  const prevStep = useCallback(() => {
    setStepIndex((index) => Math.max(0, index - 1));
  }, []);

  const value = useMemo(
    () => ({
      activeGuideId,
      stepIndex,
      steps,
      isActive: activeGuideId != null && steps.length > 0,
      startGuide,
      closeGuide,
      nextStep,
      prevStep,
    }),
    [activeGuideId, stepIndex, steps, startGuide, closeGuide, nextStep, prevStep]
  );

  return <PageGuideContext.Provider value={value}>{children}</PageGuideContext.Provider>;
}

export function usePageGuide() {
  const ctx = useContext(PageGuideContext);
  if (!ctx) {
    throw new Error('usePageGuide must be used within PageGuideProvider');
  }
  return ctx;
}
