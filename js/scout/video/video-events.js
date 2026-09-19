function getEventKey(ev, fallbackIdx = 0) {
  if (!ev) return "ev-" + fallbackIdx;
  if (typeof ev.eventId === "number" || typeof ev.eventId === "string") return ev.eventId;
  if (!ev.__tmpKey) {
    ev.__tmpKey = "tmp-" + (ev.t || Date.now()) + "-" + fallbackIdx;
  }
  return ev.__tmpKey;
}
function pruneEventSelection() {
  const allKeys = new Set();
  Object.values(eventTableContexts).forEach(ctx => {
    ctx.rows.forEach(r => allKeys.add(r.key));
  });
  Array.from(selectedEventIds).forEach(key => {
    if (!allKeys.has(key)) selectedEventIds.delete(key);
  });
  if (lastSelectedEventId && !allKeys.has(lastSelectedEventId)) {
    lastSelectedEventId = null;
  }
}
function clearEventSelection({ clearContexts = true } = {}) {
  selectedEventIds.clear();
  lastSelectedEventId = null;
  lastEventContextKey = null;
  if (clearContexts) {
    Object.keys(eventTableContexts).forEach(key => {
      delete eventTableContexts[key];
    });
  }
  updateSelectionStyles();
}
function updateSelectionStyles() {
  pruneEventSelection();
  Object.values(eventTableContexts).forEach(ctx => {
    const total = ctx.rows ? ctx.rows.length : 0;
    const selectedCount = ctx.rows ? ctx.rows.filter(r => selectedEventIds.has(r.key)).length : 0;
    if (ctx.selectAllCheckbox) {
      ctx.selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < total;
      ctx.selectAllCheckbox.checked = total > 0 && selectedCount === total;
    }
    if (ctx.table) {
      ctx.table.classList.toggle("bulk-edit-active", selectedCount > 1);
    }
    ctx.rows.forEach(r => {
      const selected = selectedEventIds.has(r.key);
      r.tr.dataset.selected = selected ? "true" : "false";
      r.tr.classList.toggle("selected", selected);
      if (r.checkbox) {
        r.checkbox.checked = selected;
      }
    });
  });
  updateVideoSelectionCount();
}
function updateVideoSelectionCount() {
  if (!elVideoSelectionCount) return;
  const ctx = eventTableContexts.video;
  const count = ctx && ctx.rows ? ctx.rows.filter(r => selectedEventIds.has(r.key)).length : 0;
  elVideoSelectionCount.textContent = "Selezionati: " + count;
}
function registerEventTableContext(key, ctx) {
  if (!key) return;
  eventTableContexts[key] = ctx;
  updateSelectionStyles();
}
function removeEventTableContext(key) {
  if (!key) return;
  delete eventTableContexts[key];
  updateSelectionStyles();
}
function getRowsForContext(contextKey) {
  const ctx = eventTableContexts[contextKey];
  return ctx ? ctx.rows : [];
}
function getSelectedRows(contextKey = null) {
  if (contextKey && eventTableContexts[contextKey]) {
    return eventTableContexts[contextKey].rows.filter(r => selectedEventIds.has(r.key));
  }
  const seen = new Set();
  const rows = [];
  const ctxOrder = ["video", "log", ...Object.keys(eventTableContexts)];
  ctxOrder.forEach(key => {
    const ctx = eventTableContexts[key];
    if (!ctx) return;
    ctx.rows.forEach(r => {
      if (selectedEventIds.has(r.key) && !seen.has(r.key)) {
        seen.add(r.key);
        rows.push(r);
      }
    });
  });
  return rows;
}
function setSelectionForContext(contextKey, keysSet, anchorKey = null, opts = {}) {
  const ctx = contextKey ? eventTableContexts[contextKey] : null;
  if (!ctx) return;
  selectedEventIds.clear();
  keysSet.forEach(k => selectedEventIds.add(k));
  lastSelectedEventId = anchorKey || Array.from(keysSet)[0] || null;
  lastEventContextKey = contextKey;
  updateSelectionStyles();
  closeCurrentEdit();
  if (typeof ctx.onSelectionChange === "function") {
    ctx.onSelectionChange(getSelectedRows(contextKey), contextKey, opts);
  }
  if (contextKey === "video") {
    updateVideoAnalysisOverlay();
  }
}
function toggleSelectionForContext(contextKey, key, opts = {}) {
  const next = new Set(selectedEventIds);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  setSelectionForContext(contextKey, next, key, opts);
}
function selectRangeForContext(contextKey, anchorKey, targetKey, opts = {}) {
  const rows = getRowsForContext(contextKey);
  if (!rows.length) return;
  const anchorIdx = Math.max(0, rows.findIndex(r => r.key === anchorKey));
  const targetIdx = Math.max(0, rows.findIndex(r => r.key === targetKey));
  const start = Math.min(anchorIdx, targetIdx);
  const end = Math.max(anchorIdx, targetIdx);
  const range = new Set(rows.slice(start, end + 1).map(r => r.key));
  setSelectionForContext(contextKey, range, anchorKey, opts);
}
function getActiveEventContextKey() {
  if (lastEventContextKey && eventTableContexts[lastEventContextKey]) return lastEventContextKey;
  if (activeTab === "video" && eventTableContexts.video) return "video";
  if (eventTableContexts.log) return "log";
  const keys = Object.keys(eventTableContexts);
  return keys[0] || null;
}
function isEditingField(target) {
  if (!target) return false;
  const tag = (target.tagName || "").toLowerCase();
  if (target.isContentEditable) return true;
  return ["input", "textarea", "select", "option", "button"].includes(tag);
}
function scrollRowIntoView(record) {
  if (!record || !record.tr || typeof record.tr.scrollIntoView !== "function") return;
  record.tr.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
function handleSeekForSelection(contextKey, opts = {}) {
  if (!opts || !opts.userAction) return;
  const activeTab = document && document.body ? document.body.dataset.activeTab : "";
  if (contextKey === "log" && !state.videoScoutMode && activeTab !== "video") {
    return;
  }
  const rows = getSelectedRows(contextKey);
  if (!rows.length) return;
  const target =
    rows.find(r => r.key === lastSelectedEventId) ||
    rows[rows.length - 1];
  if (!target) return;
  const t = typeof target.videoTime === "number" ? target.videoTime : null;
  if (isFinite(t)) {
    const preservePlayback =
      typeof opts.preservePlayback === "boolean" ? opts.preservePlayback : contextKey === "log";
    seekVideoToTime(t, { preservePlayback });
  }
}
function moveSelection(contextKey, delta, extendRange = false) {
  const ctx = eventTableContexts[contextKey];
  if (!ctx || !ctx.rows.length) return;
  const rows = ctx.rows;
  const currentKey =
    (selectedEventIds.size && lastSelectedEventId && selectedEventIds.has(lastSelectedEventId)
      ? lastSelectedEventId
      : selectedEventIds.values().next().value) || rows[0].key;
  if (extendRange && selectedEventIds.size) {
    const selectedIdx = rows
      .map((row, idx) => (selectedEventIds.has(row.key) ? idx : -1))
      .filter(idx => idx !== -1);
    const edgeIdx = delta > 0 ? Math.max(...selectedIdx) : Math.min(...selectedIdx);
    let anchorKey =
      lastSelectedEventId && selectedEventIds.has(lastSelectedEventId)
        ? lastSelectedEventId
        : rows[selectedIdx[0]].key;
    let targetIdx = Math.min(rows.length - 1, Math.max(0, edgeIdx + delta));
    const targetKey = rows[targetIdx].key;
    selectRangeForContext(contextKey, anchorKey, targetKey, { userAction: true });
    const targetRow = rows.find(r => r.key === targetKey);
    scrollRowIntoView(targetRow);
    handleSeekForSelection(contextKey, { userAction: true });
    return;
  }
  let anchorKey = currentKey;
  let anchorIdx = rows.findIndex(r => r.key === anchorKey);
  if (anchorIdx === -1) {
    anchorIdx = 0;
    anchorKey = rows[0].key;
  }
  let targetIdx = Math.min(rows.length - 1, Math.max(0, anchorIdx + delta));
  const targetKey = rows[targetIdx].key;
  setSelectionForContext(contextKey, new Set([targetKey]), targetKey, { userAction: true });
  const targetRow = rows.find(r => r.key === targetKey);
  scrollRowIntoView(targetRow);
  handleSeekForSelection(contextKey, { userAction: true });
}
function adjustSelectedVideoTimes(deltaSeconds) {
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
function adjustCurrentRowVideoTime(deltaSeconds) {
  const ctxKey = getActiveEventContextKey();
  if (!ctxKey || !eventTableContexts[ctxKey]) return;
  const rows = eventTableContexts[ctxKey].rows || [];
  if (!rows.length) return;
  pushVideoUndoSnapshot();
  const currentKey =
    (selectedEventIds.size && lastSelectedEventId && selectedEventIds.has(lastSelectedEventId)
      ? lastSelectedEventId
      : selectedEventIds.values().next().value) || rows[0].key;
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
function buildSelectedSegments() {
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
function getVideoOverlayEvent() {
  const ctx = eventTableContexts.video;
  if (!ctx || !ctx.rows || !ctx.rows.length) return null;
  let key = lastSelectedEventId && selectedEventIds.has(lastSelectedEventId) ? lastSelectedEventId : null;
  if (!key) {
    const match = ctx.rows.find(r => selectedEventIds.has(r.key));
    key = match ? match.key : null;
  }
  if (!key) return null;
  const row = ctx.rows.find(r => r.key === key);
  return row ? row.ev : null;
}
function buildVideoOverlayLinesForEvent(ev) {
  if (!ev) return [];
  const setNum = ev.set || state.currentSet || 1;
  const homeScore = ev.homeScore !== undefined && ev.homeScore !== null && ev.homeScore !== "" ? ev.homeScore : "-";
  const visitorScore =
    ev.visitorScore !== undefined && ev.visitorScore !== null && ev.visitorScore !== "" ? ev.visitorScore : "-";
  const setLine = `Set ${setNum} · ${homeScore} - ${visitorScore}`;
  const scope = getTeamScopeFromEvent(ev);
  const numbers = getPlayerNumbersForScope(scope);
  const rawName = ev.playerName || "";
  const fullName = rawName || "—";
  const numValue = rawName && numbers ? numbers[rawName] : "";
  const playerLine = numValue ? `${numValue} - ${fullName}` : fullName;
  const skillLabel = (SKILLS.find(s => s.id === ev.skillId) || {}).label || ev.skillId || "";
  const skillLine = [skillLabel, ev.code || ""].filter(Boolean).join(" ") || "—";
  const rotationLine = ev.rotation ? `P${ev.rotation}` : "P-";
  return [[setLine, playerLine, skillLine, rotationLine].filter(Boolean).join(" · ")];
}
function updateVideoAnalysisOverlay() {
  if (!elVideoOverlay) return;
  const isVideoTab = document && document.body ? document.body.dataset.activeTab === "video" : false;
  if (!state.videoPlayByPlay || !isVideoTab) {
    elVideoOverlay.classList.add("hidden");
    return;
  }
  const ev = getVideoOverlayEvent();
  if (!ev) {
    elVideoOverlay.classList.add("hidden");
    return;
  }
  const lines = buildVideoOverlayLinesForEvent(ev);
  if (!lines.length) {
    elVideoOverlay.classList.add("hidden");
    return;
  }
  if (elVideoOverlaySet) elVideoOverlaySet.textContent = lines[0] || "";
  if (elVideoOverlayPlayer) elVideoOverlayPlayer.textContent = "";
  if (elVideoOverlaySkill) elVideoOverlaySkill.textContent = "";
  if (elVideoOverlayRotation) elVideoOverlayRotation.textContent = "";
  elVideoOverlay.classList.remove("hidden");
}
function escapeFfmpegText(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n");
}
function buildFfmpegOverlayFilter(lines) {
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
function openVideoScoreModal() {
  if (!elVideoScoreModal) return;
  const ctx = eventTableContexts.video;
  const rows = ctx && ctx.rows ? ctx.rows.filter(r => selectedEventIds.has(r.key)) : [];
  if (!rows.length) {
    alert("Seleziona uno o più eventi per correggere il punteggio.");
    return;
  }
  const seed = rows[0] && rows[0].ev ? rows[0].ev : null;
  const seedHome =
    seed && typeof seed.homeScore === "number" && isFinite(seed.homeScore) ? seed.homeScore : 0;
  const seedAway =
    seed && typeof seed.visitorScore === "number" && isFinite(seed.visitorScore) ? seed.visitorScore : 0;
  if (elVideoScoreHome) elVideoScoreHome.value = String(seedHome);
  if (elVideoScoreAway) elVideoScoreAway.value = String(seedAway);
  elVideoScoreModal.classList.remove("hidden");
  setModalOpenState(true);
  if (elVideoScoreHome) elVideoScoreHome.focus();
}
function closeVideoScoreModal() {
  if (!elVideoScoreModal) return;
  elVideoScoreModal.classList.add("hidden");
  setModalOpenState(false);
}
function correctVideoScoresFromSelection(startHome, startAway) {
  const home = parseInt(startHome, 10);
  const away = parseInt(startAway, 10);
  if (!Number.isFinite(home) || !Number.isFinite(away)) {
    alert("Inserisci un punteggio valido.");
    return;
  }
  const ctx = eventTableContexts.video;
  const rows = ctx && ctx.rows ? ctx.rows.filter(r => selectedEventIds.has(r.key)) : [];
  if (!rows.length) {
    alert("Seleziona uno o più eventi per correggere il punteggio.");
    return;
  }
  pushVideoUndoSnapshot(true);
  let currentSet = null;
  let homeScore = Math.max(0, home);
  let awayScore = Math.max(0, away);
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
  refreshAfterVideoEdit(false);
  renderEventsLog({ suppressScroll: true });
  updateVideoAnalysisOverlay();
  closeVideoScoreModal();
}
if (typeof window !== "undefined") {
}
function getVideoSortDisplayValue(ev, key, baseMs = null) {
  if (!ev || !key) return "";
  const scope = getTeamScopeFromEvent(ev);
  const players = getPlayersForScope(scope);
  const numbers = getPlayerNumbersForScope(scope);
  switch (key) {
    case "eventId":
      return Number.isFinite(ev.eventId) ? ev.eventId : -1;
    case "videoTime": {
      const videoTime =
        typeof ev.videoTime === "number" ? ev.videoTime : computeEventVideoTime(ev, baseMs || getVideoBaseTimeMs(getVideoSkillEvents()));
      return Number.isFinite(videoTime) ? videoTime : -1;
    }
    case "set":
      return parseInt(ev.set, 10) || 0;
    case "homeScore":
      return parseInt(ev.homeScore, 10) || 0;
    case "visitorScore":
      return parseInt(ev.visitorScore, 10) || 0;
    case "team":
      if (ev.team === "opponent") return state.selectedOpponentTeam || "Avversaria";
      if (ev.team && ev.team !== "opponent") return ev.teamName || state.selectedTeam || "Squadra";
      if (ev.code === "opp-error" || ev.code === "opp-point" || ev.playerName === "Avversari") {
        return state.selectedOpponentTeam || "Avversaria";
      }
      return state.selectedTeam || "Squadra";
    case "player": {
      const name = ev.playerName || players[resolvePlayerIdx(ev)] || "";
      return name ? formatNameWithNumberFor(name, numbers) || name : "";
    }
    case "setter": {
      const setterName = ev.setterName || (typeof ev.setterIdx === "number" ? players[ev.setterIdx] : "");
      return setterName ? formatNameWithNumberFor(setterName, numbers) || setterName : "";
    }
    case "skill":
      return ev.actionType === "timeout"
        ? "Timeout"
        : ev.actionType === "substitution"
          ? "Cambio"
          : (SKILLS.find(s => s.id === ev.skillId) || {}).label || ev.skillId || "";
    case "code":
      return ev.code || "";
    case "zone":
      return parseInt(ev.zone || ev.playerPosition, 10) || 0;
    case "setterPosition":
      return parseInt(ev.setterPosition || ev.rotation, 10) || 0;
    case "opponentSetterPosition":
      return parseInt(ev.opponentSetterPosition, 10) || 0;
    case "receivePosition":
      return parseInt(ev.receivePosition, 10) || 0;
    case "base":
      return valueToString(ev.base);
    case "setType":
      return valueToString(ev.setType);
    case "combination":
      return valueToString(ev.combination);
    case "serveType":
      return valueToString(ev.serveType);
    case "receiveEvaluation":
      return valueToString(ev.receiveEvaluation);
    case "attackEvaluation":
      return valueToString(ev.attackEvaluation);
    case "attackBp":
      return normalizePhaseValue(ev.attackBp) || "";
    case "attackType":
      return valueToString(ev.attackType);
    case "blockNumber":
      return parseInt(ev.blockNumber, 10) || 0;
    case "durationMs":
      return parseInt(ev.durationMs, 10) || 0;
    default:
      return valueToString(ev[key]);
  }
}
function sortVideoEvents(events, baseMs = null) {
  const sortState = ensureVideoAnalysisSortState();
  if (!sortState.key || !sortState.dir) return events;
  const dirFactor = sortState.dir === "desc" ? -1 : 1;
  return [...events].sort((a, b) => {
    const av = getVideoSortDisplayValue(a, sortState.key, baseMs);
    const bv = getVideoSortDisplayValue(b, sortState.key, baseMs);
    if (typeof av === "number" && typeof bv === "number") {
      if (av !== bv) return (av - bv) * dirFactor;
    } else {
      const cmp = String(av || "").localeCompare(String(bv || ""), "it", { sensitivity: "base", numeric: true });
      if (cmp !== 0) return cmp * dirFactor;
    }
    const aId = Number.isFinite(a.eventId) ? a.eventId : 0;
    const bId = Number.isFinite(b.eventId) ? b.eventId : 0;
    return aId - bId;
  });
}
function getSelectedVideoRowForInsert() {
  const ctx = eventTableContexts.video;
  if (!ctx || !ctx.rows || !ctx.rows.length) return null;
  let key = lastSelectedEventId && selectedEventIds.has(lastSelectedEventId) ? lastSelectedEventId : null;
  if (!key) {
    const first = ctx.rows.find(r => selectedEventIds.has(r.key));
    key = first ? first.key : null;
  }
  if (!key) return null;
  return ctx.rows.find(r => r.key === key) || null;
}
function addEmptyVideoEventAfterSelection() {
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
    set: baseEv.set || state.currentSet || 1,
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
      ? (state.events || []).findIndex(ev => ev.eventId === baseEv.eventId)
      : (state.events || []).indexOf(baseEv);
  if (!state.events) state.events = [];
  const insertAt = idx >= 0 ? idx + 1 : state.events.length;
  state.events.splice(insertAt, 0, nextEvent);
  saveState({ persistLocal: true });
  recalcAllStatsAndUpdateUI();
  renderEventsLog();
  renderVideoAnalysis();
  renderTrajectoryAnalysis();
  renderServeTrajectoryAnalysis();
}
function getFileBasename(name) {
  if (!name) return "";
  const cleaned = String(name).split(/[\\/]/).pop();
  return cleaned || "";
}
function getFileExtension(name) {
  const base = getFileBasename(name);
  const idx = base.lastIndexOf(".");
  if (idx > 0 && idx < base.length - 1) return base.slice(idx);
  return "";
}
function stripFileExtension(name) {
  const base = getFileBasename(name);
  const idx = base.lastIndexOf(".");
  if (idx > 0) return base.slice(0, idx);
  return base;
}
function buildFfmpegConcatCommand(segments, inputName, outputName) {
  if (!segments || !segments.length) return "";
  const trims = segments
    .map((seg, idx) => {
      const start = seg.start.toFixed(2);
      const end = seg.end.toFixed(2);
      const overlay = buildFfmpegOverlayFilter(seg.overlayLines || []);
      return `[0:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS${overlay}[v${idx}];` +
        `[0:a]atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS[a${idx}]`;
    })
    .join(";");
  const concat = segments.map((_, idx) => `[v${idx}][a${idx}]`).join("") + `concat=n=${segments.length}:v=1:a=1[outv][outa]`;
  const input = inputName || "input.mp4";
  const output = outputName || "output.mp4";
  return `ffmpeg -i "${input}" -filter_complex "${trims};${concat}" -map "[outv]" -map "[outa]" -c:v libx264 -c:a aac "${output}"`;
}
async function copyFfmpegFromSelection() {
  const segments = buildSelectedSegments();
  if (!segments.length) {
    alert("Seleziona uno o più eventi per generare il comando ffmpeg.");
    return;
  }
  const inputName = state.video && state.video.youtubeId ? "" : getFileBasename(state.video && state.video.fileName);
  if (!inputName) {
    alert("Carica un file video locale per usare il comando ffmpeg.");
    return;
  }
  const ext = getFileExtension(inputName);
  const defaultBase = stripFileExtension(inputName) || "output";
  const outputBase = prompt("Nome file output (senza estensione):", defaultBase + "_clip");
  if (!outputBase) return;
  const sanitizedBase = stripFileExtension(outputBase.trim()) || "output";
  const outputName = sanitizedBase + ext;
  const cmd = buildFfmpegConcatCommand(segments, inputName, outputName);
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
  alert("Comando ffmpeg copiato negli appunti.");
}
function renderEventsLog(options = {}) {
  const append = !!options.append;
  let summaryText = "Nessun evento";
  const suppressScroll = !!options.suppressScroll;
  if (!state.events || state.events.length === 0) {
    if (elEventsLog) elEventsLog.innerHTML = "";
    if (elEventsLog) elEventsLog.textContent = "Nessun evento ancora registrato.";
    if (elEventsLogSummary) elEventsLogSummary.textContent = summaryText;
    lastLogRenderedKey = null;
    updateLiveDvwMirror();
    return;
  }
  const recent = state.events.slice(-40).sort((a, b) => {
    const at = new Date(a.t || 0).getTime();
    const bt = new Date(b.t || 0).getTime();
    if (isFinite(at) && isFinite(bt) && at !== bt) return at - bt; // oldest first
    return (a.eventId || 0) - (b.eventId || 0);
  });
  const latest = recent[recent.length - 1];
  const latestKey = getEventKey(latest, recent.length - 1);
  const getEventSkillLabel = ev => {
    if (ev.actionType === "timeout") return "Timeout";
    if (ev.actionType === "substitution") return "Cambio";
    const meta = SKILLS.find(s => s.id === ev.skillId);
    return meta ? meta.label : ev.skillId || "";
  };
  const formatEv = ev => {
    const dateObj = new Date(ev.t);
    const timeStr = isNaN(dateObj.getTime())
      ? ""
      : dateObj.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        });
    const errorTypeLabel =
      ev.errorType && (ev.code === "error" || ev.code === "team-error")
        ? getErrorTypeLabel(ev.errorType)
        : "";
    const scope = getTeamScopeFromEvent(ev);
    const numbers = getPlayerNumbersForScope(scope);
    const nameLabel = ev.playerName ? formatNameWithNumberFor(ev.playerName, numbers) : null;
    const leftText =
      "[S" +
      ev.set +
      "] " +
      (nameLabel || "#" + ev.playerIdx) +
      " - " +
      getEventSkillLabel(ev) +
      " " +
      ev.code +
      (errorTypeLabel ? " · " + errorTypeLabel : "");
    return { leftText, timeStr };
  };
  const latestFmt = formatEv(latest);
  summaryText = latestFmt.leftText;
  const skillEvents = getVideoSkillEvents();
  const baseMs = getVideoBaseTimeMs(skillEvents);
  let didAppend = false;
  if (append && elEventsLog && lastLogRenderedKey) {
    const lastIdx = recent.findIndex(ev => getEventKey(ev) === lastLogRenderedKey);
    if (lastIdx !== -1) {
      const toAppend = recent.slice(lastIdx + 1);
      if (toAppend.length > 0) {
        renderEventTableRows(elEventsLog, toAppend, {
          showSeek: false,
          showVideoTime: true,
          baseMs,
          enableSelection: true,
          contextKey: "log",
          onSelectionChange: (_rows, _ctx, opts) => handleSeekForSelection("log", opts),
          append: true
        });
        const table = elEventsLog.querySelector("table");
        const tbody = table ? table.querySelector("tbody") : null;
        const ctxRef = eventTableContexts.log;
        if (tbody && ctxRef && ctxRef.rows) {
          const overflow = tbody.rows.length - recent.length;
          if (overflow > 0) {
            for (let i = 0; i < overflow; i += 1) {
              const first = tbody.rows[0];
              if (first) first.remove();
            }
            ctxRef.rows.splice(0, overflow);
            pruneEventSelection();
          }
        }
        didAppend = true;
      }
    }
  }
  if (!didAppend) {
    if (elEventsLog) elEventsLog.innerHTML = "";
    renderEventTableRows(elEventsLog, recent, {
      showSeek: false,
      showVideoTime: true,
      baseMs,
      enableSelection: true,
      contextKey: "log",
      onSelectionChange: (_rows, _ctx, opts) => handleSeekForSelection("log", opts)
    });
  }
  lastLogRenderedKey = latestKey;
  if (elEventsLog && !suppressScroll) {
    requestAnimationFrame(() => {
      elEventsLog.scrollTop = elEventsLog.scrollHeight;
    });
  }
  if (elEventsLogSummary) {
    elEventsLogSummary.textContent = summaryText;
  }
  updateTeamCounters();
  renderLogServeTrajectories();
  updateLiveDvwMirror();
}
function getTimeoutCountForSet(setNum) {
  const set = Number(setNum) || 1;
  return (state.events || []).filter(
    ev => ev && ev.actionType === "timeout" && (parseInt(ev.set, 10) || 1) === set && ev.code !== "TOA"
  ).length;
}
function getTimeoutOppCountForSet(setNum) {
  const set = Number(setNum) || 1;
  return (state.events || []).filter(
    ev => ev && ev.actionType === "timeout" && (parseInt(ev.set, 10) || 1) === set && ev.code === "TOA"
  ).length;
}
function getSubstitutionCountForSet(setNum, scope = "our") {
  const set = Number(setNum) || 1;
  return (state.events || []).filter(
    ev =>
      ev &&
      ev.actionType === "substitution" &&
      (parseInt(ev.set, 10) || 1) === set &&
      getTeamScopeFromEvent(ev) === scope
  ).length;
}
function updateTeamCounters() {
  const setNum = state.currentSet || 1;
  if (elTimeoutCount) {
    const used = getTimeoutCountForSet(setNum);
    const remaining = Math.max(0, 2 - used);
    elTimeoutCount.textContent = String(remaining);
  }
  if (elTimeoutOppCount) {
    const used = getTimeoutOppCountForSet(setNum);
    const remaining = Math.max(0, 2 - used);
    elTimeoutOppCount.textContent = String(remaining);
  }
  if (elSubstitutionRemaining) {
    const used = getSubstitutionCountForSet(setNum, "our");
    const remaining = Math.max(0, 6 - used);
    elSubstitutionRemaining.textContent = String(remaining);
  }
  if (elSubstitutionRemainingOpp) {
    const used = getSubstitutionCountForSet(setNum, "opponent");
    const remaining = Math.max(0, 6 - used);
    elSubstitutionRemainingOpp.textContent = String(remaining);
  }
}
function recordTimeoutEvent() {
  recordSetAction("timeout", { playerName: "Timeout", code: "TO" });
  saveState({ persistLocal: true });
  renderEventsLog();
  renderPlayers();
  renderBenchChips();
  renderLiberoChipsInline();
  renderLineupChips();
  updateRotationDisplay();
}
function recordOpponentTimeoutEvent() {
  recordSetAction("timeout", { playerName: "Timeout Avv.", code: "TOA", teamScope: "opponent" });
  saveState({ persistLocal: true });
  renderEventsLog();
  renderPlayers();
  renderBenchChips();
  renderLiberoChipsInline();
  renderLineupChips();
  updateRotationDisplay();
}
function recordSubstitutionEvent({ playerIn, playerOut, teamScope = "our" }) {
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
  renderBenchChips();
  renderLiberoChipsInline();
  renderLineupChips();
  updateRotationDisplay();
}
function openOffsetModal() {
  if (!elOffsetModal || !elOffsetSkillGrid) return;
  elOffsetSkillGrid.innerHTML = "";
  SKILLS.forEach(skill => {
    const row = document.createElement("div");
    row.className = "offset-skill-row";
    const label = document.createElement("label");
    label.textContent = skill.label;
    const input = document.createElement("input");
    input.type = "number";
    input.step = "1";
    input.value = "0";
    input.dataset.skillId = skill.id;
    row.appendChild(label);
    row.appendChild(input);
    elOffsetSkillGrid.appendChild(row);
  });
  const manualErrorRow = document.createElement("div");
  manualErrorRow.className = "offset-skill-row";
  const manualErrorLabel = document.createElement("label");
  manualErrorLabel.textContent = "Errori (manuale)";
  const manualErrorInput = document.createElement("input");
  manualErrorInput.type = "number";
  manualErrorInput.step = "1";
  manualErrorInput.value = "0";
  manualErrorInput.dataset.skillId = "__manual_error__";
  manualErrorRow.appendChild(manualErrorLabel);
  manualErrorRow.appendChild(manualErrorInput);
  elOffsetSkillGrid.appendChild(manualErrorRow);
  elOffsetModal.classList.remove("hidden");
  setGlobalModalState(true);
}
function closeOffsetModal() {
  if (!elOffsetModal) return;
  elOffsetModal.classList.add("hidden");
  setGlobalModalState(false);
}
function getDefaultSkillDurationMs() {
  return 5000;
}
function renderSkillDurationGrid() {
  if (!elSkillDurationGrid) return;
  elSkillDurationGrid.innerHTML = "";
  const last = state.skillDurationLastApplied || {};
  SKILLS.forEach(skill => {
    const row = document.createElement("div");
    row.className = "offset-skill-row";
    const label = document.createElement("label");
    label.textContent = skill.label;
    const input = document.createElement("input");
    input.type = "number";
    input.step = "250";
    input.min = "250";
    const storedValue = last[skill.id];
    const baseValue =
      typeof storedValue === "number" && isFinite(storedValue) && storedValue > 0
        ? String(storedValue)
        : String(getDefaultSkillDurationMs());
    input.value = baseValue;
    input.dataset.skillId = skill.id;
    row.appendChild(label);
    row.appendChild(input);
    elSkillDurationGrid.appendChild(row);
  });
}
function openSkillDurationModal() {
  if (!elSkillDurationModal) return;
  renderSkillDurationGrid();
  elSkillDurationModal.classList.remove("hidden");
  setGlobalModalState(true);
}
function closeSkillDurationModal() {
  if (!elSkillDurationModal) return;
  elSkillDurationModal.classList.add("hidden");
  setGlobalModalState(false);
}
function applySkillDurationDefaults() {
  if (!elSkillDurationGrid) return;
  const defaults = {};
  elSkillDurationGrid.querySelectorAll("input[data-skill-id]").forEach(input => {
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
  (state.events || []).forEach(ev => {
    if (!ev || !ev.skillId) return;
    const next = defaults[ev.skillId];
    if (!next) return;
    ev.durationMs = next;
  });
  state.skillDurationLastApplied = defaults;
  saveState({ persistLocal: true });
  renderEventsLog({ suppressScroll: true });
  renderVideoAnalysis();
  closeSkillDurationModal();
}
const LINK_TIME_OPTIONS = [
  {
    type: "serve-pass",
    label: "Battuta / Ricezione",
    source: { id: "serve", label: "Battuta" },
    target: { id: "pass", label: "Ricezione" }
  },
  {
    type: "set-attack",
    label: "Attacco / Alzata",
    source: { id: "attack", label: "Attacco" },
    target: { id: "second", label: "Alzata" }
  },
  {
    type: "attack-block",
    label: "Attacco / Muro",
    source: { id: "attack", label: "Attacco" },
    target: { id: "block", label: "Muro" }
  },
  {
    type: "attack-defense",
    label: "Attacco / Difesa",
    source: { id: "attack", label: "Attacco" },
    target: { id: "defense", label: "Difesa" }
  },
  {
    type: "block-defense",
    label: "Muro / Difesa",
    source: { id: "block", label: "Muro" },
    target: { id: "defense", label: "Difesa" }
  }
];
function renderUnifyTimesOptions() {
  if (!elUnifyTimesGrid) return;
  elUnifyTimesGrid.innerHTML = "";
  LINK_TIME_OPTIONS.forEach(opt => {
    const row = document.createElement("div");
    row.className = "unify-times-row";
    const head = document.createElement("div");
    head.className = "unify-times-row__head";
    const enable = document.createElement("input");
    enable.type = "checkbox";
    enable.checked = true;
    enable.dataset.linkType = opt.type;
    const label = document.createElement("span");
    label.className = "unify-times-row__label";
    label.textContent = opt.label;
    head.appendChild(enable);
    head.appendChild(label);
    row.appendChild(head);
    const options = document.createElement("div");
    options.className = "unify-times-row__options";
    const name = `unify-source-${opt.type}`;
    const sourceLabel = document.createElement("label");
    const sourceInput = document.createElement("input");
    sourceInput.type = "radio";
    sourceInput.name = name;
    sourceInput.value = opt.source.id;
    sourceInput.checked = true;
    sourceLabel.appendChild(sourceInput);
    sourceLabel.appendChild(document.createTextNode(opt.source.label));
    const targetLabel = document.createElement("label");
    const targetInput = document.createElement("input");
    targetInput.type = "radio";
    targetInput.name = name;
    targetInput.value = opt.target.id;
    targetLabel.appendChild(targetInput);
    targetLabel.appendChild(document.createTextNode(opt.target.label));
    options.appendChild(sourceLabel);
    options.appendChild(targetLabel);
    row.appendChild(options);
    elUnifyTimesGrid.appendChild(row);
  });
}
function openUnifyTimesModal() {
  if (!elUnifyTimesModal) return;
  renderUnifyTimesOptions();
  elUnifyTimesModal.classList.remove("hidden");
  setGlobalModalState(true);
}
function closeUnifyTimesModal() {
  if (!elUnifyTimesModal) return;
  elUnifyTimesModal.classList.add("hidden");
  setGlobalModalState(false);
}
function getFilteredVideoEventsForAnalysis() {
  const skillEvents = getVideoSkillEvents();
  const filtered = skillEvents
    .map(item => item.ev)
    .filter(ev => matchesVideoFilters(ev, videoFilterState));
  return { events: filtered, baseMs: getVideoBaseTimeMs(skillEvents) };
}
function resolveSourceEventForLink(evA, evB, preferredSkill) {
  if (preferredSkill) {
    if (evA.skillId === preferredSkill) return evA;
    if (evB.skillId === preferredSkill) return evB;
  }
  if (typeof evA.videoTime === "number") return evA;
  if (typeof evB.videoTime === "number") return evB;
  return evA;
}
function applyUnifyTimes() {
  if (!elUnifyTimesGrid) return;
  const enabledTypes = new Set();
  const preferredSources = {};
  elUnifyTimesGrid.querySelectorAll("input[type=\"checkbox\"][data-link-type]").forEach(input => {
    if (input.checked) enabledTypes.add(input.dataset.linkType);
  });
  LINK_TIME_OPTIONS.forEach(opt => {
    const selected = elUnifyTimesGrid.querySelector(`input[name="unify-source-${opt.type}"]:checked`);
    preferredSources[opt.type] = selected ? selected.value : opt.source.id;
  });
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
function applyOffsetsToSelectedSkills() {
  const ctxKey = getActiveEventContextKey();
  const rows = ctxKey ? getSelectedRows(ctxKey) : [];
  if (!rows.length) {
    alert("Seleziona una o più skill da modificare.");
    return;
  }
  if (!elOffsetSkillGrid) return;
  const offsets = {};
  let manualErrorOffset = 0;
  elOffsetSkillGrid.querySelectorAll("input[data-skill-id]").forEach(input => {
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
