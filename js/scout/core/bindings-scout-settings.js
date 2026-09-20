function bindScoutSettingsControls() {
  if (typeof bindViewportResizeUpdates === "function") bindViewportResizeUpdates();
  if (elBtnRotateCw) {
    elBtnRotateCw.addEventListener("click", () => rotateCourt("cw"));
  }
  if (elBtnRotateCcw) {
    elBtnRotateCcw.addEventListener("click", () => rotateCourt("ccw"));
  }
  if (typeof elBtnRotateCwOpp !== "undefined" && elBtnRotateCwOpp) {
    elBtnRotateCwOpp.addEventListener("click", () => {
      if (typeof rotateOpponentCourt === "function") {
        rotateOpponentCourt("cw");
        return;
      }
      rotateCourt("cw");
    });
  }
  if (typeof elBtnRotateCcwOpp !== "undefined" && elBtnRotateCcwOpp) {
    elBtnRotateCcwOpp.addEventListener("click", () => {
      if (typeof rotateOpponentCourt === "function") {
        rotateOpponentCourt("ccw");
        return;
      }
      rotateCourt("ccw");
    });
  }
  if (elBtnRotateCwModal) {
    elBtnRotateCwModal.addEventListener("click", () => rotateCourt("cw"));
  }
  if (elBtnRotateCcwModal) {
    elBtnRotateCcwModal.addEventListener("click", () => rotateCourt("ccw"));
  }
  if (elRotationSelect) {
    elRotationSelect.addEventListener("change", () => setRotation(elRotationSelect.value));
  }
  if (typeof elRotationSelectOpp !== "undefined" && elRotationSelectOpp) {
    elRotationSelectOpp.addEventListener("change", () => {
      if (typeof setOpponentRotation === "function") {
        setOpponentRotation(elRotationSelectOpp.value);
        return;
      }
      setRotation(elRotationSelectOpp.value);
    });
  }
  const elAutoRotateToggleSettings = document.getElementById("auto-rotate-toggle-settings");
  if (elAutoRotateToggle) {
    elAutoRotateToggle.addEventListener("change", () => {
      setAutoRotateEnabled(elAutoRotateToggle.checked);
      if (elAutoRotateToggleSettings) {
        elAutoRotateToggleSettings.checked = elAutoRotateToggle.checked;
      }
    });
  }
  if (elAutoRotateToggleSettings) {
    elAutoRotateToggleSettings.checked = !!state.autoRotate;
    elAutoRotateToggleSettings.addEventListener("change", () => {
      setAutoRotateEnabled(elAutoRotateToggleSettings.checked);
      if (elAutoRotateToggle) {
        elAutoRotateToggle.checked = elAutoRotateToggleSettings.checked;
      }
    });
  }
  // Mobile controls rimossi
  const elAutoRoleToggle = document.getElementById("auto-role-toggle");
  const elAutoRoleToggleSettings = document.getElementById("auto-role-toggle-settings");
  if (elAutoRoleToggle) {
    elAutoRoleToggle.checked = !!state.autoRolePositioning;
    elAutoRoleToggle.addEventListener("change", () => {
      const enabled = elAutoRoleToggle.checked;
      if (elAutoRoleToggleSettings) {
        elAutoRoleToggleSettings.checked = enabled;
      }
      if (typeof setAutoRolePositioning === "function") {
        setAutoRolePositioning(enabled);
      } else {
        state.autoRolePositioning = enabled;
        saveState();
      }
      if (enabled && typeof applyAutoRolePositioning === "function") {
        applyAutoRolePositioning();
      }
    });
  }
  if (elAutoRoleToggleSettings) {
    elAutoRoleToggleSettings.checked = !!state.autoRolePositioning;
    elAutoRoleToggleSettings.addEventListener("change", () => {
      const enabled = elAutoRoleToggleSettings.checked;
      if (elAutoRoleToggle) {
        elAutoRoleToggle.checked = enabled;
      }
      if (typeof setAutoRolePositioning === "function") {
        setAutoRolePositioning(enabled);
      } else {
        state.autoRolePositioning = enabled;
        saveState();
      }
      if (enabled && typeof applyAutoRolePositioning === "function") {
        applyAutoRolePositioning();
      }
    });
  }
  const elAutoLiberoSelect = document.getElementById("auto-libero-select");
  const elAutoLiberoSelectOpp = document.getElementById("auto-libero-select-opp");
  const elAutoLiberoSelectSettings = document.getElementById("auto-libero-select-settings");
  const elSwapLibero = document.getElementById("btn-swap-libero");
  const elSwapLiberoOpp = document.getElementById("btn-swap-libero-opp");
  const elSwapLiberoSettings = document.getElementById("btn-swap-libero-settings");
  const elLiberoToBench = document.getElementById("btn-libero-to-bench");
  const syncAutoLiberoSelects = role => {
    if (elAutoLiberoSelect) elAutoLiberoSelect.value = role || "";
    if (elAutoLiberoSelectSettings) elAutoLiberoSelectSettings.value = role || "";
  };
  const syncOpponentAutoLiberoSelect = role => {
    if (elAutoLiberoSelectOpp) elAutoLiberoSelectOpp.value = role || "";
  };
  syncAutoLiberoSelects(state.autoLiberoRole || "");
  syncOpponentAutoLiberoSelect(state.opponentAutoLiberoRole || "");
  [elAutoLiberoSelect, elAutoLiberoSelectSettings].forEach(sel => {
    if (!sel) return;
    sel.addEventListener("change", () => {
      const role = sel.value || "";
      if (typeof setAutoLiberoRole === "function") {
        setAutoLiberoRole(role);
      } else {
        state.autoLiberoRole = role;
        state.autoLiberoBackline = role !== "" ? true : state.autoLiberoBackline;
        state.liberoAutoMap = {};
        saveState();
        if (typeof enforceAutoLiberoForState === "function") {
          enforceAutoLiberoForState({ skipServerOnServe: true });
        }
        renderPlayers();
        renderBenchChips();
        renderLiberoChipsInline();
        renderLineupChips();
      }
      syncAutoLiberoSelects(role);
    });
  });
  if (elAutoLiberoSelectOpp) {
    elAutoLiberoSelectOpp.addEventListener("change", () => {
      const role = elAutoLiberoSelectOpp.value || "";
      if (typeof setTeamAutoLiberoRole === "function") {
        setTeamAutoLiberoRole("opponent", role);
      } else {
        state.opponentAutoLiberoRole = role;
      }
      if (typeof setTeamAutoLiberoBackline === "function") {
        setTeamAutoLiberoBackline("opponent", role !== "");
      } else if (role !== "") {
        state.opponentAutoLiberoBackline = true;
      }
      if (typeof setTeamLiberoAutoMap === "function") {
        setTeamLiberoAutoMap("opponent", {});
      } else {
        state.opponentLiberoAutoMap = {};
      }
      if (typeof enforceAutoLiberoForScope === "function") {
        enforceAutoLiberoForScope("opponent", { skipServerOnServe: true });
      }
      saveState();
      syncOpponentAutoLiberoSelect(role);
      if (typeof renderOpponentPlayers === "function") renderOpponentPlayers();
    });
  }
  [elSwapLibero, elSwapLiberoSettings].forEach(btn => {
    if (!btn) return;
    btn.addEventListener("click", () => {
      if (typeof swapPreferredLibero === "function") {
        swapPreferredLibero();
        syncAutoLiberoSelects(state.autoLiberoRole || "");
      }
    });
  });
  if (elSwapLiberoOpp) {
    elSwapLiberoOpp.addEventListener("click", () => {
      if (typeof swapPreferredLiberoForScope === "function") {
        swapPreferredLiberoForScope("opponent");
        return;
      }
      state.opponentPreferredLibero = "";
      saveState();
    });
  }
  if (elLiberoToBench) {
    elLiberoToBench.addEventListener("click", () => {
      if (typeof sendLiberoToBench === "function") {
        sendLiberoToBench();
      }
    });
  }
  const elAutoRoleP1AmericanToggle = document.getElementById("auto-role-p1american-toggle");
  const elAutoRoleP1AmericanToggleOpp = document.getElementById("auto-role-p1american-toggle-opp");
  const elAutoRoleP1AmericanToggleSettings = document.getElementById("auto-role-p1american-toggle-settings");
  if (elAutoRoleP1AmericanToggle) {
    elAutoRoleP1AmericanToggle.checked = !!state.autoRoleP1American;
    elAutoRoleP1AmericanToggle.addEventListener("change", () => {
      if (elAutoRoleP1AmericanToggleSettings) {
        elAutoRoleP1AmericanToggleSettings.checked = elAutoRoleP1AmericanToggle.checked;
      }
      if (typeof setAutoRoleP1American === "function") {
        setAutoRoleP1American(!!elAutoRoleP1AmericanToggle.checked);
      } else {
        state.autoRoleP1American = !!elAutoRoleP1AmericanToggle.checked;
        saveState();
      }
    });
  }
  if (elAutoRoleP1AmericanToggleSettings) {
    elAutoRoleP1AmericanToggleSettings.checked = !!state.autoRoleP1American;
    elAutoRoleP1AmericanToggleSettings.addEventListener("change", () => {
      if (elAutoRoleP1AmericanToggle) {
        elAutoRoleP1AmericanToggle.checked = elAutoRoleP1AmericanToggleSettings.checked;
      }
      if (typeof setAutoRoleP1American === "function") {
        setAutoRoleP1American(!!elAutoRoleP1AmericanToggleSettings.checked);
      } else {
        state.autoRoleP1American = !!elAutoRoleP1AmericanToggleSettings.checked;
        saveState();
      }
    });
  }
  if (elAutoRoleP1AmericanToggleOpp) {
    elAutoRoleP1AmericanToggleOpp.checked = !!state.opponentAutoRoleP1American;
    elAutoRoleP1AmericanToggleOpp.addEventListener("change", () => {
      state.opponentAutoRoleP1American = !!elAutoRoleP1AmericanToggleOpp.checked;
      saveState();
    });
  }
  const elPredictiveSkillToggle = document.getElementById("predictive-skill-toggle");
  const elPredictiveSkillToggleSettings = document.getElementById("predictive-skill-toggle-settings");
  if (elPredictiveSkillToggle) {
    elPredictiveSkillToggle.checked = !!state.predictiveSkillFlow;
    elPredictiveSkillToggle.addEventListener("change", () => {
      if (elPredictiveSkillToggleSettings) {
        elPredictiveSkillToggleSettings.checked = elPredictiveSkillToggle.checked;
      }
      state.predictiveSkillFlow = !!elPredictiveSkillToggle.checked;
      if (!state.predictiveSkillFlow) state.skillFlowOverride = null;
      saveState();
      renderPlayers();
    });
  }
  if (elPredictiveSkillToggleSettings) {
    elPredictiveSkillToggleSettings.checked = !!state.predictiveSkillFlow;
    elPredictiveSkillToggleSettings.addEventListener("change", () => {
      if (elPredictiveSkillToggle) {
        elPredictiveSkillToggle.checked = elPredictiveSkillToggleSettings.checked;
      }
      state.predictiveSkillFlow = !!elPredictiveSkillToggleSettings.checked;
      if (!state.predictiveSkillFlow) state.skillFlowOverride = null;
      saveState();
      renderPlayers();
    });
  }
  const elAttackTrajectoryToggle = document.getElementById("attack-trajectory-toggle");
  const elAttackTrajectoryToggleOpp = document.getElementById("attack-trajectory-toggle-opp");
  const elAttackTrajectoryToggleSettings = document.getElementById("attack-trajectory-toggle-settings");
  const elAttackTrajectorySimpleToggle = document.getElementById("attack-trajectory-simple-toggle");
  const elAttackTrajectorySimpleToggleSettings = document.getElementById("attack-trajectory-simple-toggle-settings");
  const elServeTrajectoryToggleInline = document.getElementById("serve-trajectory-toggle-inline");
  const elServeTrajectoryToggleInlineOpp = document.getElementById("serve-trajectory-toggle-inline-opp");
  if (elAttackTrajectoryToggle) {
    elAttackTrajectoryToggle.checked = !!state.attackTrajectoryEnabled;
    elAttackTrajectoryToggle.addEventListener("change", () => {
      if (elAttackTrajectoryToggleSettings) {
        elAttackTrajectoryToggleSettings.checked = elAttackTrajectoryToggle.checked;
      }
      state.attackTrajectoryEnabled = !!elAttackTrajectoryToggle.checked;
      saveState();
    });
  }
  if (elAttackTrajectoryToggleOpp) {
    elAttackTrajectoryToggleOpp.checked = !!state.opponentAttackTrajectoryEnabled;
    elAttackTrajectoryToggleOpp.addEventListener("change", () => {
      state.opponentAttackTrajectoryEnabled = !!elAttackTrajectoryToggleOpp.checked;
      saveState();
    });
  }
  if (elAttackTrajectoryToggleSettings) {
    elAttackTrajectoryToggleSettings.checked = !!state.attackTrajectoryEnabled;
    elAttackTrajectoryToggleSettings.addEventListener("change", () => {
      if (elAttackTrajectoryToggle) {
        elAttackTrajectoryToggle.checked = elAttackTrajectoryToggleSettings.checked;
      }
      state.attackTrajectoryEnabled = !!elAttackTrajectoryToggleSettings.checked;
      saveState();
    });
  }
  if (elAttackTrajectorySimpleToggle) {
    elAttackTrajectorySimpleToggle.checked = !!state.attackTrajectorySimplified;
    elAttackTrajectorySimpleToggle.addEventListener("change", () => {
      if (elAttackTrajectorySimpleToggleSettings) {
        elAttackTrajectorySimpleToggleSettings.checked = elAttackTrajectorySimpleToggle.checked;
      }
      state.attackTrajectorySimplified = !!elAttackTrajectorySimpleToggle.checked;
      saveState();
    });
  }
  if (elAttackTrajectorySimpleToggleSettings) {
    elAttackTrajectorySimpleToggleSettings.checked = !!state.attackTrajectorySimplified;
    elAttackTrajectorySimpleToggleSettings.addEventListener("change", () => {
      if (elAttackTrajectorySimpleToggle) {
        elAttackTrajectorySimpleToggle.checked = elAttackTrajectorySimpleToggleSettings.checked;
      }
      state.attackTrajectorySimplified = !!elAttackTrajectorySimpleToggleSettings.checked;
      saveState();
    });
  }
  const syncServeTrajectoryToggles = value => {
    state.serveTrajectoryEnabled = !!value;
    if (elServeTrajectoryToggleInline) elServeTrajectoryToggleInline.checked = !!value;
    saveState();
  };
  const elSetTypePromptToggleInline = document.getElementById("settype-prompt-toggle-inline");
  const elSetTypePromptToggleInlineOpp = document.getElementById("settype-prompt-toggle-inline-opp");
  const syncSetTypePromptToggle = value => {
    state.setTypePromptEnabled = !!value;
    if (elSetTypePromptToggleInline) elSetTypePromptToggleInline.checked = !!value;
    saveState();
    renderPlayers();
  };
  const syncOpponentSetTypePromptToggle = value => {
    state.opponentSetTypePromptEnabled = !!value;
    if (elSetTypePromptToggleInlineOpp) elSetTypePromptToggleInlineOpp.checked = !!value;
    saveState();
  };
  const opponentSkillToggles = [
    { id: "serve", el: elOpponentSkillServe },
    { id: "pass", el: elOpponentSkillPass },
    { id: "freeball", el: elOpponentSkillFreeball },
    { id: "second", el: elOpponentSkillSecond },
    { id: "attack", el: elOpponentSkillAttack },
    { id: "defense", el: elOpponentSkillDefense },
    { id: "block", el: elOpponentSkillBlock }
  ];
  const syncOpponentSkillToggles = () => {
    state.opponentSkillConfig = state.opponentSkillConfig || {};
    opponentSkillToggles.forEach(item => {
      if (!item.el) return;
      const enabled = state.opponentSkillConfig[item.id] !== false;
      item.el.checked = enabled;
    });
  };
  const updateOpponentSkillToggle = (skillId, enabled) => {
    state.opponentSkillConfig = state.opponentSkillConfig || {};
    state.opponentSkillConfig[skillId] = !!enabled;
    saveState();
  };
  if (elSetTypePromptToggleInline) {
    elSetTypePromptToggleInline.checked = !!state.setTypePromptEnabled;
    elSetTypePromptToggleInline.addEventListener("change", () =>
      syncSetTypePromptToggle(elSetTypePromptToggleInline.checked)
    );
  }
  if (elSetTypePromptToggleInlineOpp) {
    elSetTypePromptToggleInlineOpp.checked = !!state.opponentSetTypePromptEnabled;
    elSetTypePromptToggleInlineOpp.addEventListener("change", () =>
      syncOpponentSetTypePromptToggle(elSetTypePromptToggleInlineOpp.checked)
    );
  }
  opponentSkillToggles.forEach(item => {
    if (!item.el) return;
    item.el.addEventListener("change", () => updateOpponentSkillToggle(item.id, item.el.checked));
  });
  syncOpponentSkillToggles();
  if (elServeTrajectoryToggleInline) {
    elServeTrajectoryToggleInline.checked = !!state.serveTrajectoryEnabled;
    elServeTrajectoryToggleInline.addEventListener("change", () =>
      syncServeTrajectoryToggles(elServeTrajectoryToggleInline.checked)
    );
  }
  if (elServeTrajectoryToggleInlineOpp) {
    elServeTrajectoryToggleInlineOpp.checked = !!state.opponentServeTrajectoryEnabled;
    elServeTrajectoryToggleInlineOpp.addEventListener("change", () => {
      state.opponentServeTrajectoryEnabled = !!elServeTrajectoryToggleInlineOpp.checked;
      saveState();
    });
  }
  if (elUseOpponentTeamToggle) {
    elUseOpponentTeamToggle.checked = !!state.useOpponentTeam;
    elUseOpponentTeamToggle.addEventListener("change", () => {
      state.useOpponentTeam = !!elUseOpponentTeamToggle.checked;
      saveState();
      syncOpponentSettingsUI();
    });
  }
  if (elVideoScoutToggle) {
    elVideoScoutToggle.checked = !!state.videoScoutMode;
    elVideoScoutToggle.addEventListener("change", () => {
      const nextValue = !!elVideoScoutToggle.checked;
      if (state.videoScoutMode && !nextValue) {
        updateVideoPlaybackSnapshot();
      }
      state.videoScoutMode = nextValue;
      saveState();
      updateVideoScoutModeLayout();
    });
  }
  if (elVideoPlayByPlayToggle) {
    elVideoPlayByPlayToggle.checked = !!state.videoPlayByPlay;
    elVideoPlayByPlayToggle.addEventListener("change", () => {
      state.videoPlayByPlay = !!elVideoPlayByPlayToggle.checked;
      saveState();
      if (state.videoPlayByPlay) {
        const active = document && document.body ? document.body.dataset.activeTab : "";
        if (active === "video") {
          startPlayByPlayFromSelection({ preservePlayback: true });
        }
      } else {
        stopPlayByPlay();
      }
    });
  }
  if (elUseOpponentTeamToggle || elOpponentTeamSettings) {
    syncOpponentSettingsUI();
  }
  const elForceMobileToggle = document.getElementById("force-mobile-toggle");
  if (elForceMobileToggle) {
    elForceMobileToggle.checked = !!state.forceMobileLayout;
    elForceMobileToggle.addEventListener("change", () => {
      state.forceMobileLayout = !!elForceMobileToggle.checked;
      applyForceMobileLayout(state.forceMobileLayout);
      saveState();
    });
  }
  const elSkillFlowButtons = document.getElementById("skill-flow-buttons");
  const elSkillFlowButtonsOpp = document.getElementById("skill-flow-buttons-opp");
  if (elSkillFlowButtons) {
    elSkillFlowButtons.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const skillId = target.dataset.forceSkill;
      if (!skillId) return;
      forceNextSkill(skillId);
    });
  }
  if (elSkillFlowButtonsOpp) {
    elSkillFlowButtonsOpp.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const skillId = target.dataset.forceSkill;
      if (!skillId) return;
      forceNextSkill(skillId, "opponent");
    });
  }
  if (elBtnFreeball) {
    elBtnFreeball.addEventListener("click", () => {
      triggerFreeballFlow();
    });
  }
  if (elBtnFreeballOpp) {
    elBtnFreeballOpp.addEventListener("click", () => {
      triggerFreeballFlow({ scope: "opponent" });
    });
  }
  if (elBtnFreeballOppSingle) {
    elBtnFreeballOppSingle.addEventListener("click", handleOpponentFreeballSingle);
  }
  if (elBtnToggleCourtView) {
    elBtnToggleCourtView.addEventListener("click", () => {
      state.courtSideSwapped = !state.courtSideSwapped;
      state.courtViewMirrored = !!state.courtSideSwapped;
      state.opponentCourtViewMirrored = !state.courtSideSwapped;
      saveState({ persistLocal: true });
      syncCourtSideLayout();
      renderPlayers();
    });
  }
  if (elBtnTimeout) {
    elBtnTimeout.addEventListener("click", () => {
      recordTimeoutEvent();
    });
  }
  if (elBtnTimeoutOpp) {
    elBtnTimeoutOpp.addEventListener("click", () => {
      recordOpponentTimeoutEvent();
    });
  }
  if (elBtnOffsetSkills) {
    elBtnOffsetSkills.addEventListener("click", openOffsetModal);
  }
  if (elBtnUnifyTimes) {
    elBtnUnifyTimes.addEventListener("click", openUnifyTimesModal);
  }
  if (elBtnSkillDuration) {
    elBtnSkillDuration.addEventListener("click", openSkillDurationModal);
  }
  if (elBtnVideoUndo) {
    elBtnVideoUndo.addEventListener("click", undoLastVideoEdit);
  }
  if (elBtnOpenSettings) {
    elBtnOpenSettings.addEventListener("click", () => {
      if (typeof openSettingsModal === "function") openSettingsModal();
    });
  }
  if (elSettingsClose) {
    elSettingsClose.addEventListener("click", () => {
      if (typeof closeSettingsModal === "function") closeSettingsModal();
    });
  }
  if (elSettingsModal) {
    elSettingsModal.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.closeSettings !== undefined || target.classList.contains("settings-modal__backdrop")) {
        if (typeof closeSettingsModal === "function") closeSettingsModal();
      }
    });
  }
  if (elOffsetModal) {
    elOffsetModal.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.closeOffset !== undefined || target.classList.contains("settings-modal__backdrop")) {
        closeOffsetModal();
      }
    });
  }
  if (elUnifyTimesModal) {
    elUnifyTimesModal.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.closeUnifyTimes !== undefined || target.classList.contains("settings-modal__backdrop")) {
        closeUnifyTimesModal();
      }
    });
  }
  if (elSkillDurationModal) {
    elSkillDurationModal.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.closeSkillDuration !== undefined || target.classList.contains("settings-modal__backdrop")) {
        closeSkillDurationModal();
      }
    });
  }
  if (elOffsetClose) {
    elOffsetClose.addEventListener("click", closeOffsetModal);
  }
  if (elUnifyTimesClose) {
    elUnifyTimesClose.addEventListener("click", closeUnifyTimesModal);
  }
  if (elSkillDurationClose) {
    elSkillDurationClose.addEventListener("click", closeSkillDurationModal);
  }
  if (elOffsetApply) {
    elOffsetApply.addEventListener("click", applyOffsetsToSelectedSkills);
  }
  if (elUnifyTimesApply) {
    elUnifyTimesApply.addEventListener("click", applyUnifyTimes);
  }
  if (elSkillDurationApply) {
    elSkillDurationApply.addEventListener("click", applySkillDurationDefaults);
  }
  if (elAttackTrajectoryModal) {
    const handleCloseTrajectory = () => closeAttackTrajectoryModal(null);
    const getPos = e => {
      if (!elAttackTrajectoryCanvas) return null;
      const rect = elAttackTrajectoryCanvas.getBoundingClientRect();
      const clientX = e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY);
      if (clientX == null || clientY == null) return null;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };
    const onPointerDown = e => {
      const pos = getPos(e);
      if (!pos || !elAttackTrajectoryCanvas) return;
      if (e.cancelable) e.preventDefault();
      if (typeof e.stopPropagation === "function") e.stopPropagation();
      if (typeof elAttackTrajectoryCanvas.setPointerCapture === "function" && e.pointerId != null) {
        elAttackTrajectoryCanvas.setPointerCapture(e.pointerId);
      }
      if (trajectoryMode === "serve-start") {
        trajectoryStart = pos;
        trajectoryEnd = null;
        trajectoryDragging = true;
        drawTrajectory();
        return;
      }
      if (trajectoryMode === "serve-end") {
        trajectoryStart = null;
        trajectoryEnd = pos;
        trajectoryDragging = true;
        drawTrajectory();
        return;
      }
      if (state.attackTrajectorySimplified) {
        if (!trajectoryStart) {
          if (!trajectoryNetPointId) {
            const defaultNetPoint = getDefaultTrajectoryNetPointId(trajectoryBaseZone, trajectorySetType);
            setTrajectoryNetPointId(defaultNetPoint);
          }
          applyTrajectoryStartFromNetPoint();
        }
        trajectoryDragging = true;
        trajectoryEnd = pos;
        drawTrajectory(pos);
        return;
      }
      if (!trajectoryStart || trajectoryEnd) {
        const box = getTrajectoryDisplayBox();
        const w = box ? box.width : elAttackTrajectoryCanvas.clientWidth || elAttackTrajectoryCanvas.width || 1;
        const startFromTop = trajectoryMirror || trajectoryForceFar;
        const fixedY = box
          ? box.offsetY + (startFromTop ? 0.5 : box.height - 0.5)
          : startFromTop
            ? 0.5
            : elAttackTrajectoryCanvas.height - 0.5; // partenza forzata sul bordo basso
        trajectoryStart = { x: pos.x, y: fixedY };
        trajectoryEnd = null;
        const xWithinStage = box ? pos.x - box.offsetX : pos.x;
        const third = xWithinStage < w / 3 ? 0 : xWithinStage < (2 * w) / 3 ? 1 : 2;
        const isFarSide = trajectoryForceFar;
        const leftZone = isFarSide ? 5 : 4;
        const midZone = isFarSide ? 6 : 3;
        const rightZone = isFarSide ? 1 : 2;
        const zoneFromClickRaw = startFromTop
          ? third === 0
            ? rightZone
            : third === 1
              ? midZone
              : leftZone
          : third === 0
            ? leftZone
            : third === 1
              ? midZone
              : rightZone;
        const imgSrc = getTrajectoryImageForZone(
          zoneFromClickRaw,
          trajectoryMirror || trajectoryForceFar
        ); // mostra il campo della zona front-row
        if (elAttackTrajectoryImage && elAttackTrajectoryImage.dataset.activeSrc !== imgSrc) {
          elAttackTrajectoryImage.dataset.activeSrc = imgSrc;
          elAttackTrajectoryImage.src = imgSrc;
        }
      }
      trajectoryDragging = true;
      drawTrajectory();
    };
    const onPointerMove = e => {
      if (!trajectoryDragging || (!trajectoryStart && !trajectoryEnd)) return;
      const pos = getPos(e);
      if (!pos) return;
      if (e.cancelable) e.preventDefault();
      if (typeof e.stopPropagation === "function") e.stopPropagation();
      if (trajectoryMode === "serve-start") {
        trajectoryStart = pos;
        drawTrajectory();
        return;
      }
      if (trajectoryMode === "serve-end") {
        trajectoryEnd = pos;
        drawTrajectory();
        return;
      }
      drawTrajectory(pos);
    };
    const onPointerUp = e => {
      if (!trajectoryDragging || (!trajectoryStart && !trajectoryEnd)) return;
      const pos = getPos(e);
      trajectoryDragging = false;
      if (e.cancelable) e.preventDefault();
      if (typeof e.stopPropagation === "function") e.stopPropagation();
      if (
        elAttackTrajectoryCanvas &&
        typeof elAttackTrajectoryCanvas.releasePointerCapture === "function" &&
        e.pointerId != null
      ) {
        elAttackTrajectoryCanvas.releasePointerCapture(e.pointerId);
      }
      if (!pos) return;
      if (trajectoryMode === "serve-start") {
        trajectoryStart = pos;
        drawTrajectory();
        confirmCurrentTrajectory();
        return;
      }
      if (trajectoryMode === "serve-end") {
        trajectoryEnd = pos;
        drawTrajectory();
        confirmCurrentTrajectory();
        return;
      }
      trajectoryEnd = pos;
      drawTrajectory();
      confirmCurrentTrajectory();
    };
    if (elAttackTrajectoryCanvas) {
      elAttackTrajectoryCanvas.addEventListener("click", e => {
        if (e.cancelable) e.preventDefault();
        if (typeof e.stopPropagation === "function") e.stopPropagation();
      });
      elAttackTrajectoryCanvas.addEventListener("contextmenu", e => {
        if (e.cancelable) e.preventDefault();
        if (typeof e.stopPropagation === "function") e.stopPropagation();
      });
      elAttackTrajectoryCanvas.addEventListener("pointerdown", onPointerDown);
      elAttackTrajectoryCanvas.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    }
    if (elAttackTrajectoryNetpoints) {
      const buttons = elAttackTrajectoryNetpoints.querySelectorAll("[data-net-point]");
      buttons.forEach(btn => {
        btn.addEventListener("click", () => {
          const netId = btn.dataset.netPoint || "";
          if (!netId) return;
          setTrajectoryNetPointId(netId);
          trajectoryEnd = null;
          applyTrajectoryStartFromNetPoint();
        });
      });
    }
    const confirmCurrentTrajectory = () => {
      if (trajectoryMode === "serve-start") {
        if (!trajectoryStart) return;
        const rawPoint = normalizeTrajectoryPoint(trajectoryStart);
        const mirrorForStorage = trajectoryMirror || trajectoryForceFar;
        const point = mirrorForStorage ? mirrorTrajectoryPoint(rawPoint) : rawPoint;
        closeAttackTrajectoryModal({ point, serveType: serveTrajectoryType });
        return;
      }
      if (trajectoryMode === "serve-end") {
        const pt = trajectoryEnd || trajectoryStart;
        if (!pt) return;
        const rawPoint = normalizeTrajectoryPoint(pt);
        const mirrorForStorage = trajectoryMirror || trajectoryForceFar;
        const point = mirrorForStorage ? mirrorTrajectoryPoint(rawPoint) : rawPoint;
        closeAttackTrajectoryModal({ point });
        return;
      }
      if (!trajectoryStart || !trajectoryEnd) return;
      const rawStart = normalizeTrajectoryPoint(trajectoryStart);
      const rawEnd = normalizeTrajectoryPoint(trajectoryEnd);
      const mirrorForStorage = trajectoryMirror || trajectoryForceFar;
      const start = mirrorForStorage ? mirrorTrajectoryPoint(rawStart) : rawStart;
      const end = mirrorForStorage ? mirrorTrajectoryPoint(rawEnd) : rawEnd;
      const isFar = false;
      const startZone = mapBackRowZone(getAttackZone(start, isFar), trajectoryBaseZone);
      const endZone = mapBackRowZone(getAttackZone(end, isFar), trajectoryBaseZone);
      const directionDeg = computeAttackDirectionDeg(start, end);
      closeAttackTrajectoryModal({
        start,
        end,
        startZone,
        endZone,
        directionDeg
      });
    };
    if (elAttackTrajectoryImage) {
      elAttackTrajectoryImage.addEventListener("load", resizeTrajectoryCanvas);
    }
    [elAttackTrajectoryClose, elAttackTrajectoryModal.querySelector("[data-close-trajectory]")].forEach(btn => {
      if (btn) btn.addEventListener("click", handleCloseTrajectory);
    });
    if (elAttackTrajectoryCloseBtn) {
      elAttackTrajectoryCloseBtn.addEventListener("click", handleCloseTrajectory);
    }
  }
}
