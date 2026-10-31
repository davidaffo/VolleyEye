import { session as matchState } from "../../../js/globals.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { session as browserEffectsState } from "../../app/browser-effects.js";
import { getMobileActiveScope } from "../live/flow-model.js";

export function isDesktopCourtModalLayout() {
  if (matchState.state.forceMobileLayout) return false;
  if (document.body && document.body.classList.contains("force-mobile")) return false;
  if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return false;
  return true;
}

export function ensureGlobalModalScrim() {
  scoutUiState.globalModalScrim = document.getElementById("global-modal-scrim");
}

export function setCourtAreaLocked(isLocked) {
  const courtArea = document.querySelector("#court-area") || document.querySelector(".players-area");
  if (!courtArea) return;
  if (isLocked) {
    if (scoutUiState.lockedCourtAreaHeight === null) {
      const playerEl = courtArea.querySelector("#players-container");
      const actionsEls = Array.from(courtArea.querySelectorAll(".court-actions-bar"));
      const gapValue = window.getComputedStyle(courtArea).gap || "0px";
      const gap = parseFloat(gapValue) || 0;
      const getOuterHeight = el => {
        if (!el) return 0;
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);
        const marginTop = parseFloat(styles.marginTop) || 0;
        const marginBottom = parseFloat(styles.marginBottom) || 0;
        return rect.height + marginTop + marginBottom;
      };
      if (playerEl && actionsEls.length) {
        const actionsHeight = actionsEls.reduce((sum, el) => sum + getOuterHeight(el), 0);
        const itemsCount = (playerEl ? 1 : 0) + actionsEls.length;
        const gapCount = Math.max(0, itemsCount - 1);
        scoutUiState.lockedCourtAreaHeight = Math.ceil(getOuterHeight(playerEl) + actionsHeight + gap * gapCount);
      } else {
        scoutUiState.lockedCourtAreaHeight = courtArea.offsetHeight || null;
      }
    }
    if (scoutUiState.lockedCourtAreaHeight) {
      courtArea.style.height = `${scoutUiState.lockedCourtAreaHeight}px`;
      courtArea.style.minHeight = `${scoutUiState.lockedCourtAreaHeight}px`;
      courtArea.style.maxHeight = `${scoutUiState.lockedCourtAreaHeight}px`;
    }
  } else {
    courtArea.style.height = "";
    courtArea.style.minHeight = "";
    courtArea.style.maxHeight = "";
    scoutUiState.lockedCourtAreaHeight = null;
  }
}

export function setModalOpenState(isOpen, forcePopup = false) {
  const useCourt = isDesktopCourtModalLayout() && !forcePopup;
  if (typeof document !== "undefined" && document.body) {
    document.body.classList.toggle("modal-open", isOpen);
    document.body.classList.toggle("desktop-court-modal-open", isOpen && useCourt);
  }
  setCourtAreaLocked(isOpen && useCourt);
  const isMobileModal = !!matchState.state.forceMobileLayout || window.matchMedia("(max-width: 900px)").matches;
  if (isOpen) {
    ensureGlobalModalScrim();
    if (isMobileModal) {
      scoutUiState.lastMobileScrollY = window.scrollY || 0;
      if (!scoutUiState.mobileBodyLock) {
        scoutUiState.mobileBodyLock = {
          position: document.body.style.position,
          top: document.body.style.top,
          left: document.body.style.left,
          right: document.body.style.right,
          width: document.body.style.width
        };
        document.body.style.position = "fixed";
        document.body.style.top = `-${scoutUiState.lastMobileScrollY}px`;
        document.body.style.left = "0";
        document.body.style.right = "0";
        document.body.style.width = "100%";
      }
    }
    if (!isMobileModal) {
      document.body.style.overflow = "hidden";
    }
  } else {
    if (!isMobileModal) {
      document.body.style.overflow = "";
    }
    if (isMobileModal) {
      if (scoutUiState.mobileBodyLock) {
        document.body.style.position = scoutUiState.mobileBodyLock.position;
        document.body.style.top = scoutUiState.mobileBodyLock.top;
        document.body.style.left = scoutUiState.mobileBodyLock.left;
        document.body.style.right = scoutUiState.mobileBodyLock.right;
        document.body.style.width = scoutUiState.mobileBodyLock.width;
        scoutUiState.mobileBodyLock = null;
      }
      if (scoutUiState.lastMobileScrollY !== null) {
        window.scrollTo({ top: scoutUiState.lastMobileScrollY, behavior: "auto" });
      }
      scoutUiState.pendingMobileActiveScroll = true;
      maybeScrollToActiveCourtOnMobile();
      scoutUiState.lastMobileScrollY = null;
    }
  }
}

export function setGlobalModalState(isOpen, options = {}) {
  const forcePopup = typeof options === "boolean" ? options : !!options.forcePopup;
  setModalOpenState(isOpen, forcePopup);
}

export function getActiveCourtContainerForScroll() {
  const activeScope = getMobileActiveScope() || "our";
  return activeScope === "opponent"
    ? document.getElementById("opponent-players-container")
    : document.getElementById("players-container");
}

export function isElementInViewport(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const viewHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  return rect.bottom > 0 && rect.top < viewHeight;
}

export function isElementVisible(el) {
  if (!el) return false;
  if (el.classList && el.classList.contains("hidden")) return false;
  return !!(el.offsetParent || el.getClientRects().length);
}

export function maybeScrollToActiveCourtOnMobile() {
  if (!scoutUiState.pendingMobileActiveScroll) return;
  scoutUiState.pendingMobileActiveScroll = false;
  const isCompactMobile = !!matchState.state.forceMobileLayout || window.matchMedia("(max-width: 900px)").matches;
  if (!isCompactMobile) return;
  const target = getActiveCourtContainerForScroll();
  if (!target || !isElementVisible(target)) {
    scoutUiState.pendingMobileActiveScroll = true;
    return;
  }
  if (isElementInViewport(target)) {
    scoutUiState.pendingMobileActiveScroll = false;
    return;
  }
  scoutUiState.pendingMobileActiveScroll = false;
  requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

export function scrollToActiveCourtOnMobileAlways(tries = 3) {
  const isCompactMobile = !!matchState.state.forceMobileLayout || window.matchMedia("(max-width: 900px)").matches;
  if (!isCompactMobile) return;
  const target = getActiveCourtContainerForScroll();
  if (!target) return;
  if (!isElementVisible(target)) {
    if (tries > 0) {
      browserEffectsState.setTimeout(() => {
        scrollToActiveCourtOnMobileAlways(tries - 1);
      }, 60);
    }
    return;
  }
  requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

export function suppressTransientClicks(ms = 350) {
  scoutUiState.suppressClickUntil = Date.now() + ms;
}

export function shouldSuppressClick(e) {
  if (Date.now() < scoutUiState.suppressClickUntil) {
    if (e) {
      if (e.cancelable) e.preventDefault();
      if (typeof e.stopPropagation === "function") e.stopPropagation();
    }
    return true;
  }
  return false;
}
