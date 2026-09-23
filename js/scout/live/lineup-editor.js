function getBenchForLineup(court) {
  const libSet = new Set(state.liberos || []);
  const used = new Set();
  getCourtShape(court).forEach(slot => {
    const name = slot.main || "";
    if (name) used.add(name);
  });
  const bench = (state.players || []).filter(name => name && !libSet.has(name) && !used.has(name));
  if (typeof sortNamesByNumber === "function") {
    return sortNamesByNumber(bench, state.playerNumbers || {});
  }
  return bench;
}
function getLineupBaseCourtFromState() {
  const libSet = new Set(getLineupModalLiberos());
  const baseCourt =
    lineupModalScope === "opponent" ? state.opponentCourt || [] : state.court;
  return getCourtShape(baseCourt).map(slot => {
    if (libSet.has(slot.main)) {
      return { main: slot.replaced || "", replaced: "" };
    }
    return { main: slot.main || "", replaced: "" };
  });
}
function getLineupSubstitutions(prevCourt, nextCourt, scope = "our") {
  const libSet = new Set(scope === "opponent" ? state.opponentLiberos || [] : state.liberos || []);
  const subs = [];
  for (let i = 0; i < 6; i += 1) {
    const prevName = (prevCourt[i] && prevCourt[i].main) || "";
    const nextName = (nextCourt[i] && nextCourt[i].main) || "";
    if (!prevName || !nextName || prevName === nextName) continue;
    if (libSet.has(prevName) || libSet.has(nextName)) continue;
    subs.push({ playerIn: nextName, playerOut: prevName });
  }
  return subs;
}
function assignPlayerToLineup(name, posIdx) {
  const core = window.VolleyEye && window.VolleyEye.lineup;
  if (core && typeof core.setPlayerOnCourt === "function") {
    lineupModalCourt = core.setPlayerOnCourt({
      court: lineupModalCourt,
      posIdx,
      playerName: name,
      liberos: getLineupModalLiberos()
    });
  } else {
    lineupModalCourt = getCourtShape(lineupModalCourt).map((slot, idx) => {
      const updated = Object.assign({}, slot);
      if (updated.main === name) updated.main = "";
      if (updated.replaced === name) updated.replaced = "";
      if (idx === posIdx) updated.main = name;
      return updated;
    });
  }
}
function swapLineupSlots(fromIdx, toIdx) {
  const core = window.VolleyEye && window.VolleyEye.lineup;
  if (core && typeof core.swapCourtSlots === "function") {
    lineupModalCourt = core.swapCourtSlots({
      court: lineupModalCourt,
      fromIdx,
      toIdx
    });
    return;
  }
  const court = getCourtShape(lineupModalCourt);
  const next = court.map(slot => Object.assign({}, slot));
  const tmp = next[fromIdx];
  next[fromIdx] = next[toIdx];
  next[toIdx] = tmp;
  lineupModalCourt = next;
}
function clearLineupSlot(posIdx) {
  const core = window.VolleyEye && window.VolleyEye.lineup;
  if (core && typeof core.clearCourtSlot === "function") {
    lineupModalCourt = core.clearCourtSlot({
      court: lineupModalCourt,
      posIdx,
      liberos: getLineupModalLiberos()
    });
  } else {
    lineupModalCourt = getCourtShape(lineupModalCourt).map((slot, idx) =>
      idx === posIdx ? { main: "", replaced: "" } : slot
    );
  }
}
function ensureLineupTouchListeners() {
  if (lineupTouchListenersAttached) return;
  document.addEventListener("touchmove", handleLineupTouchMove, { passive: false });
  document.addEventListener("touchend", handleLineupTouchEnd, { passive: false });
  document.addEventListener("touchcancel", handleLineupTouchCancel, { passive: false });
  lineupTouchListenersAttached = true;
}
function clearLineupTouch() {
  const prev = document.querySelector(".lineup-slot.drop-over");
  if (prev) prev.classList.remove("drop-over");
  if (lineupTouchGhost && lineupTouchGhost.parentNode) {
    lineupTouchGhost.parentNode.removeChild(lineupTouchGhost);
  }
  lineupTouchGhost = null;
  lineupTouchActive = false;
  lineupTouchName = "";
  lineupTouchFromIdx = null;
  lineupTouchOverIdx = null;
  lineupTouchContext = "";
  lineupTouchScope = "our";
  document.body.style.overflow = "";
}
function updateLineupTouchOver(x, y) {
  const elAt = document.elementFromPoint(x, y);
  const card = elAt && elAt.closest(".lineup-slot");
  const prev = document.querySelector(".lineup-slot.drop-over");
  if (prev) prev.classList.remove("drop-over");
  if (!card || (card.dataset.teamScope || "our") !== lineupTouchScope) {
    lineupTouchOverIdx = null;
    return;
  }
  if (lineupTouchContext === "modal") {
    if (!card.closest("#lineup-modal")) {
      lineupTouchOverIdx = null;
      return;
    }
  } else if (lineupTouchContext === "next-set") {
    if (!card.closest("#next-set-lineups")) {
      lineupTouchOverIdx = null;
      return;
    }
  } else {
    lineupTouchOverIdx = null;
    return;
  }
  const posIdx = parseInt(card.dataset.posIndex, 10);
  if (isNaN(posIdx)) {
    lineupTouchOverIdx = null;
    return;
  }
  lineupTouchOverIdx = posIdx;
  card.classList.add("drop-over");
}
function createLineupTouchGhost(text, x, y) {
  if (lineupTouchGhost && lineupTouchGhost.parentNode) {
    lineupTouchGhost.parentNode.removeChild(lineupTouchGhost);
  }
  const ghost = document.createElement("div");
  ghost.className = "touch-drag-ghost";
  ghost.textContent = text;
  ghost.style.left = x + "px";
  ghost.style.top = y + "px";
  document.body.appendChild(ghost);
  lineupTouchGhost = ghost;
}
function moveLineupTouchGhost(x, y) {
  if (!lineupTouchGhost) return;
  lineupTouchGhost.style.left = x + "px";
  lineupTouchGhost.style.top = y + "px";
}
function handleLineupTouchStart(e, name, fromIdx, context, scope) {
  const t = e.touches && e.touches[0];
  if (!t || !name) return;
  ensureLineupTouchListeners();
  lineupTouchActive = true;
  lineupTouchName = name;
  lineupTouchFromIdx = typeof fromIdx === "number" ? fromIdx : null;
  lineupTouchContext = context || "";
  lineupTouchScope = scope || "our";
  lineupTouchStart = { x: t.clientX, y: t.clientY };
  const label = formatLineupModalName(name, { compactCourt: true, scope: lineupTouchScope });
  createLineupTouchGhost(label, t.clientX, t.clientY);
  updateLineupTouchOver(t.clientX, t.clientY);
  document.body.style.overflow = "hidden";
  e.stopPropagation();
  e.preventDefault();
}
function handleLineupTouchMove(e) {
  if (!lineupTouchActive) return;
  const t = e.touches && e.touches[0];
  if (!t) return;
  moveLineupTouchGhost(t.clientX, t.clientY);
  updateLineupTouchOver(t.clientX, t.clientY);
  e.stopPropagation();
  e.preventDefault();
}
function finalizeLineupTouch(e, forcedIdx = null) {
  if (!lineupTouchActive) return;
  if (typeof forcedIdx === "number") {
    lineupTouchOverIdx = forcedIdx;
  }
  const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
  const endX = t ? t.clientX : lineupTouchStart.x;
  const endY = t ? t.clientY : lineupTouchStart.y;
  const dist = Math.hypot(endX - lineupTouchStart.x, endY - lineupTouchStart.y);
  if (lineupTouchContext === "modal") {
    if (lineupTouchFromIdx === null && lineupTouchName) {
      const idx = getCourtShape(lineupModalCourt).findIndex(slot => slot.main === lineupTouchName);
      if (idx >= 0) lineupTouchFromIdx = idx;
    }
    if (typeof lineupTouchOverIdx === "number" && lineupTouchOverIdx >= 0) {
      if (typeof lineupTouchFromIdx === "number" && lineupTouchFromIdx !== lineupTouchOverIdx) {
        swapLineupSlots(lineupTouchFromIdx, lineupTouchOverIdx);
      } else {
        assignPlayerToLineup(lineupTouchName, lineupTouchOverIdx);
      }
      lineupSelectedName = "";
      renderLineupModal();
    } else if (dist < 8) {
      if (typeof lineupTouchFromIdx === "number") {
        clearLineupSlot(lineupTouchFromIdx);
        renderLineupModal();
      } else {
        lineupSelectedName = lineupTouchName;
        renderLineupModal();
      }
    }
  } else if (lineupTouchContext === "next-set") {
    if (lineupTouchFromIdx === null && lineupTouchName) {
      const entry = getNextSetEntry(lineupTouchScope);
      const court = entry ? getCourtShape(entry.court || []) : [];
      const idx = court.findIndex(slot => slot.main === lineupTouchName);
      if (idx >= 0) lineupTouchFromIdx = idx;
    }
    if (typeof lineupTouchOverIdx === "number" && lineupTouchOverIdx >= 0) {
      if (typeof lineupTouchFromIdx === "number" && lineupTouchFromIdx !== lineupTouchOverIdx) {
        swapNextSetSlots(lineupTouchScope, lineupTouchFromIdx, lineupTouchOverIdx);
      } else {
        setNextSetPlayer(lineupTouchScope, lineupTouchOverIdx, lineupTouchName);
      }
      renderNextSetLineups();
    } else if (dist < 8) {
      if (typeof lineupTouchFromIdx === "number") {
        clearNextSetSlot(lineupTouchScope, lineupTouchFromIdx);
        renderNextSetLineups();
      } else {
        const entry = getNextSetEntry(lineupTouchScope);
        const court = entry ? getCourtShape(entry.court || []) : [];
        const nextEmpty = court.findIndex(slot => !slot.main);
        const targetIdx = nextEmpty !== -1 ? nextEmpty : 0;
        setNextSetPlayer(lineupTouchScope, targetIdx, lineupTouchName);
        renderNextSetLineups();
      }
    }
  }
  clearLineupTouch();
  e.stopPropagation();
  e.preventDefault();
}
function handleLineupTouchEnd(e) {
  if (!lineupTouchActive) return;
  const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
  if (t) updateLineupTouchOver(t.clientX, t.clientY);
  finalizeLineupTouch(e);
}
function handleLineupTouchCancel() {
  if (!lineupTouchActive) return;
  clearLineupTouch();
}
function renderLineupModal() {
  if (!elLineupModalCourt || !elLineupModalBench) return;
  elLineupModalCourt.innerHTML = "";
  syncLineupPreferredLiberoSelect();
  const court = getCourtShape(lineupModalCourt);
  const numbersMap = getLineupModalNumbers();
  const isCoarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  court.forEach((slot, idx) => {
    const areaClass = "pos-" + (idx + 1);
    const card = document.createElement("div");
    card.className = "lineup-slot " + areaClass + (!slot.main ? " empty" : "");
    card.style.gridArea = "pos" + (idx + 1);
    card.dataset.pos = "P" + (idx + 1);
    card.dataset.posIndex = String(idx);
    card.dataset.lineupContext = "modal";
    card.dataset.teamScope = lineupModalScope;
    if (slot.main) {
      card.draggable = true;
      card.addEventListener("dragstart", e => {
        lineupDragName = slot.main;
        lineupDragFromIdx = idx;
        if (e.dataTransfer) {
          e.dataTransfer.setData("text/plain", slot.main);
          e.dataTransfer.effectAllowed = "move";
        }
      });
      card.addEventListener("dragend", () => {
        lineupDragName = "";
        lineupDragFromIdx = null;
      });
    }
    card.addEventListener("dragover", e => {
      e.preventDefault();
      card.classList.add("drop-over");
    });
    card.addEventListener("dragleave", () => card.classList.remove("drop-over"));
    card.addEventListener("drop", e => {
      e.preventDefault();
      card.classList.remove("drop-over");
      const name = (e.dataTransfer && e.dataTransfer.getData("text/plain")) || lineupDragName || "";
      if (name) {
        if (typeof lineupDragFromIdx === "number" && lineupDragFromIdx !== idx) {
          swapLineupSlots(lineupDragFromIdx, idx);
        } else {
          assignPlayerToLineup(name, idx);
        }
        lineupDragFromIdx = null;
        lineupDragName = "";
        renderLineupModal();
      }
    });
    card.addEventListener("click", () => {
      if (lineupNumberMode) return;
      if (lineupSelectedName) {
        assignPlayerToLineup(lineupSelectedName, idx);
        lineupSelectedName = "";
        renderLineupModal();
        return;
      }
      if (slot.main) {
        clearLineupSlot(idx);
        renderLineupModal();
      }
    });
    if (slot.main) {
      card.addEventListener(
        "touchstart",
        e => {
          handleLineupTouchStart(e, slot.main, idx, "modal", lineupModalScope);
        },
        { passive: false }
      );
    }
    const head = document.createElement("div");
    head.className = "slot-head";
    const label = document.createElement("span");
    label.textContent = "Pos " + (idx + 1);
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "secondary small slot-clear";
    clearBtn.textContent = "✕";
    clearBtn.addEventListener("click", () => {
      clearLineupSlot(idx);
      renderLineupModal();
    });
    head.appendChild(label);
    head.appendChild(clearBtn);
    const body = document.createElement("div");
    body.className = "slot-body";
    if (lineupNumberMode) {
      const numInput = document.createElement("input");
      numInput.type = "text";
      numInput.inputMode = "numeric";
      numInput.className = "lineup-number-input";
      numInput.dataset.slotIndex = String(idx);
      numInput.value = (numbersMap[slot.main] || "").trim();
      numInput.addEventListener("focus", () => numInput.select());
      numInput.addEventListener("click", e => {
        e.stopPropagation();
        numInput.select();
      });
      numInput.addEventListener("keydown", e => {
        if (e.key === "Tab") {
          e.preventDefault();
          applyNumberToLineupSlot(idx, numInput.value);
          const next = (idx + (e.shiftKey ? 5 : 1)) % 6;
          renderLineupModal();
          focusLineupNumberInput(next);
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          applyNumberToLineupSlot(idx, numInput.value);
          exitLineupNumberMode();
        }
      });
      body.appendChild(numInput);
    } else {
      const nameLabel = document.createElement("div");
      nameLabel.className = "slot-name";
      nameLabel.textContent = slot.main ? formatLineupModalName(slot.main, { compactCourt: true }) : "Trascina qui";
      body.appendChild(nameLabel);
    }
    card.appendChild(head);
    card.appendChild(body);
    elLineupModalCourt.appendChild(card);
  });
  const benchNames = getBenchForLineupWithRoster(
    court,
    getLineupModalPlayers(),
    getLineupModalLiberos(),
    getLineupModalNumbers()
  );
  elLineupModalBench.innerHTML = "";
  if (benchNames.length === 0) {
    const empty = document.createElement("div");
    empty.className = "bench-empty";
    empty.textContent = "Nessuna riserva disponibile.";
    elLineupModalBench.appendChild(empty);
  } else {
    benchNames.forEach(name => {
      const chip = document.createElement("div");
      chip.className = "lineup-chip" + (lineupSelectedName === name ? " selected" : "");
      chip.draggable = true;
      chip.dataset.playerName = name;
      chip.dataset.lineupContext = "modal";
      chip.addEventListener("dragstart", e => {
        lineupDragName = name;
        lineupDragFromIdx = null;
        if (e.dataTransfer) {
          e.dataTransfer.setData("text/plain", name);
          e.dataTransfer.effectAllowed = "move";
        }
      });
      chip.addEventListener("dragend", () => {
        lineupDragName = "";
        lineupDragFromIdx = null;
      });
      chip.addEventListener("click", () => {
        const nextEmpty = court.findIndex(slot => !slot.main);
        const targetIdx = nextEmpty !== -1 ? nextEmpty : 0;
        assignPlayerToLineup(name, targetIdx);
        lineupSelectedName = "";
        renderLineupModal();
      });
      chip.addEventListener(
        "touchstart",
        e => {
          if (!isCoarse) return;
          handleLineupTouchStart(e, name, null, "modal", lineupModalScope);
        },
        { passive: false }
      );
      const span = document.createElement("span");
      span.textContent = formatLineupModalName(name, { compactCourt: true });
      chip.appendChild(span);
      elLineupModalBench.appendChild(chip);
    });
  }
}
function openMobileLineupModal(scope = "our") {
  lineupModalContext = "match";
  lineupModalScope = scope === "opponent" ? "opponent" : "our";
  lineupModalDefaultRotation = null;
  const libSet = new Set(getLineupModalLiberos());
  const baseCourt =
    lineupModalScope === "opponent" ? state.opponentCourt || [] : state.court;
  const normalizedCourt = getCourtShape(baseCourt).map(slot => {
    if (libSet.has(slot.main)) {
      return { main: slot.replaced || "", replaced: "" };
    }
    return { main: slot.main || "", replaced: "" };
  });
  lineupModalCourt = cloneCourt(normalizedCourt);
  renderLineupModal();
  updateLineupModalControls();
  if (elLineupModal) {
    if (isDesktopCourtModalLayout()) {
      setCourtAreaLocked(true);
    }
    updateCourtModalPlacement();
    elLineupModal.classList.remove("hidden");
    setModalOpenState(true);
  }
}
function renderSetStartModal() {
  if (!elSetStartModalBody) return;
  const setNum = setStartModalSetNum || state.currentSet || 1;
  const scope = setStartModalScope || "our";
  ensureSetStartSnapshot(setNum);
  const draft = ensureSetStartDraft(setNum, scope);
  if (elSetStartModalTitle) {
    const label = "Formazione di partenza S" + String(setNum);
    elSetStartModalTitle.textContent = scope === "opponent" ? label + " avversaria" : label;
  }
  const startInfo = buildSetStartInfoList([setNum], scope)[0];
  const sortedEntries =
    scope === "opponent" ? getSortedPlayerEntriesForScope(scope) : getSortedPlayerEntries();
  const list = document.createElement("div");
  list.className = "set-start-list";
  sortedEntries.forEach(({ name }) => {
    const row = document.createElement("div");
    row.className = "set-start-row";
    const label = document.createElement("span");
    label.className = "set-start-name";
    label.textContent =
      scope === "opponent"
        ? formatNameWithNumberFor(name, getPlayerNumbersForScope(scope))
        : formatNameWithNumber(name);
    row.appendChild(label);
    const select = document.createElement("select");
    select.className = "set-start-select";
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "-";
    select.appendChild(emptyOpt);
    const inOpt = document.createElement("option");
    inOpt.value = "in";
    inOpt.textContent = "in";
    select.appendChild(inOpt);
    for (let pos = 1; pos <= 6; pos += 1) {
      const opt = document.createElement("option");
      opt.value = String(pos);
      opt.textContent = String(pos);
      select.appendChild(opt);
    }
    const key = makePlayerNameKey(name);
    const draftEntry = draft && draft.selections ? draft.selections.get(key) : null;
    const pos = startInfo && startInfo.positions ? startInfo.positions.get(key) : null;
    const isSub = startInfo && startInfo.subsIn ? startInfo.subsIn.has(key) : false;
    select.value = draftEntry ? draftEntry.value || "" : pos ? String(pos) : isSub ? "in" : "";
    select.addEventListener("change", () => {
      updateSetStartSelection(setNum, scope, name, select.value);
      renderSetStartModal();
    });
    row.appendChild(select);
    list.appendChild(row);
  });
  elSetStartModalBody.innerHTML = "";
  elSetStartModalBody.appendChild(list);
}
function buildSetStartDraft(setNum, scope) {
  const startInfo = buildSetStartInfoList([setNum], scope)[0];
  const entries =
    scope === "opponent" ? getSortedPlayerEntriesForScope(scope) : getSortedPlayerEntries();
  const selections = new Map();
  entries.forEach(({ name }) => {
    const key = makePlayerNameKey(name);
    const pos = startInfo && startInfo.positions ? startInfo.positions.get(key) : null;
    const isSub = startInfo && startInfo.subsIn ? startInfo.subsIn.has(key) : false;
    selections.set(key, { name, value: pos ? String(pos) : isSub ? "in" : "" });
  });
  return { setNum, scope, selections };
}
function suppressTransientClicks(ms = 350) {
  suppressClickUntil = Date.now() + ms;
}
function shouldSuppressClick(e) {
  if (Date.now() < suppressClickUntil) {
    if (e) {
      if (e.cancelable) e.preventDefault();
      if (typeof e.stopPropagation === "function") e.stopPropagation();
    }
    return true;
  }
  return false;
}
function ensureSetStartDraft(setNum, scope) {
  if (setStartDraft && setStartDraft.setNum === setNum && setStartDraft.scope === scope) {
    return setStartDraft;
  }
  setStartDraft = buildSetStartDraft(setNum, scope);
  return setStartDraft;
}
function updateSetStartSelection(setNum, scope, playerName, value) {
  const draft = ensureSetStartDraft(setNum, scope);
  const key = makePlayerNameKey(playerName);
  const nextValue = value || "";
  const entry = draft.selections.get(key) || { name: playerName, value: "" };
  entry.value = nextValue;
  draft.selections.set(key, entry);
  if (nextValue && nextValue !== "in") {
    draft.selections.forEach((other, otherKey) => {
      if (otherKey === key) return;
      if (other.value === nextValue) {
        other.value = "";
      }
    });
  }
}
function applySetStartDraft() {
  if (!setStartDraft) return;
  const setNum = setStartDraft.setNum;
  const scope = setStartDraft.scope;
  ensureSetStartSnapshot(setNum);
  const entry = state.setStarts && state.setStarts[setNum];
  if (!entry) return;
  const scopeEntry = scope === "opponent" ? entry.opponent : entry.our;
  if (!scopeEntry) return;
  const nextCourt = Array.from({ length: 6 }, () => ({ main: "", replaced: "" }));
  const subsIn = [];
  setStartDraft.selections.forEach(item => {
    const raw = item && item.value ? String(item.value) : "";
    if (!raw) return;
    if (raw === "in") {
      subsIn.push(makePlayerNameKey(item.name));
      return;
    }
    const pos = parseInt(raw, 10);
    if (!pos || pos < 1 || pos > 6) return;
    nextCourt[pos - 1] = { main: item.name, replaced: "" };
  });
  scopeEntry.court = nextCourt;
  scopeEntry.subsIn = subsIn;
  saveState({ persistLocal: true });
  renderAggregatedTable();
  closeSetStartModal();
}
function openSetStartEditor(setNum, scope = "our") {
  const targetSet = parseInt(setNum, 10) || state.currentSet || 1;
  setStartModalSetNum = targetSet;
  setStartModalScope = scope === "opponent" ? "opponent" : "our";
  ensureSetStartDraft(targetSet, setStartModalScope);
  renderSetStartModal();
  if (elSetStartModal) {
    elSetStartModal.classList.remove("hidden");
    setModalOpenState(true, true);
  }
}
function closeLineupModal() {
  if (elLineupModal) {
    elLineupModal.classList.add("hidden");
    elLineupModal.classList.remove("force-popup");
    setModalOpenState(false);
  }
  lineupDragName = "";
  lineupSelectedName = "";
  lineupNumberMode = false;
  lineupModalContext = "match";
  setStartEditSetNum = null;
}
function closeSetStartModal() {
  if (elSetStartModal) {
    elSetStartModal.classList.add("hidden");
  }
  setStartModalSetNum = null;
  setStartModalScope = "our";
  setStartDraft = null;
  setModalOpenState(false, true);
}
function saveLineupModal({ countSubstitutions = false } = {}) {
  const prevCourt = countSubstitutions ? getLineupBaseCourtFromState() : null;
  const nextCourt = getCourtShape(lineupModalCourt);
  const applyDefaultRotation = lineupModalDefaultRotation;
  if (lineupModalContext === "next-set" && nextSetDraft) {
    const draftEntry = lineupModalScope === "opponent" ? nextSetDraft.opponent : nextSetDraft.our;
    const nextRotation =
      typeof applyDefaultRotation === "number"
        ? applyDefaultRotation
        : (draftEntry && typeof draftEntry.rotation === "number" ? draftEntry.rotation : null);
    if (lineupModalScope === "opponent") {
      nextSetDraft.opponent = { court: cloneCourt(nextCourt), rotation: nextRotation };
    } else {
      nextSetDraft.our = { court: cloneCourt(nextCourt), rotation: nextRotation };
    }
    lineupModalDefaultRotation = null;
    closeLineupModal();
    return;
  }
  if (lineupModalContext === "set-start") {
    lineupModalDefaultRotation = null;
    closeLineupModal();
    return;
  }
  if (lineupModalScope === "opponent") {
    if (typeof commitCourtChangeForScope === "function") {
      commitCourtChangeForScope(nextCourt, "opponent");
    } else {
      state.opponentCourt = nextCourt;
      saveState();
      if (typeof renderOpponentPlayers === "function") renderOpponentPlayers();
    }
    if (applyDefaultRotation && typeof setOpponentRotation === "function") {
      setOpponentRotation(applyDefaultRotation);
    } else if (applyDefaultRotation) {
      state.opponentRotation = Math.min(6, Math.max(1, parseInt(applyDefaultRotation, 10) || 1));
      if (typeof updateOpponentRotationDisplay === "function") updateOpponentRotationDisplay();
      if (typeof renderOpponentPlayers === "function") renderOpponentPlayers();
      saveState();
    }
  } else if (typeof commitCourtChange === "function") {
    commitCourtChange(nextCourt, { clean: true });
  } else {
    state.court = nextCourt;
    saveState();
    if (typeof renderPlayers === "function") renderPlayers();
    if (typeof renderBenchChips === "function") renderBenchChips();
    if (typeof renderLineupChips === "function") renderLineupChips();
    if (typeof updateRotationDisplay === "function") updateRotationDisplay();
  }
  if (lineupModalScope !== "opponent" && applyDefaultRotation) {
    if (typeof setRotation === "function") {
      setRotation(applyDefaultRotation);
    } else {
      state.rotation = Math.min(6, Math.max(1, parseInt(applyDefaultRotation, 10) || 1));
      if (typeof updateRotationDisplay === "function") updateRotationDisplay();
      saveState();
    }
  }
  if (countSubstitutions) {
    const scope = lineupModalScope === "opponent" ? "opponent" : "our";
    const subs = getLineupSubstitutions(prevCourt || [], nextCourt, scope);
    subs.forEach(sub => recordSubstitutionEvent(Object.assign({}, sub, { teamScope: scope })));
  }
  lineupModalDefaultRotation = null;
  closeLineupModal();
}
