import { isolation } from "./isolation.js";
import { roster } from "./roster.js";

function createOpponentSettings(deps) {
    const {
      state,
      saveState,
      normalizePlayers,
      parseDelimitedTeamText,
      buildNumbersForNames,
      syncOpponentPlayerNumbers,
      renderOpponentPlayersList,
      renderOpponentLiberoTags,
      onRenameReferences,
    } = deps || {};

    const rosterManager =
      roster &&
      typeof roster.createRosterManager === "function" &&
      roster.createRosterManager({
        state,
        saveState,
        normalizePlayers,
        buildNumbersForNames,
        syncNumbersFn: (names, provided) =>
          buildNumbersForNames(names, provided, state.opponentPlayerNumbers || {}),
        renderList: renderOpponentPlayersList,
        renderLiberoTags: renderOpponentLiberoTags,
        allowCaptain: true,
        canUpdateRoster: (nextPlayers, options = {}) => {
          if (options.allowDuringMatch) return true;
          const current = normalizePlayers(state.opponentPlayers || []);
          const same =
            current.length === nextPlayers.length &&
            current.every((name, index) => name === nextPlayers[index]);
          if (!same && Array.isArray(state.events) && state.events.length > 0) {
            alert(
              "Il roster avversario non può essere sostituito durante lo scout. Usa Modifica rapida per aggiungere o correggere giocatrici."
            );
            return false;
          }
          return true;
        },
        sanitizeState: () => {
          if (
            isolation &&
            typeof isolation.sanitizeRosterScope === "function"
          ) {
            isolation.sanitizeRosterScope(state, "opponent");
          }
        },
        onRenameReferences,
        liberoKey: "opponentLiberos",
        captainKey: "opponentCaptains",
        playersKey: "opponentPlayers",
        numbersKey: "opponentPlayerNumbers"
      });

    function updateOpponentPlayersList(players, options = {}) {
      if (!rosterManager) return false;
      return rosterManager.updateRoster(players, options);
    }

    function addOpponentPlayer(name) {
      if (!rosterManager) return;
      rosterManager.addPlayer(name);
    }

    function clearOpponentPlayers() {
      if (rosterManager) rosterManager.clearRoster();
    }

    const removeOpponentPlayerAtIndex = rosterManager ? rosterManager.removePlayerAtIndex : () => {};
    const renameOpponentPlayerAtIndex = rosterManager ? rosterManager.renamePlayerAtIndex : () => {};
    const handleOpponentNumberChange = rosterManager ? rosterManager.handleNumberChange : () => {};
    const toggleOpponentLibero = rosterManager ? rosterManager.toggleLibero : () => {};
    const setOpponentCaptain = rosterManager ? rosterManager.setCaptain : () => {};

    return {
      updateOpponentPlayersList,
      addOpponentPlayer,
      clearOpponentPlayers,
      handleOpponentNumberChange,
      renameOpponentPlayerAtIndex,
      removeOpponentPlayerAtIndex,
      toggleOpponentLibero,
      setOpponentCaptain
    };
  }
export const opponentRoster = Object.freeze({ createOpponentSettings });
