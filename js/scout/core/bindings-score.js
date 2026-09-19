function bindScoreAndSetControls() {
  if (elBtnResetMetrics) {
    elBtnResetMetrics.addEventListener("click", resetMetricsToDefault);
  }
  if (elBtnResetCodes) {
    elBtnResetCodes.addEventListener("click", resetAllActiveCodes);
  }
  if (elBtnResetPoints) {
    elBtnResetPoints.addEventListener("click", resetPointRulesToDefault);
  }
  if (elBtnScoreForPlus) {
    elBtnScoreForPlus.addEventListener("click", () => handleManualScore("for", 1));
  }
  if (elBtnScoreForMinus) {
    elBtnScoreForMinus.addEventListener("click", () => handleManualScore("for", -1));
  }
  if (elBtnScoreAgainstPlus) {
    elBtnScoreAgainstPlus.addEventListener("click", () => handleManualScore("against", 1));
  }
  if (elBtnScoreAgainstMinus) {
    elBtnScoreAgainstMinus.addEventListener("click", () => handleManualScore("against", -1));
  }
  if (elBtnScoreTeamPoint) {
    elBtnScoreTeamPoint.addEventListener("click", () => startPointPickMode("our"));
  }
  if (elBtnScoreOppError) {
    elBtnScoreOppError.addEventListener("click", handleOpponentErrorPoint);
  }
  if (elBtnScoreTeamError) {
    elBtnScoreTeamError.addEventListener("click", () => startErrorPickMode("our"));
  }
  if (elBtnScoreOppPoint) {
    elBtnScoreOppPoint.addEventListener("click", handleOpponentPoint);
  }
  if (elBtnScoreOppErrorSingle) {
    elBtnScoreOppErrorSingle.addEventListener("click", handleOpponentErrorPoint);
  }
  if (elBtnScoreOppPointSingle) {
    elBtnScoreOppPointSingle.addEventListener("click", handleOpponentPoint);
  }
  if (elBtnNextSet) {
    elBtnNextSet.addEventListener("click", () => openNextSetModal((state.currentSet || 1) + 1));
  }
  if (elBtnEndMatch) {
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
  if (elSetStartModalClose) {
    elSetStartModalClose.addEventListener("click", closeSetStartModal);
  }
  if (elSetStartModalCancel) {
    elSetStartModalCancel.addEventListener("click", closeSetStartModal);
  }
  if (elSetStartModalSave) {
    elSetStartModalSave.addEventListener("click", applySetStartDraft);
  }
  if (elBtnNextSetModal) {
    elBtnNextSetModal.addEventListener("click", () => openNextSetModal((state.currentSet || 1) + 1));
  }
  if (elBtnEndMatchModal) {
    elBtnEndMatchModal.addEventListener("click", endMatch);
  }
  if (elNextSetDefaultOur) {
    elNextSetDefaultOur.addEventListener("click", () => {
      if (!nextSetDraft) return;
      const defaults = getRawDefaultStartForScope("our");
      if (!defaults) return;
      nextSetDraft.our = defaults;
      renderNextSetLineups();
    });
  }
  if (elNextSetRotateCwOur) {
    elNextSetRotateCwOur.addEventListener("click", () => rotateNextSetCourt("our", "cw"));
  }
  if (elNextSetRotateCcwOur) {
    elNextSetRotateCcwOur.addEventListener("click", () => rotateNextSetCourt("our", "ccw"));
  }
  if (elNextSetRotationSelectOur) {
    elNextSetRotationSelectOur.addEventListener("change", () => {
      setNextSetRotation("our", elNextSetRotationSelectOur.value);
    });
  }
  if (elNextSetDefaultOpp) {
    elNextSetDefaultOpp.addEventListener("click", () => {
      if (!nextSetDraft) return;
      const defaults = getRawDefaultStartForScope("opponent");
      if (!defaults) return;
      nextSetDraft.opponent = defaults;
      renderNextSetLineups();
    });
  }
  if (elNextSetRotateCwOpp) {
    elNextSetRotateCwOpp.addEventListener("click", () => rotateNextSetCourt("opponent", "cw"));
  }
  if (elNextSetRotateCcwOpp) {
    elNextSetRotateCcwOpp.addEventListener("click", () => rotateNextSetCourt("opponent", "ccw"));
  }
  if (elNextSetRotationSelectOpp) {
    elNextSetRotationSelectOpp.addEventListener("change", () => {
      setNextSetRotation("opponent", elNextSetRotationSelectOpp.value);
    });
  }
  if (elNextSetSwapCourt) {
    elNextSetSwapCourt.addEventListener("change", () => {
      if (nextSetDraft) {
        nextSetDraft.swapCourt = !!elNextSetSwapCourt.checked;
      }
    });
  }
  if (elNextSetSideOur) {
    elNextSetSideOur.addEventListener("change", () => {
      if (!nextSetDraft) return;
      if (elNextSetSideOur.checked) {
        nextSetDraft.swapCourt = false;
      }
    });
  }
  if (elNextSetSideOpp) {
    elNextSetSideOpp.addEventListener("change", () => {
      if (!nextSetDraft) return;
      if (elNextSetSideOpp.checked) {
        nextSetDraft.swapCourt = true;
      }
    });
  }
  if (elNextSetServeOur) {
    elNextSetServeOur.addEventListener("change", () => {
      if (nextSetDraft && elNextSetServeOur.checked) {
        nextSetDraft.isServing = true;
      }
    });
  }
  if (elNextSetServeOpp) {
    elNextSetServeOpp.addEventListener("change", () => {
      if (nextSetDraft && elNextSetServeOpp.checked) {
        nextSetDraft.isServing = false;
      }
    });
  }
  if (elNextSetStart) {
    elNextSetStart.addEventListener("click", applyNextSetDraft);
  }
  if (elNextSetCancel) {
    elNextSetCancel.addEventListener("click", closeNextSetModal);
  }
  if (elNextSetClose) {
    elNextSetClose.addEventListener("click", closeNextSetModal);
  }
}
