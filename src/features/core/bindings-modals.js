import { session as scoutUiState } from "../state/scout-ui.js";
import { bindViewportResizeUpdates, bindVideoResizeHandle, bindScoutColumnResize } from "../scout-ui.js";
import { closeNextSetModal } from "../live/next-set-lineups.js";
import { listenRuntime } from "../../app/browser-effects.js";
import { stopPointPickMode, stopErrorPickMode, closeSkillModal, getActiveVideoPlaybackSeconds, updateVideoPlaybackSnapshot, startVideoPlaybackSnapshotTimer } from "../live/live-entry.js";
import { closeSettingsModal } from "../teams/court/court-ui-bootstrap.js";
import { closeAggSkillModal } from "../analysis/skill-tables.js";
import { closeBaseModal, closeAttackTypeModal, closeAttackSetterModal, closeBlockNumberModal, applyBaseToTarget, applyAttackTypeToTarget, applyBlockNumberToTarget, toggleBaseModal, toggleAttackSetterModal, toggleAttackTypeModal, toggleBlockNumberModal } from "../live/team-management.js";
import { session as teamManagementState } from "../state/live-team-management.js";
import { closeCurrentEdit, triggerNetBlockPrompt } from "../live/game-flow.js";
import { isEditingField, moveSelection, adjustSelectedVideoTimes, adjustCurrentRowVideoTime } from "../video/video-events.js";
import { getActiveEventContextKey } from "../events/selection-model.js";
import { session as workspaceLayoutState } from "../state/live-workspace-layout.js";
import { bindScoutWidgetLayout } from "../live/workspace-layout.js";
import { session as matchState } from "../../../js/globals.js";

export function bindModalAndGlobalControls() {
  if (scoutUiState.elNextSetInline) {
    scoutUiState.elNextSetInline.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target === scoutUiState.elNextSetInline) {
        e.preventDefault();
        closeNextSetModal();
      }
    });
  }

  bindViewportResizeUpdates();
  listenRuntime(document, "keydown", e => {
    if (e.key === "Escape") {
      stopPointPickMode();
      stopErrorPickMode();
      closeSkillModal();
      closeSettingsModal();
      closeAggSkillModal();
      closeNextSetModal();
      closeBaseModal();
      closeAttackTypeModal();
      closeAttackSetterModal();
      closeBlockNumberModal();
    }
  });
  listenRuntime(document, "mousedown", e => {
    if (scoutUiState.currentEditCell && !scoutUiState.currentEditCell.contains(e.target)) {
      closeCurrentEdit();
    }
  });
  listenRuntime(document, "keydown", e => {
    if (isEditingField(e.target)) return;
    closeCurrentEdit();
    if (!teamManagementState.elBaseModal?.classList.contains("hidden")) {
      if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        closeBaseModal();
        return;
      }
      const mapped = workspaceLayoutState.BASE_KEY_MAP[String(e.key).toUpperCase()];
      if (mapped) {
        e.preventDefault();
        applyBaseToTarget(mapped);
      }
      return;
    }
    if (!teamManagementState.elAttackSetterModal?.classList.contains("hidden")) {
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        closeAttackSetterModal();
      }
      return;
    }
    if (!teamManagementState.elAttackTypeModal?.classList.contains("hidden")) {
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        closeAttackTypeModal();
        return;
      }
      const mapped = workspaceLayoutState.ATTACK_TYPE_KEY_MAP[String(e.key).toUpperCase()];
      if (mapped) {
        e.preventDefault();
        applyAttackTypeToTarget(mapped);
      }
      return;
    }
    if (!teamManagementState.elBlockNumberModal?.classList.contains("hidden")) {
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        closeBlockNumberModal();
        return;
      }
      const mapped = workspaceLayoutState.BLOCK_NUMBER_KEY_MAP[String(e.key)];
      if (mapped !== undefined) {
        e.preventDefault();
        applyBlockNumberToTarget(mapped);
      }
      return;
    }
    if (e.key === "k" || e.key === "K") {
      e.preventDefault();
      toggleBaseModal();
      return;
    }
    if (e.key === "a" || e.key === "A") {
      e.preventDefault();
      toggleAttackSetterModal();
      return;
    }
    if (e.key === "t" || e.key === "T") {
      e.preventDefault();
      toggleAttackTypeModal();
      return;
    }
    if (e.key === "n" || e.key === "N") {
      e.preventDefault();
      if (teamManagementState.elBtnNetBlockPrompt && !teamManagementState.elBtnNetBlockPrompt.classList.contains("hidden")) {
        triggerNetBlockPrompt();
      } else {
        toggleBlockNumberModal();
      }
      return;
    }
    const ctxKey = getActiveEventContextKey();
    if (!ctxKey) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveSelection(ctxKey, 1, e.shiftKey);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveSelection(ctxKey, -1, e.shiftKey);
    } else if (e.key === "[" || (e.key === "ArrowLeft" && e.altKey)) {
      e.preventDefault();
      adjustSelectedVideoTimes(-0.2);
    } else if (e.key === "]" || (e.key === "ArrowRight" && e.altKey)) {
      e.preventDefault();
      adjustSelectedVideoTimes(0.2);
    } else if (e.key === "q" || e.key === "Q") {
      e.preventDefault();
      e.stopPropagation();
      adjustCurrentRowVideoTime(-0.5);
    } else if (e.key === "w" || e.key === "W") {
      e.preventDefault();
      e.stopPropagation();
      adjustCurrentRowVideoTime(0.5);
    }
  });
  listenRuntime(document, "click", e => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const closer = target.closest("[data-close-skill]");
    if (closer && !matchState.elSkillModal?.classList.contains("hidden")) {
      e.preventDefault();
      closeSkillModal();
    }
    const aggCloser = target.closest("[data-close-agg-skill]");
    if (aggCloser && !matchState.elAggSkillModal?.classList.contains("hidden")) {
      e.preventDefault();
      closeAggSkillModal();
    }
  });
  const snapshotPlayback = () => {
    const playback = getActiveVideoPlaybackSeconds();
    updateVideoPlaybackSnapshot(playback, true);
  };
  listenRuntime(window, "beforeunload", snapshotPlayback);
  listenRuntime(window, "pagehide", snapshotPlayback);
  listenRuntime(document, "visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      snapshotPlayback();
    }
  });
  startVideoPlaybackSnapshotTimer();
  bindVideoResizeHandle(scoutUiState.elVideoAnalysisResizeHandle, "analysisHeight");
  bindVideoResizeHandle(scoutUiState.elVideoScoutResizeHandle, "scoutHeight");
  bindScoutColumnResize();
  bindScoutWidgetLayout();
}
