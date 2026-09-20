function bindModalAndGlobalControls() {
  if (elNextSetInline) {
    elNextSetInline.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target === elNextSetInline) {
        e.preventDefault();
        closeNextSetModal();
      }
    });
  }
  if (elBtnAttackBase) {
    elBtnAttackBase.addEventListener("click", toggleBaseModal);
  }
  if (elBtnAttackSetter) {
    elBtnAttackSetter.addEventListener("click", toggleAttackSetterModal);
  }
  if (elBtnAttackType) {
    elBtnAttackType.addEventListener("click", toggleAttackTypeModal);
  }
  if (elBtnBlockNumber) {
    elBtnBlockNumber.addEventListener("click", toggleBlockNumberModal);
  }
  if (elBtnNetBlockPrompt) {
    elBtnNetBlockPrompt.addEventListener("click", triggerNetBlockPrompt);
  }
  if (elBaseModalClose) {
    elBaseModalClose.addEventListener("click", closeBaseModal);
  }
  if (elBaseModal) {
    elBaseModal.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const wantsClose = target.dataset.closeBase || target === elBaseModal;
      if (wantsClose) {
        e.preventDefault();
        closeBaseModal();
      }
    });
  }
  if (elBaseModalGrid) {
    elBaseModalGrid.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest(".base-modal-btn");
      if (!btn) return;
      const baseValue = btn.dataset.base;
      if (baseValue) {
        applyBaseToTarget(baseValue);
      }
    });
  }
  if (elAttackTypeModalClose) {
    elAttackTypeModalClose.addEventListener("click", closeAttackTypeModal);
  }
  if (elAttackTypeModal) {
    elAttackTypeModal.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const wantsClose = target.dataset.closeAttackType || target === elAttackTypeModal;
      if (wantsClose) {
        e.preventDefault();
        closeAttackTypeModal();
      }
    });
  }
  if (elAttackTypeModalGrid) {
    elAttackTypeModalGrid.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest(".base-modal-btn");
      if (!btn) return;
      const value = btn.dataset.attackType;
      if (value) {
        applyAttackTypeToTarget(value);
      }
    });
  }
  if (elAttackSetterModalClose) {
    elAttackSetterModalClose.addEventListener("click", closeAttackSetterModal);
  }
  if (elAttackSetterModal) {
    elAttackSetterModal.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const wantsClose = target.dataset.closeAttackSetter || target === elAttackSetterModal;
      if (wantsClose) {
        e.preventDefault();
        closeAttackSetterModal();
      }
    });
  }
  if (elBlockNumberModalClose) {
    elBlockNumberModalClose.addEventListener("click", closeBlockNumberModal);
  }
  if (elBlockNumberModal) {
    elBlockNumberModal.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const wantsClose = target.dataset.closeBlockNumber || target === elBlockNumberModal;
      if (wantsClose) {
        e.preventDefault();
        closeBlockNumberModal();
      }
    });
  }
  if (elBlockNumberModalGrid) {
    elBlockNumberModalGrid.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest(".base-modal-btn");
      if (!btn) return;
      const raw = btn.dataset.blockNumber;
      if (raw !== undefined) {
        const num = parseInt(raw, 10);
        if (!Number.isNaN(num)) {
          applyBlockNumberToTarget(num);
        }
      }
    });
  }
  if (elSkillModalCancel) {
    elSkillModalCancel.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      cancelSkillModalFlow();
    });
  }
  if (elSkillModalClose) {
    elSkillModalClose.addEventListener("click", closeSkillModal);
  }
  if (elSkillModal) {
    elSkillModal.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const wantsClose =
        target.dataset.closeSkill ||
        !!target.closest("[data-close-skill]") ||
        target === elSkillModal;
      if (wantsClose) {
        e.preventDefault();
        closeSkillModal();
      }
    });
  }
  if (elAggSkillModalClose) {
    elAggSkillModalClose.addEventListener("click", closeAggSkillModal);
  }
  if (elAggSkillModal) {
    elAggSkillModal.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const wantsClose =
        target.dataset.closeAggSkill ||
        !!target.closest("[data-close-agg-skill]") ||
        target === elAggSkillModal;
      if (wantsClose) {
        e.preventDefault();
        closeAggSkillModal();
      }
    });
  }
  if (typeof bindViewportResizeUpdates === "function") bindViewportResizeUpdates();
  document.addEventListener("keydown", e => {
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
  document.addEventListener("mousedown", e => {
    if (currentEditCell && !currentEditCell.contains(e.target)) {
      closeCurrentEdit();
    }
  });
  document.addEventListener("keydown", e => {
    if (isEditingField(e.target)) return;
    closeCurrentEdit();
    if (!elBaseModal?.classList.contains("hidden")) {
      if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        closeBaseModal();
        return;
      }
      const mapped = BASE_KEY_MAP[String(e.key).toUpperCase()];
      if (mapped) {
        e.preventDefault();
        applyBaseToTarget(mapped);
      }
      return;
    }
    if (!elAttackSetterModal?.classList.contains("hidden")) {
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        closeAttackSetterModal();
      }
      return;
    }
    if (!elAttackTypeModal?.classList.contains("hidden")) {
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        closeAttackTypeModal();
        return;
      }
      const mapped = ATTACK_TYPE_KEY_MAP[String(e.key).toUpperCase()];
      if (mapped) {
        e.preventDefault();
        applyAttackTypeToTarget(mapped);
      }
      return;
    }
    if (!elBlockNumberModal?.classList.contains("hidden")) {
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        closeBlockNumberModal();
        return;
      }
      const mapped = BLOCK_NUMBER_KEY_MAP[String(e.key)];
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
      if (elBtnNetBlockPrompt && !elBtnNetBlockPrompt.classList.contains("hidden")) {
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
  document.addEventListener("click", e => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const closer = target.closest("[data-close-skill]");
    if (closer && !elSkillModal?.classList.contains("hidden")) {
      e.preventDefault();
      closeSkillModal();
    }
    const aggCloser = target.closest("[data-close-agg-skill]");
    if (aggCloser && !elAggSkillModal?.classList.contains("hidden")) {
      e.preventDefault();
      closeAggSkillModal();
    }
  });
  const snapshotPlayback = () => {
    const playback = getActiveVideoPlaybackSeconds();
    updateVideoPlaybackSnapshot(playback, true);
  };
  window.addEventListener("beforeunload", snapshotPlayback);
  window.addEventListener("pagehide", snapshotPlayback);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      snapshotPlayback();
    }
  });
  startVideoPlaybackSnapshotTimer();
  bindVideoResizeHandle(elVideoAnalysisResizeHandle, "analysisHeight");
  bindVideoResizeHandle(elVideoScoutResizeHandle, "scoutHeight");
  bindScoutColumnResize();
  bindScoutWidgetLayout();
}
