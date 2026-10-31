import { DV_SKILLS_BY_CODE } from "./datavolley-skills.js";
import { session as teamManagementState } from "../state/live-team-management.js";
import { dvwEntryStore } from "../../state/roster-import-store.mjs";
import { publishReactDvwEntry } from "../scout/code-entry.js";
import { expandDvwCompoundToken, normalizeDvwScoutToken, decodeDvwSetType, decodeDvwServeType, parseDvwSkillCode } from "./datavolley-codec.js";
import { session as matchState } from "../../../js/globals.js";
import { getDataVolleyTeamPayload, computeDataVolleyEventSignature } from "./datavolley-export.js";
import { padDv, parseDvwZoneMeta, parseDvwSuffixMeta } from "./datavolley-format.js";
import { getTeamScopeFromEvent, getPlayersForScope, getPlayerNumbersForScope } from "../teams/selectors.js";
import { normalizeDataVolleyEventMeta } from "../teams/player-identity.js";
import { recordOpponentTimeoutEvent, recordTimeoutEvent } from "../video/video-events.js";
import { renderEventsLog } from "../events/log-view.js";
import { saveState } from "../storage/save-state.js";
import { handleEventClick } from "../live/event-recording.js";
import { renderVideoAnalysis } from "../video/playback.js";
import { renderTrajectoryAnalysis, renderServeTrajectoryAnalysis } from "../analysis/trajectory-rendering.js";
import { setDvwScoutStatus, updateLiveDvwMirror } from "./datavolley-entry-view.js";

export function queueCurrentDvwScoutToken() {
  const token = String(dvwEntryStore.getSnapshot().text || "").trim();
  if (!token) return false;
  const expanded = expandDvwCompoundToken(token);
  const entries = expanded && expanded.length
    ? expanded.map(item => normalizeDvwScoutToken(item))
    : [normalizeDvwScoutToken(token)];
  if (entries.some(item => !item.parsed || item.parsed.kind === "unknown")) {
    setDvwScoutStatus(`Codice non riconosciuto: ${token}`, "error");
    publishReactDvwEntry();
    return false;
  }
  const closedAtMs = Date.now();
  entries.forEach(normalized => {
    teamManagementState.dvwScoutPendingTokens.push({
      id: `dvw-pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: normalized.normalized || token,
      rawText: token,
      closedAtMs,
      parsed: normalized.parsed,
      corrected: !!normalized.corrected || !!expanded
    });
  });
  dvwEntryStore.publish({ text: "" });
  publishReactDvwEntry();
  if (expanded && expanded.length > 1) {
    setDvwScoutStatus(`Compound espanso: ${expanded.join(" · ")}`, "success");
  } else if (entries[0].corrected && entries[0].normalized) {
    setDvwScoutStatus(`Token autocorretto: ${token} → ${entries[0].normalized}`, "success");
  } else {
    setDvwScoutStatus(`Token aggiunto: ${token}`);
  }
  return true;
}


export function openDvwScoutHelp() {
  const helpUrl = new URL("docs/codici_scouting.html", window.location.href).toString();
  window.open(helpUrl, "_blank", "noopener");
}

export function getPlayerIdxByDvNumber(scope, dvNumber) {
  const normalizedNumber = padDv(dvNumber, 2);
  const players = getPlayersForScope(scope);
  const numbers = getPlayerNumbersForScope(scope) || {};
  return players.findIndex(name => padDv(numbers[name], 2) === normalizedNumber);
}

export function syncLiveEventWithDecodedDvw(event, decoded, rawCode) {
  if (!event || !decoded || decoded.kind !== "skill") return;
  const zoneMeta = decoded.zoneMeta || parseDvwZoneMeta(decoded.zonePair);
  const suffixMeta = parseDvwSuffixMeta(decoded.skillLetter, decoded.inlineCode, decoded.suffix || "");
  const scope = getTeamScopeFromEvent(event);
  const startZoneNum = zoneMeta.startZone ? Number(zoneMeta.startZone) : null;
  const endZoneNum = zoneMeta.endZone ? Number(zoneMeta.endZone) : null;
  event.dv = normalizeDataVolleyEventMeta(
    Object.assign({}, event.dv || {}, {
      skillType: decoded.typeLetter,
      attackCode: decoded.skillLetter === "A" ? decoded.advancedCode : event.dv && event.dv.attackCode,
      setCode: decoded.skillLetter === "E" ? decoded.advancedCode : event.dv && event.dv.setCode,
      setType:
        decoded.skillLetter === "A" || decoded.skillLetter === "E"
          ? decodeDvwSetType(decoded.typeLetter) || ""
          : event.dv && event.dv.setType,
      skillSubtype: suffixMeta.skillSubtype,
      specialCode: suffixMeta.specialCode,
      startZone: zoneMeta.startZone || "",
      endZone: zoneMeta.endZone || "",
      endSubzone: zoneMeta.endSubzone || "",
      endCone: zoneMeta.endCone || "",
      numPlayersNumeric: Number.isFinite(suffixMeta.numPlayersNumeric) ? suffixMeta.numPlayersNumeric : null,
      rawCode: rawCode || "",
      rawCodeSignature: ""
    })
  );
  if (decoded.skillLetter === "S") {
    event.serveType = decodeDvwServeType(decoded.typeLetter) || event.serveType || "JF";
    if (startZoneNum) {
      event.zone = startZoneNum;
      event.originZone = startZoneNum;
      event.playerPosition = startZoneNum;
    }
  }
  if (decoded.skillLetter === "R" || decoded.skillLetter === "D" || decoded.skillLetter === "F") {
    if (startZoneNum) {
      event.zone = startZoneNum;
      event.originZone = startZoneNum;
      event.playerPosition = startZoneNum;
    }
  }
  if (decoded.skillLetter === "A") {
    if (decoded.advancedCode) {
      event.attackType = decoded.advancedCode;
    }
    const decodedSetType = decodeDvwSetType(decoded.typeLetter);
    if (decodedSetType) event.setType = decodedSetType;
    if (startZoneNum) {
      event.zone = startZoneNum;
      event.originZone = startZoneNum;
      event.playerPosition = startZoneNum;
      event.attackStartZone = startZoneNum;
    }
    if (endZoneNum) {
      event.attackEndZone = endZoneNum;
    }
  }
  if (decoded.skillLetter === "E") {
    if (decoded.advancedCode) {
      event.base = decoded.advancedCode;
    }
    const decodedSetType = decodeDvwSetType(decoded.typeLetter);
    if (decodedSetType) event.setType = decodedSetType;
  }
  if (decoded.skillLetter === "B" && Number.isFinite(suffixMeta.numPlayersNumeric)) {
    event.blockNumber = suffixMeta.numPlayersNumeric;
  }
  event.dv.rawCodeSignature = computeDataVolleyEventSignature(event, getDataVolleyTeamPayload(scope));
}

export function findLiveEventFromDvwApply(startIndex, skillId, code, playerName, scope = "our") {
  const appended = (matchState.state.events || []).slice(startIndex);
  for (let idx = appended.length - 1; idx >= 0; idx -= 1) {
    const ev = appended[idx];
    if (!ev || ev.skillId !== skillId || ev.code !== code) continue;
    if (getTeamScopeFromEvent(ev) !== scope) continue;
    if ((ev.playerName || "") !== (playerName || "")) continue;
    return ev;
  }
  return null;
}

export async function applyDvwScoutToken(rawToken, options = {}) {
  const token = String(rawToken || "").trim();
  const closedAtMs = Number(options.closedAtMs);
  if (!token) return { ok: true, message: "" };
  const decoded = parseDvwSkillCode(token);
  if (!decoded || decoded.kind === "unknown") {
    return { ok: false, message: `Codice non riconosciuto: ${token}` };
  }
  if (decoded.kind === "timeout") {
    const prevLen = Array.isArray(matchState.state.events) ? matchState.state.events.length : 0;
    if (decoded.teamScope === "opponent") {
      if (!matchState.state.useOpponentTeam) {
        return { ok: false, message: `Timeout avversario non disponibile senza doppia squadra: ${token}` };
      }
      recordOpponentTimeoutEvent();
    } else {
      recordTimeoutEvent();
    }
    const timeoutEvent = (matchState.state.events || []).slice(prevLen).find(ev => ev && ev.actionType === "timeout");
    if (timeoutEvent && Number.isFinite(closedAtMs)) {
      timeoutEvent.t = new Date(closedAtMs).toISOString();
      saveState({ persistLocal: true });
      renderEventsLog({ suppressScroll: true });
    }
    return { ok: true, message: token };
  }
  if (decoded.kind !== "skill") {
    return { ok: false, message: `Tipo codice non ancora supportato in scout live: ${token}` };
  }
  const skillMap = DV_SKILLS_BY_CODE;
  const scope = decoded.teamScope === "opponent" ? "opponent" : "our";
  if (scope === "opponent" && !matchState.state.useOpponentTeam) {
    return { ok: false, message: `Codice avversario disponibile solo in doppia squadra: ${token}` };
  }
  const skillId = skillMap[decoded.skillLetter];
  if (!skillId) {
    return { ok: false, message: `Skill non supportata: ${token}` };
  }
  const playerIdx = getPlayerIdxByDvNumber(scope, decoded.playerNumber);
  if (playerIdx < 0) {
    return { ok: false, message: `Giocatrice ${decoded.playerNumber} non trovata in ${scope === "opponent" ? "squadra avversaria" : "squadra nostra"}` };
  }
  const players = getPlayersForScope(scope);
  const playerName = players[playerIdx];
  const setTypeChoice = skillId === "attack" || skillId === "second" ? decodeDvwSetType(decoded.typeLetter) : null;
  const serveMeta = skillId === "serve" ? { serveType: decodeDvwServeType(decoded.typeLetter) || "JF" } : null;
  const prevLen = Array.isArray(matchState.state.events) ? matchState.state.events.length : 0;
  const ok = await handleEventClick(String(playerIdx), skillId, decoded.evaluation, playerName, null, {
    setTypeChoice,
    serveMeta,
    attackMeta: null,
    scope
  });
  if (!ok) {
    return { ok: false, message: `Codice rifiutato dal flusso corrente: ${token}` };
  }
  const targetEvent = findLiveEventFromDvwApply(prevLen, skillId, decoded.evaluation, playerName, scope);
  if (targetEvent) {
    if (Number.isFinite(closedAtMs)) {
      targetEvent.t = new Date(closedAtMs).toISOString();
    }
    syncLiveEventWithDecodedDvw(targetEvent, decoded, token);
    saveState({ persistLocal: true });
    renderEventsLog({ suppressScroll: true });
    renderVideoAnalysis();
    renderTrajectoryAnalysis();
    renderServeTrajectoryAnalysis();
  }
  return { ok: true, message: token };
}

export async function applyDvwScoutInput() {
  if (dvwEntryStore.getSnapshot().text.trim()) {
    const queued = queueCurrentDvwScoutToken();
    if (!queued) return;
  }
  if (!teamManagementState.dvwScoutPendingTokens.length) {
    setDvwScoutStatus("Inserisci almeno un codice.", "error");
    return;
  }
  let applied = 0;
  for (const token of teamManagementState.dvwScoutPendingTokens) {
    const result = await applyDvwScoutToken(token.text, { closedAtMs: token.closedAtMs });
    if (!result.ok) {
      setDvwScoutStatus(result.message, "error");
      teamManagementState.elDvwScoutInput.focus();
      return;
    }
    applied += 1;
  }
  teamManagementState.dvwScoutPendingTokens = [];
  publishReactDvwEntry();
  updateLiveDvwMirror();
  setDvwScoutStatus(`${applied} codice/i applicati correttamente.`, "success");
}
