function bindRosterAndArchiveControls() {
  [elCurrentSet].forEach(select => {
    if (!select || select.dataset.reactManaged === "true") return;
    select.addEventListener("change", () => setCurrentSet(select.value));
  });
  if (elThemeToggles.length) {
    elThemeToggles.filter(button => !button.dataset || button.dataset.reactManaged !== "true").forEach(button => button.addEventListener("click", () => {
      applyTheme(button.dataset.themeChoice);
      saveState();
    }));
    applyTheme(state.theme || "dark");
  }
  const elPastePlayersModal = document.getElementById("paste-players-modal");
  const closePastePlayersModal = () => {
    if (!elPastePlayersModal) return;
    elPastePlayersModal.classList.add("hidden");
    if (elTeamManagerModal && !elTeamManagerModal.classList.contains("hidden")) return;
    setGlobalModalState(false);
  };
  if (elBtnApplyPlayers && elBtnApplyPlayers.dataset.reactManaged !== "true") {
    elBtnApplyPlayers.addEventListener("click", () => {
      if (applyPlayersFromTextarea({ mode: "append" })) {
        closePastePlayersModal();
        if (elPlayersInput) {
          elPlayersInput.value = "";
        }
      }
    });
  }
  const elBtnReplacePlayers = document.getElementById("btn-replace-players");
  if (elBtnReplacePlayers && elBtnReplacePlayers.dataset.reactManaged !== "true") {
    elBtnReplacePlayers.addEventListener("click", () => {
      if (applyPlayersFromTextarea({ mode: "replace" })) {
        closePastePlayersModal();
        if (elPlayersInput) {
          elPlayersInput.value = "";
        }
      }
    });
  }
  if (elBtnApplyOpponentPlayers) {
    elBtnApplyOpponentPlayers.addEventListener("click", () => {
      applyOpponentPlayersFromTextarea();
    });
  }
  if (elBtnAddPlayer) {
    elBtnAddPlayer.addEventListener("click", addPlayerFromInput);
  }
  if (elBtnAddOpponentPlayer) {
    elBtnAddOpponentPlayer.addEventListener("click", addOpponentPlayerFromInput);
  }
  if (elNewPlayerInput) {
    elNewPlayerInput.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        addPlayerFromInput();
      }
    });
  }
  if (elNewOpponentPlayerInput) {
    elNewOpponentPlayerInput.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        addOpponentPlayerFromInput();
      }
    });
  }
  if (elPlayersList) {
    elPlayersList.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.classList.contains("pill-remove")) {
        const idx = parseInt(target.dataset.playerIdx, 10);
        if (!isNaN(idx)) {
          removePlayerAtIndex(idx);
        }
      }
    });
  }
  if (elBtnClearPlayers) {
    elBtnClearPlayers.addEventListener("click", () => {
      if (!state.players || state.players.length === 0) return;
      updatePlayersList([], { askReset: true });
    });
  }
  if (elBtnClearOpponentPlayers) {
    elBtnClearOpponentPlayers.addEventListener("click", clearOpponentPlayers);
  }
  if (elBtnSaveTeam) {
    elBtnSaveTeam.addEventListener("click", () => {
      const teamManagerModal = document.getElementById("team-manager-modal");
      if (teamManagerModal && !teamManagerModal.classList.contains("hidden") && typeof saveTeamManagerPayload === "function") {
        saveTeamManagerPayload({ closeModal: false });
        return;
      }
      saveCurrentTeam();
    });
  }
  if (elBtnOpenLineup && elBtnOpenLineup.dataset.reactManaged !== "true") {
    elBtnOpenLineup.addEventListener("click", () => {
      openMobileLineupModal();
    });
  }
  const elBtnOpenLineupOpp = document.getElementById("btn-open-lineup-opp");
  if (elBtnOpenLineupOpp && elBtnOpenLineupOpp.dataset.reactManaged !== "true") {
    elBtnOpenLineupOpp.addEventListener("click", () => {
      openMobileLineupModal("opponent");
    });
  }
  if (elBtnSaveOpponentTeam) {
    elBtnSaveOpponentTeam.addEventListener("click", saveCurrentOpponentTeam);
  }
  if (elBtnOpenTeamManager && elBtnOpenTeamManager.dataset.reactManaged !== "true") {
    elBtnOpenTeamManager.addEventListener("click", () => openTeamManagerModal("our"));
  }
  {
    const elBtnOpenLiveTeamEditor = document.getElementById("btn-open-live-team-editor");
    if (elBtnOpenLiveTeamEditor && elBtnOpenLiveTeamEditor.dataset.reactManaged !== "true") {
      elBtnOpenLiveTeamEditor.addEventListener("click", () => openTeamManagerModal({ scope: "our", liveEdit: true }));
    }
  }
  {
    const elBtnOpenLiveOpponentTeamEditor = document.getElementById("btn-open-live-opponent-team-editor");
    if (elBtnOpenLiveOpponentTeamEditor && elBtnOpenLiveOpponentTeamEditor.dataset.reactManaged !== "true") {
      elBtnOpenLiveOpponentTeamEditor.addEventListener("click", () =>
        openTeamManagerModal({ scope: "opponent", liveEdit: true })
      );
    }
  }
  const elBtnNewTeam = document.getElementById("btn-new-team");
  if (elBtnNewTeam && elBtnNewTeam.dataset.reactManaged !== "true") {
    elBtnNewTeam.addEventListener("click", createManagedTeam);
  }
  const elBtnDuplicateTeam = document.getElementById("btn-duplicate-team");
  if (elBtnDuplicateTeam) {
    elBtnDuplicateTeam.addEventListener("click", () => {
      if (typeof duplicateSelectedTeam === "function") {
        duplicateSelectedTeam();
      }
    });
  }
  if (elBtnOpenOpponentTeamManager) {
    elBtnOpenOpponentTeamManager.addEventListener("click", () => openTeamManagerModal("opponent"));
  }
  if (elLineupModalClose && elLineupModalClose.dataset.reactManaged !== "true") {
    elLineupModalClose.addEventListener("click", closeLineupModal);
  }
  if (elLineupModalCancel && elLineupModalCancel.dataset.reactManaged !== "true") {
    elLineupModalCancel.addEventListener("click", closeLineupModal);
  }
  if (elLineupModalSaveOverride && elLineupModalSaveOverride.dataset.reactManaged !== "true") {
    elLineupModalSaveOverride.addEventListener("click", () => {
      saveLineupModal({ countSubstitutions: false });
    });
  }
  if (elLineupModalSaveSubstitution && elLineupModalSaveSubstitution.dataset.reactManaged !== "true") {
    elLineupModalSaveSubstitution.addEventListener("click", () => {
      saveLineupModal({ countSubstitutions: true });
    });
  }
  if (elLineupModalApplyDefault && elLineupModalApplyDefault.dataset.reactManaged !== "true") {
    elLineupModalApplyDefault.addEventListener("click", applyDefaultLineupToModal);
  }
  if (elLineupModalToggleNumbers && elLineupModalToggleNumbers.dataset.reactManaged !== "true") {
    elLineupModalToggleNumbers.addEventListener("click", () => {
      lineupNumberMode = !lineupNumberMode;
      renderLineupModal();
    });
  }
  if (elLineupModal && elLineupModal.dataset.reactManaged !== "true") {
    elLineupModal.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.closeLineup !== undefined) {
        closeLineupModal();
      }
    });
  }
  if (elTeamManagerClose && elTeamManagerClose.dataset.reactManaged !== "true") {
    elTeamManagerClose.addEventListener("click", closeTeamManagerModal);
  }
  if (elTeamManagerCancel && elTeamManagerCancel.dataset.reactManaged !== "true") {
    elTeamManagerCancel.addEventListener("click", closeTeamManagerModal);
  }
  if (elTeamManagerAdd && elTeamManagerAdd.dataset.reactManaged !== "true") {
    elTeamManagerAdd.addEventListener("click", addManagedTeamPlayer);
  }
  if (elTeamManagerSave && elTeamManagerSave.dataset.reactManaged !== "true") {
    elTeamManagerSave.addEventListener("click", () => {
      saveTeamManagerPayload();
    });
  }
  if (elTeamManagerModal && elTeamManagerModal.dataset.reactManaged !== "true") {
    elTeamManagerModal.addEventListener("click", e => {
      const target = e.target;
      if (target === elTeamManagerModal || (target && target.classList && target.classList.contains("team-modal__backdrop"))) {
        closeTeamManagerModal();
      }
    });
  }
  const elBtnOpenPlayersPaste = document.getElementById("btn-open-players-paste");
  if (elBtnOpenPlayersPaste && elBtnOpenPlayersPaste.dataset.reactManaged !== "true") {
    elBtnOpenPlayersPaste.addEventListener("click", openManagedPlayersPaste);
  }
  if (typeof elBtnImportCamp3 !== "undefined" && elBtnImportCamp3 && elBtnImportCamp3.dataset.reactManaged !== "true" && typeof elCamp3FileInput !== "undefined" && elCamp3FileInput) {
    elBtnImportCamp3.addEventListener("click", () => {
      elCamp3FileInput.value = "";
      elCamp3FileInput.click();
    });
    elCamp3FileInput.addEventListener("change", async e => {
      const input = e.target;
      const file = input && input.files && input.files[0];
      if (!file || typeof importCamp3IntoTeamManager !== "function") return;
      const previousLabel = elBtnImportCamp3.textContent;
      elBtnImportCamp3.disabled = true;
      elBtnImportCamp3.textContent = "Lettura CAMP3...";
      try {
        await importCamp3IntoTeamManager(file);
      } catch (err) {
        logError("Errore import CAMP3", err);
        alert("CAMP3 non leggibile. Per PDF o foto serve connessione per caricare il motore di lettura.");
      } finally {
        elBtnImportCamp3.disabled = false;
        elBtnImportCamp3.textContent = previousLabel || "Importa CAMP3";
        elCamp3FileInput.value = "";
      }
    });
  }
  if (typeof elCamp3ConfirmApply !== "undefined" && elCamp3ConfirmApply && elCamp3ConfirmApply.dataset.reactManaged !== "true") {
    elCamp3ConfirmApply.addEventListener("click", () => closeCamp3ConfirmModal(true));
  }
  if (typeof elCamp3ConfirmCancel !== "undefined" && elCamp3ConfirmCancel && elCamp3ConfirmCancel.dataset.reactManaged !== "true") {
    elCamp3ConfirmCancel.addEventListener("click", () => closeCamp3ConfirmModal(false));
  }
  if (typeof elCamp3ConfirmClose !== "undefined" && elCamp3ConfirmClose && elCamp3ConfirmClose.dataset.reactManaged !== "true") {
    elCamp3ConfirmClose.addEventListener("click", () => closeCamp3ConfirmModal(false));
  }
  if (typeof elCamp3ConfirmModal !== "undefined" && elCamp3ConfirmModal && elCamp3ConfirmModal.dataset.reactManaged !== "true") {
    elCamp3ConfirmModal.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.closeCamp3Confirm !== undefined || target === elCamp3ConfirmModal) {
        closeCamp3ConfirmModal(false);
      }
    });
  }
  if (elPastePlayersModal && elPastePlayersModal.dataset.reactManaged !== "true") {
    elPastePlayersModal.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest("[data-close-paste]")) {
        closePastePlayersModal();
      }
    });
  }
  if (elTeamManagerDup && elTeamManagerDup.dataset.reactManaged !== "true") {
    elTeamManagerDup.addEventListener("click", duplicateManagedTeamPlayers);
  }
  if (elTeamManagerTemplate && elTeamManagerTemplate.dataset.reactManaged !== "true") {
    elTeamManagerTemplate.addEventListener("click", generateManagedTeamTemplate);
  }
  if (elBtnDeleteTeam) {
    elBtnDeleteTeam.addEventListener("click", deleteSelectedTeam);
  }
  if (elBtnDeleteOpponentTeam) {
    elBtnDeleteOpponentTeam.addEventListener("click", deleteSelectedOpponentTeam);
  }
  if (elBtnRenameOpponentTeam) {
    elBtnRenameOpponentTeam.addEventListener("click", renameSelectedOpponentTeam);
  }
  if (elBtnExportTeam && elBtnExportTeam.dataset.reactManaged !== "true") {
    elBtnExportTeam.addEventListener("click", exportCurrentTeamToFile);
  }
  if (elBtnExportOpponentTeam) {
    elBtnExportOpponentTeam.addEventListener("click", exportCurrentOpponentTeamToFile);
  }
  if (elBtnImportTeam && elTeamFileInput) {
    elBtnImportTeam.addEventListener("click", () => {
      elTeamFileInput.value = "";
      elTeamFileInput.click();
    });
    elTeamFileInput.addEventListener("change", e => {
      const input = e.target;
      const file = input && input.files && input.files[0];
      if (file) importTeamFromFile(file);
    });
  }
  if (elBtnImportOpponentTeam && elOpponentTeamFileInput) {
    elBtnImportOpponentTeam.addEventListener("click", () => {
      elOpponentTeamFileInput.value = "";
      elOpponentTeamFileInput.click();
    });
    elOpponentTeamFileInput.addEventListener("change", e => {
      const input = e.target;
      const file = input && input.files && input.files[0];
      if (file) importOpponentTeamFromFile(file);
    });
  }
  if (elBtnDeleteMatch && elBtnDeleteMatch.dataset.reactManaged !== "true") {
    elBtnDeleteMatch.addEventListener("click", deleteSelectedMatch);
  }
  if (elBtnExportDb && elBtnExportDb.dataset.reactManaged !== "true") {
    elBtnExportDb.addEventListener("click", exportDatabaseToFile);
  }
  if (elBtnImportDb && elBtnImportDb.dataset.reactManaged !== "true" && elDbFileInput) {
    elBtnImportDb.addEventListener("click", () => {
      elDbFileInput.value = "";
      elDbFileInput.click();
    });
    elDbFileInput.addEventListener("change", e => {
      const input = e.target;
      const file = input && input.files && input.files[0];
      if (file) handleImportDatabaseFile(file);
    });
  }
  if (elBtnImportDbUrl && elBtnImportDbUrl.dataset.reactManaged !== "true" && elImportDbUrl) {
    elBtnImportDbUrl.addEventListener("click", () => {
      importDatabaseFromUrl(elImportDbUrl.value || "");
    });
  }
  if (elBtnOpenMatchManager) {
    elBtnOpenMatchManager.addEventListener("click", openMatchManagerModal);
  }
  const elBtnOpenTeamsManager = document.getElementById("btn-open-teams-manager");
  if (elBtnOpenTeamsManager && elBtnOpenTeamsManager.dataset.reactManaged !== "true") {
    elBtnOpenTeamsManager.addEventListener("click", openTeamsManagerModal);
  }
  const elBtnOpenPlayersDb = document.getElementById("btn-open-players-db");
  if (elBtnOpenPlayersDb) {
    elBtnOpenPlayersDb.addEventListener("click", openPlayersDbModal);
  }
  if (elMatchManagerClose) {
    elMatchManagerClose.addEventListener("click", closeMatchManagerModal);
  }
  if (elPlayersDbClose && elPlayersDbClose.dataset.reactManaged !== "true") {
    elPlayersDbClose.addEventListener("click", closePlayersDbModal);
  }
  if (elPlayersDbClean && elPlayersDbClean.dataset.reactManaged !== "true") {
    elPlayersDbClean.addEventListener("click", removeOrphanPlayersFromDb);
  }
  if (elBtnMergePlayers && elBtnMergePlayers.dataset.reactManaged !== "true") {
    elBtnMergePlayers.addEventListener("click", async () => {
      if (!elPlayersDbMergePrimary || !elPlayersDbMergeSecondary) return;
      const primaryId = elPlayersDbMergePrimary.value || "";
      const secondaryId = elPlayersDbMergeSecondary.value || "";
      if (!primaryId || !secondaryId || primaryId === secondaryId) {
        alert("Seleziona due giocatrici diverse da unire.");
        return;
      }
      const ok = confirm("Unire le due giocatrici selezionate mantenendo l'ID della prima?");
      if (!ok) return;
      const merged = await mergePlayersDbEntries(primaryId, secondaryId);
      if (!merged) {
        alert("Unione non riuscita. Verifica che entrambe esistano nell'archivio.");
        return;
      }
      renderPlayersDbList();
      alert("Giocatrici unite. ID aggiornati nei match.");
    });
  }
  if (elBtnOpenDebugModal && elBtnOpenDebugModal.dataset.reactManaged !== "true") {
    elBtnOpenDebugModal.addEventListener("click", openDebugModal);
  }
  if (elDebugModalClose && elDebugModalClose.dataset?.reactManaged !== "true") {
    elDebugModalClose.addEventListener("click", closeDebugModal);
  }
  if (elTeamsManagerClose && elTeamsManagerClose.dataset.reactManaged !== "true") {
    elTeamsManagerClose.addEventListener("click", closeTeamsManagerModal);
  }
  if (elTeamsManagerOpenTeam && elTeamsManagerOpenTeam.dataset.reactManaged !== "true") {
    elTeamsManagerOpenTeam.addEventListener("click", openSelectedManagedTeam);
  }
  if (elMatchManagerModal) {
    elMatchManagerModal.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.closeMatchManager !== undefined) {
        closeMatchManagerModal();
      }
    });
  }
  if (elPlayersDbModal && elPlayersDbModal.dataset.reactManaged !== "true") {
    elPlayersDbModal.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.closePlayersDb !== undefined) {
        closePlayersDbModal();
      }
    });
  }
  if (elDebugModal && elDebugModal.dataset?.reactManaged !== "true") {
    elDebugModal.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.closeDebugModal !== undefined || target.classList.contains("settings-modal__backdrop")) {
        closeDebugModal();
      }
    });
  }
  if (elTeamsManagerModal && elTeamsManagerModal.dataset.reactManaged !== "true") {
    elTeamsManagerModal.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.closeTeamsManager !== undefined) {
        closeTeamsManagerModal();
      }
    });
  }
  if (elTeamsManagerDelete && elTeamsManagerDelete.dataset.reactManaged !== "true") {
    elTeamsManagerDelete.addEventListener("click", deleteSelectedManagedTeam);
  }
  if (elTeamsManagerDuplicate && elTeamsManagerDuplicate.dataset.reactManaged !== "true") {
    elTeamsManagerDuplicate.addEventListener("click", duplicateSelectedManagedTeam);
  }
  if (elTeamsManagerExport && elTeamsManagerExport.dataset.reactManaged !== "true") {
    elTeamsManagerExport.addEventListener("click", exportSelectedManagedTeam);
  }
  if (elTeamsManagerImport && elTeamsManagerFileInput && elTeamsManagerImport.dataset.reactManaged !== "true") {
    elTeamsManagerImport.addEventListener("click", () => {
      elTeamsManagerFileInput.value = "";
      elTeamsManagerFileInput.click();
    });
    elTeamsManagerFileInput.addEventListener("change", e => {
      const input = e.target;
      const file = input && input.files && input.files[0];
      if (file) {
        importTeamToStorageOnly(file);
      }
      renderTeamsManagerList();
    });
  }
  if (elTeamsManagerOpenPlayersDb && elTeamsManagerOpenPlayersDb.dataset.reactManaged !== "true") {
    elTeamsManagerOpenPlayersDb.addEventListener("click", openPlayersDbModal);
  }
  if (elSavedMatchesList && elSavedMatchesList.dataset.reactManaged !== "true") {
    elSavedMatchesList.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest(".match-list-open");
      if (!btn) return;
      const name = btn.dataset.matchName || "";
      if (elSavedMatchesSelect && elSavedMatchesSelect.dataset.reactManaged !== "true") {
        elSavedMatchesSelect.value = name;
      }
      state.selectedMatch = name;
      renderMatchesList(Object.keys(state.savedMatches || {}), name);
      updateMatchButtonsState();
    });
  }
  document.querySelectorAll("[data-edit-match]").forEach(button => {
    if (button.dataset.reactManaged === "true") return;
    button.addEventListener("click", () => openNewMatchModal("edit"));
  });
  if (elBtnNewMatch && elBtnNewMatch.dataset.reactManaged !== "true") {
    elBtnNewMatch.addEventListener("click", () => {
      if (typeof createNewMatchFromPrompt === "function") {
        createNewMatchFromPrompt();
        return;
      }
      if (!elSavedMatchesSelect) return;
      elSavedMatchesSelect.value = "";
      loadSelectedMatch();
    });
  }
  const newMatchModal = document.getElementById("new-match-modal");
  const newMatchTeam = document.getElementById("new-match-team");
  const newMatchConfirm = document.getElementById("new-match-confirm");
  if (newMatchModal && newMatchModal.dataset.reactManaged !== "true") {
    newMatchModal.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.closeNewMatch !== undefined || target.id === "new-match-close") {
        if (typeof closeNewMatchModal === "function") closeNewMatchModal();
      }
    });
    newMatchModal.querySelectorAll('input[name="new-match-mode"]').forEach(input => {
      input.addEventListener("change", () => {
        if (typeof updateNewMatchModeUI === "function") updateNewMatchModeUI();
      });
    });
  }
  if (newMatchTeam && newMatchModal && newMatchModal.dataset.reactManaged !== "true") {
    newMatchTeam.addEventListener("change", () => {
      if (typeof populateNewMatchTeamSelects === "function") populateNewMatchTeamSelects();
    });
  }
  if (newMatchConfirm && newMatchModal && newMatchModal.dataset.reactManaged !== "true") {
    newMatchConfirm.addEventListener("click", () => {
      const selectedMode = document.querySelector('input[name="new-match-mode"]:checked');
      const setup = {
        teamName: (document.getElementById("new-match-team") || {}).value || "",
        mode: selectedMode ? selectedMode.value : "single",
        opponentTeam: (document.getElementById("new-match-opponent-team") || {}).value || "",
        opponentManual: (document.getElementById("new-match-opponent-name") || {}).value || "",
        category: elCategory.value,
        date: elDate.value,
        matchType: elMatchType.value,
        leg: elLeg.value
      };
      const created = newMatchModal.dataset.mode === "edit"
        ? saveMatchDetailsFromSetup(setup)
        : createNewMatchFromSetup(setup);
      if (created && typeof closeNewMatchModal === "function") closeNewMatchModal();
    });
  }
  const newMatchManageTeams = document.getElementById("new-match-manage-teams");
  if (newMatchManageTeams && newMatchModal && newMatchModal.dataset.reactManaged !== "true") {
    newMatchManageTeams.addEventListener("click", () => {
      if (typeof closeNewMatchModal === "function") closeNewMatchModal();
      if (typeof setActiveTab === "function") setActiveTab("info");
      if (typeof openTeamsManagerModal === "function") openTeamsManagerModal();
    });
  }
  if (elBtnLoadMatch && elBtnLoadMatch.dataset.reactManaged !== "true") {
    elBtnLoadMatch.addEventListener("click", () => {
      if (typeof enterSelectedMatch === "function") {
        enterSelectedMatch();
      } else {
        loadSelectedMatch();
      }
    });
  }
  document.querySelectorAll("[data-exit-match]").forEach(exitButton => {
    if (exitButton.dataset.reactManaged === "true") return;
    exitButton.addEventListener("click", () => {
      if (typeof exitCurrentMatch === "function") exitCurrentMatch();
    });
  });
  if (elTeamsSelect) {
    elTeamsSelect.addEventListener("change", handleTeamSelectChange);
  }
  if (elOpponentTeamsSelect) {
    elOpponentTeamsSelect.addEventListener("change", () => {
      handleOpponentTeamSelectChange();
    });
  }
  if (elSavedMatchesSelect && elSavedMatchesSelect.dataset.reactManaged !== "true") {
    elSavedMatchesSelect.addEventListener("change", () => {
      updateMatchButtonsState();
      state.selectedMatch = elSavedMatchesSelect.value || "";
      if (typeof renderMatchesList === "function") {
        renderMatchesList(Object.keys(state.savedMatches || {}), state.selectedMatch);
      }
    });
  }
}

function openSelectedManagedTeam() {
      const name = teamsManagerSelectedName;
      if (!name) return;
      const team = typeof loadTeamFromStorage === "function" ? loadTeamFromStorage(name) : null;
      if (!team) {
        alert("Squadra non trovata o corrotta.");
        return;
      }
      if (typeof openTeamManagerModal === "function") {
        closeTeamsManagerModal();
        openTeamManagerModal({ scope: "our", storageOnly: true, source: team });
        return;
      }
      state.selectedTeam = name;
      if (typeof renderTeamsSelect === "function") renderTeamsSelect();
      closeTeamsManagerModal();
      openTeamManagerModal("our");
}

function deleteSelectedManagedTeam() {
      const name = teamsManagerSelectedName;
      if (!name) return;
      const ok = confirm("Eliminare la squadra \"" + name + "\"?");
      if (!ok) return;
      if (typeof deleteTeamFromStorage === "function") {
        deleteTeamFromStorage(name);
      }
      if (typeof syncTeamsFromStorage === "function") syncTeamsFromStorage();
      if (typeof renderTeamsSelect === "function") renderTeamsSelect();
      if (typeof renderOpponentTeamsSelect === "function") renderOpponentTeamsSelect();
      renderTeamsManagerList();
}

function duplicateSelectedManagedTeam() {
      const name = teamsManagerSelectedName;
      if (!name) return;
      const team = typeof loadTeamFromStorage === "function" ? loadTeamFromStorage(name) : null;
      if (!team) {
        alert("Squadra non trovata o corrotta.");
        return;
      }
      let newName = prompt("Nome della nuova squadra:", name + " (copia)") || "";
      newName = newName.trim();
      if (!newName) return;
      if (newName === name) {
        alert("Scegli un nome diverso per la copia.");
        return;
      }
      const names = typeof listTeamsFromStorage === "function" ? listTeamsFromStorage() : [];
      if (names.includes(newName)) {
        const ok = confirm("Esiste già una squadra con questo nome. Sovrascrivere?");
        if (!ok) return;
      }
      if (typeof saveTeamToStorage === "function") {
        if (!saveTeamToStorage(newName, team)) {
          alert("Impossibile creare la copia. Controlla lo spazio disponibile nel browser.");
          return;
        }
      }
      if (typeof syncTeamsFromStorage === "function") syncTeamsFromStorage();
      if (typeof renderTeamsSelect === "function") renderTeamsSelect();
      if (typeof renderOpponentTeamsSelect === "function") renderOpponentTeamsSelect();
      teamsManagerSelectedName = newName;
      renderTeamsManagerList();
}

function exportSelectedManagedTeam() {
      const name = teamsManagerSelectedName;
      if (!name) return;
      const team = typeof loadTeamFromStorage === "function" ? loadTeamFromStorage(name) : null;
      if (!team) {
        alert("Squadra non trovata o corrotta.");
        return;
      }
      const payload = typeof compactTeamPayload === "function" ? compactTeamPayload(team, name) : team;
      const slug = (name || "squadra").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
      if (typeof downloadBlob === "function") {
        downloadBlob(blob, "squadra_" + (slug || "export") + ".json");
      }
}

function createManagedTeam() {
      if (typeof openNewTeamManager === "function") {
        openNewTeamManager();
        return;
      }
      openTeamManagerModal("our");
}

function addManagedTeamPlayer() {
      if (!teamManagerState) {
        openTeamManagerModal(teamManagerScope || "our");
        return;
      }
      const nextPlayer = {
        id: typeof generatePlayerId === "function" ? generatePlayerId() : Date.now() + "_" + Math.random(),
        name: "",
        firstName: "",
        lastName: "",
        number: "",
        role: "",
        isCaptain: false,
        out: false
      };
      if (typeof teamManagerLiveEditMode !== "undefined" && teamManagerLiveEditMode) {
        teamManagerState.players.push(nextPlayer);
      } else {
        teamManagerState.players.unshift(nextPlayer);
      }
      renderTeamManagerTable();
}

function duplicateManagedTeamPlayers() {
      if (!teamManagerState) {
        openTeamManagerModal(teamManagerScope || "our");
        return;
      }
      const clone = JSON.parse(JSON.stringify(teamManagerState.players || []));
      teamManagerState.players = clone.map(p =>
        (() => {
          const firstName = String(p.firstName || "").trim();
          const lastName = (String(p.lastName || "").trim() || (!firstName ? String(p.name || "").trim() : "")) + " (dup)";
          return Object.assign({}, p, {
            id: typeof generatePlayerId === "function" ? generatePlayerId() : Date.now() + "_" + Math.random(),
            name: buildFullName(lastName, firstName),
            firstName,
            lastName
          });
        })()
      );
      renderTeamManagerTable();
}

function generateManagedTeamTemplate() {
      const playersDetailed =
        typeof buildTemplatePlayersDetailed === "function"
          ? buildTemplatePlayersDetailed()
          : TEMPLATE_TEAM.players.map((name, idx) => {
              return {
                id: typeof generatePlayerId === "function" ? generatePlayerId() : idx + "_" + name,
                name,
                firstName: "",
                lastName: name,
                number: String(idx + 1),
                role: TEMPLATE_TEAM.liberos.includes(name) ? "L" : "",
                isCaptain: idx === 0,
                out: false
              };
            });
      teamManagerState = {
        name: teamManagerScope === "opponent" ? state.selectedOpponentTeam || "Avversaria" : state.selectedTeam || "Squadra",
        staff: Object.assign({}, DEFAULT_STAFF),
        players: playersDetailed,
        defaultRotation: 1,
        defaultLineup:
          typeof buildRoleBasedDefaultLineup === "function"
            ? buildRoleBasedDefaultLineup(TEMPLATE_TEAM.players)
            : TEMPLATE_TEAM.players.slice(0, 6)
      };
      renderTeamManagerTable();
}

function openManagedPlayersPaste() {
  const elPastePlayersModal=document.getElementById("paste-players-modal");
  if(elPastePlayersModal?.dataset.reactManaged === "true" && typeof pastePlayersStore !== "undefined"){
    pastePlayersStore.publish({open:true,text:""});setGlobalModalState(true);return;
  }
      if (elPlayersInput) {
        elPlayersInput.value = "";
      }
      if (elPastePlayersModal) {
        elPastePlayersModal.classList.remove("hidden");
        setGlobalModalState(true);
      }
      if (elPlayersInput) {
        elPlayersInput.focus();
      }
}
