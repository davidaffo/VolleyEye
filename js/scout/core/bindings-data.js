function bindDataAndNavigationControls() {
  setAutoRotateEnabled(state.autoRotate !== false);
  if (elRotationIndicator && elRotationSelect) {
    const openSelect = () => {
      elRotationSelect.focus();
      elRotationSelect.click();
    };
    elRotationIndicator.addEventListener("click", openSelect);
    elRotationIndicator.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openSelect();
      }
    });
  }
  // elementi mobile rimossi
  if (elBtnExportPdf) elBtnExportPdf.addEventListener("click", exportAnalysisPdf);
  if (elBtnExportHtml) elBtnExportHtml.addEventListener("click", exportAnalysisHtml);
  if (elBtnExportMatch) elBtnExportMatch.addEventListener("click", exportMatchToFile);
  if (elBtnExportDvw) elBtnExportDvw.addEventListener("click", exportDataVolleyToFile);
  if (elBtnImportMatch && elMatchFileInput) {
    elBtnImportMatch.addEventListener("click", () => elMatchFileInput.click());
    elMatchFileInput.addEventListener("change", e => {
      const file = e.target && e.target.files && e.target.files[0];
      if (file) handleImportMatchFile(file);
    });
  }
  if (elBtnResetMatch) elBtnResetMatch.addEventListener("click", resetMatch);
  if (elVideoFilterPresetSave) {
    elVideoFilterPresetSave.addEventListener("click", saveCurrentVideoFilterPreset);
  }
  if (elVideoFilterPresetName) {
    elVideoFilterPresetName.addEventListener("keydown", e => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      saveCurrentVideoFilterPreset();
    });
  }
  if (elBtnForceSyncLog) {
    elBtnForceSyncLog.addEventListener("click", () => {
      forceSyncDataFromLog();
      alert("Dati riallineati dal log.");
    });
  }
  if (elBtnBackfillPlayerIds) {
    elBtnBackfillPlayerIds.addEventListener("click", () => {
      const ok = confirm("Scrivere gli ID giocatrici in tutti i match salvati?");
      if (!ok) return;
      backfillPlayerIdsInSavedMatches();
    });
  }
  if (elBtnToggleTopbar) {
    elBtnToggleTopbar.addEventListener("click", () => {
      state.uiTopBarHidden = !state.uiTopBarHidden;
      applyTopBarVisibility();
      saveState({ persistLocal: true });
    });
  }
  if (elBtnResetApp) {
    elBtnResetApp.addEventListener("click", e => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      resetAppData();
    });
  }
  if (elBtnDeleteDemoData) {
    elBtnDeleteDemoData.addEventListener("click", e => {
      if (e) e.preventDefault();
      removeDefaultDemoData();
    });
    updateDefaultDemoDeleteButtonVisibility();
  }
  const elBtnForceRefreshApp = document.getElementById("btn-force-refresh-app");
  if (elBtnForceRefreshApp) {
    elBtnForceRefreshApp.addEventListener("click", forceRefreshAppAssets);
  }
  if (elBtnUndo) elBtnUndo.addEventListener("click", undoLastEvent);
  if (elBtnDvwScoutApply) {
    elBtnDvwScoutApply.addEventListener("click", () => {
      applyDvwScoutInput();
    });
  }
  if (elBtnDvwScoutClear) {
    elBtnDvwScoutClear.addEventListener("click", () => {
      dvwScoutPendingTokens = [];
      if (elDvwScoutInput) {
        elDvwScoutInput.value = "";
        elDvwScoutInput.focus();
      }
      renderDvwScoutPending();
      setDvwScoutStatus("Pronto.");
    });
  }
  if (elBtnDvwScoutHelp) {
    elBtnDvwScoutHelp.addEventListener("click", () => {
      openDvwScoutHelp();
    });
  }
  if (elDvwScoutInput) {
    elDvwScoutInput.addEventListener("input", () => {
      renderDvwScoutPending();
    });
    elDvwScoutInput.addEventListener("keydown", e => {
      e.stopPropagation();
      if (e.key === " " || e.key === "Tab") {
        const hasToken = String(elDvwScoutInput.value || "").trim();
        if (hasToken) {
          e.preventDefault();
          queueCurrentDvwScoutToken();
        }
        return;
      }
      if (e.key !== "Enter") return;
      e.preventDefault();
      applyDvwScoutInput();
    });
  }
  // pulsanti lineup mobile rimossi
  const elMobileMenuBtn = document.getElementById("btn-open-menu-mobile");
  const elMobileLogBtn = document.getElementById("btn-open-log-mobile");
  const elDrawerBackdrop = document.getElementById("scout-drawer-backdrop");
  const closeDrawers = () => {
    document.body.classList.remove("drawer-menu-open", "drawer-log-open");
  };
  if (elMobileMenuBtn) {
    elMobileMenuBtn.addEventListener("click", () => {
      document.body.classList.toggle("drawer-menu-open");
      document.body.classList.remove("drawer-log-open");
    });
  }
  if (elMobileLogBtn) {
    elMobileLogBtn.addEventListener("click", () => {
      document.body.classList.toggle("drawer-log-open");
      document.body.classList.remove("drawer-menu-open");
    });
  }
  if (elDrawerBackdrop) {
    elDrawerBackdrop.addEventListener("click", closeDrawers);
  }
  document.querySelectorAll("[data-close-drawer]").forEach(btn => {
    btn.addEventListener("click", closeDrawers);
  });
}
