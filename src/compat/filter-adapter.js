function publishReactFilter(container, options, selectedSet, config = {}) {
  const id = container.id,
    type = config.type || "checkbox",
    selected = Object.freeze([...selectedSet].map(String));
  filterStore.publish(id, {
    type,
    name: config.name,
    groups: Object.freeze([]),
    options: Object.freeze(
      options.map((option) => Object.freeze({ ...option })),
    ),
    selected,
    value: selected[0] || null,
    onChange: (value, checked, event) => {
      filterStore.change(id, value, checked);
      const callback = config.onChange || handleTrajectoryFilterChange;
      if (typeof callback === "function") callback(event);
    },
  });
}
function publishReactSplitFilter(container, groups, selectedSet) {
  const id = container.id;
  filterStore.publish(id, {
    type: "checkbox",
    options: Object.freeze([]),
    groups: Object.freeze(
      groups.map((group) =>
        Object.freeze({
          id: `${id}-${group.scope}`,
          label: getTeamNameForScope(group.scope),
          options: Object.freeze(
            group.options.map((option) => Object.freeze({ ...option })),
          ),
        }),
      ),
    ),
    selected: Object.freeze([...selectedSet].map(String)),
    onChange: (value, checked, event) => {
      filterStore.change(id, value, checked);
      handleVideoFilterChange(event);
    },
  });
}
function readReactFilterValues(container, asNumber = false) {
  const view = filterStore.getView(container.id),
    options = view.groups.length
      ? view.groups.flatMap((group) => group.options)
      : view.options;
  return options
    .filter((option) => view.selected.includes(String(option.value)))
    .map((option) => (asNumber ? Number(option.value) : String(option.value)));
}

function readReactFilterSelect(container) {
  return filterStore.getView(container.id).value;
}
function publishReactPreviousSkill(container, value, onChange) {
  const id = container.id;
  filterStore.publish(id, {
    type: "select",
    groups: Object.freeze([]),
    selected: Object.freeze([]),
    value: value || "any",
    options: Object.freeze(
      PREVIOUS_SKILL_OPTIONS.map((option) => Object.freeze({ ...option })),
    ),
    onChange: (value, checked, event) => {
      filterStore.change(id, value, checked);
      onChange(event);
    },
  });
}

function publishReactVideoPresets() {
  videoPresetsStore.publish({
    entries: Object.freeze(
      ensureVideoFilterPresetsState().map((entry) =>
        Object.freeze({
          id: entry.id,
          name: entry.name,
          count: countActiveVideoFilters(entry.filters || {}),
          active: entry.id === activeVideoFilterPresetId,
        }),
      ),
    ),
  });
}
function applyReactVideoPreset(id) {
  const entry = ensureVideoFilterPresetsState().find(
    (entry) => entry.id === id,
  );
  if (!entry) return;
  activeVideoFilterPresetId = id;
  applyVideoFilterSnapshot(entry.filters || {});
  renderVideoAnalysis();
  focusFirstFilteredVideoEventMobile();
  saveState({ persistLocal: true });
}
function renameReactVideoPreset(id, value) {
  const entry = ensureVideoFilterPresetsState().find(
    (entry) => entry.id === id,
  );
  if (!entry) return;
  const name = typeof value === "string" ? value.trim() : "";
  if (name) {
    entry.name = name.slice(0, 40);
    saveState({ persistLocal: true });
  }
  renderVideoFilterPresets();
}
function removeReactVideoPreset(id) {
  if (activeVideoFilterPresetId === id) activeVideoFilterPresetId = null;
  state.videoFilterPresets = ensureVideoFilterPresetsState().filter(
    (entry) => entry.id !== id,
  );
  saveState({ persistLocal: true });
  renderVideoFilterPresets();
}
function reorderReactVideoPresets(ids) {
  const presets = ensureVideoFilterPresetsState(),
    order = ids
      .map((id) => presets.find((entry) => entry.id === id))
      .filter(Boolean);
  presets.forEach((entry) => {
    if (!ids.includes(entry.id)) order.push(entry);
  });
  state.videoFilterPresets = order;
  saveState({ persistLocal: true });
}

function getReactMultiscoutScope() {
  return state.useOpponentTeam && multiscoutTeamScope === "opponent"
    ? "opponent"
    : "our";
}
function publishReactMultiscoutCount() {
  const scope = getReactMultiscoutScope(),
    extra = getAnalysisExtraMatchState();
  multiscoutStore.publish({ count: extra[scope]?.size || 0 });
}
function publishReactMultiscout() {
  const scope = getReactMultiscoutScope(),
    options = getAnalysisMatchOptions(scope),
    extra = getAnalysisExtraMatchState(),
    selected = extra[scope] || new Set(),
    filtered = new Set(
      [...selected].filter((key) =>
        options.some((option) => option.value === key),
      ),
    );
  extra[scope] = filtered;
  saveAnalysisExtraMatchState(extra);
  const teams = state.useOpponentTeam
    ? [
        { value: "our", label: getTeamNameForScope("our") || "Squadra" },
        {
          value: "opponent",
          label: getTeamNameForScope("opponent") || "Avversaria",
        },
      ]
    : [{ value: "our", label: getTeamNameForScope("our") || "Squadra" }];
  const pieces = [],
    match = getCurrentMatchLabel(),
    team = getTeamNameForScope(scope);
  if (match) pieces.push("Match: " + match);
  if (team) pieces.push("Squadra: " + team);
  multiscoutStore.publish({
    scope,
    teams: Object.freeze(teams.map(Object.freeze)),
    subtitle: pieces.length ? pieces.join(" · ") : "Match corrente",
  });
  publishReactFilter(elMultiscoutList, options, filtered, {
    onChange: () =>
      updateAnalysisExtraMatchesFromContainer(elMultiscoutList, scope),
  });
  updateMultiscoutButton();
}
function openReactMultiscout() {
  renderMultiscoutModal();
  multiscoutStore.publish({ open: true });
  setModalOpenState(true, true);
}
function closeReactMultiscout() {
  multiscoutStore.publish({ open: false });
  setModalOpenState(false, true);
}
function changeReactMultiscoutScope(value) {
  multiscoutTeamScope = value === "opponent" ? "opponent" : "our";
  renderMultiscoutModal();
}
function resetReactMultiscout() {
  const extra = getAnalysisExtraMatchState();
  extra[getReactMultiscoutScope()] = new Set();
  saveAnalysisExtraMatchState(extra);
  saveState();
  invalidateAnalysisCaches();
  updateMultiscoutButton();
  renderMultiscoutModal();
  renderAggregatedTable();
  renderTrajectoryAnalysis();
  renderServeTrajectoryAnalysis();
  renderSecondTable();
  renderPlayerAnalysis();
}

function publishReactMetrics() {
  ensureMetricsConfigDefaults();
  ensurePointRulesDefaults();
  metricsStore.publish({
    skills: SKILLS.map((skill) => {
      const config = state.metricsConfig[skill.id],
        point = normalizePointRule(skill.id, state.pointRules[skill.id]);
      const rows = (metas, points = false) =>
        metas.map((meta) => ({
          ...meta,
          codes:
            meta.key === "enabled"
              ? []
              : SETTINGS_RESULT_CODES.map((code) => ({
                  code,
                  tone: points
                    ? meta.key === "for"
                      ? "positive"
                      : meta.key === "against"
                        ? "negative"
                        : "neutral"
                    : getCodeTone(skill.id, code),
                  active: points
                    ? meta.key === "for"
                      ? point.for.includes(code)
                      : meta.key === "against"
                        ? point.against.includes(code)
                        : !point.for.includes(code) &&
                          !point.against.includes(code)
                    : config[meta.key].includes(code),
                  disabled:
                    !points &&
                    skill.id === "block" &&
                    code === "!" &&
                    meta.key === "activeCodes",
                  command: points
                    ? "togglePointRule"
                    : meta.key === "activeCodes"
                      ? "toggleActiveCode"
                      : "toggleMetricAssignment",
                })),
        }));
      return {
        id: skill.id,
        label: skill.label,
        enabled: config.enabled,
        columns: [
          rows([
            { key: "enabled", label: "Scout attivo?" },
            { key: "activeCodes", label: "Codici abilitati" },
          ]),
          rows([
            { key: "positive", label: "Positivo" },
            { key: "neutral", label: "Neutro" },
            { key: "negative", label: "Negativo" },
          ]),
          rows(
            [
              { key: "for", label: "Punto" },
              { key: "against", label: "Punto subito" },
              { key: "neutral", label: "Neutro (no punto)" },
            ],
            true,
          ),
        ],
      };
    }),
  });
  try {
    syncSkillFlowButtons();
  } catch (error) {
    console.error("Skill flow buttons sync failed", error);
  }
}
