function setDvwScoutStatus(message, tone = "") {
  if (!elDvwScoutStatus) return;
  elDvwScoutStatus.textContent = message || "";
  elDvwScoutStatus.classList.remove("is-error", "is-success");
  if (tone === "error") elDvwScoutStatus.classList.add("is-error");
  if (tone === "success") elDvwScoutStatus.classList.add("is-success");
}
function getDvwScoutSkillLabel(letter) {
  const map = {
    S: "Battuta",
    R: "Ricezione",
    A: "Attacco",
    B: "Muro",
    D: "Difesa",
    E: "Alzata",
    F: "Freeball"
  };
  return map[String(letter || "").toUpperCase()] || String(letter || "").toUpperCase();
}
function getDvwScoutTypeLabel(letter, skillLetter = "") {
  const type = String(letter || "").toUpperCase();
  const skill = String(skillLetter || "").toUpperCase();
  const genericMap = {
    H: "High",
    M: "Medium",
    Q: "Quick",
    T: "Tense",
    U: "Super",
    N: "Fast",
    O: "Other"
  };
  const contextualMap = {
    S: {
      H: "Float",
      M: "Jump Float",
      Q: "Jump Serve"
    },
    R: {
      H: "Su Float",
      M: "Su Jump Float",
      Q: "Su Jump Serve"
    },
    A: {
      H: "Alta",
      M: "Mezza",
      Q: "Quick",
      T: "Tesa",
      U: "Super",
      N: "Fast",
      O: "Altro"
    },
    B: {
      H: "Su Alta",
      M: "Su Mezza",
      Q: "Su Quick",
      T: "Su Tesa",
      U: "Su Super",
      N: "Su Fast",
      O: "Su Altro"
    },
    D: {
      H: "Su Alta",
      M: "Su Mezza",
      Q: "Su Quick",
      T: "Su Tesa",
      U: "Su Super",
      N: "Su Fast",
      O: "Su Altro"
    },
    E: {
      H: "Per Alta",
      M: "Per Mezza",
      Q: "Per Quick",
      T: "Per Tesa",
      U: "Per Super",
      N: "Per Fast",
      O: "Per Altro"
    },
    F: {
      H: "Alta",
      M: "Media",
      Q: "Rapida",
      O: "Altra"
    }
  };
  return (contextualMap[skill] && contextualMap[skill][type]) || genericMap[type] || type;
}
function getDvwScoutEvalLabel(symbol) {
  const map = {
    "#": "#",
    "+": "+",
    "!": "!",
    "-": "-",
    "/": "/",
    "=": "="
  };
  return map[String(symbol || "")] || String(symbol || "");
}
function escapeDvwScoutHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function renderDvwScoutBreakdownGroup(title, toneClass, entries = [], options = {}) {
  const extraClass = options.placeholder ? " is-placeholder" : "";
  const rows = entries.length
    ? entries
        .map(entry => {
          const label = escapeDvwScoutHtml(entry.label);
          const value = escapeDvwScoutHtml(entry.value);
          const filledClass = entry.value ? " is-filled" : "";
          return `<div class="scout-dvw-breakdown__item${filledClass}"><span class="scout-dvw-breakdown__key">${label}</span><span class="scout-dvw-breakdown__value">${value || "—"}</span></div>`;
        })
        .join("")
    : `<div class="scout-dvw-breakdown__empty">—</div>`;
  return `<section class="scout-dvw-breakdown__group ${toneClass}${extraClass}"><div class="scout-dvw-breakdown__group-title">${escapeDvwScoutHtml(title)}</div><div class="scout-dvw-breakdown__group-body">${rows}</div></section>`;
}
function renderDvwScoutBreakdownCommand(title, text) {
  return `<section class="scout-dvw-breakdown__group scout-dvw-breakdown__group--command"><div class="scout-dvw-breakdown__group-title">${escapeDvwScoutHtml(title)}</div><div class="scout-dvw-breakdown__command-text">${escapeDvwScoutHtml(text)}</div></section>`;
}
function renderDvwScoutSuggestion(normalized) {
  if (!normalized || !normalized.corrected || !normalized.normalized) return "";
  return `<div class="scout-dvw-breakdown__suggestion"><span class="scout-dvw-breakdown__suggestion-label">Autocorrezione</span><code>${escapeDvwScoutHtml(normalized.normalized)}</code></div>`;
}
function buildDvwScoutBreakdown(rawInput) {
  const raw = String(rawInput || "").trim();
  if (!raw) {
    const main = renderDvwScoutBreakdownGroup(
      "Main code",
      "scout-dvw-breakdown__group--main",
      [
        { label: "Team", value: "" },
        { label: "N", value: "" },
        { label: "Skill", value: "" },
        { label: "Type", value: "" },
        { label: "Val", value: "" }
      ],
      { placeholder: true }
    );
    const advanced = renderDvwScoutBreakdownGroup(
      "Advanced",
      "scout-dvw-breakdown__group--advanced",
      [
        { label: "Cmb", value: "" },
        { label: "Inline", value: "" },
        { label: "Start", value: "" },
        { label: "End", value: "" },
        { label: "End+", value: "" }
      ],
      { placeholder: true }
    );
    const extended = renderDvwScoutBreakdownGroup(
      "Extended",
      "scout-dvw-breakdown__group--extended",
      [
        { label: "Skill type", value: "" },
        { label: "Players", value: "" },
        { label: "Special", value: "" }
      ],
      { placeholder: true }
    );
    return `<div class="scout-dvw-breakdown__grid">${main}${advanced}${extended}</div>`;
  }
  const compound = expandDvwCompoundToken(raw);
  if (compound && compound.length > 1) {
    const items = compound
      .map(item => normalizeDvwScoutToken(item))
      .filter(item => item.parsed && item.parsed.kind === "skill");
    const suggestion = `<div class="scout-dvw-breakdown__suggestion"><span class="scout-dvw-breakdown__suggestion-label">Compound</span><code>${escapeDvwScoutHtml(compound.join(" · "))}</code></div>`;
    const groups = items.map((item, idx) => {
      const parsed = item.parsed;
      const suffixMeta = parseDvwSuffixMeta(parsed.skillLetter, parsed.inlineCode, parsed.suffix || "");
      const zoneMeta = parsed.zoneMeta || parseDvwZoneMeta(parsed.zonePair);
      return renderDvwScoutBreakdownGroup(
        idx === 0 ? "Skill 1" : `Skill ${idx + 1}`,
        idx === 0 ? "scout-dvw-breakdown__group--main" : "scout-dvw-breakdown__group--advanced",
        [
          { label: "Team", value: parsed.teamScope === "opponent" ? "V" : "H" },
          { label: "N", value: parsed.playerNumber },
          { label: "Skill", value: getDvwScoutSkillLabel(parsed.skillLetter) },
          { label: "Type", value: `${parsed.typeLetter} · ${getDvwScoutTypeLabel(parsed.typeLetter, parsed.skillLetter)}` },
          { label: "Val", value: getDvwScoutEvalLabel(parsed.evaluation) },
          { label: "Dir", value: zoneMeta.startZone || zoneMeta.endZone ? `${zoneMeta.startZone || "·"}${zoneMeta.endZone || "·"}${zoneMeta.endSubzone || ""}` : "" },
          { label: "Ext", value: [suffixMeta.skillSubtype, Number.isFinite(suffixMeta.numPlayersNumeric) ? suffixMeta.numPlayersNumeric : "", suffixMeta.specialCode].filter(Boolean).join(" ") }
        ]
      );
    });
    return `${suggestion}<div class="scout-dvw-breakdown__grid">${groups.join("")}</div>`;
  }
  const normalized = normalizeDvwScoutToken(raw);
  const parsed = normalized.parsed;
  if (parsed && parsed.kind === "skill") {
    const suffixMeta = parseDvwSuffixMeta(parsed.skillLetter, parsed.inlineCode, parsed.suffix || "");
    const zoneMeta = parsed.zoneMeta || parseDvwZoneMeta(parsed.zonePair);
    const suggestion = renderDvwScoutSuggestion(normalized);
    const main = renderDvwScoutBreakdownGroup("Main code", "scout-dvw-breakdown__group--main", [
      { label: "Team", value: parsed.teamScope === "opponent" ? "V" : "H" },
      { label: "N", value: parsed.playerNumber },
      { label: "Skill", value: getDvwScoutSkillLabel(parsed.skillLetter) },
      { label: "Type", value: `${parsed.typeLetter} · ${getDvwScoutTypeLabel(parsed.typeLetter, parsed.skillLetter)}` },
      { label: "Val", value: getDvwScoutEvalLabel(parsed.evaluation) }
    ]);
    const advanced = renderDvwScoutBreakdownGroup("Advanced", "scout-dvw-breakdown__group--advanced", [
      { label: "Cmb", value: parsed.advancedCode || "" },
      { label: "Inline", value: parsed.inlineCode || "" },
      { label: "Start", value: zoneMeta.startZone || "" },
      { label: "End", value: zoneMeta.endZone || "" },
      { label: "End+", value: zoneMeta.endSubzone || "" }
    ]);
    const extended = renderDvwScoutBreakdownGroup("Extended", "scout-dvw-breakdown__group--extended", [
      { label: "Skill type", value: suffixMeta.skillSubtype || "" },
      { label: "Players", value: Number.isFinite(suffixMeta.numPlayersNumeric) ? String(suffixMeta.numPlayersNumeric) : "" },
      { label: "Special", value: suffixMeta.specialCode || "" }
    ]);
    return `${suggestion}<div class="scout-dvw-breakdown__grid">${main}${advanced}${extended}</div>`;
  }
  if (parsed && parsed.kind === "timeout") {
    return renderDvwScoutBreakdownCommand("Comando", `Timeout ${parsed.teamScope === "opponent" ? "avversario" : "nostro"}.`);
  }
  if (parsed && parsed.kind === "substitution") {
    return renderDvwScoutBreakdownCommand(
      "Comando",
      `Cambio ${parsed.teamScope === "opponent" ? "avversario" : "nostro"} · entra ${parsed.playerInNumber} · esce ${parsed.playerOutNumber}.`
    );
  }
  if (parsed && parsed.kind === "point-marker") {
    return renderDvwScoutBreakdownCommand(
      "Comando",
      `Point marker ${parsed.teamScope === "opponent" ? "avversario" : "nostro"} · tipo ${parsed.pointType || "—"} · val ${parsed.evaluation || "—"}.`
    );
  }
  if (parsed && parsed.kind === "score") {
    return renderDvwScoutBreakdownCommand("Comando", `Punteggio ${parsed.scoreOur}-${parsed.scoreOpp}.`);
  }
  if (parsed && parsed.kind === "rotation") return renderDvwScoutBreakdownCommand("Comando", "Rotazione.");
  if (parsed && parsed.kind === "lineup") return renderDvwScoutBreakdownCommand("Comando", "Lineup.");
  if (parsed && parsed.kind === "set-end") return renderDvwScoutBreakdownCommand("Comando", "Fine set.");
  const upper = raw.toUpperCase();
  let idx = 0;
  let team = "";
  let player = "";
  let skill = "";
  let type = "";
  let evaluation = "";
  if (upper[idx] === "*" || upper[idx] === "A") {
    team = upper[idx] === "*" ? "Team H" : "Team V";
    idx += 1;
  }
  while (idx < upper.length && /\d/.test(upper[idx]) && player.length < 2) {
    player += upper[idx];
    idx += 1;
  }
  if (idx < upper.length && /[SRABDEF]/.test(upper[idx])) {
    skill = upper[idx];
    idx += 1;
  }
  if (idx < upper.length && /[HMQTUNO]/.test(upper[idx])) {
    type = upper[idx];
    idx += 1;
  }
  if (idx < upper.length && /[#=!+\-/]/.test(upper[idx])) {
    evaluation = upper[idx];
    idx += 1;
  }
  const tail = upper.slice(idx);
  const suggestion = renderDvwScoutSuggestion(normalized);
  const main = renderDvwScoutBreakdownGroup("Main code", "scout-dvw-breakdown__group--main", [
    { label: "Team", value: team.replace("Team ", "") || "" },
    { label: "N", value: player || "" },
    { label: "Skill", value: skill ? getDvwScoutSkillLabel(skill) : "" },
    { label: "Type", value: type ? `${type} · ${getDvwScoutTypeLabel(type, skill)}` : "" },
    { label: "Val", value: evaluation ? getDvwScoutEvalLabel(evaluation) : "" }
  ]);
  const advanced = renderDvwScoutBreakdownGroup(
    "Advanced / Tail",
    "scout-dvw-breakdown__group--advanced",
    [{ label: "Tail", value: tail || "" }],
    { placeholder: !tail }
  );
  return `${suggestion}<div class="scout-dvw-breakdown__grid">${main}${advanced}</div>`;
}
function renderDvwScoutBreakdown() {
  if (!elDvwScoutBreakdown) return;
  const draft = elDvwScoutInput ? String(elDvwScoutInput.value || "").trim() : "";
  elDvwScoutBreakdown.innerHTML = buildDvwScoutBreakdown(draft);
}
function getDvwScoutChipSkillClass(parsed) {
  if (!parsed || parsed.kind !== "skill") return "";
  const skillMap = {
    S: "serve",
    R: "pass",
    E: "second",
    A: "attack",
    D: "defense",
    B: "block",
    F: "freeball"
  };
  const skillId = skillMap[String(parsed.skillLetter || "").toUpperCase()] || "";
  return skillId ? `is-skill-${skillId}` : "";
}
function renderDvwScoutPending() {
  if (!elDvwScoutPending) return;
  elDvwScoutPending.innerHTML = "";
  const draft = elDvwScoutInput ? String(elDvwScoutInput.value || "").trim() : "";
  renderDvwScoutBreakdown();
  dvwScoutPendingTokens.forEach(entry => {
    const chip = document.createElement("div");
    chip.className = "scout-dvw-chip";
    const skillClass = getDvwScoutChipSkillClass(entry.parsed);
    if (skillClass) chip.classList.add(skillClass);
    const code = document.createElement("span");
    code.className = "scout-dvw-chip__code";
    code.textContent = entry.text;
    chip.appendChild(code);
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "scout-dvw-chip__remove";
    removeBtn.textContent = "×";
    removeBtn.title = "Rimuovi token";
    removeBtn.addEventListener("click", () => {
      dvwScoutPendingTokens = dvwScoutPendingTokens.filter(item => item.id !== entry.id);
      renderDvwScoutPending();
      setDvwScoutStatus("Token rimosso.");
      if (elDvwScoutInput) elDvwScoutInput.focus();
    });
    chip.appendChild(removeBtn);
    elDvwScoutPending.appendChild(chip);
  });
  if (draft) {
    const expanded = expandDvwCompoundToken(draft);
    const previewItems = expanded && expanded.length
      ? expanded.map(item => normalizeDvwScoutToken(item))
      : [normalizeDvwScoutToken(draft)];
    previewItems.forEach((normalized, idx) => {
      const parsed = normalized.parsed;
      const draftChip = document.createElement("div");
      draftChip.className = "scout-dvw-chip is-draft";
      const skillClass = getDvwScoutChipSkillClass(parsed);
      if (skillClass) draftChip.classList.add(skillClass);
      if (!parsed || parsed.kind === "unknown") {
        draftChip.classList.add("is-invalid");
      }
      const code = document.createElement("span");
      code.className = "scout-dvw-chip__code";
      code.textContent = normalized.corrected && normalized.normalized ? normalized.normalized : (normalized.normalized || draft);
      draftChip.appendChild(code);
      if (expanded && idx === 0) {
        draftChip.title = "Compound code espanso";
      }
      elDvwScoutPending.appendChild(draftChip);
    });
  }
}
function queueCurrentDvwScoutToken() {
  if (!elDvwScoutInput) return false;
  const token = String(elDvwScoutInput.value || "").trim();
  if (!token) return false;
  const expanded = expandDvwCompoundToken(token);
  const entries = expanded && expanded.length
    ? expanded.map(item => normalizeDvwScoutToken(item))
    : [normalizeDvwScoutToken(token)];
  if (entries.some(item => !item.parsed || item.parsed.kind === "unknown")) {
    setDvwScoutStatus(`Codice non riconosciuto: ${token}`, "error");
    renderDvwScoutPending();
    return false;
  }
  const closedAtMs = Date.now();
  entries.forEach(normalized => {
    dvwScoutPendingTokens.push({
      id: `dvw-pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: normalized.normalized || token,
      rawText: token,
      closedAtMs,
      parsed: normalized.parsed,
      corrected: !!normalized.corrected || !!expanded
    });
  });
  elDvwScoutInput.value = "";
  renderDvwScoutPending();
  if (expanded && expanded.length > 1) {
    setDvwScoutStatus(`Compound espanso: ${expanded.join(" · ")}`, "success");
  } else if (entries[0].corrected && entries[0].normalized) {
    setDvwScoutStatus(`Token autocorretto: ${token} → ${entries[0].normalized}`, "success");
  } else {
    setDvwScoutStatus(`Token aggiunto: ${token}`);
  }
  return true;
}
function updateLiveDvwMirror() {
  if (!elDvwScoutLastCode) return;
  const events = Array.isArray(state.events) ? state.events : [];
  const last = [...events].reverse().find(ev => ev && ev.skillId !== "manual" && !ev.actionType);
  if (!last) {
    elDvwScoutLastCode.textContent = "Ultimo codice: —";
    return;
  }
  const teamPayload = getDataVolleyTeamPayload(getTeamScopeFromEvent(last));
  const code = buildDataVolleySkillCode(last, teamPayload);
  elDvwScoutLastCode.textContent = code ? `Ultimo codice: ${code}` : "Ultimo codice: —";
}
function openDvwScoutHelp() {
  const helpUrl = new URL("docs/codici_scouting.html", window.location.href).toString();
  window.open(helpUrl, "_blank", "noopener");
}
function getPlayerIdxByDvNumber(scope, dvNumber) {
  const normalizedNumber = padDv(dvNumber, 2);
  const players = getPlayersForScope(scope);
  const numbers = getPlayerNumbersForScope(scope) || {};
  return players.findIndex(name => padDv(numbers[name], 2) === normalizedNumber);
}
function syncLiveEventWithDecodedDvw(event, decoded, rawCode) {
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
function findLiveEventFromDvwApply(startIndex, skillId, code, playerName, scope = "our") {
  const appended = (state.events || []).slice(startIndex);
  for (let idx = appended.length - 1; idx >= 0; idx -= 1) {
    const ev = appended[idx];
    if (!ev || ev.skillId !== skillId || ev.code !== code) continue;
    if (getTeamScopeFromEvent(ev) !== scope) continue;
    if ((ev.playerName || "") !== (playerName || "")) continue;
    return ev;
  }
  return null;
}
async function applyDvwScoutToken(rawToken, options = {}) {
  const token = String(rawToken || "").trim();
  const closedAtMs = Number(options.closedAtMs);
  if (!token) return { ok: true, message: "" };
  const decoded = parseDvwSkillCode(token);
  if (!decoded || decoded.kind === "unknown") {
    return { ok: false, message: `Codice non riconosciuto: ${token}` };
  }
  if (decoded.kind === "timeout") {
    const prevLen = Array.isArray(state.events) ? state.events.length : 0;
    if (decoded.teamScope === "opponent") {
      if (!state.useOpponentTeam) {
        return { ok: false, message: `Timeout avversario non disponibile senza doppia squadra: ${token}` };
      }
      recordOpponentTimeoutEvent();
    } else {
      recordTimeoutEvent();
    }
    const timeoutEvent = (state.events || []).slice(prevLen).find(ev => ev && ev.actionType === "timeout");
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
  const skillMap = {
    S: "serve",
    R: "pass",
    A: "attack",
    B: "block",
    D: "defense",
    E: "second",
    F: "freeball"
  };
  const scope = decoded.teamScope === "opponent" ? "opponent" : "our";
  if (scope === "opponent" && !state.useOpponentTeam) {
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
  const prevLen = Array.isArray(state.events) ? state.events.length : 0;
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
async function applyDvwScoutInput() {
  if (!elDvwScoutInput) return;
  if (elDvwScoutInput.value && elDvwScoutInput.value.trim()) {
    const queued = queueCurrentDvwScoutToken();
    if (!queued) return;
  }
  if (!dvwScoutPendingTokens.length) {
    setDvwScoutStatus("Inserisci almeno un codice.", "error");
    return;
  }
  let applied = 0;
  for (const token of dvwScoutPendingTokens) {
    const result = await applyDvwScoutToken(token.text, { closedAtMs: token.closedAtMs });
    if (!result.ok) {
      setDvwScoutStatus(result.message, "error");
      elDvwScoutInput.focus();
      return;
    }
    applied += 1;
  }
  dvwScoutPendingTokens = [];
  renderDvwScoutPending();
  updateLiveDvwMirror();
  setDvwScoutStatus(`${applied} codice/i applicati correttamente.`, "success");
}
