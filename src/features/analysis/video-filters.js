import { getFilterControlIds } from "../../domain/analysis-filter-schema.js";
import { publishReactVideoPresets } from "./video-preset-view.js";
import { buildUniqueOptions, normalizeSetNumber, normalizePhaseValue } from "./values.js";
import {
  getFilterFields,
  buildAdvancedFilterOptions,
  pruneFilterControls,
  renderFilterControls,
} from "./filter-controls.js";
import { SKILLS } from "../../../js/globals.js";
import { renderDynamicFilter, toggleFilterVisibility } from "./filter-view.js";
import {
  matchesTeamFilter,
  getAnalysisTeamScope,
  makeScopedIndexKey,
  getSetterFromEvent,
  filterNormalEvalOptions,
  getTeamFilterOptions,
} from "./filter-model.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";
import { session as matchState } from "../../../js/globals.js";
import {
  getTeamScopeFromEvent,
  getPlayersForScope,
  getPlayerNumbersForScope,
  getTeamNameForScope,
} from "../teams/selectors.js";
import {
  formatNameWithNumberFor,
  formatNameWithNumber,
} from "../teams/roster-data.js";
import { resolvePlayerIdx } from "../events/player-links.js";
import { sortPlayerOptionsByNumberForScope } from "../teams/lineup-selectors.js";

import { session as liveScoreAndSetState } from "../state/live-live-score-and-set.js";
import { formatAttackPhaseLabel } from "./values.js";
import { buildAttackTypeLabel } from "./values.js";
import {
  publishReactSplitFilter,
  publishReactPreviousSkill,
} from "./filter-view.js";

const videoFilterAction = Object.freeze({ command: "handleVideoFilterChange" });
const videoTeamFilterAction = Object.freeze({
  command: "handleVideoTeamFilterChange",
});

export function renderVideoFilters(events) {
  const controlIds = getFilterControlIds("videoFilterState");
  const list = Array.isArray(events) ? events : [];
  const getManualCodeLabel = (val) => {
    const map = {
      for: "Punto",
      "opp-error": "Errore avv.",
      "opp-point": "Punto avv.",
      error: "Errore",
      "team-error": "Errore squadra",
      TO: "Timeout",
      TOA: "Timeout avv.",
      SUB: "Cambio",
    };
    return map[val] || val;
  };
  const filteredByTeam = analysisFiltersState.videoFilterState.teams.size
    ? list.filter((ev) =>
        matchesTeamFilter(ev, analysisFiltersState.videoFilterState.teams),
      )
    : list;
  const showBothTeams =
    matchState.state.useOpponentTeam &&
    analysisFiltersState.videoFilterState.teams.size !== 1;
  const labelScope = filteredByTeam.length
    ? getTeamScopeFromEvent(filteredByTeam[0])
    : getAnalysisTeamScope();
  const labelPlayers = getPlayersForScope(labelScope);
  const labelNumbers = getPlayerNumbersForScope(labelScope);
  const getPlayerLabel = (
    scope,
    idx,
    { setter = false, includeTeam = true } = {},
  ) => {
    const players = getPlayersForScope(scope);
    const numbers = getPlayerNumbersForScope(scope);
    const name = players[idx];
    const baseLabel = name
      ? scope === "opponent"
        ? formatNameWithNumberFor(name, numbers)
        : formatNameWithNumber(name)
      : setter
        ? "Alzatore " + (Number(idx) + 1)
        : "#" + (Number(idx) + 1);
    if (showBothTeams && includeTeam) {
      return getTeamNameForScope(scope) + " · " + baseLabel;
    }
    return baseLabel;
  };
  const sortScopedOptionsForScope = (options, scope) => {
    const scoped = options.map((opt) => {
      const key = String(opt.value);
      const idxRaw = key.includes(":") ? key.split(":")[1] : key;
      const idx = Number(idxRaw);
      const players = getPlayersForScope(scope);
      const numbers = getPlayerNumbersForScope(scope);
      const name = players[idx];
      const rawNum = numbers && name ? numbers[name] : null;
      const parsedNum =
        rawNum !== null && rawNum !== undefined && rawNum !== ""
          ? parseInt(rawNum, 10)
          : null;
      return {
        opt,
        idx,
        number: Number.isFinite(parsedNum) ? parsedNum : null,
        name: name || "",
      };
    });
    scoped.sort((a, b) => {
      const numA = a.number;
      const numB = b.number;
      if (numA === null && numB === null) {
        return a.name.localeCompare(b.name, "it", { sensitivity: "base" });
      }
      if (numA === null) return 1;
      if (numB === null) return -1;
      if (numA !== numB) return numA - numB;
      return a.name.localeCompare(b.name, "it", { sensitivity: "base" });
    });
    return scoped.map((entry) => entry.opt);
  };
  const buildPlayerKey = (scope, idx) =>
    showBothTeams ? makeScopedIndexKey(scope, idx) : String(idx);
  const buildPlayerOptionsForScope = (scope, { setter = false } = {}) => {
    const values = filteredByTeam
      .filter((ev) => getTeamScopeFromEvent(ev) === scope)
      .map((ev) => {
        const idx = setter ? getSetterFromEvent(ev) : resolvePlayerIdx(ev);
        if (idx === null || idx === -1) return null;
        return buildPlayerKey(scope, idx);
      });
    const raw = buildUniqueOptions(values, {
      labelFn: (key) => {
        if (!showBothTeams) {
          const idx = Number(String(key).split(":")[1] || key);
          const name = labelPlayers[idx];
          if (!name)
            return setter
              ? "Alzatore " + (Number(idx) + 1)
              : "#" + (Number(idx) + 1);
          return labelScope === "opponent"
            ? formatNameWithNumberFor(name, labelNumbers)
            : formatNameWithNumber(name);
        }
        const [keyScope, idxRaw] = String(key).split(":");
        return getPlayerLabel(keyScope, Number(idxRaw), {
          setter,
          includeTeam: false,
        });
      },
    });
    return showBothTeams
      ? sortScopedOptionsForScope(raw, scope)
      : sortPlayerOptionsByNumberForScope(raw, labelScope);
  };
  const playerOptsOur = showBothTeams ? buildPlayerOptionsForScope("our") : [];
  const playerOptsOpp = showBothTeams
    ? buildPlayerOptionsForScope("opponent")
    : [];
  const setterOptsOur = showBothTeams
    ? buildPlayerOptionsForScope("our", { setter: true })
    : [];
  const setterOptsOpp = showBothTeams
    ? buildPlayerOptionsForScope("opponent", { setter: true })
    : [];
  const playerOptsRaw = showBothTeams
    ? playerOptsOur.concat(playerOptsOpp)
    : buildPlayerOptionsForScope(labelScope);
  const setterOptsRaw = showBothTeams
    ? setterOptsOur.concat(setterOptsOpp)
    : buildPlayerOptionsForScope(labelScope, { setter: true });
  const playerOpts = playerOptsRaw;
  const setterOpts = setterOptsRaw;
  const skillOpts = buildUniqueOptions(
    filteredByTeam.map((ev) => ev.skillId),
    {
      labelFn: (val) => {
        if (val === "manual") return "Manuale";
        return (SKILLS.find((s) => s.id === val) || {}).label || val;
      },
    },
  );
  const evalCodeOpts = filterNormalEvalOptions(
    buildUniqueOptions(
      filteredByTeam.map((ev) => ev.code),
      { labelFn: (val) => val },
    ),
  );
  const manualCodeOpts = buildUniqueOptions(
    filteredByTeam
      .filter((ev) => ev && ev.skillId === "manual")
      .map((ev) => ev.code),
    { labelFn: (val) => getManualCodeLabel(val) },
  );
  const codeOptMap = new Map();
  [...evalCodeOpts, ...manualCodeOpts].forEach((opt) => {
    if (!opt || !opt.value || codeOptMap.has(opt.value)) return;
    codeOptMap.set(opt.value, opt);
  });
  const codeOpts = Array.from(codeOptMap.values());
  const setOpts = buildUniqueOptions(
    filteredByTeam.map((ev) => normalizeSetNumber(ev.set)),
    {
      asNumber: true,
      labelFn: (val) => "Set " + val,
    },
  );
  const rotOpts = buildUniqueOptions(
    filteredByTeam.map((ev) => ev.rotation),
    {
      asNumber: true,
      labelFn: (val) => "P" + val,
    },
  );
  const zoneOpts = buildUniqueOptions(
    filteredByTeam.map((ev) => ev.zone || ev.playerPosition),
    {
      asNumber: true,
      labelFn: (val) => "Z" + val,
    },
  );
  const { setTypeOpts, baseOpts, phaseOpts, recvEvalOpts, recvZoneOpts } =
    buildAdvancedFilterOptions(filteredByTeam, {
      baseLabel: (val) => val.toUpperCase(),
      phaseValue: (ev) => {
        let rawPhase = ev.attackBp;
        if (rawPhase === undefined || rawPhase === null) {
          rawPhase =
            ev.phase !== undefined
              ? ev.phase
              : ev.attackPhase !== undefined
                ? ev.attackPhase
                : null;
        }
        return normalizePhaseValue(rawPhase);
      },
      phaseLabel: formatAttackPhaseLabel,
    });
  const serveTypeOpts = buildUniqueOptions(
    filteredByTeam.map((ev) => ev.serveType),
    { labelFn: (val) => val },
  );
  const attackTypeOpts = buildUniqueOptions(
    filteredByTeam
      .filter((ev) => ev && ev.skillId === "attack")
      .map((ev) => buildAttackTypeLabel(ev.attackType)),
    { labelFn: (val) => val },
  );

  const fields = getFilterFields("videoFilterState");
  const options = {
    teams: getTeamFilterOptions(),
    players: playerOpts,
    setters: setterOpts,
    skills: skillOpts,
    codes: codeOpts,
    sets: setOpts,
    rotations: rotOpts,
    zones: zoneOpts,
    bases: baseOpts,
    setTypes: setTypeOpts,
    phases: phaseOpts,
    receiveEvaluations: recvEvalOpts,
    receiveZones: recvZoneOpts,
    serveTypes: serveTypeOpts,
    attackTypes: attackTypeOpts,
  };
  pruneFilterControls(analysisFiltersState.videoFilterState, fields, options);
  if (
    !liveScoreAndSetState.PREVIOUS_SKILL_OPTIONS.some(
      (opt) => opt.value === analysisFiltersState.videoFilterState.prevSkill,
    )
  ) {
    analysisFiltersState.videoFilterState.prevSkill = "any";
  }

  renderDynamicFilter(
    controlIds.teams,
    getTeamFilterOptions(),
    analysisFiltersState.videoFilterState.teams,
    {
      onChange: videoTeamFilterAction,
    },
  );
  if (showBothTeams) {
    publishReactSplitFilter(
      controlIds.players,
      [
        { scope: "our", options: playerOptsOur },
        { scope: "opponent", options: playerOptsOpp },
      ],
      analysisFiltersState.videoFilterState.players,
      videoFilterAction,
    );
    publishReactSplitFilter(
      controlIds.setters,
      [
        { scope: "our", options: setterOptsOur },
        { scope: "opponent", options: setterOptsOpp },
      ],
      analysisFiltersState.videoFilterState.setters,
      videoFilterAction,
    );
    toggleFilterVisibility(controlIds.players, playerOpts.length > 0);
    toggleFilterVisibility(controlIds.setters, setterOpts.length > 0);
  } else {
    renderDynamicFilter(
      controlIds.players,
      playerOpts,
      analysisFiltersState.videoFilterState.players,
      {
        onChange: videoFilterAction,
      },
    );
    renderDynamicFilter(
      controlIds.setters,
      setterOpts,
      analysisFiltersState.videoFilterState.setters,
      {
        onChange: videoFilterAction,
      },
    );
  }
  renderFilterControls(
    analysisFiltersState.videoFilterState,
    fields.filter(([key]) => !["teams", "players", "setters"].includes(key)),
    options,
    videoFilterAction,
    { prune: false },
  );

  toggleFilterVisibility(controlIds.prev, true);
  publishReactPreviousSkill(
    controlIds.prev,
    analysisFiltersState.videoFilterState.prevSkill,
    videoFilterAction,
  );

  const visibleFilters = [
    playerOpts.length,
    setterOpts.length,
    skillOpts.length,
    codeOpts.length,
    liveScoreAndSetState.PREVIOUS_SKILL_OPTIONS.length,
    setOpts.length,
    rotOpts.length,
    zoneOpts.length,
    baseOpts.length,
    setTypeOpts.length,
    phaseOpts.length,
    recvEvalOpts.length,
    recvZoneOpts.length,
    serveTypeOpts.length,
    attackTypeOpts.length,
  ];
  toggleFilterVisibility("video-filters", visibleFilters.some(Boolean));
  toggleFilterVisibility(controlIds.reset, visibleFilters.some(Boolean));

  publishReactVideoPresets();
}
