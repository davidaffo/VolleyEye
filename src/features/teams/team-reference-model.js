import { session as matchState } from "../../../js/globals.js";
import { saveMatchToStorage, loadMatchesMapFromStorage } from "../storage/match-repository.js";

export function renameTeamReferencesInNode(node, oldName, newName, scope = "our") {
  if (!node || typeof node !== "object") return 0;
  const keyNames =
    scope === "opponent"
      ? new Set(["selectedOpponentTeam", "opponent"])
      : new Set(["selectedTeam", "teamName"]);
  let changes = 0;
  const walk = value => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    Object.keys(value).forEach(key => {
      const current = value[key];
      if (typeof current === "string" && keyNames.has(key) && current.trim() === oldName) {
        value[key] = newName;
        changes += 1;
        return;
      }
      if (current && typeof current === "object") {
        walk(current);
      }
    });
  };
  walk(node);
  return changes;
}

export function renameTeamReferencesAcrossSavedMatches(oldName, newName, scope = "our") {
  if (!oldName || !newName || oldName === newName) return { matchesUpdated: 0, refsUpdated: 0 };
  const sourceMatches =
    (loadMatchesMapFromStorage());
  const matches = sourceMatches && typeof sourceMatches === "object" ? sourceMatches : {};
  let matchesUpdated = 0;
  let refsUpdated = 0;
  Object.entries(matches).forEach(([matchName, payload]) => {
    if (!payload || typeof payload !== "object") return;
    const cloned = JSON.parse(JSON.stringify(payload));
    const changed = renameTeamReferencesInNode(cloned, oldName, newName, scope);
    if (!changed) return;
    refsUpdated += changed;
    matchesUpdated += 1;
    matches[matchName] = cloned;
    saveMatchToStorage(matchName, cloned);
  });
  matchState.state.savedMatches = matches;
  if (scope === "our") {
    if ((matchState.state.selectedTeam || "").trim() === oldName) matchState.state.selectedTeam = newName;
    if (matchState.state.match && (matchState.state.match.teamName || "").trim() === oldName) {
      matchState.state.match.teamName = newName;
    }
  } else {
    if ((matchState.state.selectedOpponentTeam || "").trim() === oldName) matchState.state.selectedOpponentTeam = newName;
    if (matchState.state.match && (matchState.state.match.opponent || "").trim() === oldName) {
      matchState.state.match.opponent = newName;
    }
  }
  return { matchesUpdated, refsUpdated };
}
