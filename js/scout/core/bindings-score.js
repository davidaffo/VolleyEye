function bindScoreAndSetControls() {
  if (elBtnResetMetrics && elBtnResetMetrics.dataset?.reactManaged !== "true") {
    elBtnResetMetrics.addEventListener("click", resetMetricsToDefault);
  }
  if (elBtnResetCodes && elBtnResetCodes.dataset?.reactManaged !== "true") {
    elBtnResetCodes.addEventListener("click", resetAllActiveCodes);
  }
  if (elBtnResetPoints && elBtnResetPoints.dataset?.reactManaged !== "true") {
    elBtnResetPoints.addEventListener("click", resetPointRulesToDefault);
  }
  if (elBtnScoreForPlus && elBtnScoreForPlus.dataset.reactManaged !== "true") {
    elBtnScoreForPlus.addEventListener("click", () => handleManualScore("for", 1));
  }
  if (elBtnScoreForMinus && elBtnScoreForMinus.dataset.reactManaged !== "true") {
    elBtnScoreForMinus.addEventListener("click", () => handleManualScore("for", -1));
  }
  if (elBtnScoreAgainstPlus && elBtnScoreAgainstPlus.dataset.reactManaged !== "true") {
    elBtnScoreAgainstPlus.addEventListener("click", () => handleManualScore("against", 1));
  }
  if (elBtnScoreAgainstMinus && elBtnScoreAgainstMinus.dataset.reactManaged !== "true") {
    elBtnScoreAgainstMinus.addEventListener("click", () => handleManualScore("against", -1));
  }
  if (elBtnScoreTeamPoint && elBtnScoreTeamPoint.dataset.reactManaged !== "true") {
    elBtnScoreTeamPoint.addEventListener("click", () => startPointPickMode("our"));
  }
  if (elBtnScoreOppError && elBtnScoreOppError.dataset.reactManaged !== "true") {
    elBtnScoreOppError.addEventListener("click", handleOpponentErrorPoint);
  }
  if (elBtnScoreTeamError && elBtnScoreTeamError.dataset.reactManaged !== "true") {
    elBtnScoreTeamError.addEventListener("click", () => startErrorPickMode("our"));
  }
  if (elBtnScoreOppPoint && elBtnScoreOppPoint.dataset.reactManaged !== "true") {
    elBtnScoreOppPoint.addEventListener("click", handleOpponentPoint);
  }
  if (elBtnScoreOppErrorSingle && elBtnScoreOppErrorSingle.dataset.reactManaged !== "true") {
    elBtnScoreOppErrorSingle.addEventListener("click", handleOpponentErrorPoint);
  }
  if (elBtnScoreOppPointSingle && elBtnScoreOppPointSingle.dataset.reactManaged !== "true") {
    elBtnScoreOppPointSingle.addEventListener("click", handleOpponentPoint);
  }
  if (elBtnNextSet && elBtnNextSet.dataset.reactManaged !== "true") {
    elBtnNextSet.addEventListener("click", () => openNextSetModal((state.currentSet || 1) + 1));
  }
  if (elBtnEndMatch && elBtnEndMatch.dataset.reactManaged !== "true") {
    elBtnEndMatch.addEventListener("click", endMatch);
  }
  if (elBtnScoreTeamErrorModal) {
    elBtnScoreTeamErrorModal.addEventListener("click", () => startErrorPickMode("our"));
  }
  document.addEventListener(
    "click",
    e => {
      shouldSuppressClick(e);
    },
    true
  );
  if (elSetStartModalClose && elSetStartModalClose.dataset.reactManaged !== "true") {
    elSetStartModalClose.addEventListener("click", closeSetStartModal);
  }
  if (elSetStartModalCancel && elSetStartModalCancel.dataset.reactManaged !== "true") {
    elSetStartModalCancel.addEventListener("click", closeSetStartModal);
  }
  if (elSetStartModalSave && elSetStartModalSave.dataset.reactManaged !== "true") {
    elSetStartModalSave.addEventListener("click", applySetStartDraft);
  }
  if (elBtnNextSetModal) {
    elBtnNextSetModal.addEventListener("click", () => openNextSetModal((state.currentSet || 1) + 1));
  }
  if (elBtnEndMatchModal) {
    elBtnEndMatchModal.addEventListener("click", endMatch);
  }
  if (elNextSetDefaultOur && elNextSetDefaultOur.dataset.reactManaged !== "true") {
    elNextSetDefaultOur.addEventListener("click", () => {
      if (!nextSetDraft) return;
      const defaults = getRawDefaultStartForScope("our");
      if (!defaults) return;
      nextSetDraft.our = defaults;
      renderNextSetLineups();
    });
  }
  if (elNextSetRotateCwOur && elNextSetRotateCwOur.dataset.reactManaged !== "true") {
    elNextSetRotateCwOur.addEventListener("click", () => rotateNextSetCourt("our", "cw"));
  }
  if (elNextSetRotateCcwOur && elNextSetRotateCcwOur.dataset.reactManaged !== "true") {
    elNextSetRotateCcwOur.addEventListener("click", () => rotateNextSetCourt("our", "ccw"));
  }
  if (elNextSetRotationSelectOur && elNextSetRotationSelectOur.dataset.reactManaged !== "true") {
    elNextSetRotationSelectOur.addEventListener("change", () => {
      setNextSetRotation("our", elNextSetRotationSelectOur.value);
    });
  }
  if (elNextSetDefaultOpp && elNextSetDefaultOpp.dataset.reactManaged !== "true") {
    elNextSetDefaultOpp.addEventListener("click", () => {
      if (!nextSetDraft) return;
      const defaults = getRawDefaultStartForScope("opponent");
      if (!defaults) return;
      nextSetDraft.opponent = defaults;
      renderNextSetLineups();
    });
  }
  if (elNextSetRotateCwOpp && elNextSetRotateCwOpp.dataset.reactManaged !== "true") {
    elNextSetRotateCwOpp.addEventListener("click", () => rotateNextSetCourt("opponent", "cw"));
  }
  if (elNextSetRotateCcwOpp && elNextSetRotateCcwOpp.dataset.reactManaged !== "true") {
    elNextSetRotateCcwOpp.addEventListener("click", () => rotateNextSetCourt("opponent", "ccw"));
  }
  if (elNextSetRotationSelectOpp && elNextSetRotationSelectOpp.dataset.reactManaged !== "true") {
    elNextSetRotationSelectOpp.addEventListener("change", () => {
      setNextSetRotation("opponent", elNextSetRotationSelectOpp.value);
    });
  }
  if (elNextSetSwapCourt && elNextSetSwapCourt.dataset.reactManaged !== "true") {
    elNextSetSwapCourt.addEventListener("change", () => {
      if (nextSetDraft) {
        nextSetDraft.swapCourt = !!elNextSetSwapCourt.checked;
      }
    });
  }
  if (elNextSetSideOur && elNextSetSideOur.dataset.reactManaged !== "true") {
    elNextSetSideOur.addEventListener("change", () => {
      if (!nextSetDraft) return;
      if (elNextSetSideOur.checked) {
        nextSetDraft.swapCourt = false;
      }
    });
  }
  if (elNextSetSideOpp && elNextSetSideOpp.dataset.reactManaged !== "true") {
    elNextSetSideOpp.addEventListener("change", () => {
      if (!nextSetDraft) return;
      if (elNextSetSideOpp.checked) {
        nextSetDraft.swapCourt = true;
      }
    });
  }
  if (elNextSetServeOur && elNextSetServeOur.dataset.reactManaged !== "true") {
    elNextSetServeOur.addEventListener("change", () => {
      if (nextSetDraft && elNextSetServeOur.checked) {
        nextSetDraft.isServing = true;
      }
    });
  }
  if (elNextSetServeOpp && elNextSetServeOpp.dataset.reactManaged !== "true") {
    elNextSetServeOpp.addEventListener("change", () => {
      if (nextSetDraft && elNextSetServeOpp.checked) {
        nextSetDraft.isServing = false;
      }
    });
  }
  if (elNextSetStart && elNextSetStart.dataset.reactManaged !== "true") {
    elNextSetStart.addEventListener("click", applyNextSetDraft);
  }
  if (elNextSetCancel && elNextSetCancel.dataset.reactManaged !== "true") {
    elNextSetCancel.addEventListener("click", closeNextSetModal);
  }
  if (elNextSetClose && elNextSetClose.dataset.reactManaged !== "true") {
    elNextSetClose.addEventListener("click", closeNextSetModal);
  }
}
