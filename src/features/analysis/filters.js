import { publishReactFilter } from "./filter-view.js";
import { SKILLS } from "../../../js/globals.js";

import { ensureVideoFilterPresetsState, countActiveVideoFilters, applyVideoFilterSnapshot, renderVideoFilterPresets, updateAnalysisExtraMatchesFromContainer, updateMultiscoutButton, renderMultiscoutModal, invalidateAnalysisCaches } from "./analysis-filters.js";
import { getAnalysisExtraMatchState, getAnalysisMatchOptions, saveAnalysisExtraMatchState, getCurrentMatchLabel } from "./filter-model.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";
import { getTeamNameForScope } from "../teams/selectors.js";
import { setModalOpenState } from "../layout/modals.js";
import { session as scoutUiState } from "../state/scout-ui.js";

import { videoPresetsStore, multiscoutStore, metricsStore } from "../../state/roster-import-store.mjs";
import { renderVideoAnalysis, focusFirstFilteredVideoEventMobile } from "../video/playback.js";
import { saveState } from "../storage/save-state.js";
import { session as matchState } from "../../../js/globals.js";
import { renderAggregatedTable } from "./aggregated-table.js";
import { renderTrajectoryAnalysis, renderServeTrajectoryAnalysis } from "./trajectory-rendering.js";
import { renderSecondTable } from "./second-distribution.js";
import { renderPlayerAnalysis } from "./skill-tables.js";
import { ensureMetricsConfigDefaults, ensurePointRulesDefaults, normalizePointRule, getCodeTone } from "../settings/rules.js";
import { session as camp3ImportState } from "../settings/rule-state.js";
import { syncSkillFlowButtons } from "../teams/court/court-ui-bootstrap.js";











export function publishReactVideoPresets() {
  videoPresetsStore.publish({
    entries: Object.freeze(
      ensureVideoFilterPresetsState().map((entry) =>
        Object.freeze({
          id: entry.id,
          name: entry.name,
          count: countActiveVideoFilters(entry.filters || {}),
          active: entry.id === analysisFiltersState.activeVideoFilterPresetId,
        }),
      ),
    ),
  });
}

export function applyReactVideoPreset(id) {
  const entry = ensureVideoFilterPresetsState().find(
    (entry) => entry.id === id,
  );
  if (!entry) return;
  analysisFiltersState.activeVideoFilterPresetId = id;
  applyVideoFilterSnapshot(entry.filters || {});
  renderVideoAnalysis();
  focusFirstFilteredVideoEventMobile();
  saveState({ persistLocal: true });
}

export function renameReactVideoPreset(id, value) {
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

export function removeReactVideoPreset(id) {
  if (analysisFiltersState.activeVideoFilterPresetId === id) analysisFiltersState.activeVideoFilterPresetId = null;
  matchState.state.videoFilterPresets = ensureVideoFilterPresetsState().filter(
    (entry) => entry.id !== id,
  );
  saveState({ persistLocal: true });
  renderVideoFilterPresets();
}

export function reorderReactVideoPresets(ids) {
  const presets = ensureVideoFilterPresetsState(),
    order = ids
      .map((id) => presets.find((entry) => entry.id === id))
      .filter(Boolean);
  presets.forEach((entry) => {
    if (!ids.includes(entry.id)) order.push(entry);
  });
  matchState.state.videoFilterPresets = order;
  saveState({ persistLocal: true });
}

export function getReactMultiscoutScope() {
  return matchState.state.useOpponentTeam && analysisFiltersState.multiscoutTeamScope === "opponent"
    ? "opponent"
    : "our";
}

export function publishReactMultiscoutCount() {
  const scope = getReactMultiscoutScope(),
    extra = getAnalysisExtraMatchState();
  multiscoutStore.publish({ count: extra[scope]?.size || 0 });
}

export function publishReactMultiscout() {
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
  const teams = matchState.state.useOpponentTeam
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
  publishReactFilter(scoutUiState.elMultiscoutList, options, filtered, {
    onChange: () =>
      updateAnalysisExtraMatchesFromContainer(scoutUiState.elMultiscoutList, scope),
  });
  updateMultiscoutButton();
}

export function openReactMultiscout() {
  renderMultiscoutModal();
  multiscoutStore.publish({ open: true });
  setModalOpenState(true, true);
}

export function closeReactMultiscout() {
  multiscoutStore.publish({ open: false });
  setModalOpenState(false, true);
}

export function changeReactMultiscoutScope(value) {
  analysisFiltersState.multiscoutTeamScope = value === "opponent" ? "opponent" : "our";
  renderMultiscoutModal();
}

export function resetReactMultiscout() {
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

export function publishReactMetrics() {
  ensureMetricsConfigDefaults();
  ensurePointRulesDefaults();
  metricsStore.publish({
    skills: SKILLS.map((skill) => {
      const config = matchState.state.metricsConfig[skill.id],
        point = normalizePointRule(skill.id, matchState.state.pointRules[skill.id]);
      const rows = (metas, points = false) =>
        metas.map((meta) => ({
          ...meta,
          codes:
            meta.key === "enabled"
              ? []
              : camp3ImportState.SETTINGS_RESULT_CODES.map((code) => ({
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
