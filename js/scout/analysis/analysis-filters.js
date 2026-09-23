function normalizeBaseValue(val) {
  if (!val) return null;
  return String(val).trim().toUpperCase();
}
function normalizePhaseValue(val) {
  if (val === true || val === "true" || val === 1 || val === "1") return "bp";
  if (val === false || val === "false" || val === 0 || val === "0") return "so";
  if (typeof val === "string") {
    const upper = val.toUpperCase();
    if (upper.includes("BP") || upper.includes("BREAK")) return "bp";
    if (upper.includes("SO") || upper.includes("SIDE")) return "so";
  }
  return null;
}
function getEventPhaseValue(ev) {
  if (!ev) return null;
  let phaseVal = ev.attackBp;
  if (phaseVal === undefined || phaseVal === null) {
    phaseVal = ev.phase;
  }
  if (phaseVal === undefined || phaseVal === null) {
    phaseVal = ev.attackPhase;
  }
  return normalizePhaseValue(phaseVal);
}
function normalizeEvalCode(val) {
  if (!val) return null;
  const str = String(val).trim();
  return RESULT_CODES.includes(str) ? str : null;
}
function normalizeReceiveZone(val) {
  const num = Number(val);
  if (!Number.isFinite(num)) return null;
  return num;
}
function normalizeSetNumber(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return null;
    const direct = Number(trimmed);
    if (Number.isFinite(direct)) return direct;
    const match = trimmed.match(/\d+/);
    if (match) {
      const parsed = Number(match[0]);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  }
  const num = Number(val);
  if (!Number.isFinite(num)) return null;
  return num;
}
function findEventById(id) {
  if (!state.events || !Array.isArray(state.events)) return null;
  return state.events.find(e => e && e.eventId === id) || null;
}
function findPreviousEvent(ev) {
  if (!ev) return null;
  if (Array.isArray(ev.relatedEvents)) {
    for (let i = 0; i < ev.relatedEvents.length; i++) {
      const related = findEventById(ev.relatedEvents[i]);
      if (related) return related;
    }
  }
  const idx = state.events ? state.events.indexOf(ev) : -1;
  if (idx > 0) return state.events[idx - 1];
  return null;
}
function findRelatedSetEvent(ev) {
  if (!ev || !Array.isArray(ev.relatedEvents)) return null;
  for (let i = 0; i < ev.relatedEvents.length; i++) {
    const related = findEventById(ev.relatedEvents[i]);
    if (related && related.skillId === "second") return related;
  }
  return null;
}
function getSetterFromEvent(ev) {
  if (!ev) return null;
  if (typeof ev.playerIdx === "number" && ev.skillId === "second") return ev.playerIdx;
  if (typeof ev.setterIdx === "number") return ev.setterIdx;
  if (typeof ev.setterId === "number") return ev.setterId;
  const relatedSet = findRelatedSetEvent(ev);
  if (relatedSet && typeof relatedSet.playerIdx === "number") return relatedSet.playerIdx;
  return null;
}
function mergeFilterOptions(defaultOptions, extraValues, normalizeFn, labelBuilder) {
  const opts = [];
  const seen = new Set();
  defaultOptions.forEach(opt => {
    const norm = normalizeFn ? normalizeFn(opt.value) : opt.value;
    if (norm === null || norm === undefined || seen.has(norm)) return;
    seen.add(norm);
    opts.push({ value: norm, label: opt.label || String(opt.value) });
  });
  extraValues.forEach(val => {
    const norm = normalizeFn ? normalizeFn(val) : val;
    if (norm === null || norm === undefined || seen.has(norm)) return;
    seen.add(norm);
    opts.push({ value: norm, label: (labelBuilder && labelBuilder(val, norm)) || String(norm) });
  });
  return opts;
}
function buildFilterOptions(container, options, selectedSet, { asNumber = false, onChange } = {}) {
  if (!container) return;
  container.innerHTML = "";
  options.forEach(opt => {
    const val = asNumber ? Number(opt.value) : opt.value;
    const id = `${container.id}-${opt.value}`;
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = opt.value;
    input.id = id;
    input.checked = selectedSet.has(val);
    input.addEventListener("change", onChange || handleTrajectoryFilterChange);
    label.appendChild(input);
    const span = document.createElement("span");
    span.textContent = opt.label;
    label.appendChild(span);
    container.appendChild(label);
  });
}
function buildUniqueOptions(values, { asNumber = false, labelFn } = {}) {
  const seen = new Set();
  const opts = [];
  (values || []).forEach(raw => {
    if (raw === null || raw === undefined || raw === "") return;
    const val = asNumber ? Number(raw) : String(raw);
    if (asNumber && Number.isNaN(val)) return;
    if (seen.has(val)) return;
    seen.add(val);
    opts.push({
      value: val,
      label: labelFn ? labelFn(val) : String(val)
    });
  });
  return opts;
}
function toggleFilterVisibility(container, shouldShow) {
  if (!container) return;
  const wrapper = container.closest(".analysis-filter");
  if (!wrapper) return;
  wrapper.style.display = shouldShow ? "" : "none";
}
function renderDynamicFilter(container, options, selectedSet, config = {}) {
  const shouldShow = Array.isArray(options) && options.length > 0;
  if (!shouldShow) {
    if (selectedSet && typeof selectedSet.clear === "function") selectedSet.clear();
    if (container) container.innerHTML = "";
  }
  toggleFilterVisibility(container, shouldShow);
  if (shouldShow) {
    buildFilterOptions(container, options, selectedSet, config);
  }
  return shouldShow;
}
function getOptionLabel(options, value) {
  const match = (options || []).find(opt => String(opt.value) === String(value));
  if (match && match.label) return match.label;
  return String(value);
}
function getCheckedValues(container, { asNumber = false } = {}) {
  if (!container) return [];
  return Array.from(container.querySelectorAll("input[type=checkbox]:checked")).map(inp =>
    asNumber ? Number(inp.value) : inp.value
  );
}
function getCheckedRadioValue(container) {
  if (!container) return null;
  const input = container.querySelector("input[type=radio]:checked");
  return input ? input.value : null;
}
function normalizeMatchKey(value) {
  return String(value || "").trim().toLowerCase();
}
function getCurrentMatchKey() {
  const selected = (state.loadedMatchName || state.selectedMatch || "").trim();
  if (selected) return selected;
  if (typeof buildMatchDisplayName === "function") {
    return buildMatchDisplayName(state.match || {}) || "";
  }
  return "";
}
function getCurrentMatchLabel() {
  const loaded = (state.loadedMatchName || state.selectedMatch || "").trim();
  if (loaded) return loaded;
  if (typeof buildMatchDisplayName === "function") {
    return buildMatchDisplayName(state.match || {}) || "";
  }
  return loaded;
}
function getMatchTeamNameForScope(payload, scope) {
  if (!payload || !payload.state) return "";
  if (scope === "opponent") {
    return (payload.state.selectedOpponentTeam || "").trim();
  }
  return (payload.state.selectedTeam || "").trim();
}
function getMatchTeamNames(payload) {
  if (!payload || !payload.state) return [];
  const match = payload.state.match || {};
  const matchTeam = (match.teamName || "").trim();
  const matchOpponent = (match.opponent || "").trim();
  const selectedTeam = (payload.state.selectedTeam || "").trim();
  const selectedOpponent = (payload.state.selectedOpponentTeam || "").trim();
  const names = [];
  if (matchTeam) {
    names.push(matchTeam);
  } else if (selectedTeam) {
    names.push(selectedTeam);
  }
  if (matchOpponent) {
    names.push(matchOpponent);
  } else if (selectedOpponent) {
    names.push(selectedOpponent);
  }
  return Array.from(new Set(names));
}
function buildMatchLabelFromPayload(payload) {
  if (!payload || !payload.state) return "";
  const match = payload.state.match || {};
  const dateIso = match.date || "";
  const datePart = dateIso && typeof formatUsDate === "function" ? formatUsDate(dateIso) : dateIso;
  const teamName = (match.teamName || payload.state.selectedTeam || "").trim();
  const opponent = match.opponent || payload.state.selectedOpponentTeam || "Match";
  const typeLabels = {
    amichevole: "Amichevole",
    campionato: "Campionato",
    torneo: "Torneo",
    playoff: "Playoff",
    playout: "Playout",
    coppa: "Coppa"
  };
  const legLabels = {
    andata: "Andata",
    ritorno: "Ritorno",
    "gara-1": "Gara 1",
    "gara-2": "Gara 2",
    "gara-3": "Gara 3"
  };
  const parts = [
    datePart || "",
    teamName || "Squadra",
    opponent,
    match.category || "",
    typeLabels[match.matchType] || match.matchType || "",
    legLabels[match.leg] || match.leg || ""
  ].filter(Boolean);
  return parts.join(" - ") || "Match";
}
function getAnalysisExtraMatchState() {
  const raw = state.uiAnalysisExtraMatchesByScope;
  const ourList = raw && Array.isArray(raw.our) ? raw.our : [];
  const oppList = raw && Array.isArray(raw.opponent) ? raw.opponent : [];
  return { our: new Set(ourList), opponent: new Set(oppList) };
}
function saveAnalysisExtraMatchState(next) {
  state.uiAnalysisExtraMatchesByScope = {
    our: Array.from(next.our || []),
    opponent: Array.from(next.opponent || [])
  };
}
function getAnalysisMatchOptions(scope) {
  const saved = state.savedMatches || {};
  const currentTeam = getSelectedTeamNameForScope(scope);
  const currentKey = normalizeMatchKey(getCurrentMatchKey());
  const currentLabelKey = normalizeMatchKey(getCurrentMatchLabel());
  if (!currentTeam) return [];
  const currentTeamKey = normalizeMatchKey(currentTeam);
  return Object.entries(saved)
    .filter(([name, payload]) => {
      if (!payload || !payload.state) return false;
      const label = buildMatchLabelFromPayload(payload);
      const labelKey = normalizeMatchKey(label);
      if (normalizeMatchKey(name) === currentKey) return false;
      if (labelKey && labelKey === currentLabelKey) return false;
      const teamNames = getMatchTeamNames(payload).map(team => normalizeMatchKey(team));
      if (teamNames.length === 0) return false;
      return teamNames.includes(currentTeamKey);
    })
    .map(([name, payload]) => {
      const label = buildMatchLabelFromPayload(payload) || name;
      return { value: name, label };
    });
}
function getAnalysisScopesForExtras() {
  if (!state.useOpponentTeam) return ["our"];
  if (!analysisTeamFilterState.teams || analysisTeamFilterState.teams.size === 0) {
    return ["our", "opponent"];
  }
  return Array.from(analysisTeamFilterState.teams);
}
function getAnalysisEvents() {
  const extraStateForKey = getAnalysisExtraMatchState();
  const scopesForKey = getAnalysisScopesForExtras();
  const cacheKey =
    `rev:${analysisEventsCacheRevision}` +
    `|base:${Array.isArray(state.events) ? state.events.length : 0}` +
    `|useOpp:${state.useOpponentTeam ? 1 : 0}` +
    `|scopes:${(scopesForKey || []).join(",")}` +
    `|our:${Array.from((extraStateForKey && extraStateForKey.our) || []).sort().join(",")}` +
    `|opp:${Array.from((extraStateForKey && extraStateForKey.opponent) || []).sort().join(",")}`;
  if (analysisEventsCache && analysisEventsCacheKey === cacheKey) {
    return analysisEventsCache;
  }
  syncEventPlayerLinks(state.events || []);
  const baseEvents = Array.isArray(state.events) ? state.events : [];
  const extraState = extraStateForKey;
  const extraEvents = [];
  const scopes = scopesForKey;
  scopes.forEach(scope => {
    const matchNames = extraState[scope] || new Set();
    matchNames.forEach(name => {
      const payload = state.savedMatches && state.savedMatches[name];
      const events = payload && payload.state && Array.isArray(payload.state.events) ? payload.state.events : [];
      const rosterOur = payload && payload.state && Array.isArray(payload.state.players) ? payload.state.players : [];
      const rosterOpp =
        payload && payload.state && Array.isArray(payload.state.opponentPlayers)
          ? payload.state.opponentPlayers
          : [];
      const resolvePayloadRosterMap = scopeName => {
        if (!payload || !payload.state || typeof extractRosterFromTeam !== "function") return null;
        const teamName =
          scopeName === "opponent"
            ? (payload.state.selectedOpponentTeam || "").trim()
            : (payload.state.selectedTeam || "").trim();
        if (!teamName) return null;
        const mapSource =
          scopeName === "opponent"
            ? payload.state.savedOpponentTeams || payload.state.savedTeams
            : payload.state.savedTeams;
        let team = mapSource && mapSource[teamName] ? mapSource[teamName] : null;
        if (!team && typeof loadTeamFromStorage === "function") {
          team = loadTeamFromStorage(teamName);
        }
        if (!team && scopeName === "opponent" && typeof loadOpponentTeamFromStorage === "function") {
          team = loadOpponentTeamFromStorage(teamName);
        }
        if (!team) return null;
        const roster = extractRosterFromTeam(team);
        const detailed = Array.isArray(roster.playersDetailed) ? roster.playersDetailed : [];
        const nameToId = new Map();
        detailed.forEach(player => {
          const id = player && (player.id || player.playerId);
          const pname = player && player.name;
          if (!id || !pname) return;
          nameToId.set(normalizePlayerKey(pname), id);
        });
        return { nameToId };
      };
      const payloadRosterMaps = {
        our: resolvePayloadRosterMap("our"),
        opponent: resolvePayloadRosterMap("opponent")
      };
      events.forEach(ev => {
        if (!ev) return;
        const cloned = Object.assign({}, ev);
        cloned.analysisMatchKey = name;
        cloned.analysisMatchLabel = buildMatchLabelFromPayload(payload) || name;
        cloned.analysisMatchDate = (payload && payload.state && payload.state.match && payload.state.match.date) || "";
        const evScope = getTeamScopeFromEvent(cloned);
        if (!cloned.playerName && typeof cloned.playerIdx === "number") {
          const roster = evScope === "opponent" ? rosterOpp : rosterOur;
          if (roster && roster[cloned.playerIdx]) {
            cloned.playerName = roster[cloned.playerIdx];
          }
        }
        if (!cloned.playerId && cloned.playerName) {
          const map = payloadRosterMaps[evScope];
          if (map && map.nameToId) {
            cloned.playerId = map.nameToId.get(normalizePlayerKey(cloned.playerName)) || null;
          }
        }
        syncEventPlayerLink(cloned);
        extraEvents.push(cloned);
      });
    });
  });
  analysisEventsCache = baseEvents.concat(extraEvents);
  analysisEventsCacheKey = cacheKey;
  return analysisEventsCache;
}
function renderAnalysisCourtSideRadios(container, selectedValue, onChange, groupName) {
  if (!container) return;
  const name = groupName || container.id || "analysis-court-side";
  const options = [
    { value: "near", label: "Vicino" },
    { value: "far", label: "Lontano" }
  ];
  container.innerHTML = "";
  options.forEach((opt, idx) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = name;
    input.value = opt.value;
    input.checked = opt.value === selectedValue;
    input.addEventListener("change", () => {
      if (typeof onChange === "function") onChange();
    });
    const span = document.createElement("span");
    span.textContent = opt.label;
    label.appendChild(input);
    label.appendChild(span);
    container.appendChild(label);
  });
}
function makeScopedIndexKey(scope, idx) {
  return `${scope}:${idx}`;
}
function matchScopedIndexFilter(selectedSet, scope, idx) {
  if (!selectedSet || selectedSet.size === 0) return true;
  const key = makeScopedIndexKey(scope, idx);
  if (selectedSet.has(key)) return true;
  if (selectedSet.has(idx)) return true;
  if (selectedSet.has(String(idx))) return true;
  return false;
}
function getTeamFilterOptions() {
  const options = [
    { value: "our", label: getTeamNameForScope("our") }
  ];
  if (state.useOpponentTeam) {
    options.push({ value: "opponent", label: getTeamNameForScope("opponent") });
  }
  return options;
}
function ensureAnalysisTeamFilterDefault() {
  if (!state.useOpponentTeam && analysisTeamFilterState.teams.size === 0) {
    analysisTeamFilterState.teams.add("our");
  }
}
function invalidateAnalysisCaches() {
  analysisStatsCache = null;
  analysisStatsScope = null;
  analysisEventsCache = null;
  analysisEventsCacheKey = "";
  analysisEventsCacheRevision += 1;
  invalidateSkillChartCaches();
}
function handleAnalysisMatchFilterChange() {
  if (!elAnalysisFilterMatches) return;
  updateAnalysisExtraMatchesFromContainer(elAnalysisFilterMatches);
}
function handleAnalysisTeamFilterChange(e) {
  if (!elAnalysisFilterTeams) return;
  if (e && e.target instanceof HTMLInputElement && e.target.checked) {
    elAnalysisFilterTeams.querySelectorAll("input[type=checkbox]").forEach(inp => {
      if (inp !== e.target) inp.checked = false;
    });
  }
  const values = getCheckedValues(elAnalysisFilterTeams);
  analysisTeamFilterState.teams = new Set(values);
  renderAnalysisMatchFilter();
  renderMultiscoutModal();
  invalidateAnalysisCaches();
  renderAggregatedTable();
  renderTrajectoryAnalysis();
  renderServeTrajectoryAnalysis();
  renderSecondTable();
  renderPlayerAnalysis();
}
function handleAnalysisSummarySetFilterChange() {
  if (!elAnalysisFilterSets) return;
  analysisSummaryFilterState.sets = new Set(getCheckedValues(elAnalysisFilterSets, { asNumber: true }));
  invalidateSkillChartCaches();
  renderAggregatedTable();
  renderPlayerAnalysis();
}
function handleVideoTeamFilterChange(e) {
  if (!elVideoFilterTeams) return;
  const values = getCheckedValues(elVideoFilterTeams);
  videoFilterState.teams = new Set(values);
  renderVideoAnalysis();
}
function renderAnalysisTeamFilter() {
  if (!elAnalysisFilterTeams) return;
  ensureAnalysisTeamFilterDefault();
  const options = getTeamFilterOptions();
  analysisTeamFilterState.teams = new Set(
    [...analysisTeamFilterState.teams].filter(val => options.some(opt => opt.value === val))
  );
  const visible = renderDynamicFilter(elAnalysisFilterTeams, options, analysisTeamFilterState.teams, {
    onChange: handleAnalysisTeamFilterChange
  });
  toggleFilterVisibility(elAnalysisFilterTeams, visible);
  renderAnalysisMatchFilter();
}
function renderAnalysisMatchFilter() {
  if (!elAnalysisFilterMatches) {
    updateMultiscoutButton();
    return;
  }
  const scope = getAnalysisTeamScope();
  const options = getAnalysisMatchOptions(scope);
  const extraState = getAnalysisExtraMatchState();
  const selected = extraState[scope] || new Set();
  const filtered = new Set([...selected].filter(key => options.some(opt => opt.value === key)));
  extraState[scope] = filtered;
  saveAnalysisExtraMatchState(extraState);
  const visible = renderDynamicFilter(elAnalysisFilterMatches, options, filtered, {
    onChange: handleAnalysisMatchFilterChange
  });
  toggleFilterVisibility(elAnalysisFilterMatches, visible);
  updateMultiscoutButton();
}
function updateMultiscoutButton() {
  if (!elBtnOpenMultiscout) return;
  const scope = state.useOpponentTeam
    ? multiscoutTeamScope === "opponent"
      ? "opponent"
      : "our"
    : "our";
  const extraState = getAnalysisExtraMatchState();
  const activeCount = extraState[scope] ? extraState[scope].size : 0;
  elBtnOpenMultiscout.classList.toggle("is-active", activeCount > 0);
  elBtnOpenMultiscout.textContent = "Utilizza dati di piu partite (" + activeCount + ")";
}
function updateAnalysisExtraMatchesFromContainer(container, scopeOverride) {
  if (!container) return;
  const scope = scopeOverride || getAnalysisTeamScope();
  const extraState = getAnalysisExtraMatchState();
  extraState[scope] = new Set(getCheckedValues(container));
  saveAnalysisExtraMatchState(extraState);
  saveState();
  invalidateAnalysisCaches();
  updateMultiscoutButton();
  renderAggregatedTable();
  renderTrajectoryAnalysis();
  renderServeTrajectoryAnalysis();
  renderSecondTable();
  renderPlayerAnalysis();
}
function renderMultiscoutModal() {
  if (!elMultiscoutList || !elMultiscoutModal) return;
  elMultiscoutList.innerHTML = "";
  const scope = state.useOpponentTeam
    ? multiscoutTeamScope === "opponent"
      ? "opponent"
      : "our"
    : "our";
  const options = getAnalysisMatchOptions(scope);
  const extraState = getAnalysisExtraMatchState();
  const selected = extraState[scope] || new Set();
  const filtered = new Set([...selected].filter(key => options.some(opt => opt.value === key)));
  extraState[scope] = filtered;
  saveAnalysisExtraMatchState(extraState);
  if (elMultiscoutTeamSelect) {
    elMultiscoutTeamSelect.innerHTML = "";
    const teamOptions = state.useOpponentTeam
      ? [
          { value: "our", label: getTeamNameForScope("our") || "Squadra" },
          { value: "opponent", label: getTeamNameForScope("opponent") || "Avversaria" }
        ]
      : [{ value: "our", label: getTeamNameForScope("our") || "Squadra" }];
    teamOptions.forEach(opt => {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.label;
      elMultiscoutTeamSelect.appendChild(option);
    });
    elMultiscoutTeamSelect.value = scope;
    if (!elMultiscoutTeamSelect._bound) {
      elMultiscoutTeamSelect.addEventListener("change", () => {
        multiscoutTeamScope = elMultiscoutTeamSelect.value === "opponent" ? "opponent" : "our";
        renderMultiscoutModal();
      });
      elMultiscoutTeamSelect._bound = true;
    }
  }
  if (elMultiscoutReset && !elMultiscoutReset._bound) {
    elMultiscoutReset.addEventListener("click", () => {
      const activeScope = state.useOpponentTeam
        ? multiscoutTeamScope === "opponent"
          ? "opponent"
          : "our"
        : "our";
      const stateForReset = getAnalysisExtraMatchState();
      stateForReset[activeScope] = new Set();
      saveAnalysisExtraMatchState(stateForReset);
      saveState();
      invalidateAnalysisCaches();
      updateMultiscoutButton();
      renderMultiscoutModal();
      renderAggregatedTable();
      renderTrajectoryAnalysis();
      renderServeTrajectoryAnalysis();
      renderSecondTable();
      renderPlayerAnalysis();
    });
    elMultiscoutReset._bound = true;
  }
  if (elMultiscoutSubtitle) {
    const teamName = getTeamNameForScope(scope);
    const matchLabel = getCurrentMatchLabel();
    const pieces = [];
    if (matchLabel) pieces.push("Match: " + matchLabel);
    if (teamName) pieces.push("Squadra: " + teamName);
    elMultiscoutSubtitle.textContent = pieces.length ? pieces.join(" · ") : "Match corrente";
  }
  renderDynamicFilter(elMultiscoutList, options, filtered, {
    onChange: () => updateAnalysisExtraMatchesFromContainer(elMultiscoutList, scope)
  });
  updateMultiscoutButton();
}
function renderAnalysisSummarySetFilter() {
  if (!elAnalysisFilterSets) return;
  const events = filterEventsByAnalysisTeam();
  const setOpts = buildUniqueOptions(events.map(ev => normalizeSetNumber(ev.set)), {
    asNumber: true,
    labelFn: val => "Set " + val
  });
  analysisSummaryFilterState.sets = new Set(
    [...analysisSummaryFilterState.sets].filter(val => setOpts.some(opt => Number(opt.value) === val))
  );
  const visible = renderDynamicFilter(elAnalysisFilterSets, setOpts, analysisSummaryFilterState.sets, {
    onChange: handleAnalysisSummarySetFilterChange
  });
  toggleFilterVisibility(elAnalysisFilterSets, visible);
}
function matchesTeamFilter(ev, selectedSet) {
  if (!selectedSet || selectedSet.size === 0) return true;
  const scope = getTeamScopeFromEvent(ev);
  return selectedSet.has(scope);
}
function getAnalysisTeamScope() {
  ensureAnalysisTeamFilterDefault();
  if (analysisTeamFilterState.teams.size === 1) {
    return Array.from(analysisTeamFilterState.teams)[0];
  }
  return "our";
}
function filterEventsByAnalysisTeam(events) {
  const source = events || getAnalysisEvents();
  return (source || []).filter(ev => matchesTeamFilter(ev, analysisTeamFilterState.teams));
}
function matchesSummarySetFilter(ev) {
  if (!analysisSummaryFilterState.sets || analysisSummaryFilterState.sets.size === 0) return true;
  const setNum = normalizeSetNumber(ev && ev.set);
  if (setNum === null) return false;
  return analysisSummaryFilterState.sets.has(setNum);
}
function getPointDirectionFor(scope, ev) {
  if (!ev) return null;
  if (state.useOpponentTeam) {
    return getPointDirectionForScope(ev, scope);
  }
  return getPointDirection(ev);
}
function computeRotationDeltasForEvents(events, scope) {
  const rotations = Array.from({ length: 6 }, () => ({ for: 0, against: 0 }));
  (events || []).forEach(ev => {
    const direction = getPointDirectionFor(scope, ev);
    if (!direction) return;
    const rot = ev.rotation && ev.rotation >= 1 && ev.rotation <= 6 ? ev.rotation : 1;
    const val = getEventPointValue(ev);
    const entry = rotations[rot - 1];
    if (direction === "for") {
      entry.for += val;
    } else if (direction === "against") {
      entry.against += val;
    }
  });
  return rotations.map(entry => entry.for - entry.against);
}
function computeAttackSplitSummary(events) {
  const summary = {
    err: 0,
    mur: 0,
    pt: 0,
    tot: 0
  };
  (events || []).forEach(ev => {
    if (!ev || ev.skillId !== "attack") return;
    summary.tot += 1;
    if (ev.code === "=") summary.err += 1;
    if (ev.code === "/") summary.mur += 1;
    if (ev.code === "#") summary.pt += 1;
  });
  return summary;
}
function formatPercentValueSafe(num, den) {
  if (!den) return "0%";
  return formatPercentValue(num, den);
}
function getSummarySetNumbers() {
  const setNums = new Set();
  getAnalysisEvents().forEach(ev => {
    const num = normalizeSetNumber(ev && ev.set);
    if (num) setNums.add(num);
  });
  const played = Array.from(setNums).sort((a, b) => a - b);
  if (!analysisSummaryFilterState.sets || analysisSummaryFilterState.sets.size === 0) return played;
  return played.filter(num => analysisSummaryFilterState.sets.has(num));
}
function filterNormalEvalOptions(options) {
  return (options || []).filter(opt => NORMAL_EVAL_CODES.has(opt.value));
}
function matchesPreviousSkill(ev, filterVal) {
  if (!filterVal || filterVal === "any") return true;
  const normalizedVal = filterVal === "dig-negative" ? "defense-negative" : filterVal;
  const prev = findPreviousEvent(ev);
  const explicitFreeball = !!(ev && ev.fromFreeball);
  const prevFreeball =
    explicitFreeball ||
    (prev && (prev.fromFreeball || prev.actionType === "freeball" || prev.skillId === "freeball"));
  const prevIsReceive = prev && prev.skillId === "pass";
  const prevIsDefense = prev && prev.skillId === "defense";
  const prevReceiveCode = prevIsReceive ? prev.code || prev.receiveEvaluation : null;
  const isPositiveReceive = prevIsReceive && (prevReceiveCode === "#" || prevReceiveCode === "+");
  const isNegativeReceive = prevIsReceive && (prevReceiveCode === "!" || prevReceiveCode === "-");
  // Se non abbiamo receive/freeball esplicita, assumiamo difesa di default
  const fallbackDefense = !prevIsReceive && !prevFreeball;
  switch (normalizedVal) {
    case "freeball-positive":
      return prevFreeball || isPositiveReceive;
    case "receive-positive":
      return !!isPositiveReceive;
    case "defense-negative":
      return isNegativeReceive || prevIsDefense || fallbackDefense;
    case "freeball-only":
      return prevFreeball;
    case "dig-only":
      return prevIsDefense || fallbackDefense;
    default:
      return true;
  }
}
function matchesAdvancedFilters(ev, filters, { includeSetter = false } = {}) {
  if (!ev || !filters) return true;
  if (includeSetter && filters.setters && filters.setters.size) {
    const setterIdx = getSetterFromEvent(ev);
    if (setterIdx === null || !filters.setters.has(setterIdx)) return false;
  }
  if (filters.setTypes && filters.setTypes.size) {
    const setType = normalizeSetTypeValue(
      ev.setType || (ev.combination && ev.combination.set_type) || (ev.combination && ev.combination.setType)
    );
    if (!setType || !filters.setTypes.has(setType)) return false;
  }
  if (filters.bases && filters.bases.size) {
    const base = normalizeBaseValue(ev.base);
    if (!base || !filters.bases.has(base)) return false;
  }
  if (filters.phases && filters.phases.size) {
    let rawPhase = ev.attackBp;
    if (rawPhase === undefined || rawPhase === null) {
      rawPhase = ev.phase !== undefined ? ev.phase : ev.attackPhase !== undefined ? ev.attackPhase : true; // default BP
    }
    const phase = normalizePhaseValue(rawPhase);
    if (phase === null || !filters.phases.has(phase)) return false;
  }
  if (filters.receiveEvaluations && filters.receiveEvaluations.size) {
    const recvEval = normalizeEvalCode(ev.receiveEvaluation);
    if (!recvEval || !filters.receiveEvaluations.has(recvEval)) return false;
  }
  if (filters.receiveZones && filters.receiveZones.size) {
    const recvZone = normalizeReceiveZone(ev.receivePosition || ev.receiveZone);
    if (recvZone === null || !filters.receiveZones.has(recvZone)) return false;
  }
  if (filters.sets && filters.sets.size) {
    const setNum = normalizeSetNumber(ev.set);
    if (setNum === null || !filters.sets.has(setNum)) return false;
  }
  if (filters.prevSkill && !matchesPreviousSkill(ev, filters.prevSkill)) return false;
  return true;
}
function matchesVideoFilters(ev, filters) {
  if (!ev || !filters) return true;
  if (filters.teams && filters.teams.size) {
    if (!matchesTeamFilter(ev, filters.teams)) return false;
  }
  if (filters.players && filters.players.size) {
    const idx = resolvePlayerIdx(ev);
    const scope = getTeamScopeFromEvent(ev);
    if (idx === -1 || !matchScopedIndexFilter(filters.players, scope, idx)) return false;
  }
  if (filters.setters && filters.setters.size) {
    const setterIdx = getSetterFromEvent(ev);
    const scope = getTeamScopeFromEvent(ev);
    if (setterIdx === null || !matchScopedIndexFilter(filters.setters, scope, setterIdx)) return false;
  }
  if (filters.skills && filters.skills.size) {
    if (!ev.skillId || !filters.skills.has(ev.skillId)) return false;
  }
  if (filters.codes && filters.codes.size) {
    if (!ev.code || !filters.codes.has(ev.code)) return false;
  }
  if (filters.sets && filters.sets.size) {
    const setNum = normalizeSetNumber(ev.set);
    if (setNum === null || !filters.sets.has(setNum)) return false;
  }
  if (filters.rotations && filters.rotations.size) {
    const rot = Number(ev.rotation);
    if (!Number.isFinite(rot) || !filters.rotations.has(rot)) return false;
  }
  if (filters.zones && filters.zones.size) {
    const zoneVal = Number(ev.zone || ev.playerPosition);
    if (!Number.isFinite(zoneVal) || !filters.zones.has(zoneVal)) return false;
  }
  if (filters.bases && filters.bases.size) {
    const base = normalizeBaseValue(ev.base);
    if (!base || !filters.bases.has(base)) return false;
  }
  if (filters.setTypes && filters.setTypes.size) {
    const setType = normalizeSetTypeValue(
      ev.setType || (ev.combination && ev.combination.set_type) || (ev.combination && ev.combination.setType)
    );
    if (!setType || !filters.setTypes.has(setType)) return false;
  }
  if (filters.phases && filters.phases.size) {
    let rawPhase = ev.attackBp;
    if (rawPhase === undefined || rawPhase === null) {
      rawPhase = ev.phase !== undefined ? ev.phase : ev.attackPhase !== undefined ? ev.attackPhase : true;
    }
    const phase = normalizePhaseValue(rawPhase);
    if (phase === null || !filters.phases.has(phase)) return false;
  }
  if (filters.receiveEvaluations && filters.receiveEvaluations.size) {
    const recvEval = normalizeEvalCode(ev.receiveEvaluation);
    if (!recvEval || !filters.receiveEvaluations.has(recvEval)) return false;
  }
  if (filters.receiveZones && filters.receiveZones.size) {
    const recvZone = normalizeReceiveZone(ev.receivePosition || ev.receiveZone);
    if (recvZone === null || !filters.receiveZones.has(recvZone)) return false;
  }
  if (filters.serveTypes && filters.serveTypes.size) {
    if (!ev.serveType || !filters.serveTypes.has(ev.serveType)) return false;
  }
  if (filters.attackTypes && filters.attackTypes.size) {
    if (ev.skillId !== "attack") return false;
    if (!filters.attackTypes.has(buildAttackTypeLabel(ev.attackType))) return false;
  }
  if (filters.prevSkill && !matchesPreviousSkill(ev, filters.prevSkill)) return false;
  return true;
}
const trajectoryFilterState = {
  setters: new Set(),
  players: new Set(),
  sets: new Set(),
  codes: new Set(),
  attackTypes: new Set(),
  zones: new Set(),
  setTypes: new Set(),
  bases: new Set(),
  phases: new Set(),
  receiveEvaluations: new Set(),
  receiveZones: new Set(),
  prevSkill: "any"
};
const analysisTeamFilterState = {
  teams: new Set()
};
const analysisSummaryFilterState = {
  sets: new Set()
};
const serveTrajectoryFilterState = {
  players: new Set(),
  sets: new Set(),
  codes: new Set(),
  zones: new Set(),
  setTypes: new Set(),
  bases: new Set(),
  phases: new Set(),
  receiveEvaluations: new Set(),
  receiveZones: new Set()
};
const playerTrajectoryFilterState = {
  sets: new Set(),
  codes: new Set(),
  attackTypes: new Set(),
  zones: new Set(),
  setTypes: new Set(),
  bases: new Set(),
  phases: new Set(),
  receiveEvaluations: new Set(),
  receiveZones: new Set(),
  prevSkill: "any"
};
const playerServeTrajectoryFilterState = {
  sets: new Set(),
  codes: new Set(),
  zones: new Set(),
  setTypes: new Set(),
  bases: new Set(),
  phases: new Set(),
  receiveEvaluations: new Set(),
  receiveZones: new Set()
};
const secondFilterState = {
  setters: new Set(),
  players: new Set(),
  codes: new Set(),
  zones: new Set(),
  setTypes: new Set(),
  bases: new Set(),
  phases: new Set(),
  receiveEvaluations: new Set(),
  receiveZones: new Set(),
  sets: new Set(),
  prevSkill: "any"
};
const playerSecondFilterState = {
  setTypes: new Set(),
  bases: new Set(),
  phases: new Set(),
  receiveEvaluations: new Set(),
  receiveZones: new Set(),
  sets: new Set(),
  prevSkill: "any"
};
const videoFilterState = {
  teams: new Set(),
  players: new Set(),
  setters: new Set(),
  skills: new Set(),
  codes: new Set(),
  prevSkill: "any",
  sets: new Set(),
  rotations: new Set(),
  zones: new Set(),
  bases: new Set(),
  setTypes: new Set(),
  phases: new Set(),
  receiveEvaluations: new Set(),
  receiveZones: new Set(),
  serveTypes: new Set(),
  attackTypes: new Set()
};
let activeVideoFilterPresetId = null;
const TRAJECTORY_BG_BY_ZONE = {
  1: "images/trajectory/attack_2_near.png",
  2: "images/trajectory/attack_2_near.png",
  3: "images/trajectory/attack_3_near.png",
  4: "images/trajectory/attack_4_near.png",
  5: "images/trajectory/attack_4_near.png",
  6: "images/trajectory/attack_3_near.png"
};
const TRAJECTORY_LINE_COLORS = {
  "#": "#16a34a", // verde: punto pieno
  "+": "#2563eb", // blu
  "!": "#2563eb", // blu
  "-": "#f97316", // arancione deciso
  "=": "#dc2626", // rosso
  "/": "#dc2626" // rosso
};
const TRAJECTORY_LINE_COLORS_SERVE = {
  ...TRAJECTORY_LINE_COLORS,
  "/": "#2563eb" // battuta: slash blu
};
const TRAJECTORY_LINE_WIDTH = 3;
const trajectoryBgCache = {};
let serveTrajectoryImgs = null;
let multiscoutTeamScope = "our";
let rosterSyncInProgress = false;
function getAnalysisCourtSide(value) {
  return value === "far" ? "far" : "near";
}
function ensureCourtSideState(key) {
  const current = state[key];
  let next;
  if (current && typeof current === "object") {
    next = Object.assign({ our: "near", opponent: "far" }, current);
  } else if (typeof current === "string") {
    next = { our: getAnalysisCourtSide(current), opponent: "far" };
  } else {
    next = { our: "near", opponent: "far" };
  }
  state[key] = next;
  return next;
}
function clamp01Val(n) {
  if (n == null || isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
function syncTrajectoryFilterState() {
  trajectoryFilterState.setters = new Set(getCheckedValues(elTrajFilterSetters, { asNumber: true }));
  trajectoryFilterState.players = new Set(getCheckedValues(elTrajFilterPlayers, { asNumber: true }));
  trajectoryFilterState.sets = new Set(getCheckedValues(elTrajFilterSets, { asNumber: true }));
  trajectoryFilterState.codes = new Set(getCheckedValues(elTrajFilterCodes));
  trajectoryFilterState.attackTypes = new Set(getCheckedValues(elTrajFilterAttackTypes));
  trajectoryFilterState.zones = new Set(getCheckedValues(elTrajFilterZones, { asNumber: true }));
  trajectoryFilterState.setTypes = new Set(getCheckedValues(elTrajFilterSetTypes));
  trajectoryFilterState.bases = new Set(getCheckedValues(elTrajFilterBases));
  trajectoryFilterState.phases = new Set(getCheckedValues(elTrajFilterPhases));
  trajectoryFilterState.receiveEvaluations = new Set(getCheckedValues(elTrajFilterReceiveEvals));
  trajectoryFilterState.receiveZones = new Set(getCheckedValues(elTrajFilterReceiveZones, { asNumber: true }));
  trajectoryFilterState.prevSkill = (elTrajFilterPrev && elTrajFilterPrev.value) || "any";
}
function syncServeTrajectoryFilterState() {
  serveTrajectoryFilterState.players = new Set(getCheckedValues(elServeTrajFilterPlayers, { asNumber: true }));
  serveTrajectoryFilterState.sets = new Set(getCheckedValues(elServeTrajFilterSets, { asNumber: true }));
  serveTrajectoryFilterState.codes = new Set(getCheckedValues(elServeTrajFilterCodes));
  serveTrajectoryFilterState.zones = new Set(getCheckedValues(elServeTrajFilterZones, { asNumber: true }));
  serveTrajectoryFilterState.setTypes = new Set(getCheckedValues(elServeTrajFilterSetTypes));
  serveTrajectoryFilterState.bases = new Set(getCheckedValues(elServeTrajFilterBases));
  serveTrajectoryFilterState.phases = new Set(getCheckedValues(elServeTrajFilterPhases));
  serveTrajectoryFilterState.receiveEvaluations = new Set(getCheckedValues(elServeTrajFilterReceiveEvals));
  serveTrajectoryFilterState.receiveZones = new Set(getCheckedValues(elServeTrajFilterReceiveZones, { asNumber: true }));
}
function syncVideoFilterState() {
  const els = getVideoFilterElements();
  if (!els) return;
  videoFilterState.teams = new Set(getCheckedValues(els.teams));
  videoFilterState.players = new Set(getCheckedValues(els.players));
  videoFilterState.setters = new Set(getCheckedValues(els.setters));
  videoFilterState.skills = new Set(getCheckedValues(els.skills));
  videoFilterState.codes = new Set(getCheckedValues(els.codes));
  videoFilterState.prevSkill = (els.prev && els.prev.value) || "any";
  videoFilterState.sets = new Set(getCheckedValues(els.sets, { asNumber: true }));
  videoFilterState.rotations = new Set(getCheckedValues(els.rotations, { asNumber: true }));
  videoFilterState.zones = new Set(getCheckedValues(els.zones, { asNumber: true }));
  videoFilterState.bases = new Set(getCheckedValues(els.bases));
  videoFilterState.setTypes = new Set(getCheckedValues(els.setTypes));
  videoFilterState.phases = new Set(getCheckedValues(els.phases));
  videoFilterState.receiveEvaluations = new Set(getCheckedValues(els.receiveEvals));
  videoFilterState.receiveZones = new Set(getCheckedValues(els.receiveZones, { asNumber: true }));
  videoFilterState.serveTypes = new Set(getCheckedValues(els.serveTypes));
  videoFilterState.attackTypes = new Set(getCheckedValues(els.attackTypes));
}
function handleTrajectoryFilterChange() {
  syncTrajectoryFilterState();
  renderTrajectoryAnalysis();
}
function handleServeTrajectoryFilterChange() {
  syncServeTrajectoryFilterState();
  renderServeTrajectoryAnalysis();
}
function handleVideoFilterChange() {
  activeVideoFilterPresetId = null;
  syncVideoFilterState();
  renderVideoAnalysis();
  focusFirstFilteredVideoEventMobile();
}
function resetTrajectoryFilters() {
  trajectoryFilterState.setters.clear();
  trajectoryFilterState.players.clear();
  trajectoryFilterState.sets.clear();
  trajectoryFilterState.codes.clear();
  trajectoryFilterState.attackTypes.clear();
  trajectoryFilterState.zones.clear();
  trajectoryFilterState.setTypes.clear();
  trajectoryFilterState.bases.clear();
  trajectoryFilterState.phases.clear();
  trajectoryFilterState.receiveEvaluations.clear();
  trajectoryFilterState.receiveZones.clear();
  trajectoryFilterState.prevSkill = "any";
  if (elTrajFilterPrev) elTrajFilterPrev.value = "any";
  renderTrajectoryFilters();
  renderTrajectoryAnalysis();
}
function resetServeTrajectoryFilters() {
  serveTrajectoryFilterState.players.clear();
  serveTrajectoryFilterState.sets.clear();
  serveTrajectoryFilterState.codes.clear();
  serveTrajectoryFilterState.zones.clear();
  serveTrajectoryFilterState.setTypes.clear();
  serveTrajectoryFilterState.bases.clear();
  serveTrajectoryFilterState.phases.clear();
  serveTrajectoryFilterState.receiveEvaluations.clear();
  serveTrajectoryFilterState.receiveZones.clear();
  renderServeTrajectoryFilters();
  renderServeTrajectoryAnalysis();
}
function resetVideoFilters() {
  activeVideoFilterPresetId = null;
  videoFilterState.teams.clear();
  videoFilterState.players.clear();
  videoFilterState.setters.clear();
  videoFilterState.skills.clear();
  videoFilterState.codes.clear();
  videoFilterState.prevSkill = "any";
  videoFilterState.sets.clear();
  videoFilterState.rotations.clear();
  videoFilterState.zones.clear();
  videoFilterState.bases.clear();
  videoFilterState.setTypes.clear();
  videoFilterState.phases.clear();
  videoFilterState.receiveEvaluations.clear();
  videoFilterState.receiveZones.clear();
  videoFilterState.serveTypes.clear();
  videoFilterState.attackTypes.clear();
  const els = getVideoFilterElements();
  if (els && els.prev) {
    els.prev.value = "any";
  }
  renderVideoAnalysis();
  focusFirstFilteredVideoEventMobile();
}
function getVideoFilterElements() {
  const wrap = document.getElementById("video-filters");
  const players = document.getElementById("video-filter-players");
  if (!players) return null;
  return {
    wrap,
    teams: document.getElementById("video-filter-teams"),
    players,
    setters: document.getElementById("video-filter-setters"),
    skills: document.getElementById("video-filter-skills"),
    codes: document.getElementById("video-filter-codes"),
    prev: document.getElementById("video-filter-prev"),
    sets: document.getElementById("video-filter-sets"),
    rotations: document.getElementById("video-filter-rotations"),
    zones: document.getElementById("video-filter-zones"),
    bases: document.getElementById("video-filter-bases"),
    setTypes: document.getElementById("video-filter-set-types"),
    phases: document.getElementById("video-filter-phases"),
    receiveEvals: document.getElementById("video-filter-receive-evals"),
    receiveZones: document.getElementById("video-filter-receive-zones"),
    serveTypes: document.getElementById("video-filter-serve-types"),
    attackTypes: document.getElementById("video-filter-attack-types"),
    reset: document.getElementById("video-filter-reset")
  };
}
function ensureVideoFilterPresetsState() {
  if (!Array.isArray(state.videoFilterPresets)) {
    state.videoFilterPresets = [];
  }
  return state.videoFilterPresets;
}
function getActiveVideoFilterPresetName() {
  if (!activeVideoFilterPresetId) return "";
  const activePreset = ensureVideoFilterPresetsState().find(entry => entry.id === activeVideoFilterPresetId);
  return activePreset ? String(activePreset.name || "").trim() : "";
}
function listFromSet(setObj, { asNumber = false } = {}) {
  const arr = Array.from(setObj || []);
  return asNumber ? arr.map(v => Number(v)).filter(Number.isFinite) : arr.map(v => String(v));
}
function snapshotVideoFilters() {
  return {
    teams: listFromSet(videoFilterState.teams),
    players: listFromSet(videoFilterState.players),
    setters: listFromSet(videoFilterState.setters),
    skills: listFromSet(videoFilterState.skills),
    codes: listFromSet(videoFilterState.codes),
    prevSkill: videoFilterState.prevSkill || "any",
    sets: listFromSet(videoFilterState.sets, { asNumber: true }),
    rotations: listFromSet(videoFilterState.rotations, { asNumber: true }),
    zones: listFromSet(videoFilterState.zones, { asNumber: true }),
    bases: listFromSet(videoFilterState.bases),
    setTypes: listFromSet(videoFilterState.setTypes),
    phases: listFromSet(videoFilterState.phases),
    receiveEvaluations: listFromSet(videoFilterState.receiveEvaluations),
    receiveZones: listFromSet(videoFilterState.receiveZones, { asNumber: true }),
    serveTypes: listFromSet(videoFilterState.serveTypes),
    attackTypes: listFromSet(videoFilterState.attackTypes)
  };
}
function countActiveVideoFilters(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return 0;
  let count = 0;
  [
    "teams",
    "players",
    "setters",
    "skills",
    "codes",
    "sets",
    "rotations",
    "zones",
    "bases",
    "setTypes",
    "phases",
    "receiveEvaluations",
    "receiveZones",
    "serveTypes",
    "attackTypes"
  ].forEach(key => {
    const val = snapshot[key];
    if (Array.isArray(val) && val.length > 0) count += 1;
  });
  if (snapshot.prevSkill && snapshot.prevSkill !== "any") count += 1;
  return count;
}
function applyVideoFilterSnapshot(snapshot) {
  const src = snapshot && typeof snapshot === "object" ? snapshot : {};
  const toNumSet = list => new Set((Array.isArray(list) ? list : []).map(v => Number(v)).filter(Number.isFinite));
  const toStrSet = list => new Set((Array.isArray(list) ? list : []).map(v => String(v)));
  videoFilterState.teams = toStrSet(src.teams);
  videoFilterState.players = toStrSet(src.players);
  videoFilterState.setters = toStrSet(src.setters);
  videoFilterState.skills = toStrSet(src.skills);
  videoFilterState.codes = toStrSet(src.codes);
  videoFilterState.prevSkill = src.prevSkill || "any";
  videoFilterState.sets = toNumSet(src.sets);
  videoFilterState.rotations = toNumSet(src.rotations);
  videoFilterState.zones = toNumSet(src.zones);
  videoFilterState.bases = toStrSet(src.bases);
  videoFilterState.setTypes = toStrSet(src.setTypes);
  videoFilterState.phases = toStrSet(src.phases);
  videoFilterState.receiveEvaluations = toStrSet(src.receiveEvaluations);
  videoFilterState.receiveZones = toNumSet(src.receiveZones);
  videoFilterState.serveTypes = toStrSet(src.serveTypes);
  videoFilterState.attackTypes = toStrSet(src.attackTypes);
}
function reorderVideoFilterPresetsByDom(container) {
  if (!container) return;
  const presets = ensureVideoFilterPresetsState();
  const orderIds = Array.from(container.querySelectorAll("[data-video-filter-preset-id]"))
    .map(el => el.dataset.videoFilterPresetId)
    .filter(Boolean);
  if (!orderIds.length) return;
  const byId = new Map(presets.map(p => [p.id, p]));
  const reordered = [];
  orderIds.forEach(id => {
    const entry = byId.get(id);
    if (entry) reordered.push(entry);
  });
  presets.forEach(entry => {
    if (!orderIds.includes(entry.id)) reordered.push(entry);
  });
  state.videoFilterPresets = reordered;
  saveState({ persistLocal: true });
}
function renderVideoFilterPresets() {
  if (!elVideoFilterPresetsList) return;
  const presets = ensureVideoFilterPresetsState();
  elVideoFilterPresetsList.innerHTML = "";
  if (!presets.length) {
    const empty = document.createElement("div");
    empty.className = "video-filter-preset-empty";
    empty.textContent = "Nessun preset salvato per questo match.";
    elVideoFilterPresetsList.appendChild(empty);
    return;
  }
  presets.forEach(entry => {
    const card = document.createElement("div");
    card.className = "video-filter-preset-card";
    card.classList.toggle("active", entry.id === activeVideoFilterPresetId);
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.draggable = true;
    card.dataset.videoFilterPresetId = entry.id;
    const name = document.createElement("span");
    name.className = "video-filter-preset-name";
    name.textContent = entry.name;
    const meta = document.createElement("span");
    meta.className = "video-filter-preset-meta";
    meta.textContent = String(countActiveVideoFilters(entry.filters || {})) + " filtri";
    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "video-filter-preset-rename";
    renameBtn.title = "Rinomina preset";
    renameBtn.setAttribute("aria-label", "Rinomina preset");
    renameBtn.textContent = "✎";
    renameBtn.addEventListener("click", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      if (card.classList.contains("editing")) return;
      card.classList.add("editing");
      card.draggable = false;
      const input = document.createElement("input");
      input.type = "text";
      input.className = "video-filter-preset-name-input";
      input.maxLength = 40;
      input.value = entry.name || "";
      const finish = save => {
        if (!card.classList.contains("editing")) return;
        const trimmed = String(input.value || "").trim();
        if (save && trimmed) {
          entry.name = trimmed.slice(0, 40);
          saveState({ persistLocal: true });
        }
        renderVideoFilterPresets();
      };
      input.addEventListener("click", e => e.stopPropagation());
      input.addEventListener("dblclick", e => e.stopPropagation());
      input.addEventListener("keydown", e => {
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          finish(true);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          finish(false);
        }
      });
      input.addEventListener("blur", () => finish(true), { once: true });
      name.replaceWith(input);
      input.focus();
      input.select();
    });
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "video-filter-preset-delete";
    removeBtn.title = "Elimina preset";
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      if (activeVideoFilterPresetId === entry.id) activeVideoFilterPresetId = null;
      state.videoFilterPresets = presets.filter(p => p.id !== entry.id);
      saveState({ persistLocal: true });
      renderVideoFilterPresets();
    });
    card.appendChild(name);
    card.appendChild(meta);
    card.appendChild(renameBtn);
    card.appendChild(removeBtn);
    card.addEventListener("click", () => {
      if (card.classList.contains("editing")) return;
      activeVideoFilterPresetId = entry.id;
      applyVideoFilterSnapshot(entry.filters || {});
      renderVideoAnalysis();
      focusFirstFilteredVideoEventMobile();
      saveState({ persistLocal: true });
    });
    card.addEventListener("keydown", ev => {
      if (card.classList.contains("editing")) return;
      if (ev.key !== "Enter" && ev.key !== " ") return;
      ev.preventDefault();
      activeVideoFilterPresetId = entry.id;
      applyVideoFilterSnapshot(entry.filters || {});
      renderVideoAnalysis();
      focusFirstFilteredVideoEventMobile();
      saveState({ persistLocal: true });
    });
    card.addEventListener("dragstart", () => {
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      reorderVideoFilterPresetsByDom(elVideoFilterPresetsList);
    });
    card.addEventListener("dragover", ev => {
      ev.preventDefault();
      const dragging = elVideoFilterPresetsList.querySelector(".video-filter-preset-card.dragging");
      if (!dragging || dragging === card) return;
      const rect = card.getBoundingClientRect();
      const insertAfter = ev.clientY > rect.top + rect.height / 2;
      if (insertAfter) {
        elVideoFilterPresetsList.insertBefore(dragging, card.nextSibling);
      } else {
        elVideoFilterPresetsList.insertBefore(dragging, card);
      }
    });
    elVideoFilterPresetsList.appendChild(card);
  });
}
function saveCurrentVideoFilterPreset() {
  const presets = ensureVideoFilterPresetsState();
  const rawName = elVideoFilterPresetName ? String(elVideoFilterPresetName.value || "").trim() : "";
  const name = rawName || ("Preset " + (presets.length + 1));
  const entry = {
    id: "vf_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7),
    name,
    filters: snapshotVideoFilters()
  };
  presets.push(entry);
  if (elVideoFilterPresetName) {
    elVideoFilterPresetName.value = "";
  }
  saveState({ persistLocal: true });
  renderVideoFilterPresets();
}
function getSecondFilterElements() {
  const setters = document.getElementById("second-filter-setters");
  if (!setters) return null;
  return {
    setters,
    players: document.getElementById("second-filter-players"),
    codes: document.getElementById("second-filter-codes"),
    zones: document.getElementById("second-filter-zones"),
    setTypes: document.getElementById("second-filter-set-types"),
    bases: document.getElementById("second-filter-bases"),
    phases: document.getElementById("second-filter-phases"),
    receiveEvals: document.getElementById("second-filter-receive-evals"),
    receiveZones: document.getElementById("second-filter-receive-zones"),
    sets: document.getElementById("second-filter-sets"),
    prev: document.getElementById("second-filter-prev"),
    reset: document.getElementById("second-filter-reset")
  };
}
