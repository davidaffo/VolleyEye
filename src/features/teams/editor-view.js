import { openPlayerPhotoEditor, preparePlayerPhotoDataUrl } from "../players/photo-editor.js";
import { PLAYER_PHOTO_REMOVE_RESULT, pickImageFile, logError } from "../../../js/globals.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { isValidPlayerId, generatePlayerId, findPlayersDbMatchByName } from "./storage/team-repository.js";
import { buildFullName, enforceSingleCaptainFlag } from "../../domain/player-names.js";
import { sortNamesByNumber, formatNameWithNumberFor, formatStructuredPlayerName } from "./roster-data.js";
import { teamEditorStore } from "../../state/team-editor-store.mjs";
import { setGlobalModalState } from "../layout/modals.js";

export function publishTeamEditorView() {
  if (!rosterLineupState.teamManagerState) return;
  const players = (rosterLineupState.teamManagerState.players || []).map((player, idx) => ({
    player,
    idx,
  }));
  players.sort((a, b) => {
    const number = (player) =>
      player.number !== undefined &&
      player.number !== null &&
      player.number !== ""
        ? parseInt(player.number, 10)
        : null;
    const rawA = number(a.player),
      rawB = number(b.player);
    const nA = Number.isFinite(rawA) ? rawA : null,
      nB = Number.isFinite(rawB) ? rawB : null;
    if (nA === null && nB === null) return a.idx - b.idx;
    if (nA === null) return -1;
    if (nB === null) return 1;
    if (nA !== nB) return nA - nB;
    return (a.player.name || "").localeCompare(b.player.name || "", "it", {
      sensitivity: "base",
    });
  });
  const rows = players.map(({ player: p }) => {
    if (!isValidPlayerId(p.id)) p.id = generatePlayerId();
    p.lastName = (p.lastName || (!p.firstName ? p.name : "") || "").trim();
    p.firstName = (p.firstName || "").trim();
    p.name = buildFullName(p.lastName, p.firstName);
    return Object.freeze({
      ...p,
      onNumber: (value) => {
        p.number = value;
        renderTeamManagerTable();
      },
      onName: (first, last) => changeTeamEditorPlayerName(p, first, last),
      onCaptain: (checked) => {
        p.isCaptain = checked;
        enforceSingleCaptainFlag(
          rosterLineupState.teamManagerState.players,
          p.isCaptain ? p.name : "",
        );
        renderTeamManagerTable();
      },
      onLibero: (checked) => {
        p.role = checked ? "L" : "";
        renderTeamManagerTable();
      },
      onOut: (checked) => {
        if (rosterLineupState.teamManagerLiveEditMode) return;
        p.out = checked;
        renderTeamManagerTable();
      },
      onDelete: () => {
        if (
          rosterLineupState.teamManagerLiveEditMode ||
          !confirm("Eliminare " + (p.name || "questa giocatrice") + "?")
        )
          return;
        const index = (rosterLineupState.teamManagerState.players || []).findIndex(
          (entry) => entry.id === p.id,
        );
        if (index >= 0) rosterLineupState.teamManagerState.players.splice(index, 1);
        else
          rosterLineupState.teamManagerState.players = (rosterLineupState.teamManagerState.players || []).filter(
            (entry) => entry !== p,
          );
        renderTeamManagerTable();
      },
      onPhoto: () => changeTeamEditorPlayerPhoto(p),
    });
  });
  const rawRotation = parseInt(rosterLineupState.teamManagerState.defaultRotation, 10);
  rosterLineupState.teamManagerState.defaultRotation =
    Number.isFinite(rawRotation) && rawRotation >= 1 && rawRotation <= 6
      ? rawRotation
      : 1;
  const roster = getDefaultLineupRoster(),
    rosterNames = roster.map((player) => player.name);
  const numbers = {},
    captains = new Set(),
    out = new Set();
  const all = (rosterLineupState.teamManagerState.players || []).filter((player) =>
    (player.name || "").trim(),
  );
  all.forEach((player) => {
    const name =
      buildFullName(player.lastName, player.firstName) || player.name.trim();
    if (player.number) numbers[name] = String(player.number);
    if (player.isCaptain) captains.add(name);
    if (player.out) out.add(name);
  });
  const liberos = all
    .filter(
      (player) =>
        String(player.role || "").toUpperCase() === "L" && !player.out,
    )
    .map(
      (player) =>
        buildFullName(player.lastName, player.firstName) || player.name.trim(),
    );
  const preferred =
    rosterLineupState.teamManagerState.preferredLibero &&
    liberos.includes(rosterLineupState.teamManagerState.preferredLibero)
      ? rosterLineupState.teamManagerState.preferredLibero
      : liberos[0] || "";
  rosterLineupState.teamManagerState.preferredLibero = preferred;
  const lineup = normalizeDefaultLineup(
    rosterLineupState.teamManagerState.defaultLineup || [],
    rosterNames,
  );
  rosterLineupState.teamManagerState.defaultLineup = lineup;
  const used = new Set(lineup.filter(Boolean));
  const label = (name) =>
    formatDefaultLineupName(name, numbers, captains, { compactCourt: true }) ||
    name;
  teamEditorStore.publish({
    players: Object.freeze(rows),
    liveEdit: !!rosterLineupState.teamManagerLiveEditMode,
    rotation: rosterLineupState.teamManagerState.defaultRotation,
    preferredLibero: preferred,
    court: Object.freeze(
      [3, 2, 1, 4, 5, 0].map((index) =>
        Object.freeze({
          index,
          name: lineup[index],
          label: lineup[index] ? label(lineup[index]) : "",
          out: out.has(lineup[index]),
          onClear: () => clearDefaultLineupSlot(index),
          onDrop: (name) => setDefaultLineupSlot(index, name),
        }),
      ),
    ),
    bench: Object.freeze(
      roster
        .filter((player) => !used.has(player.name))
        .map((player) =>
          Object.freeze({
            ...player,
            label: label(player.name),
            onChoose: () => {
              const index = lineup.findIndex((name) => !name);
              if (index !== -1) setDefaultLineupSlot(index, player.name);
            },
          }),
        ),
    ),
    liberos: Object.freeze(
      sortNamesByNumber(liberos, numbers).map((name) =>
        Object.freeze({ name, label: formatNameWithNumberFor(name, numbers) }),
      ),
    ),
    onRotation: (value) => {
      const rotation = parseInt(value, 10);
      rosterLineupState.teamManagerState.defaultRotation = Number.isFinite(rotation)
        ? Math.min(6, Math.max(1, rotation))
        : 1;
      publishTeamEditorView();
    },
    onRotate: (direction) => rotateDefaultLineup(direction),
    onLibero: (value) => {
      rosterLineupState.teamManagerState.preferredLibero = value || "";
      publishTeamEditorView();
    },
  });
  
}

export function changeTeamEditorPlayerName(player, first, last) {
  player.firstName = first.trim();
  player.lastName = last.trim();
  player.name = buildFullName(player.lastName, player.firstName);
  const key = (player.lastName + "|" + player.firstName).toLowerCase().trim();
  if (!player.firstName || !player.lastName) {
    player.__dbPromptKey = "";
    return;
  }
  if (player.__dbPromptKey === key) return;
  const match = findPlayersDbMatchByName(
    player.firstName,
    player.lastName,
    player.id,
  );
  if (match) {
    const label =
      buildFullName(match.lastName, match.firstName) ||
      match.name ||
      "questa giocatrice";
    if (
      confirm(
        "Giocatrice già presente in archivio (" +
          label +
          "). Vuoi usare quella esistente?",
      )
    ) {
      player.id = match.id;
      player.firstName = match.firstName || player.firstName;
      player.lastName = match.lastName || player.lastName;
      player.name = buildFullName(player.lastName, player.firstName);
      player.photo =
        typeof match.photo === "string" ? match.photo : player.photo || "";
      renderTeamManagerTable();
      return;
    }
  }
  player.__dbPromptKey = key;
}

export async function changeTeamEditorPlayerPhoto(player) {
  try {
    let photo = "";
    if (player.photo) {
      const edited = await openPlayerPhotoEditor(player.photo, {
        allowRemove: true,
      });
      if (edited === PLAYER_PHOTO_REMOVE_RESULT) {
        player.photo = "";
        renderTeamManagerTable();
        return;
      }
      photo = edited || "";
    } else {
      const file =
        (await pickImageFile("image/*"));
      if (!file) return;
      photo =
        (await preparePlayerPhotoDataUrl(file, {
              allowRemove: !!player.photo,
            }));
    }
    if (!photo) return;
    player.photo = photo;
    renderTeamManagerTable();
  } catch (error) {
    logError("Errore caricamento foto giocatrice", error);
    alert("Immagine non valida o non caricabile.");
  }
}

export function openReactTeamEditor({ isNew = false } = {}) {
  teamEditorStore.publish({
    open: true,
    isNew,
    title: isNew
      ? "Nuova squadra"
      : rosterLineupState.teamManagerLiveEditMode
        ? "Modifica squadra in partita"
        : rosterLineupState.teamManagerScope === "opponent"
          ? "Gestione squadra avversaria"
          : "Gestione squadra",
    meta: Object.freeze({
      name: rosterLineupState.teamManagerState.name || "",
      headCoach: rosterLineupState.teamManagerState.staff?.headCoach || "",
      assistantCoach: rosterLineupState.teamManagerState.staff?.assistantCoach || "",
      manager: rosterLineupState.teamManagerState.staff?.manager || "",
    }),
  });
  publishTeamEditorView();
  setGlobalModalState(true);
}

export function closeReactTeamEditor() {
  teamEditorStore.publish({ open: false });
}

export function publishTeamEditorMode() {
  teamEditorStore.publish({ liveEdit: !!rosterLineupState.teamManagerLiveEditMode });
}

export function getReactTeamEditorMetadata() {
  return teamEditorStore.getSnapshot().meta;
}

export function renderTeamManagerTable() {
  if (!rosterLineupState.elTeamManagerBody || !rosterLineupState.teamManagerState) return;

 publishTeamEditorView(); return;
}

export function getDefaultLineupRoster() {
  if (!rosterLineupState.teamManagerState) return [];
  const roster = (rosterLineupState.teamManagerState.players || [])
    .filter(p => (p.name || "").trim() !== "" && String(p.role || "").toUpperCase() !== "L")
    .map(p => ({
      name: buildFullName(p.lastName, p.firstName) || p.name.trim(),
      number: p.number || "",
      isCaptain: !!p.isCaptain,
      out: !!p.out
    }));
  roster.sort((a, b) => {
    const numA = a.number !== "" ? parseInt(a.number, 10) : NaN;
    const numB = b.number !== "" ? parseInt(b.number, 10) : NaN;
    const cleanA = Number.isFinite(numA) ? numA : null;
    const cleanB = Number.isFinite(numB) ? numB : null;
    if (cleanA === null && cleanB === null) {
      return a.name.localeCompare(b.name, "it", { sensitivity: "base" });
    }
    if (cleanA === null) return 1;
    if (cleanB === null) return -1;
    if (cleanA !== cleanB) return cleanA - cleanB;
    return a.name.localeCompare(b.name, "it", { sensitivity: "base" });
  });
  return roster;
}

export function formatDefaultLineupName(name, numbersMap, captainSet, options = {}) {
  if (!name) return "";
  const num = (numbersMap && numbersMap[name]) || "";
  const compactCourt = !!options.compactCourt;
  let baseName = formatStructuredPlayerName(name, rosterLineupState.teamManagerScope || "our");
  if (compactCourt) {
    baseName = baseName || name || "";
  }
  const base = num ? num + " - " + baseName : baseName;
  if (options.includeCaptain !== false && captainSet && captainSet.has(name)) {
    return base + " (K)";
  }
  return base;
}

export function normalizeDefaultLineup(names, rosterNames) {
  const allowed = new Set(rosterNames);
  const list = Array.isArray(names) ? names.slice(0, 6) : [];
  const cleaned = list.map(name => (name && allowed.has(name) ? name : ""));
  while (cleaned.length < 6) cleaned.push("");
  return cleaned;
}

export function setDefaultLineupSlot(slotIdx, name) {
  if (!rosterLineupState.teamManagerState) return;
  const roster = getDefaultLineupRoster();
  const rosterNames = roster.map(p => p.name);
  if (!rosterNames.includes(name)) return;
  const current = normalizeDefaultLineup(rosterLineupState.teamManagerState.defaultLineup || [], rosterNames);
  const existingIdx = current.findIndex(n => n === name);
  const targetName = current[slotIdx] || "";
  if (targetName && targetName !== name) {
    if (existingIdx !== -1) {
      current[existingIdx] = targetName;
    }
  }
  if (existingIdx !== -1 && existingIdx !== slotIdx && !targetName) {
    current[existingIdx] = "";
  }
  current[slotIdx] = name;
  rosterLineupState.teamManagerState.defaultLineup = current;
  renderDefaultLineupEditor();
}

export function rotateDefaultLineup(direction) {
  if (!rosterLineupState.teamManagerState) return;
  const rosterNames = getDefaultLineupRoster().map(p => p.name);
  const current = normalizeDefaultLineup(rosterLineupState.teamManagerState.defaultLineup || [], rosterNames);
  let rotated = current.slice();
  if (direction === "cw") {
    rotated = [current[5], current[0], current[1], current[2], current[3], current[4]];
    rosterLineupState.teamManagerState.defaultRotation = ((rosterLineupState.teamManagerState.defaultRotation || 1) % 6) + 1;
  } else {
    rotated = [current[1], current[2], current[3], current[4], current[5], current[0]];
    rosterLineupState.teamManagerState.defaultRotation =
      rosterLineupState.teamManagerState.defaultRotation === 1 ? 6 : (rosterLineupState.teamManagerState.defaultRotation || 1) - 1;
  }
  rosterLineupState.teamManagerState.defaultLineup = rotated;
  renderDefaultLineupEditor();
}

export function clearDefaultLineupSlot(slotIdx) {
  if (!rosterLineupState.teamManagerState) return;
  const rosterNames = getDefaultLineupRoster().map(p => p.name);
  const current = normalizeDefaultLineup(rosterLineupState.teamManagerState.defaultLineup || [], rosterNames);
  current[slotIdx] = "";
  rosterLineupState.teamManagerState.defaultLineup = current;
  renderDefaultLineupEditor();
}

export function renderDefaultLineupEditor() {
  if (!rosterLineupState.elDefaultLineupGrid || !rosterLineupState.elDefaultLineupBench || !rosterLineupState.teamManagerState) return;

 publishTeamEditorView(); return;
}
