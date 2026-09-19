function cleanCourtLiberoReplacementsForScope(scope = "our") {
  const court = scope === "opponent" ? state.opponentCourt : state.court;
  if (!Array.isArray(court)) return;
  let changed = false;
  const nextCourt = court.map(slot => {
    const main = slot && slot.main ? slot.main : "";
    const replaced = slot && slot.replaced ? slot.replaced : "";
    if (replaced && (!main || !isLiberoForScope(main, scope))) {
      changed = true;
      return { main, replaced: "" };
    }
    return slot && typeof slot === "object" ? Object.assign({}, slot) : { main: "", replaced: "" };
  });
  if (!changed) return;
  if (scope === "opponent") {
    state.opponentCourt = nextCourt;
  } else {
    state.court = nextCourt;
  }
}
function refreshAfterVideoEdit(shouldRecalcStats) {
  if (bulkEditActive) return;
  saveState({ persistLocal: shouldTrackVideoUndo() });
  if (shouldRecalcStats) {
    syncEventPlayerLinks(state.events || []);
    invalidateAnalysisCaches();
    recalcAllStatsAndUpdateUI();
    renderEventsLog();
    renderAggregatedTable();
    renderTrajectoryAnalysis();
    renderServeTrajectoryAnalysis();
    renderSecondTable();
    renderPlayerAnalysis();
  }
  renderVideoAnalysis();
}
function forceSyncDataFromLog() {
  syncEventPlayerLinks(state.events || []);
  invalidateAnalysisCaches();
  recalcAllStatsAndUpdateUI();
  renderEventsLog({ suppressScroll: true });
  renderAggregatedTable();
  renderTrajectoryAnalysis();
  renderServeTrajectoryAnalysis();
  renderSecondTable();
  renderPlayerAnalysis();
  renderVideoAnalysis();
  saveState();
}
function createPlayerSelect(ev, onDone, options = {}) {
  const select = document.createElement("select");
  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = "—";
  select.appendChild(emptyOpt);
  const scope = getTeamScopeFromEvent(ev);
  const players = getPlayersForScope(scope);
  const numbers = getPlayerNumbersForScope(scope);
  players.forEach((name, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent =
      scope === "opponent" ? formatNameWithNumberFor(name, numbers) : formatNameWithNumber(name);
    select.appendChild(opt);
  });
  const isSetterTarget = options && options.target === "setter";
  const playerIdx = isSetterTarget
    ? typeof ev.setterIdx === "number"
      ? ev.setterIdx
      : typeof ev.setterName === "string"
        ? players.indexOf(ev.setterName)
        : -1
    : resolvePlayerIdx(ev);
  select.value = playerIdx >= 0 ? String(playerIdx) : "";
  select.addEventListener("change", () => {
    markVideoUndoCapture(select);
    const raw = select.value;
    const val = parseInt(raw, 10);
    if (!raw) {
      if (isSetterTarget) {
        ev.setterIdx = null;
        ev.setterName = null;
      } else {
        ev.playerIdx = null;
        ev.playerName = null;
        ev.playerId = null;
      }
      refreshAfterVideoEdit(true);
      return;
    }
    if (!isNaN(val) && players[val]) {
      if (isSetterTarget) {
        ev.setterIdx = val;
        ev.setterName = players[val];
      } else {
        ev.playerIdx = val;
        ev.playerName = players[val];
        ev.playerId = getPlayerIdForScope(scope, val, players[val]);
      }
      refreshAfterVideoEdit(true);
    }
  });
  select.addEventListener("blur", () => {
    if (typeof onDone === "function") onDone();
    renderVideoAnalysis();
  });
  return select;
}
function createSkillSelect(ev, onDone) {
  const select = document.createElement("select");
  const skillOptions = SKILLS.concat([{ id: "manual", label: "Manuale" }]);
  skillOptions.forEach(skill => {
    const opt = document.createElement("option");
    opt.value = skill.id;
    opt.textContent = skill.label;
    select.appendChild(opt);
  });
  select.value = ev.skillId || SKILLS[0]?.id || "";
  select.addEventListener("change", () => {
    if (select.value) {
      markVideoUndoCapture(select);
      ev.skillId = select.value;
      if (ev.skillId !== "manual") ev.pointDirection = null;
      refreshAfterVideoEdit(true);
    }
  });
  select.addEventListener("blur", () => {
    if (typeof onDone === "function") onDone();
    renderVideoAnalysis();
  });
  return select;
}
function syncManualEventPointDirection(ev) {
  if (!ev || ev.skillId !== "manual") return;
  const scope = getTeamScopeFromEvent(ev);
  switch (ev.code) {
    case "for":
      ev.pointDirection = "for";
      break;
    case "against":
    case "error":
    case "team-error":
      ev.pointDirection = "against";
      break;
    case "opp-point":
      ev.pointDirection = scope === "opponent" ? "for" : "against";
      break;
    case "opp-error":
      ev.pointDirection = scope === "opponent" ? "against" : "for";
      break;
    default:
      ev.pointDirection = null;
  }
}
function createCodeSelect(ev, onDone) {
  const select = document.createElement("select");
  const codes = ev.skillId === "manual"
    ? ["for", "against", "error", "team-error", "opp-point", "opp-error", "freeball"]
    : RESULT_CODES;
  codes.forEach(code => {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = code;
    select.appendChild(opt);
  });
  select.value = ev.code || codes[0];
  select.addEventListener("change", () => {
    markVideoUndoCapture(select);
    ev.code = select.value;
    syncManualEventPointDirection(ev);
    refreshAfterVideoEdit(true);
  });
  select.addEventListener("blur", () => {
    if (typeof onDone === "function") onDone();
    renderVideoAnalysis();
  });
  return select;
}
function createEventTeamSelect(ev, onDone) {
  const select = document.createElement("select");
  [
    { value: "our", label: state.selectedTeam || "Squadra" },
    { value: "opponent", label: state.selectedOpponentTeam || "Avversaria" }
  ].forEach(item => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    select.appendChild(option);
  });
  select.value = getTeamScopeFromEvent(ev);
  select.addEventListener("change", () => {
    markVideoUndoCapture(select);
    const scope = select.value === "opponent" ? "opponent" : "our";
    ev.team = scope;
    ev.teamName = getTeamNameForScope(scope);
    ev.playerIdx = null;
    ev.playerId = null;
    ev.playerName = null;
    ev.setterIdx = null;
    ev.setterName = null;
    syncManualEventPointDirection(ev);
    refreshAfterVideoEdit(true);
  });
  select.addEventListener("blur", () => {
    if (typeof onDone === "function") onDone();
    renderVideoAnalysis();
  });
  return select;
}
function createRelatedEventsInput(ev, onDone) {
  const input = document.createElement("input");
  input.type = "text";
  input.value = Array.isArray(ev.relatedEvents) ? ev.relatedEvents.join(" ") : "";
  const commit = () => {
    markVideoUndoCapture(input);
    ev.relatedEvents = String(input.value || "")
      .split(/[\s,;]+/)
      .map(value => value.trim())
      .filter(Boolean)
      .map(value => (/^\d+$/.test(value) ? Number(value) : value));
    refreshAfterVideoEdit(true);
  };
  input.addEventListener("change", commit);
  input.addEventListener("blur", () => {
    if (typeof onDone === "function") onDone();
    renderVideoAnalysis();
    renderEventsLog();
  });
  return input;
}
function createErrorTypeSelect(ev, onDone) {
  const select = document.createElement("select");
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "—";
  select.appendChild(empty);
  ERROR_TYPES.forEach(item => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.label;
    select.appendChild(option);
  });
  select.value = ev.errorType || "";
  select.addEventListener("change", () => {
    markVideoUndoCapture(select);
    ev.errorType = select.value || null;
    refreshAfterVideoEdit(true);
  });
  select.addEventListener("blur", () => {
    if (typeof onDone === "function") onDone();
    renderVideoAnalysis();
  });
  return select;
}
function createBooleanInput(ev, field, onDone) {
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = !!ev[field];
  checkbox.addEventListener("change", () => {
    markVideoUndoCapture(checkbox);
    ev[field] = checkbox.checked;
    refreshAfterVideoEdit(true);
  });
  checkbox.addEventListener("blur", () => {
    if (typeof onDone === "function") onDone();
  });
  return checkbox;
}
function createNumberSelect(ev, field, min, max, onDone) {
  const select = document.createElement("select");
  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = "—";
  select.appendChild(emptyOpt);
  for (let i = min; i <= max; i += 1) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = String(i);
    select.appendChild(opt);
  }
  select.value = ev[field] != null ? String(ev[field]) : "";
  select.addEventListener("change", () => {
    markVideoUndoCapture(select);
    const val = parseInt(select.value, 10);
    if (!isNaN(val) && val >= min && val <= max) {
      ev[field] = val;
      refreshAfterVideoEdit(field === "rotation" || field === "setterPosition" || field === "opponentSetterPosition");
    }
  });
  select.addEventListener("blur", () => {
    if (typeof onDone === "function") onDone();
    renderVideoAnalysis();
  });
  return select;
}
function createBaseSelect(ev, onDone) {
  const select = document.createElement("select");
  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = "—";
  select.appendChild(emptyOpt);
  DEFAULT_BASE_OPTIONS.forEach(opt => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label || opt.value;
    select.appendChild(option);
  });
  select.value = ev.base || "";
  select.addEventListener("change", () => {
    markVideoUndoCapture(select);
    ev.base = select.value || null;
    refreshAfterVideoEdit(true);
  });
  select.addEventListener("blur", () => {
    if (typeof onDone === "function") onDone();
    renderVideoAnalysis();
  });
  return select;
}
function createSetTypeSelect(ev, onDone) {
  const select = document.createElement("select");
  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = "—";
  select.appendChild(emptyOpt);
  const setTypeOptions = DEFAULT_SET_TYPE_OPTIONS.some(opt => String(opt.value).toLowerCase() === "damp")
    ? DEFAULT_SET_TYPE_OPTIONS
    : DEFAULT_SET_TYPE_OPTIONS.concat([{ value: "Damp", label: "Damp" }]);
  setTypeOptions.forEach(opt => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label || opt.value;
    select.appendChild(option);
  });
  select.value = ev.setType || "";
  select.addEventListener("change", () => {
    markVideoUndoCapture(select);
    ev.setType = select.value || null;
    refreshAfterVideoEdit(true);
  });
  select.addEventListener("blur", () => {
    if (typeof onDone === "function") onDone();
    renderVideoAnalysis();
  });
  return select;
}
function createServeTypeSelect(ev, onDone) {
  const select = document.createElement("select");
  const options = [
    { value: "F", label: "F" },
    { value: "JF", label: "JF" },
    { value: "S", label: "S" }
  ];
  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = "—";
  select.appendChild(emptyOpt);
  options.forEach(opt => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
  });
  select.value = ev.serveType || "";
  select.addEventListener("change", () => {
    markVideoUndoCapture(select);
    ev.serveType = select.value || null;
    refreshAfterVideoEdit(true);
  });
  select.addEventListener("blur", () => {
    if (typeof onDone === "function") onDone();
    renderVideoAnalysis();
  });
  return select;
}
function createEvalSelect(ev, field, onDone, { includeFb = false } = {}) {
  const select = document.createElement("select");
  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = "—";
  select.appendChild(emptyOpt);
  const list = RESULT_CODES.slice();
  if (includeFb) list.push("FB");
  list.forEach(code => {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = code;
    select.appendChild(opt);
  });
  select.value = ev[field] || "";
  select.addEventListener("change", () => {
    markVideoUndoCapture(select);
    ev[field] = select.value || null;
    refreshAfterVideoEdit(true);
  });
  select.addEventListener("blur", () => {
    if (typeof onDone === "function") onDone();
    renderVideoAnalysis();
  });
  return select;
}
function createPhaseSelect(ev, onDone) {
  const select = document.createElement("select");
  DEFAULT_PHASE_OPTIONS.forEach(opt => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label || opt.value;
    select.appendChild(option);
  });
  const val = normalizePhaseValue(ev.attackBp);
  select.value = val || "bp";
  select.addEventListener("change", () => {
    markVideoUndoCapture(select);
    const choice = select.value;
    ev.attackBp = choice === "bp";
    refreshAfterVideoEdit(true);
  });
  select.addEventListener("blur", () => {
    if (typeof onDone === "function") onDone();
    renderVideoAnalysis();
  });
  return select;
}
function createPlayerNameSelect(ev, field, onDone) {
  const select = document.createElement("select");
  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = "—";
  select.appendChild(emptyOpt);
  const scope = getTeamScopeFromEvent(ev);
  const players = getPlayersForScope(scope);
  const numbers = getPlayerNumbersForScope(scope);
  players.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = formatNameWithNumberFor(name, numbers) || name;
    select.appendChild(opt);
  });
  select.value = ev[field] || "";
  select.addEventListener("change", () => {
    markVideoUndoCapture(select);
    ev[field] = select.value || null;
    refreshAfterVideoEdit(true);
  });
  select.addEventListener("blur", () => {
    if (typeof onDone === "function") onDone();
    renderVideoAnalysis();
  });
  return select;
}
function createSetInput(ev, onDone) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = "1";
  input.max = "5";
  input.value = ev.set || "";
  input.addEventListener("change", () => {
    const val = parseInt(input.value, 10);
    if (!isNaN(val) && val > 0) {
      ev.set = val;
      refreshAfterVideoEdit(true);
    }
  });
  input.addEventListener("blur", () => {
    if (typeof onDone === "function") onDone();
    renderVideoAnalysis();
  });
  return input;
}
function createRotationInput(ev, onDone) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = "1";
  input.max = "6";
  input.value = ev.rotation || "";
  input.addEventListener("change", () => {
    const val = parseInt(input.value, 10);
    if (!isNaN(val) && val >= 1 && val <= 6) {
      ev.rotation = val;
      refreshAfterVideoEdit(true);
    }
  });
  input.addEventListener("blur", () => {
    if (typeof onDone === "function") onDone();
    renderVideoAnalysis();
  });
  return input;
}
function createZoneInput(ev, onDone) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = "1";
  input.max = "6";
  input.placeholder = "1-6";
  const fallback = getCurrentZoneForPlayer(resolvePlayerIdx(ev), null, getTeamScopeFromEvent(ev));
  input.value = ev.zone || fallback || "";
  input.addEventListener("change", () => {
    const val = parseInt(input.value, 10);
    if (!isNaN(val) && val >= 1 && val <= 6) {
      ev.zone = val;
      refreshAfterVideoEdit(false);
    }
  });
  input.addEventListener("blur", () => {
    if (typeof onDone === "function") onDone();
    renderVideoAnalysis();
  });
  return input;
}
function createVideoTimeInput(ev, videoTime, onDone) {
  const totalSeconds = Math.max(0, Number.isFinite(videoTime) ? videoTime : 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const wrapper = document.createElement("div");
  wrapper.className = "video-time-input";
  const makePart = (label, value, max) => {
    const block = document.createElement("label");
    block.className = "video-time-part";
    const span = document.createElement("span");
    span.textContent = label;
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    if (typeof max === "number") input.max = String(max);
    input.step = "1";
    input.value = String(value);
    block.appendChild(span);
    block.appendChild(input);
    return { block, input };
  };
  const hh = makePart("H", hours, 23);
  const mm = makePart("M", minutes, 59);
  const ss = makePart("S", seconds, 59);
  wrapper.appendChild(hh.block);
  wrapper.appendChild(mm.block);
  wrapper.appendChild(ss.block);

  const commit = () => {
    markVideoUndoCapture(wrapper);
    const h = Math.max(0, parseInt(hh.input.value || "0", 10) || 0);
    const m = Math.max(0, parseInt(mm.input.value || "0", 10) || 0);
    const s = Math.max(0, parseInt(ss.input.value || "0", 10) || 0);
    const next = h * 3600 + m * 60 + s;
    ev.videoTime = Math.max(0, next);
    refreshAfterVideoEdit(false);
  };
  [hh.input, mm.input, ss.input].forEach(input => {
    input.addEventListener("change", commit);
    input.addEventListener("keydown", e => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      commit();
      if (typeof onDone === "function") onDone();
      renderVideoAnalysis();
    });
    input.addEventListener("blur", () => {
      commit();
      if (typeof onDone === "function") onDone();
      renderVideoAnalysis();
    });
  });
  return wrapper;
}
function makeEditableCell(td, _title, factory, guard = null) {
  const startEdit = () => {
    if (td.dataset.editing === "true") return;
    if (currentEditCell && currentEditCell !== td) {
      closeCurrentEdit({ refresh: false });
    }
    td.dataset.editing = "true";
    td.innerHTML = "";
    const endEdit = () => {
      td.dataset.editing = "false";
      if (currentEditControl === control) currentEditControl = null;
      if (currentEditCell === td) currentEditCell = null;
      closeCurrentEdit({ refresh: false });
    };
    const control = factory(() => {
      endEdit();
    });
    td.appendChild(control);
    currentEditControl = control;
    currentEditCell = td;
    if (typeof control.focus === "function") {
      control.focus();
    }
    control.addEventListener("blur", endEdit);
  };
  td.addEventListener("dblclick", e => {
    e.stopPropagation();
    const isAllowed =
      !guard || typeof guard.isRowSelected !== "function" || guard.isRowSelected() === true;
    if (!isAllowed) {
      if (guard && typeof guard.requestSelect === "function") {
        guard.requestSelect();
        setTimeout(() => {
          if (guard.isRowSelected && guard.isRowSelected()) {
            startEdit();
          }
        }, 0);
      }
      return;
    }
    startEdit();
  });
}
function renderEventTableRows(target, events, options = {}) {
  if (!target) return;
  const append = !!options.append;
  const contextKey = options.contextKey || target.id || (target.closest && target.closest("[data-context-key]")?.dataset.contextKey) || "events";
  const enableSelection = options.enableSelection !== false;
  const showCheckbox = options.showCheckbox !== false;
  if (!enableSelection) removeEventTableContext(contextKey);
  const showVideoTime = options.showVideoTime;
  const showSeek = options.showSeek;
  const showIndex = options.showIndex !== false;
  const baseMs = options.baseMs || null;
  const sortState = options.sortState || null;
  const onSortChange = typeof options.onSortChange === "function" ? options.onSortChange : null;
  const targetIsTbody = target.tagName && target.tagName.toLowerCase() === "tbody";
  let table = targetIsTbody ? null : null;
  let tbody = targetIsTbody ? target : null;
  let usingExisting = false;
  if (append) {
    if (targetIsTbody) {
      usingExisting = true;
    } else {
      table = target.querySelector("table");
      tbody = table ? table.querySelector("tbody") : null;
      usingExisting = !!tbody;
    }
  }
  if (!usingExisting) {
    target.innerHTML = "";
    table = targetIsTbody ? null : document.createElement("table");
    tbody = targetIsTbody ? target : document.createElement("tbody");
  }
  const rowRecords = [];
  let ctxRef = null;
  if (enableSelection) {
    if (append && eventTableContexts[contextKey]) {
      ctxRef = eventTableContexts[contextKey];
      ctxRef.onSelectionChange = options.onSelectionChange || ctxRef.onSelectionChange || null;
      ctxRef.baseMs = baseMs;
    } else {
      ctxRef = { rows: [], onSelectionChange: options.onSelectionChange || null, baseMs };
      eventTableContexts[contextKey] = ctxRef;
    }
  }

  const handleRowClick = (record, e, fromCheckbox = false) => {
    if (!enableSelection) return;
    const key = record.key;
    const isMeta = e.metaKey || e.ctrlKey;
    const isShift = e.shiftKey;
    if (isShift && lastSelectedEventId && selectedEventIds.has(lastSelectedEventId)) {
      selectRangeForContext(contextKey, lastSelectedEventId, key, { userAction: true });
      scrollRowIntoView(record);
      return;
    }
    if (isMeta) {
      toggleSelectionForContext(contextKey, key, { userAction: true });
    } else {
      setSelectionForContext(contextKey, new Set([key]), key, { userAction: true });
    }
    scrollRowIntoView(record);
  };

  if (!targetIsTbody && !usingExisting) {
    table.className = options.tableClass || "event-edit-table";
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const headers = [
      ...(enableSelection && showCheckbox ? [{ label: "✓" }] : []),
      ...(showIndex ? [{ label: "ID", sortKey: "eventId" }] : []),
      ...(showVideoTime ? [{ label: "Tempo", bulkKey: "videoTime", sortKey: "videoTime" }] : []),
      { label: "Set", bulkKey: "set", sortKey: "set" },
      { label: "Pt N", sortKey: "homeScore" },
      { label: "Pt A", sortKey: "visitorScore" },
      { label: "Squadra", sortKey: "team" },
      { label: "Giocatrice", bulkKey: "player", sortKey: "player" },
      { label: "Alzatore", bulkKey: "setter", sortKey: "setter" },
      { label: "Fondamentale", bulkKey: "skill", sortKey: "skill" },
      { label: "Codice", bulkKey: "code", sortKey: "code" },
      { label: "Link" },
      { label: "Tipo errore" },
      { label: "FB N" },
      { label: "Zona", bulkKey: "zone", sortKey: "zone" },
      { label: "Pos Palleggio", bulkKey: "setterPosition", sortKey: "setterPosition" },
      { label: "Pos Palleggio Avv", bulkKey: "opponentSetterPosition", sortKey: "opponentSetterPosition" },
      { label: "Zona Rice", bulkKey: "receivePosition", sortKey: "receivePosition" },
      { label: "Base", bulkKey: "base", sortKey: "base" },
      { label: "Tipo Alzata", bulkKey: "setType", sortKey: "setType" },
      { label: "Combinazione", bulkKey: "combination", sortKey: "combination" },
      { label: "Tipo Servizio", bulkKey: "serveType", sortKey: "serveType" },
      { label: "Servizio Start" },
      { label: "Servizio End" },
      { label: "Valut Rice", bulkKey: "receiveEvaluation", sortKey: "receiveEvaluation" },
      { label: "Valut Att", bulkKey: "attackEvaluation", sortKey: "attackEvaluation" },
      { label: "Att BP", bulkKey: "attackBp", sortKey: "attackBp" },
      { label: "Tipo Att", bulkKey: "attackType", sortKey: "attackType" },
      { label: "Direzione Att" },
      { label: "Muro N", bulkKey: "blockNumber", sortKey: "blockNumber" },
      { label: "In", bulkKey: "playerIn" },
      { label: "Out", bulkKey: "playerOut" },
      { label: "Dur (ms)", bulkKey: "durationMs", sortKey: "durationMs" }
    ];
    headers.push({ label: "Elimina" });
    const bulkHeaders = [];
    headers.forEach((h, idx) => {
      const th = document.createElement("th");
      if (enableSelection && showCheckbox && idx === 0) {
        const selectAll = document.createElement("input");
        selectAll.type = "checkbox";
        selectAll.title = "Seleziona tutto";
        selectAll.addEventListener("change", () => {
          const ctx = eventTableContexts[contextKey];
          if (!ctx || !ctx.rows) return;
          if (selectAll.checked) {
            const all = new Set(ctx.rows.map(r => r.key));
            setSelectionForContext(contextKey, all, ctx.rows[0]?.key || null, { userAction: true });
          } else {
            setSelectionForContext(contextKey, new Set(), null, { userAction: true });
          }
        });
        th.appendChild(selectAll);
        if (ctxRef) ctxRef.selectAllCheckbox = selectAll;
      } else {
        const activeDir = sortState && sortState.key === h.sortKey ? sortState.dir : "";
        th.textContent = h.label + (activeDir === "asc" ? " ▲" : activeDir === "desc" ? " ▼" : "");
        if (h.sortKey && onSortChange) {
          th.classList.add("video-sortable-header");
          th.title = "Ordina";
          th.addEventListener("click", () => onSortChange(h.sortKey));
        }
        if (h.bulkKey && BULK_EDIT_CONFIG[h.bulkKey]) {
          th.classList.add("bulk-editable");
          th.dataset.bulkKey = h.bulkKey;
          th.title = "Modifica tutte le skill selezionate";
          th.addEventListener("click", () => {
            const ctx = eventTableContexts[contextKey];
            if (!ctx || !ctx.rows) return;
            const selected = ctx.rows.filter(r => selectedEventIds.has(r.key));
            if (selected.length < 2) return;
            openBulkEditModal(contextKey, h.bulkKey);
          });
          bulkHeaders.push(th);
        }
      }
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    table.appendChild(tbody);
    if (ctxRef) {
      ctxRef.table = table;
      ctxRef.bulkHeaders = bulkHeaders;
    }
  }
  if (append && usingExisting && ctxRef && table) {
    ctxRef.table = table;
    ctxRef.bulkHeaders = Array.from(table.querySelectorAll("th.bulk-editable"));
  }
  const startIdx = append && ctxRef && ctxRef.rows ? ctxRef.rows.length : 0;
  events.forEach((ev, index) => {
    const displayIdx = append ? startIdx + index : index;
    const tr = document.createElement("tr");
    const videoTime = showVideoTime ? computeEventVideoTime(ev, baseMs) : null;
    const zoneDisplay = ev.zone || ev.playerPosition || "";
    const key = getEventKey(ev, displayIdx);
    let rowCheckbox = null;
    const editGuard = {
      isRowSelected: () => selectedEventIds.has(key),
      requestSelect: () => setSelectionForContext(contextKey, new Set([key]), key)
    };
    tr.className = "event-row";
    tr.dataset.eventKey = key;
    const formatTrajPoint = pt =>
      pt && typeof pt.x === "number" && typeof pt.y === "number"
        ? `${pt.x.toFixed(2)},${pt.y.toFixed(2)}`
        : "";
    const traj = ev.attackTrajectory || {};
    const trajStartPt = traj.start || ev.attackStart || null;
    const trajEndPt = traj.end || ev.attackEnd || null;
    const receiveEvalDisplay = valueToString(ev.receiveEvaluation);
    const attackPhaseDisplay = formatAttackPhaseLabel(ev.attackBp);
    const formatAttackDir = () => {
      const dir = ev.attackDirection || traj || null;
      if (dir && typeof dir === "object") {
        const s = dir.start || trajStartPt;
        const e = dir.end || trajEndPt;
        const sStr = formatTrajPoint(s);
        const eStr = formatTrajPoint(e);
        return sStr && eStr ? `${sStr}→${eStr}` : sStr || eStr || "";
      }
      return valueToString(dir);
    };
    const formatRelatedEvents = () => {
      if (!Array.isArray(ev.relatedEvents) || ev.relatedEvents.length === 0) return "";
      return ev.relatedEvents.map(id => (id != null ? String(id) : "")).filter(Boolean).join(" ");
    };
    const resolveTeamLabel = () => {
      if (ev.team === "opponent") return state.selectedOpponentTeam || "Avversaria";
      if (ev.team && ev.team !== "opponent") return ev.teamName || state.selectedTeam || "Squadra";
      if (ev.code === "opp-error" || ev.code === "opp-point" || ev.playerName === "Avversari") {
        return state.selectedOpponentTeam || "Avversaria";
      }
      return state.selectedTeam || "Squadra";
    };
    if (enableSelection && showCheckbox) {
      const selectTd = document.createElement("td");
      selectTd.className = "row-select";
      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = selectedEventIds.has(key);
      chk.addEventListener("click", e => {
        e.stopPropagation();
        toggleSelectionForContext(contextKey, key, { userAction: true, preserveSelection: true });
        scrollRowIntoView({ key, tr, idx: displayIdx });
      });
      selectTd.appendChild(chk);
      tr.appendChild(selectTd);
      rowCheckbox = chk;
    }
    const cells = [
      ...(showIndex
        ? [{
            text: ev.eventId != null ? String(ev.eventId) : "",
            editable: td =>
              makeEditableCell(td, "ID evento", done => createNumberInput(ev, "eventId", 1, undefined, done), editGuard)
          }]
        : []),
      ...(showVideoTime
        ? [
            {
              text: formatVideoTimestamp(videoTime),
              classes: ["event-time-cell"],
              editable: td =>
                makeEditableCell(td, "Tempo video", done => createVideoTimeInput(ev, videoTime, done), editGuard)
            }
          ]
        : []),
      {
        text: ev.set || "1",
        editable: td => makeEditableCell(td, "Set", done => createNumberSelect(ev, "set", 1, 5, done), editGuard)
      },
      {
        text: valueToString(ev.homeScore),
        editable: td => makeEditableCell(td, "Punteggio nostro", done => createNumberInput(ev, "homeScore", 0, undefined, done), editGuard)
      },
      {
        text: valueToString(ev.visitorScore),
        editable: td => makeEditableCell(td, "Punteggio avversario", done => createNumberInput(ev, "visitorScore", 0, undefined, done), editGuard)
      },
      {
        text: resolveTeamLabel(),
        editable: td => makeEditableCell(td, "Squadra", done => createEventTeamSelect(ev, done), editGuard)
      },
      {
        text: (() => {
          const scope = getTeamScopeFromEvent(ev);
          const players = getPlayersForScope(scope);
          const numbers = getPlayerNumbersForScope(scope);
          const name = ev.playerName || players[resolvePlayerIdx(ev)];
          if (!name) return "—";
          return scope === "opponent"
            ? formatNameWithNumberFor(name, numbers)
            : formatNameWithNumber(name);
        })(),
        editable: td => makeEditableCell(td, "Giocatrice", done => createPlayerSelect(ev, done), editGuard)
      },
      {
        text: (() => {
          const scope = getTeamScopeFromEvent(ev);
          const players = getPlayersForScope(scope);
          const numbers = getPlayerNumbersForScope(scope);
          const setterName =
            ev.setterName || (typeof ev.setterIdx === "number" ? players[ev.setterIdx] : "");
          return setterName ? formatNameWithNumberFor(setterName, numbers) : "";
        })(),
        editable: td =>
          makeEditableCell(td, "Alzatore", done => createPlayerSelect(ev, done, { target: "setter" }), editGuard)
      },
      {
        text:
          ev.actionType === "timeout"
            ? "Timeout"
            : ev.actionType === "substitution"
              ? "Cambio"
              : (SKILLS.find(s => s.id === ev.skillId) || {}).label || ev.skillId || "",
        editable: td => makeEditableCell(td, "Fondamentale", done => createSkillSelect(ev, done), editGuard)
      },
      {
        text: ev.code || "",
        editable: td => makeEditableCell(td, "Codice", done => createCodeSelect(ev, done), editGuard)
      },
      {
        text: formatRelatedEvents(),
        editable: td => makeEditableCell(td, "Eventi collegati", done => createRelatedEventsInput(ev, done), editGuard)
      },
      {
        text:
          ev.errorType && (ev.code === "error" || ev.code === "team-error")
            ? getErrorTypeLabel(ev.errorType)
            : "",
        editable: td => makeEditableCell(td, "Tipo errore", done => createErrorTypeSelect(ev, done), editGuard)
      },
      {
        text: ev.skillId === "attack" && ev.fromFreeball ? "FB" : "",
        editable: td => makeEditableCell(td, "Attacco da freeball", done => createBooleanInput(ev, "fromFreeball", done), editGuard)
      },
      {
        text: zoneDisplay ? String(zoneDisplay) : "",
        editable: td => makeEditableCell(td, "Zona", done => createNumberSelect(ev, "zone", 1, 6, done), editGuard)
      },
      {
        text: valueToString(ev.setterPosition || ev.rotation || ""),
        editable: td =>
          makeEditableCell(td, "Posizione palleggio", done => createNumberSelect(ev, "setterPosition", 1, 6, done), editGuard)
      },
      {
        text: valueToString(ev.opponentSetterPosition),
        editable: td =>
          makeEditableCell(
            td,
            "Posizione palleggio avv",
            done => createNumberSelect(ev, "opponentSetterPosition", 1, 6, done),
            editGuard
          )
      },
      {
        text: valueToString(ev.receivePosition),
        editable: td =>
          makeEditableCell(td, "Zona ricezione", done => createNumberSelect(ev, "receivePosition", 1, 6, done), editGuard)
      },
      {
        text: valueToString(ev.base),
        editable: td => makeEditableCell(td, "Base", done => createBaseSelect(ev, done), editGuard)
      },
      {
        text: valueToString(ev.setType),
        editable: td => makeEditableCell(td, "Tipo alzata", done => createSetTypeSelect(ev, done), editGuard)
      },
      {
        text: valueToString(ev.combination),
        editable: td => makeEditableCell(td, "Combinazione", done => createTextInput(ev, "combination", done), editGuard)
      },
      {
        text: valueToString(ev.serveType),
        editable: td => makeEditableCell(td, "Tipo servizio", done => createServeTypeSelect(ev, done), editGuard)
      },
      {
        text: formatTrajPoint(ev.serveStart),
        classes: ["traj-cell"],
        onClick: e => {
          e.stopPropagation();
          captureServeTrajectory(ev, { forcePopup: true }).then(() => {
            renderEventTableRows(target, events, options);
          });
        }
      },
      {
        text: formatTrajPoint(ev.serveEnd),
        classes: ["traj-cell"],
        onClick: e => {
          e.stopPropagation();
          captureServeTrajectory(ev, { forcePopup: true }).then(() => {
            renderEventTableRows(target, events, options);
          });
        }
      },
      {
        text: receiveEvalDisplay,
        editable: td =>
          makeEditableCell(
            td,
            "Valutazione ricezione",
            done => createEvalSelect(ev, "receiveEvaluation", done, { includeFb: true }),
            editGuard
          )
      },
      {
        text: valueToString(ev.attackEvaluation),
        editable: td =>
          makeEditableCell(td, "Valutazione attacco", done => createEvalSelect(ev, "attackEvaluation", done), editGuard)
      },
      {
        text: attackPhaseDisplay,
        editable: td => makeEditableCell(td, "Fase attacco", done => createPhaseSelect(ev, done), editGuard)
      },
      {
        text: valueToString(ev.attackType),
        editable: td => makeEditableCell(td, "Tipo attacco", done => createTextInput(ev, "attackType", done), editGuard)
      },
      {
        text: formatAttackDir(),
        classes: ["traj-cell"],
        onClick: e => {
          e.stopPropagation();
          const dir = ev.attackDirection || traj || null;
          const baseZonePrefill = ev.originZone || ev.zone || ev.playerPosition || null;
          const evScope = getTeamScopeFromEvent(ev);
          const forceFar = false;
          const prefill =
            dir && typeof dir === "object" && dir.start && dir.end
              ? {
                  start: dir.start,
                  end: dir.end,
                  startZone: dir.startZone,
                  endZone: dir.endZone,
                  baseZone: baseZonePrefill,
                  setType: ev.setType || null,
                  forceFar,
                  scope: evScope
                }
              : traj && traj.start && traj.end
              ? {
                  start: traj.start,
                  end: traj.end,
                  startZone: traj.startZone,
                  endZone: traj.endZone,
                  baseZone: baseZonePrefill,
                  setType: ev.setType || null,
                  forceFar,
                  scope: evScope
                }
              : { baseZone: baseZonePrefill, setType: ev.setType || null, forceFar, scope: evScope };
          openAttackTrajectoryModal(Object.assign({ forcePopup: true }, prefill)).then(coords => {
            if (!coords || !coords.start || !coords.end) return;
            const mapZone = z => mapBackRowZone(z, baseZonePrefill);
            const trajectoryPayload = {
              start: coords.start,
              end: coords.end,
              startZone: mapZone(coords.startZone || null),
              endZone: mapZone(coords.endZone || null),
              directionDeg: null
            };
            ev.attackStart = coords.start;
            ev.attackEnd = coords.end;
            ev.attackStartZone = trajectoryPayload.startZone;
            ev.attackEndZone = trajectoryPayload.endZone;
            ev.attackDirection = trajectoryPayload;
            ev.attackTrajectory = trajectoryPayload;
            if (!ev.originZone) {
              ev.originZone = baseZonePrefill;
            }
            if (trajectoryPayload.startZone) {
              ev.zone = trajectoryPayload.startZone;
              ev.playerPosition = trajectoryPayload.startZone;
            }
            saveState();
            renderEventsLog({ suppressScroll: true });
            renderVideoAnalysis();
            renderTrajectoryAnalysis();
            renderServeTrajectoryAnalysis();
          });
        }
      },
      {
        text: valueToString(ev.blockNumber),
        editable: td =>
          makeEditableCell(td, "Numero muro", done => createNumberInput(ev, "blockNumber", 0, undefined, done), editGuard)
      },
      {
        text: valueToString(ev.playerIn),
        editable: td => makeEditableCell(td, "In", done => createPlayerNameSelect(ev, "playerIn", done), editGuard)
      },
      {
        text: valueToString(ev.playerOut),
        editable: td => makeEditableCell(td, "Out", done => createPlayerNameSelect(ev, "playerOut", done), editGuard)
      },
      {
        text: valueToString(ev.durationMs || ""),
        editable: td =>
          makeEditableCell(td, "Durata (ms)", done => createNumberInput(ev, "durationMs", 0, undefined, done), editGuard)
      }
    ];
    cells.forEach(cell => {
      const td = document.createElement("td");
      if (cell.control) {
        td.innerHTML = "";
        td.appendChild(cell.control);
      } else {
        td.textContent = cell.text != null ? String(cell.text) : "";
      }
      if (cell.editable) {
        cell.editable(td);
      }
      if (cell.classes && Array.isArray(cell.classes)) {
        cell.classes.forEach(cls => td.classList.add(cls));
      }
      if (typeof cell.onClick === "function") {
        td.classList.add("clickable-cell");
        td.addEventListener("dblclick", e => cell.onClick(e, td));
      }
      tr.appendChild(td);
    });
    rowRecords.push({ key, tr, idx: displayIdx, ev, videoTime, checkbox: rowCheckbox });
    tr.addEventListener("dblclick", () => {
      if (showSeek) seekVideoToTime(videoTime);
    });
    if (enableSelection) {
      tr.addEventListener("click", e => {
        const target = e.target;
        if (target instanceof HTMLElement) {
          if (target.closest(".row-select")) return;
          if (["input", "label", "button", "select", "option", "textarea"].includes(target.tagName.toLowerCase())) {
            return;
          }
        }
        handleRowClick({ key, tr, idx: displayIdx }, e);
      });
    }
    const deleteTd = document.createElement("td");
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "small danger";
    deleteBtn.textContent = "✕";
    deleteBtn.title = "Elimina skill";
    deleteBtn.addEventListener("click", e => {
      e.stopPropagation();
      deleteEventByKey(key);
    });
    deleteTd.appendChild(deleteBtn);
    tr.appendChild(deleteTd);
    tbody.appendChild(tr);
  });
  if (enableSelection && ctxRef) {
    if (append) {
      ctxRef.rows = (ctxRef.rows || []).concat(rowRecords);
    } else {
      ctxRef.rows = rowRecords;
    }
    registerEventTableContext(contextKey, ctxRef);
    handleSeekForSelection(contextKey);
  }
  if (!targetIsTbody && !usingExisting) {
    target.appendChild(table);
  }
}
function closeBulkEditModal() {
  if (!elBulkEditModal) return;
  elBulkEditModal.classList.add("hidden");
  if (elBulkEditBody) elBulkEditBody.innerHTML = "";
  if (elBulkEditHint) elBulkEditHint.textContent = "";
  setModalOpenState(false);
  bulkEditActive = false;
  bulkEditSession = null;
}
function shouldRecalcForBulkKey(bulkKey) {
  const noRecalc = new Set(["videoTime", "durationMs", "combination", "attackType"]);
  return !noRecalc.has(bulkKey);
}
function openBulkEditModal(contextKey, bulkKey) {
  if (!elBulkEditModal || !elBulkEditBody) return;
  const config = BULK_EDIT_CONFIG[bulkKey];
  if (!config) return;
  const rows = getSelectedRows(contextKey);
  if (!rows || rows.length < 2) return;
  const events = rows.map(r => r.ev).filter(Boolean);
  if (!events.length) return;
  const seed = Object.assign({}, events[0]);
  const pending = {};
  bulkEditSession = {
    pending,
    events,
    shouldRecalc: shouldRecalcForBulkKey(bulkKey)
  };
  bulkEditActive = true;
  const proxy = new Proxy(seed, {
    set: (_obj, prop, value) => {
      pending[prop] = value;
      seed[prop] = value;
      return true;
    },
    get: (_obj, prop) => seed[prop]
  });
  const ctx = eventTableContexts[contextKey] || {};
  const control = config.build({ proxy, events, context: ctx });
  elBulkEditBody.innerHTML = "";
  elBulkEditBody.appendChild(control);
  if (elBulkEditTitle) {
    elBulkEditTitle.textContent = "Modifica multipla: " + config.label;
  }
  if (elBulkEditHint) {
    elBulkEditHint.textContent = "Applica a " + events.length + " skill selezionate.";
  }
  elBulkEditModal.classList.remove("hidden");
  setModalOpenState(true);
  if (elBulkEditApply) {
    elBulkEditApply.onclick = () => {
      if (!bulkEditSession) {
        closeBulkEditModal();
        return;
      }
      const entries = Object.entries(bulkEditSession.pending || {});
      if (entries.length === 0) {
        closeBulkEditModal();
        return;
      }
      pushVideoUndoSnapshot(true);
      bulkEditActive = false;
      bulkEditSession.events.forEach(ev => {
        entries.forEach(([key, value]) => {
          ev[key] = value;
        });
      });
      const shouldRecalc = bulkEditSession.shouldRecalc;
      closeBulkEditModal();
      refreshAfterVideoEdit(shouldRecalc);
      renderEventsLog({ suppressScroll: true });
    };
  }
  const focusable = control && typeof control.querySelector === "function" ? control.querySelector("input,select") : null;
  if (focusable && typeof focusable.focus === "function") focusable.focus();
}
