import { session as matchState } from '../../../js/globals.js';
import { session as rosterLineupState } from '../state/roster-lineup.js';
import { loadTeamNormalized, isValidPlayerId, generatePlayerId } from './storage/team-repository.js';
import { normalizePlayers, buildFullName, enforceSingleCaptainFlag } from '../../domain/player-names.js';
import { buildMatchExportPayload } from '../storage/match-payload.js';

export function getCurrentTeamPayload(name = "") {
  const safeName = (name || matchState.state.selectedTeam || (matchState.state.match && matchState.state.match.teamName) || "squadra").trim();
  const existing = safeName ? loadTeamNormalized(safeName) : null;
  const staff = existing?.staff || Object.assign({}, rosterLineupState.DEFAULT_STAFF);
  const defaultLineup = Array.isArray(existing?.defaultLineup) ? existing.defaultLineup : [];
  const detailed = Array.isArray(existing?.playersDetailed) ? existing.playersDetailed : [];
  const activePlayers = normalizePlayers(matchState.state.players || []);
  const detailedByName = new Map(detailed.filter(Boolean).map(player => [player.name, player]));
  const captainSet = new Set(matchState.state.captains || []);
  const playersDetailed = activePlayers
    .map(pName => {
      const previous = detailedByName.get(pName) || {};
      const hasCurrentNumber =
        matchState.state.playerNumbers && Object.prototype.hasOwnProperty.call(matchState.state.playerNumbers, pName);
      const firstName = String(previous.firstName || "").trim();
      const lastName = String(previous.lastName || "").trim() || (!firstName ? pName : "");
      return Object.assign({}, previous, {
        id: isValidPlayerId(previous.id) ? previous.id : generatePlayerId(),
        name: buildFullName(lastName, firstName) || pName,
        firstName,
        lastName,
        codeOfficial: typeof previous.codeOfficial === "string" ? previous.codeOfficial : "",
        number: hasCurrentNumber ? matchState.state.playerNumbers[pName] : previous.number || "",
        role: (matchState.state.liberos || []).includes(pName) ? "L" : "",
        isCaptain: captainSet.has(pName),
        out: false
      });
    })
    .concat(
      detailed
        .filter(player => player && !activePlayers.includes(player.name))
        .map(player => Object.assign({}, player, { isCaptain: false, out: true }))
    );
  enforceSingleCaptainFlag(playersDetailed, matchState.state.captains && matchState.state.captains[0]);
  const liberos = playersDetailed.filter(p => p.role === "L" && !p.out).map(p => p.name);
  const preferredLibero =
    liberos.includes(matchState.state.preferredLibero) ? matchState.state.preferredLibero : liberos[0] || "";
  const numbers = {};
  playersDetailed.forEach(p => {
    if (p.number !== undefined && p.number !== null && p.number !== "") {
      numbers[p.name] = String(p.number);
    }
  });
  const players = playersDetailed.filter(p => !p.out).map(p => p.name);
  const captains = playersDetailed.filter(p => p.isCaptain && !p.out).map(p => p.name).slice(0, 1);
  return {
    version: 3,
    name: safeName,
    staff,
    officialCode: existing?.officialCode || "",
    officialId: existing?.officialId || "",
    playersDetailed,
    players,
    liberos,
    numbers,
    captains,
    defaultLineup,
    defaultRotation: existing?.defaultRotation || 1,
    preferredLibero
  };
}

export function getCurrentOpponentPayload(name = "") {
  const safeName = (name || matchState.state.selectedOpponentTeam || matchState.state.match.opponent || "avversaria").trim();
  const existing = safeName ? loadTeamNormalized(safeName) : null;
  const players = normalizePlayers(matchState.state.opponentPlayers || []);
  const numbers = {};
  players.forEach(p => {
    const num = matchState.state.opponentPlayerNumbers && matchState.state.opponentPlayerNumbers[p];
    if (num !== undefined && num !== null && num !== "") {
      numbers[p] = String(num);
    }
  });
  const liberos = normalizePlayers(matchState.state.opponentLiberos || []).filter(n => players.includes(n));
  const preferredLibero =
    liberos.includes(matchState.state.opponentPreferredLibero) ? matchState.state.opponentPreferredLibero : liberos[0] || "";
  const captains = normalizePlayers(matchState.state.opponentCaptains || []).filter(n => players.includes(n)).slice(0, 1);
  const existingDetailed = existing?.playersDetailed || [];
  const existingMap = new Map(existingDetailed.map(p => [p.name, p]));
  const playersDetailed = players
    .map(p => {
      const prev = existingMap.get(p);
      const currentNumber = Object.prototype.hasOwnProperty.call(numbers, p)
        ? numbers[p]
        : (prev && prev.number) || "";
      const firstName = String((prev && prev.firstName) || "").trim();
      const lastName = String((prev && prev.lastName) || "").trim() || (!firstName ? p : "");
      return Object.assign({}, prev || {}, {
        id: prev && isValidPlayerId(prev.id) ? prev.id : generatePlayerId(),
        name: buildFullName(lastName, firstName) || p,
        firstName,
        lastName,
        codeOfficial: prev && typeof prev.codeOfficial === "string" ? prev.codeOfficial : "",
        number: currentNumber,
        role: liberos.includes(p) ? "L" : "",
        isCaptain: captains.includes(p),
        out: false
      });
    })
    .concat(
      existingDetailed
        .filter(player => player && !players.includes(player.name))
        .map(player => Object.assign({}, player, { isCaptain: false, out: true }))
    );
  enforceSingleCaptainFlag(playersDetailed, captains[0] || "");
  return {
    version: 3,
    name: safeName,
    staff: existing?.staff || Object.assign({}, rosterLineupState.DEFAULT_STAFF),
    officialCode: existing?.officialCode || "",
    officialId: existing?.officialId || "",
    playersDetailed,
    players,
    liberos,
    numbers,
    captains,
    defaultLineup: Array.isArray(existing?.defaultLineup) ? existing.defaultLineup : [],
    defaultRotation: existing?.defaultRotation || 1,
    preferredLibero
  };
}

export function getCurrentMatchPayload(name = "") {
  const safeName = (name || matchState.state.loadedMatchName || matchState.state.selectedMatch || matchState.state.match.opponent || "match").trim();
  const payload = buildMatchExportPayload();
  payload.name = safeName;
  return payload;
}
