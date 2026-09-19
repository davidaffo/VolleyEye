function renderVideoFilters(events) {
  const els = getVideoFilterElements();
  if (!els) return;
  const list = Array.isArray(events) ? events : [];
  const getManualCodeLabel = val => {
    const map = {
      for: "Punto",
      "opp-error": "Errore avv.",
      "opp-point": "Punto avv.",
      error: "Errore",
      "team-error": "Errore squadra",
      TO: "Timeout",
      TOA: "Timeout avv.",
      SUB: "Cambio"
    };
    return map[val] || val;
  };
  const filteredByTeam = videoFilterState.teams.size
    ? list.filter(ev => matchesTeamFilter(ev, videoFilterState.teams))
    : list;
  const showBothTeams = state.useOpponentTeam && videoFilterState.teams.size !== 1;
  const labelScope = filteredByTeam.length ? getTeamScopeFromEvent(filteredByTeam[0]) : getAnalysisTeamScope();
  const labelPlayers = getPlayersForScope(labelScope);
  const labelNumbers = getPlayerNumbersForScope(labelScope);
  const getPlayerLabel = (scope, idx, { setter = false, includeTeam = true } = {}) => {
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
    const scoped = options.map(opt => {
      const key = String(opt.value);
      const idxRaw = key.includes(":") ? key.split(":")[1] : key;
      const idx = Number(idxRaw);
      const players = getPlayersForScope(scope);
      const numbers = getPlayerNumbersForScope(scope);
      const name = players[idx];
      const rawNum = numbers && name ? numbers[name] : null;
      const parsedNum = rawNum !== null && rawNum !== undefined && rawNum !== "" ? parseInt(rawNum, 10) : null;
      return {
        opt,
        idx,
        number: Number.isFinite(parsedNum) ? parsedNum : null,
        name: name || ""
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
    return scoped.map(entry => entry.opt);
  };
  const buildPlayerKey = (scope, idx) =>
    showBothTeams ? makeScopedIndexKey(scope, idx) : String(idx);
  const buildPlayerOptionsForScope = (scope, { setter = false } = {}) => {
    const values = filteredByTeam
      .filter(ev => getTeamScopeFromEvent(ev) === scope)
      .map(ev => {
        const idx = setter ? getSetterFromEvent(ev) : resolvePlayerIdx(ev);
        if (idx === null || idx === -1) return null;
        return buildPlayerKey(scope, idx);
      });
    const raw = buildUniqueOptions(values, {
      labelFn: key => {
        if (!showBothTeams) {
          const idx = Number(String(key).split(":")[1] || key);
          const name = labelPlayers[idx];
          if (!name) return setter ? "Alzatore " + (Number(idx) + 1) : "#" + (Number(idx) + 1);
          return labelScope === "opponent"
            ? formatNameWithNumberFor(name, labelNumbers)
            : formatNameWithNumber(name);
        }
        const [keyScope, idxRaw] = String(key).split(":");
        return getPlayerLabel(keyScope, Number(idxRaw), { setter, includeTeam: false });
      }
    });
    return showBothTeams
      ? sortScopedOptionsForScope(raw, scope)
      : sortPlayerOptionsByNumberForScope(raw, labelScope);
  };
  const playerOptsOur = showBothTeams ? buildPlayerOptionsForScope("our") : [];
  const playerOptsOpp = showBothTeams ? buildPlayerOptionsForScope("opponent") : [];
  const setterOptsOur = showBothTeams ? buildPlayerOptionsForScope("our", { setter: true }) : [];
  const setterOptsOpp = showBothTeams ? buildPlayerOptionsForScope("opponent", { setter: true }) : [];
  const playerOptsRaw = showBothTeams
    ? playerOptsOur.concat(playerOptsOpp)
    : buildPlayerOptionsForScope(labelScope);
  const setterOptsRaw = showBothTeams
    ? setterOptsOur.concat(setterOptsOpp)
    : buildPlayerOptionsForScope(labelScope, { setter: true });
  const playerOpts = playerOptsRaw;
  const setterOpts = setterOptsRaw;
  const skillOpts = buildUniqueOptions(filteredByTeam.map(ev => ev.skillId), {
    labelFn: val => {
      if (val === "manual") return "Manuale";
      return (SKILLS.find(s => s.id === val) || {}).label || val;
    }
  });
  const evalCodeOpts = filterNormalEvalOptions(
    buildUniqueOptions(filteredByTeam.map(ev => ev.code), { labelFn: val => val })
  );
  const manualCodeOpts = buildUniqueOptions(
    filteredByTeam.filter(ev => ev && ev.skillId === "manual").map(ev => ev.code),
    { labelFn: val => getManualCodeLabel(val) }
  );
  const codeOptMap = new Map();
  [...evalCodeOpts, ...manualCodeOpts].forEach(opt => {
    if (!opt || !opt.value || codeOptMap.has(opt.value)) return;
    codeOptMap.set(opt.value, opt);
  });
  const codeOpts = Array.from(codeOptMap.values());
  const setOpts = buildUniqueOptions(filteredByTeam.map(ev => normalizeSetNumber(ev.set)), {
    asNumber: true,
    labelFn: val => "Set " + val
  });
  const rotOpts = buildUniqueOptions(filteredByTeam.map(ev => ev.rotation), {
    asNumber: true,
    labelFn: val => "P" + val
  });
  const zoneOpts = buildUniqueOptions(filteredByTeam.map(ev => ev.zone || ev.playerPosition), {
    asNumber: true,
    labelFn: val => "Z" + val
  });
  const baseOpts = buildUniqueOptions(filteredByTeam.map(ev => normalizeBaseValue(ev.base)), {
    labelFn: val => val.toUpperCase()
  });
  const setTypeOpts = buildUniqueOptions(
    filteredByTeam.map(ev =>
      normalizeSetTypeValue(
        ev.setType || (ev.combination && ev.combination.set_type) || (ev.combination && ev.combination.setType)
      )
    ),
    { labelFn: val => getOptionLabel(DEFAULT_SET_TYPE_OPTIONS, val) }
  );
  const phaseOpts = buildUniqueOptions(
    filteredByTeam.map(ev => {
      let rawPhase = ev.attackBp;
      if (rawPhase === undefined || rawPhase === null) {
        rawPhase = ev.phase !== undefined ? ev.phase : ev.attackPhase !== undefined ? ev.attackPhase : null;
      }
      return normalizePhaseValue(rawPhase);
    }),
    { labelFn: val => formatAttackPhaseLabel(val) }
  );
  const recvEvalOpts = buildUniqueOptions(filteredByTeam.map(ev => normalizeEvalCode(ev.receiveEvaluation)), {
    labelFn: val => val
  });
  const recvZoneOpts = buildUniqueOptions(
    filteredByTeam.map(ev => normalizeReceiveZone(ev.receivePosition || ev.receiveZone)),
    { asNumber: true, labelFn: val => "Z" + val }
  );
  const serveTypeOpts = buildUniqueOptions(filteredByTeam.map(ev => ev.serveType), { labelFn: val => val });
  const attackTypeOpts = buildUniqueOptions(
    filteredByTeam
      .filter(ev => ev && ev.skillId === "attack")
      .map(ev => buildAttackTypeLabel(ev.attackType)),
    { labelFn: val => val }
  );

  const playerOptValues = new Set(playerOpts.map(opt => opt.value));
  const setterOptValues = new Set(setterOpts.map(opt => opt.value));
  videoFilterState.players = new Set(
    [...videoFilterState.players].filter(val => playerOptValues.has(val))
  );
  videoFilterState.setters = new Set(
    [...videoFilterState.setters].filter(val => setterOptValues.has(val))
  );
  videoFilterState.skills = new Set(
    [...videoFilterState.skills].filter(val => skillOpts.some(o => o.value === val))
  );
  videoFilterState.codes = new Set(
    [...videoFilterState.codes].filter(val => codeOpts.some(o => o.value === val))
  );
  videoFilterState.sets = new Set(
    [...videoFilterState.sets].filter(val => setOpts.some(o => Number(o.value) === val))
  );
  videoFilterState.rotations = new Set(
    [...videoFilterState.rotations].filter(val => rotOpts.some(o => Number(o.value) === val))
  );
  videoFilterState.zones = new Set(
    [...videoFilterState.zones].filter(val => zoneOpts.some(o => Number(o.value) === val))
  );
  videoFilterState.bases = new Set(
    [...videoFilterState.bases].filter(val => baseOpts.some(o => o.value === val))
  );
  videoFilterState.setTypes = new Set(
    [...videoFilterState.setTypes].filter(val => setTypeOpts.some(o => o.value === val))
  );
  videoFilterState.phases = new Set(
    [...videoFilterState.phases].filter(val => phaseOpts.some(o => o.value === val))
  );
  videoFilterState.receiveEvaluations = new Set(
    [...videoFilterState.receiveEvaluations].filter(val => recvEvalOpts.some(o => o.value === val))
  );
  videoFilterState.receiveZones = new Set(
    [...videoFilterState.receiveZones].filter(val => recvZoneOpts.some(o => Number(o.value) === val))
  );
  videoFilterState.serveTypes = new Set(
    [...videoFilterState.serveTypes].filter(val => serveTypeOpts.some(o => o.value === val))
  );
  videoFilterState.attackTypes = new Set(
    [...videoFilterState.attackTypes].filter(val => attackTypeOpts.some(o => o.value === val))
  );
  videoFilterState.teams = new Set(
    [...videoFilterState.teams].filter(val => getTeamFilterOptions().some(o => o.value === val))
  );
  if (!PREVIOUS_SKILL_OPTIONS.some(opt => opt.value === videoFilterState.prevSkill)) {
    videoFilterState.prevSkill = "any";
  }

  renderDynamicFilter(els.teams, getTeamFilterOptions(), videoFilterState.teams, {
    onChange: handleVideoTeamFilterChange
  });
  if (showBothTeams) {
    const renderSplitFilter = (container, groups, selectedSet) => {
      if (!container) return;
      container.innerHTML = "";
      groups.forEach(group => {
        const groupEl = document.createElement("div");
        groupEl.className = "filter-scope-group";
        const title = document.createElement("div");
        title.className = "filter-scope-title";
        title.textContent = getTeamNameForScope(group.scope);
        const optionsEl = document.createElement("div");
        optionsEl.className = "analysis-filter__options";
        optionsEl.id = `${container.id}-${group.scope}`;
        buildFilterOptions(optionsEl, group.options, selectedSet, { onChange: handleVideoFilterChange });
        groupEl.appendChild(title);
        groupEl.appendChild(optionsEl);
        container.appendChild(groupEl);
      });
    };
    renderSplitFilter(
      els.players,
      [
        { scope: "our", options: playerOptsOur },
        { scope: "opponent", options: playerOptsOpp }
      ],
      videoFilterState.players
    );
    renderSplitFilter(
      els.setters,
      [
        { scope: "our", options: setterOptsOur },
        { scope: "opponent", options: setterOptsOpp }
      ],
      videoFilterState.setters
    );
    toggleFilterVisibility(els.players, playerOpts.length > 0);
    toggleFilterVisibility(els.setters, setterOpts.length > 0);
  } else {
    renderDynamicFilter(els.players, playerOpts, videoFilterState.players, {
      onChange: handleVideoFilterChange
    });
    renderDynamicFilter(els.setters, setterOpts, videoFilterState.setters, {
      onChange: handleVideoFilterChange
    });
  }
  renderDynamicFilter(els.skills, skillOpts, videoFilterState.skills, {
    onChange: handleVideoFilterChange
  });
  renderDynamicFilter(els.codes, codeOpts, videoFilterState.codes, {
    onChange: handleVideoFilterChange
  });
  renderDynamicFilter(els.sets, setOpts, videoFilterState.sets, {
    onChange: handleVideoFilterChange
  });
  renderDynamicFilter(els.rotations, rotOpts, videoFilterState.rotations, {
    onChange: handleVideoFilterChange
  });
  renderDynamicFilter(els.zones, zoneOpts, videoFilterState.zones, {
    onChange: handleVideoFilterChange
  });
  renderDynamicFilter(els.bases, baseOpts, videoFilterState.bases, {
    onChange: handleVideoFilterChange
  });
  renderDynamicFilter(els.setTypes, setTypeOpts, videoFilterState.setTypes, {
    onChange: handleVideoFilterChange
  });
  renderDynamicFilter(els.phases, phaseOpts, videoFilterState.phases, {
    onChange: handleVideoFilterChange
  });
  renderDynamicFilter(els.receiveEvals, recvEvalOpts, videoFilterState.receiveEvaluations, {
    onChange: handleVideoFilterChange
  });
  renderDynamicFilter(els.receiveZones, recvZoneOpts, videoFilterState.receiveZones, {
    onChange: handleVideoFilterChange
  });
  renderDynamicFilter(els.serveTypes, serveTypeOpts, videoFilterState.serveTypes, {
    onChange: handleVideoFilterChange
  });
  renderDynamicFilter(els.attackTypes, attackTypeOpts, videoFilterState.attackTypes, {
    onChange: handleVideoFilterChange
  });

  toggleFilterVisibility(els.prev, true);
  if (els.prev) {
    els.prev.value = videoFilterState.prevSkill || "any";
    if (!els.prev._videoPrevBound) {
      els.prev.addEventListener("change", handleVideoFilterChange);
      els.prev._videoPrevBound = true;
    }
  }

  const visibleFilters = [
    playerOpts.length,
    setterOpts.length,
    skillOpts.length,
    codeOpts.length,
    PREVIOUS_SKILL_OPTIONS.length,
    setOpts.length,
    rotOpts.length,
    zoneOpts.length,
    baseOpts.length,
    setTypeOpts.length,
    phaseOpts.length,
    recvEvalOpts.length,
    recvZoneOpts.length,
    serveTypeOpts.length,
    attackTypeOpts.length
  ];
  if (els.wrap) {
    els.wrap.style.display = visibleFilters.some(Boolean) ? "" : "none";
  }
  toggleFilterVisibility(els.reset, visibleFilters.some(Boolean));
  if (els.reset && !els.reset._videoResetBound) {
    els.reset.addEventListener("click", resetVideoFilters);
    els.reset._videoResetBound = true;
  }
  renderVideoFilterPresets();
}
