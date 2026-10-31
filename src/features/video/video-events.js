import { getDefaultSkillDurationMs } from "./playback-model.js";
import { getSelectedRows, getActiveEventContextKey, getSelectedVideoRowForInsert } from "../events/selection-model.js";
import { buildVideoOverlayLinesForEvent } from "./overlay-model.js";
import { session } from "../state/video-video-events.js";
import { session as matchState } from "../../../js/globals.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { getPlayerNumbersForScope, getTeamScopeFromEvent, getTeamNameForScope } from "../teams/selectors.js";
import { setModalOpenState } from "../layout/modals.js";
import { refreshAfterVideoEdit } from "./event-editor.js";
import { renderVideoAnalysis } from "./playback.js";
import { pushVideoUndoSnapshot } from "./undo-model.js";
import { getVideoBaseTimeMs, getVideoSkillEvents } from "./event-model.js";
import { computeEventVideoTime } from "./timing.js";
import { saveState } from "../storage/save-state.js";
import { formatNameWithNumberFor } from "../teams/roster-data.js";
import { publishReactVideoOverlay } from "./view.js";
import { openReactVideoScore, closeReactVideoScore, chooseReactFfmpegEncoder } from "../events/dialog-view.js";
import { openReactVideoEdit, closeReactVideoEdit, readVideoEditInputs } from "./edit-view.js";
import { getPointDirectionForScope, getEventPointValue } from "../analysis/scores.js";
import { getNextEventId, recordSetAction } from "../events/recording-model.js";
import { getActiveVideoFilterPresetName } from "../analysis/video-filter-model.js";
import { matchesVideoFilters } from "../analysis/filter-model.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";
import { recalcAllStatsAndUpdateUI } from "../analysis/stats-update.js";
import { renderTrajectoryAnalysis, renderServeTrajectoryAnalysis } from "../analysis/trajectory-rendering.js";
import { renderPlayers } from "../live/team-rendering.js";
import { renderLiberoBench } from "../scout/court-commands.js";
import { updateRotationDisplay } from "../teams/court-view.js";
import { session as teamManagementState } from "../state/live-team-management.js";
import { handleSeekForSelection } from "../events/selection-commands.js";
import { renderEventsLog } from "../events/log-view.js";

const videoEventsState = session;












export function adjustSelectedVideoTimes(deltaSeconds) {
  const rows = getSelectedRows(getActiveEventContextKey());
  if (!rows.length) return;
  pushVideoUndoSnapshot();
  rows.forEach(r => {
    const ev = r.ev;
    if (!ev) return;
    const current =
      typeof ev.videoTime === "number"
        ? ev.videoTime
        : typeof r.videoTime === "number"
          ? r.videoTime
          : 0;
    const next = Math.max(0, current + deltaSeconds);
    ev.videoTime = next;
  });
  refreshAfterVideoEdit(false);
  renderEventsLog();
  handleSeekForSelection(getActiveEventContextKey(), { userAction: true });
}

export function adjustCurrentRowVideoTime(deltaSeconds) {
  const ctxKey = getActiveEventContextKey();
  if (!ctxKey || !scoutUiState.eventTableContexts[ctxKey]) return;
  const rows = scoutUiState.eventTableContexts[ctxKey].rows || [];
  if (!rows.length) return;
  pushVideoUndoSnapshot();
  const currentKey =
    (scoutUiState.selectedEventIds.size && scoutUiState.lastSelectedEventId && scoutUiState.selectedEventIds.has(scoutUiState.lastSelectedEventId)
      ? scoutUiState.lastSelectedEventId
      : scoutUiState.selectedEventIds.values().next().value) || rows[0].key;
  const target = rows.find(r => r.key === currentKey);
  if (!target || !target.ev) return;
  const baseMs = getVideoBaseTimeMs(getVideoSkillEvents());
  const current =
    typeof target.ev.videoTime === "number"
      ? target.ev.videoTime
      : typeof target.videoTime === "number"
        ? target.videoTime
        : computeEventVideoTime(target.ev, baseMs);
  target.ev.videoTime = Math.max(0, current + deltaSeconds);
  saveState({ persistLocal: true });
  renderEventsLog();
  renderVideoAnalysis();
  handleSeekForSelection(ctxKey, { userAction: true });
}

export function buildSelectedSegments() {
  const rows = getSelectedRows("video");
  const baseRows = rows.length ? rows : getSelectedRows(getActiveEventContextKey());
  if (!baseRows.length) return [];
  const segments = baseRows
    .map(r => {
      const ev = r.ev || {};
      const start =
        typeof r.videoTime === "number"
          ? r.videoTime
          : typeof ev.videoTime === "number"
            ? ev.videoTime
            : computeEventVideoTime(ev, getVideoBaseTimeMs(getVideoSkillEvents()));
      const duration =
        typeof ev.durationMs === "number" && isFinite(ev.durationMs) ? ev.durationMs / 1000 : 5;
      const end = start + duration;
      return {
        key: r.key,
        start,
        end,
        duration,
        label:
          (ev.playerName
            ? formatNameWithNumberFor(ev.playerName, getPlayerNumbersForScope(getTeamScopeFromEvent(ev)))
            : "Evento") +
          " " +
          (ev.skillId || "") +
          " " +
          (ev.code || ""),
        overlayLines: buildVideoOverlayLinesForEvent(ev)
      };
    })
    .filter(seg => isFinite(seg.start) && isFinite(seg.end))
    .sort((a, b) => a.start - b.start);
  return segments;
}

export function escapeFfmpegText(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n");
}

export function buildFfmpegOverlayFilter(lines) {
  if (!lines || !lines.length) return "";
  const x = 24;
  const yStart = 24;
  const step = 28;
  return lines
    .map((line, idx) => {
      const safe = escapeFfmpegText(line || "");
      const y = yStart + step * idx;
      return `,drawtext=text='${safe}':x=${x}:y=${y}:fontcolor=white:fontsize=24:box=1:boxcolor=black@0.55:boxborderw=8`;
    })
    .join("");
}

export function openVideoScoreModal() {
  if (!scoutUiState.elVideoScoreModal) return;
  const ctx = scoutUiState.eventTableContexts.video;
  const rows = ctx && ctx.rows ? ctx.rows.filter(r => scoutUiState.selectedEventIds.has(r.key)) : [];
  if (!rows.length) {
    alert("Seleziona uno o più eventi per correggere il punteggio.");
    return;
  }
  const seed = rows[0] && rows[0].ev ? rows[0].ev : null;
  const seedHome =
    seed && typeof seed.homeScore === "number" && isFinite(seed.homeScore) ? seed.homeScore : 0;
  const seedAway =
    seed && typeof seed.visitorScore === "number" && isFinite(seed.visitorScore) ? seed.visitorScore : 0;

openReactVideoScore(seedHome,seedAway);return;
}

export function closeVideoScoreModal() {
  if (!scoutUiState.elVideoScoreModal) return;
  closeReactVideoScore();
  setModalOpenState(false);
}

export function correctVideoScoresFromSelection(startHome, startAway) {
  const home = parseInt(startHome, 10);
  const away = parseInt(startAway, 10);
  if (!Number.isFinite(home) || !Number.isFinite(away)) {
    alert("Inserisci un punteggio valido.");
    return;
  }
  const ctx = scoutUiState.eventTableContexts.video;
  const rows = ctx && ctx.rows ? ctx.rows.filter(r => scoutUiState.selectedEventIds.has(r.key)) : [];
  if (!rows.length) {
    alert("Seleziona uno o più eventi per correggere il punteggio.");
    return;
  }
  pushVideoUndoSnapshot(true);
  let currentSet = null;
  let homeScore = Math.max(0, home);
  let awayScore = Math.max(0, away);
  const eventOrder = new Map((matchState.state.events || []).map((event, index) => [event, index]));
  rows.sort((a, b) => (eventOrder.get(a.ev) ?? Number.MAX_SAFE_INTEGER) - (eventOrder.get(b.ev) ?? Number.MAX_SAFE_INTEGER));
  rows.forEach(row => {
    const ev = row.ev;
    if (!ev) return;
    const setVal = parseInt(ev.set || currentSet || 1, 10);
    if (currentSet === null) {
      currentSet = setVal;
    } else if (setVal !== currentSet) {
      currentSet = setVal;
      homeScore = Math.max(0, home);
      awayScore = Math.max(0, away);
    }
    ev.homeScore = homeScore;
    ev.visitorScore = awayScore;
    const direction = getPointDirectionForScope(ev, "our");
    if (direction === "for") {
      homeScore += getEventPointValue(ev);
    } else if (direction === "against") {
      awayScore += getEventPointValue(ev);
    }
  });
  saveState({ persistLocal: true });
  refreshAfterVideoEdit(false);
  renderEventsLog({ suppressScroll: true });
  publishReactVideoOverlay();
  closeVideoScoreModal();
}

export function addEmptyVideoEventAfterSelection() {
  const insertRow = getSelectedVideoRowForInsert();
  if (!insertRow || !insertRow.ev) {
    alert("Seleziona un evento dopo cui inserire il nuovo.");
    return;
  }
  const baseEv = insertRow.ev;
  const scope = baseEv.team === "opponent" ? "opponent" : "our";
  const baseMs = getVideoBaseTimeMs(getVideoSkillEvents());
  const baseTime =
    typeof baseEv.videoTime === "number" && isFinite(baseEv.videoTime)
      ? baseEv.videoTime
      : computeEventVideoTime(baseEv, baseMs);
  const nextEvent = {
    eventId: getNextEventId(),
    t: new Date().toISOString(),
    set: baseEv.set || matchState.state.currentSet || 1,
    team: scope === "opponent" ? "opponent" : "our",
    teamName: getTeamNameForScope(scope),
    skillId: "manual",
    code: "",
    playerName: null,
    playerIdx: null,
    rotation: baseEv.rotation || 1,
    homeScore: baseEv.homeScore || 0,
    visitorScore: baseEv.visitorScore || 0,
    durationMs: getDefaultSkillDurationMs(),
    videoTime: baseTime
  };
  const idx =
    typeof baseEv.eventId !== "undefined"
      ? (matchState.state.events || []).findIndex(ev => ev.eventId === baseEv.eventId)
      : (matchState.state.events || []).indexOf(baseEv);
  if (!matchState.state.events) matchState.state.events = [];
  const insertAt = idx >= 0 ? idx + 1 : matchState.state.events.length;
  matchState.state.events.splice(insertAt, 0, nextEvent);
  saveState({ persistLocal: true });
  recalcAllStatsAndUpdateUI();
  renderEventsLog();
  renderVideoAnalysis();
  renderTrajectoryAnalysis();
  renderServeTrajectoryAnalysis();
}

export function getFileBasename(name) {
  if (!name) return "";
  const cleaned = String(name).split(/[\\/]/).pop();
  return cleaned || "";
}

export function getFileExtension(name) {
  const base = getFileBasename(name);
  const idx = base.lastIndexOf(".");
  if (idx > 0 && idx < base.length - 1) return base.slice(idx);
  return "";
}

export function stripFileExtension(name) {
  const base = getFileBasename(name);
  const idx = base.lastIndexOf(".");
  if (idx > 0) return base.slice(0, idx);
  return base;
}

export function sanitizeVideoOutputBase(name) {
  return String(name || "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 120);
}

export function buildFfmpegConcatCommand(segments, inputName, outputName, encoder = "cpu") {
  if (!segments || !segments.length) return "";
  const useGpu = encoder === "gpu";
  const trims = segments
    .map((seg, idx) => {
      const start = seg.start.toFixed(3);
      const end = seg.end.toFixed(3);
      const overlay = buildFfmpegOverlayFilter(seg.overlayLines || []);
      return `[0:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS${overlay}[v${idx}]`;
    })
    .join(";");
  const concatOutput = useGpu
    ? "[outv_raw];[outv_raw]format=nv12,hwupload[outv]"
    : "[outv]";
  const concat = segments.map((_, idx) => `[v${idx}]`).join("") +
    `concat=n=${segments.length}:v=1:a=0${concatOutput}`;
  const input = inputName || "input.mp4";
  const output = outputName || "output.mp4";
  const deviceArgs = useGpu ? " -vaapi_device /dev/dri/renderD128" : "";
  const videoEncoder = useGpu
    ? "-c:v h264_vaapi -rc_mode CQP -qp 24 -quality 8 -profile:v high"
    : "-c:v libx264 -preset ultrafast -crf 24 -pix_fmt yuv420p";
  return `ffmpeg -hide_banner${deviceArgs} -i "${input}" -filter_complex "${trims};${concat}" ` +
    `-map "[outv]" -an ${videoEncoder} "${output}"`;
}

export function chooseFfmpegEncoder() {
  const modal = document.getElementById("ffmpeg-encoder-modal");
  const gpuButton = document.getElementById("ffmpeg-copy-gpu");
  const cpuButton = document.getElementById("ffmpeg-copy-cpu");
  if (!modal || !gpuButton || !cpuButton) return Promise.resolve("cpu");

return chooseReactFfmpegEncoder();
}

export async function copyFfmpegFromSelection() {
  const segments = buildSelectedSegments();
  if (!segments.length) {
    alert("Seleziona uno o più eventi per generare il comando ffmpeg.");
    return;
  }
  const inputName = matchState.state.video && matchState.state.video.youtubeId ? "" : getFileBasename(matchState.state.video && matchState.state.video.fileName);
  if (!inputName) {
    alert("Carica un file video locale per usare il comando ffmpeg.");
    return;
  }
  const ext = getFileExtension(inputName);
  const defaultBase = stripFileExtension(inputName) || "output";
  const presetName = (getActiveVideoFilterPresetName());
  const suggestedBase = sanitizeVideoOutputBase(presetName) || (defaultBase + "_clip");
  const outputBase = prompt("Nome file output (senza estensione):", suggestedBase);
  if (!outputBase) return;
  const sanitizedBase = sanitizeVideoOutputBase(stripFileExtension(outputBase.trim())) || "output";
  const outputName = sanitizedBase + ext;
  const encoder = await chooseFfmpegEncoder();
  if (!encoder) return;
  const cmd = buildFfmpegConcatCommand(segments, inputName, outputName, encoder);
  try {
    await navigator.clipboard.writeText(cmd);
  } catch (_) {
    const ta = document.createElement("textarea");
    ta.value = cmd;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  alert(
    encoder === "gpu"
      ? "Comando ffmpeg GPU con overlay copiato. La codifica userà VAAPI."
      : "Comando ffmpeg CPU con overlay copiato. La codifica userà il preset ultrafast."
  );
}


export function recordTimeoutEvent() {
  recordSetAction("timeout", { playerName: "Timeout", code: "TO" });
  saveState({ persistLocal: true });
  renderEventsLog();
  renderPlayers();
  renderLiberoBench();

  updateRotationDisplay();
}

export function recordOpponentTimeoutEvent() {
  recordSetAction("timeout", { playerName: "Timeout Avv.", code: "TOA", teamScope: "opponent" });
  saveState({ persistLocal: true });
  renderEventsLog();
  renderPlayers();
  renderLiberoBench();

  updateRotationDisplay();
}

export function recordSubstitutionEvent({ playerIn, playerOut, teamScope = "our" }) {
  const label = playerIn || "Cambio";
  recordSetAction("substitution", {
    playerName: label,
    playerIn: playerIn || null,
    playerOut: playerOut || null,
    code: "SUB",
    teamScope
  });
  saveState({ persistLocal: true });
  renderEventsLog();
  renderPlayers();
  renderLiberoBench();

  updateRotationDisplay();
}

export function openOffsetModal() {

openReactVideoEdit("offset");return;
}

export function closeOffsetModal() {

closeReactVideoEdit("offset");return;
}

export function openSkillDurationModal() {

openReactVideoEdit("duration");return;
}

export function closeSkillDurationModal() {

closeReactVideoEdit("duration");return;
}

export function applySkillDurationDefaults() {
  if (!teamManagementState.elSkillDurationGrid) return;
  const defaults = {};
  (readVideoEditInputs("duration")).forEach(input => {
    const id = input.dataset.skillId;
    const value = parseFloat(input.value || "0");
    if (!id || !isFinite(value) || value <= 0) return;
    defaults[id] = value;
  });
  if (!Object.keys(defaults).length) {
    alert("Inserisci una durata valida per almeno una skill.");
    return;
  }
  pushVideoUndoSnapshot(true);
  (matchState.state.events || []).forEach(ev => {
    if (!ev || !ev.skillId) return;
    const next = defaults[ev.skillId];
    if (!next) return;
    ev.durationMs = next;
  });
  matchState.state.skillDurationLastApplied = defaults;
  saveState({ persistLocal: true });
  renderEventsLog({ suppressScroll: true });
  renderVideoAnalysis();
  closeSkillDurationModal();
}

export function openUnifyTimesModal() {

openReactVideoEdit("unify");return;
}

export function closeUnifyTimesModal() {

closeReactVideoEdit("unify");return;
}

export function getFilteredVideoEventsForAnalysis() {
  const skillEvents = getVideoSkillEvents();
  const filtered = skillEvents
    .map(item => item.ev)
    .filter(ev => matchesVideoFilters(ev, analysisFiltersState.videoFilterState));
  return { events: filtered, baseMs: getVideoBaseTimeMs(skillEvents) };
}

export function resolveSourceEventForLink(evA, evB, preferredSkill) {
  if (preferredSkill) {
    if (evA.skillId === preferredSkill) return evA;
    if (evB.skillId === preferredSkill) return evB;
  }
  if (typeof evA.videoTime === "number") return evA;
  if (typeof evB.videoTime === "number") return evB;
  return evA;
}

export function applyUnifyTimes() {
  if (!teamManagementState.elUnifyTimesGrid) return;
  const enabledTypes = new Set();
  const preferredSources = {};

    readVideoEditInputs("unify").forEach(input=>{if(input.checked)enabledTypes.add(input.dataset.linkType);preferredSources[input.dataset.linkType]=input.value;});

  if (!enabledTypes.size) {
    alert("Seleziona almeno un collegamento da unificare.");
    return;
  }
  const { events, baseMs } = getFilteredVideoEventsForAnalysis();
  if (!events.length) {
    alert("Non ci sono skill con i filtri attivi.");
    return;
  }
  const byId = new Map();
  events.forEach(ev => {
    if (ev && ev.eventId != null) byId.set(ev.eventId, ev);
  });
  const seen = new Set();
  const pairs = [];
  events.forEach(ev => {
    const links = Array.isArray(ev.relatedLinks) ? ev.relatedLinks : [];
    links.forEach(link => {
      if (!link || !enabledTypes.has(link.type)) return;
      const other = byId.get(link.eventId);
      if (!other || other === ev) return;
      const aId = ev.eventId;
      const bId = other.eventId;
      if (aId == null || bId == null) return;
      const key = aId < bId ? `${aId}|${bId}|${link.type}` : `${bId}|${aId}|${link.type}`;
      if (seen.has(key)) return;
      seen.add(key);
      pairs.push({ a: ev, b: other, type: link.type });
    });
  });
  if (!pairs.length) {
    alert("Nessun collegamento trovato nei filtri attivi.");
    return;
  }
  pushVideoUndoSnapshot(true);
  pairs.forEach(pair => {
    const preferred = preferredSources[pair.type] || null;
    const source = resolveSourceEventForLink(pair.a, pair.b, preferred);
    const time = computeEventVideoTime(source, baseMs);
    if (!isFinite(time)) return;
    pair.a.videoTime = time;
    pair.b.videoTime = time;
  });
  saveState({ persistLocal: true });
  renderEventsLog({ suppressScroll: true });
  renderVideoAnalysis();
  closeUnifyTimesModal();
}

export function applyOffsetsToSelectedSkills() {
  const ctxKey = getActiveEventContextKey();
  const rows = ctxKey ? getSelectedRows(ctxKey) : [];
  if (!rows.length) {
    alert("Seleziona una o più skill da modificare.");
    return;
  }
  if (!teamManagementState.elOffsetSkillGrid) return;
  const offsets = {};
  let manualErrorOffset = 0;
  (readVideoEditInputs("offset")).forEach(input => {
    const id = input.dataset.skillId;
    const value = parseFloat(input.value || "0");
    if (!id || isNaN(value) || value === 0) return;
    if (id === "__manual_error__") {
      manualErrorOffset = value;
      return;
    }
    offsets[id] = value;
  });
  if (!Object.keys(offsets).length && manualErrorOffset === 0) {
    alert("Inserisci almeno un offset diverso da 0.");
    return;
  }
  pushVideoUndoSnapshot();
  const baseMs = getVideoBaseTimeMs(getVideoSkillEvents());
  rows.forEach(r => {
    const ev = r.ev;
    if (!ev) return;
    const code = String(ev.code || "").trim().toLowerCase();
    const isManualErrorCode = code === "error" || code === "team-error" || code === "opp-error";
    let delta = ev.skillId ? offsets[ev.skillId] : undefined;
    if (
      !delta &&
      manualErrorOffset !== 0 &&
      isManualErrorCode
    ) {
      delta = manualErrorOffset;
    }
    if (!delta) return;
    const current =
      typeof ev.videoTime === "number"
        ? ev.videoTime
        : typeof r.videoTime === "number"
          ? r.videoTime
          : computeEventVideoTime(ev, baseMs);
    ev.videoTime = Math.max(0, current + delta);
  });
  saveState({ persistLocal: true });
  renderEventsLog();
  renderVideoAnalysis();
  handleSeekForSelection(ctxKey, { userAction: true });
  closeOffsetModal();
}
