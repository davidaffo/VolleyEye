import { session as matchState } from '../../../js/globals.js';
import { getCurrentMatchPayload } from '../teams/current-payload.js';
import { buildMatchDisplayName } from '../teams/match-details.js';
import { cloneIsolationData } from '../../domain/snapshots.js';
import { listMatchesFromStorage, loadMatchFromStorage, saveMatchToStorage } from './match-repository.js';
import { emitDomainEvent } from '../../domain/events.js';

export function makeUniqueMatchName(baseName, existingNames = []) {
  const base = String(baseName || "Match").trim() || "Match";
  const used = new Set(existingNames.map(name => String(name || "").trim()).filter(Boolean));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base} (${suffix})`)) suffix += 1;
  return `${base} (${suffix})`;
}

export function generateMatchName(base = "") {
  if (base) return base;
  const existingNames = Array.from(
    new Set([
      ...Object.keys(matchState.state.savedMatches || {}),
      ...listMatchesFromStorage()
    ])
  );
  return makeUniqueMatchName(buildMatchDisplayName(matchState.state.match), existingNames);
}

export function persistCurrentMatch(options = {}) {
  const { allowCreate = true } = options || {};
  if (typeof window !== "undefined") {
    const resetCooldownActive =
      Number.isFinite(window.__recentAppResetAt) &&
      Date.now() - window.__recentAppResetAt < 5000;
    if (window.__appResetInProgress || resetCooldownActive) {
      window.__resetWriteLog = window.__resetWriteLog || [];
      window.__resetWriteLog.push({
        kind: "persistCurrentMatch-blocked",
        at: new Date().toISOString(),
        allowCreate: !!allowCreate,
        selectedMatch: matchState.state && matchState.state.selectedMatch,
        loadedMatchName: matchState.state && matchState.state.loadedMatchName,
        stack: new Error().stack
      });
      return false;
    }
  }
  ;
  matchState.state.savedMatches = matchState.state.savedMatches || {};
  const currentName = (matchState.state.loadedMatchName || matchState.state.selectedMatch || "").trim();
  if (!currentName && !allowCreate) {
    return false;
  }
  if (!allowCreate) {
    const knownInMemory = !!(matchState.state.savedMatches && matchState.state.savedMatches[currentName]);
    const knownInStorage = !!loadMatchFromStorage(currentName);
    if (!knownInMemory && !knownInStorage) {
      return false;
    }
  }
  const desiredName = currentName || generateMatchName(matchState.state.loadedMatchName || matchState.state.selectedMatch);
  const payload = getCurrentMatchPayload(desiredName);
  matchState.state.loadedMatchName = desiredName;
  matchState.state.selectedMatch = desiredName;
  matchState.state.savedMatches[desiredName] = cloneIsolationData(payload);
  const stored = saveMatchToStorage(desiredName, payload);
  emitDomainEvent('match-archive-changed');
  return stored;
}
