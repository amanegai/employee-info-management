const VIEWPORT_PADDING = 72;

/** 可滚动祖先（由内到外） */
export function getScrollableAncestors(element) {
  const ancestors = [];
  let parent = element.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = window.getComputedStyle(parent);
    const { overflowY, overflowX, overflow } = style;
    const scrollable = /(auto|scroll|overlay)/.test(`${overflowY} ${overflowX} ${overflow}`);
    if (scrollable && (parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth)) {
      ancestors.push(parent);
    }
    parent = parent.parentElement;
  }
  return ancestors;
}

function scrollWithinContainer(container, element, behavior) {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  let deltaTop = 0;
  let deltaLeft = 0;

  if (elementRect.top < containerRect.top + VIEWPORT_PADDING) {
    deltaTop = elementRect.top - containerRect.top - VIEWPORT_PADDING;
  } else if (elementRect.bottom > containerRect.bottom - VIEWPORT_PADDING) {
    deltaTop = elementRect.bottom - containerRect.bottom + VIEWPORT_PADDING;
  }

  if (elementRect.left < containerRect.left + 16) {
    deltaLeft = elementRect.left - containerRect.left - 16;
  } else if (elementRect.right > containerRect.right - 16) {
    deltaLeft = elementRect.right - containerRect.right + 16;
  }

  if (deltaTop !== 0) {
    container.scrollBy({ top: deltaTop, left: 0, behavior });
  }
  if (deltaLeft !== 0) {
    container.scrollBy({ top: 0, left: deltaLeft, behavior });
  }
}

/** 将目标滚入视口（窗口 + 内部滚动区域） */
export function scrollTargetIntoView(element, { behavior = 'smooth' } = {}) {
  if (!element) return;

  element.style.scrollMargin = `${VIEWPORT_PADDING}px`;

  const rectBefore = element.getBoundingClientRect();
  const block = rectBefore.height > window.innerHeight * 0.55 ? 'start' : 'center';

  element.scrollIntoView({
    behavior,
    block,
    inline: 'nearest',
  });

  const ancestors = getScrollableAncestors(element);
  for (const container of ancestors) {
    scrollWithinContainer(container, element, behavior);
  }

  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  let scrollTop = 0;
  let scrollLeft = 0;

  if (rect.top < VIEWPORT_PADDING) {
    scrollTop = rect.top - VIEWPORT_PADDING;
  } else if (rect.bottom > viewportHeight - VIEWPORT_PADDING) {
    scrollTop = rect.bottom - viewportHeight + VIEWPORT_PADDING;
  }

  if (rect.left < 16) {
    scrollLeft = rect.left - 16;
  } else if (rect.right > viewportWidth - 16) {
    scrollLeft = rect.right - viewportWidth + 16;
  }

  if (scrollTop !== 0 || scrollLeft !== 0) {
    window.scrollBy({ top: scrollTop, left: scrollLeft, behavior });
  }
}

export function clearTargetScrollMargin(element) {
  if (element) {
    element.style.scrollMargin = '';
  }
}

export function measureElementRect(selector) {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width < 1 && rect.height < 1) return null;
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

const POPOVER_EST_HEIGHT = 240;
const POPOVER_WIDTH = 360;

/** 根据高亮区域计算弹窗位置，保证在视口内 */
export function computePopoverStyle(spotlightRect) {
  if (!spotlightRect) return undefined;

  const pad = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxWidth = Math.min(POPOVER_WIDTH, vw - 32);

  const spaceBelow = vh - (spotlightRect.top + spotlightRect.height);
  const spaceAbove = spotlightRect.top;
  const placeBelow = spaceBelow >= POPOVER_EST_HEIGHT + pad || spaceBelow >= spaceAbove;

  let top;
  if (placeBelow) {
    top = spotlightRect.top + spotlightRect.height + pad;
    if (top + POPOVER_EST_HEIGHT > vh - 16) {
      top = Math.max(16, vh - POPOVER_EST_HEIGHT - 16);
    }
  } else {
    top = spotlightRect.top - POPOVER_EST_HEIGHT - pad;
    if (top < 16) {
      top = 16;
    }
  }

  let left = spotlightRect.left;
  if (left + maxWidth > vw - 16) {
    left = vw - maxWidth - 16;
  }
  left = Math.max(16, left);

  return {
    top,
    left,
    maxWidth,
  };
}
