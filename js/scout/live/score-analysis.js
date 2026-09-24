function ensureScoreOverrides() {
  const normalized = normalizeScoreOverrides(state.scoreOverrides || {});
  state.scoreOverrides = normalized;
  return state.scoreOverrides;
}
function getScoreOverrideForSet(setNum) {
  const overrides = ensureScoreOverrides();
  const entry = overrides[setNum] || { for: 0, against: 0 };
  const forVal = Number(entry.for);
  const againstVal = Number(entry.against);
  return {
    for: Number.isFinite(forVal) ? forVal : 0,
    against: Number.isFinite(againstVal) ? againstVal : 0
  };
}
function getScoreOverrideTotals(targetSet = null) {
  if (targetSet !== null && targetSet !== undefined) {
    const setNum = Math.min(5, Math.max(1, parseInt(targetSet, 10) || 1));
    return getScoreOverrideForSet(setNum);
  }
  const overrides = ensureScoreOverrides();
  return Object.keys(overrides || {}).reduce(
    (acc, key) => {
      const setNum = parseInt(key, 10);
      if (!setNum) return acc;
      const entry = getScoreOverrideForSet(setNum);
      acc.for += entry.for;
      acc.against += entry.against;
      return acc;
    },
    { for: 0, against: 0 }
  );
}
function getPointDirection(ev) {
  // Imported score markers award each rally once. Direction is stored for home.
  if (ev && ev.dvwScoreAuthoritative) {
    const direction = ev.pointDirection;
    if (direction !== "for" && direction !== "against") return null;
    return getTeamScopeFromEvent(ev) === "opponent"
      ? (direction === "for" ? "against" : "for") : direction;
  }
  if (ev && ev.pendingBlockEval) return null;
  if (ev && (ev.derivedFromPassServe || ev.derivedFromBlock)) return null;
  if (ev && ev.skillId === "manual" && (ev.pointDirection === "for" || ev.pointDirection === "against")) {
    return ev.pointDirection;
  }
  ensurePointRulesDefaults();
  const skill = ev.skillId;
  const code = ev.code;
  const cfg = normalizePointRule(skill, state.pointRules && state.pointRules[skill]);
  if (cfg.for.includes(code)) return "for";
  if (cfg.against.includes(code)) return "against";
  return null;
}
function getPointDirectionForScope(ev, scope) {
  const dir = getPointDirection(ev);
  if (!dir) return null;
  const eventScope = getTeamScopeFromEvent(ev);
  if (eventScope === scope) return dir;
  return dir === "for" ? "against" : "for";
}
function getEventPointValue(ev) {
  if (!ev || ev.value === undefined || ev.value === null || ev.value === "") return 1;
  const value = Number(ev.value);
  return Number.isFinite(value) ? Math.max(0, value) : 1;
}
function isOpponentErrorPoint(ev) {
  return !!(ev && ev.skillId === "manual" && ev.code === "opp-error");
}
function computePointsSummary(targetSet, options = {}) {
  const includeOverrides = options.includeOverrides !== false;
  const excludeOpponentErrors = !!options.excludeOpponentErrors;
  const teamScope = options.teamScope || "our";
  const sourceEvents = Array.isArray(options.events) ? options.events : state.events || [];
  const target = targetSet ? parseInt(targetSet, 10) : null;
  const rotations = {};
  for (let r = 1; r <= 6; r++) {
    rotations[r] = { for: 0, against: 0 };
  }
  let totalFor = 0;
  let totalAgainst = 0;
  const filteredEvents = sourceEvents.filter(ev => {
    if (target === null) return true;
    return (parseInt(ev && ev.set, 10) || 1) === target;
  });
  filteredEvents.forEach(ev => {
    if (excludeOpponentErrors && isOpponentErrorPoint(ev)) return;
    const direction = state.useOpponentTeam
      ? getPointDirectionForScope(ev, teamScope)
      : getPointDirection(ev);
    if (!direction) return;
    const value = getEventPointValue(ev);
    const rot = ev.rotation && ev.rotation >= 1 && ev.rotation <= 6 ? ev.rotation : 1;
    if (!rotations[rot]) {
      rotations[rot] = { for: 0, against: 0 };
    }
    if (direction === "for") {
      rotations[rot].for += value;
      totalFor += value;
    } else if (direction === "against") {
      rotations[rot].against += value;
      totalAgainst += value;
    }
  });
  const rotationList = Object.keys(rotations).map(key => {
    const rotNum = parseInt(key, 10);
    const obj = rotations[rotNum] || { for: 0, against: 0 };
    const forVal = Math.max(0, obj.for);
    const againstVal = Math.max(0, obj.against);
    return { rotation: rotNum, for: forVal, against: againstVal, delta: forVal - againstVal };
  });
  const overrideTotals = includeOverrides ? getScoreOverrideTotals(target) : { for: 0, against: 0 };
  const totalForClean = Math.max(0, totalFor + overrideTotals.for);
  const totalAgainstClean = Math.max(0, totalAgainst + overrideTotals.against);
  const hasRotationEvents = rotationList.some(r => r.for || r.against);
  const hasEvents = hasRotationEvents || overrideTotals.for !== 0 || overrideTotals.against !== 0;
  const maxDelta = rotationList.reduce((acc, r) => Math.max(acc, r.delta), -Infinity);
  const minDelta = rotationList.reduce((acc, r) => Math.min(acc, r.delta), Infinity);
  const best = hasRotationEvents ? rotationList.find(r => r.delta === maxDelta) : null;
  const worst = hasRotationEvents ? rotationList.find(r => r.delta === minDelta) : null;
  return {
    totalFor: totalForClean,
    totalAgainst: totalAgainstClean,
    rotations: rotationList,
    bestRotation: hasRotationEvents && best ? best.rotation : null,
    worstRotation: hasRotationEvents && worst ? worst.rotation : null,
    bestDelta: hasRotationEvents && best ? best.delta : null,
    worstDelta: hasRotationEvents && worst ? worst.delta : null,
    hasRotationEvents,
    overrideFor: overrideTotals.for,
    overrideAgainst: overrideTotals.against
  };
}
function computeSetScores(teamScope = "our", options = {}) {
  const sourceEvents = Array.isArray(options.events) ? options.events : state.events || [];
  const setMap = {};
  sourceEvents.forEach(ev => {
    const setNum = parseInt(ev.set, 10) || 1;
    const direction =
      state.useOpponentTeam ? getPointDirectionForScope(ev, teamScope) : getPointDirection(ev);
    if (!direction) return;
    const value = getEventPointValue(ev);
    if (!setMap[setNum]) {
      setMap[setNum] = { for: 0, against: 0 };
    }
    if (direction === "for") {
      setMap[setNum].for += value;
    } else if (direction === "against") {
      setMap[setNum].against += value;
    }
  });
  const overrideMap = ensureScoreOverrides();
  Object.keys(overrideMap || {}).forEach(key => {
    const setNum = parseInt(key, 10);
    if (!setNum) return;
    const entry = getScoreOverrideForSet(setNum);
    if (!setMap[setNum]) {
      setMap[setNum] = { for: 0, against: 0 };
    }
    setMap[setNum].for += entry.for;
    setMap[setNum].against += entry.against;
  });
  const sets = Object.keys(setMap)
    .map(k => parseInt(k, 10))
    .sort((a, b) => a - b)
    .map(setNum => {
      const entry = setMap[setNum];
      const forVal = Math.max(0, entry.for);
      const againstVal = Math.max(0, entry.against);
      return { set: setNum, for: forVal, against: againstVal, delta: forVal - againstVal };
    });
  const totalFor = sets.reduce((sum, s) => sum + s.for, 0);
  const totalAgainst = sets.reduce((sum, s) => sum + s.against, 0);
  return { sets, totalFor: Math.max(0, totalFor), totalAgainst: Math.max(0, totalAgainst) };
}
function getSetTrendScopeLabels(scope) {
  const focus = getTeamNameForScope(scope) || (scope === "opponent" ? "Avversarie" : "Noi");
  const opponent = getTeamNameForScope(getOppositeScope(scope)) || (scope === "opponent" ? "Noi" : "Avversarie");
  return { focus, opponent };
}
function getEventTimelineSortValue(ev, fallbackIdx = 0) {
  const time = ev && ev.t ? new Date(ev.t).getTime() : NaN;
  if (Number.isFinite(time)) return time;
  const eventId = ev && typeof ev.eventId === "number" ? ev.eventId : fallbackIdx;
  return eventId;
}
function buildSetTrendGroups(scope = getAnalysisTeamScope()) {
  const sourceEvents = getAnalysisEvents() || [];
  const groups = new Map();
  sourceEvents
    .map((ev, idx) => ({ ev, idx }))
    .filter(({ ev }) => {
      const setNum = normalizeSetNumber(ev && ev.set);
      return setNum !== null && matchesSummarySetFilter(ev);
    })
    .sort((a, b) => {
      const aMatchDate = a.ev && a.ev.analysisMatchDate ? new Date(a.ev.analysisMatchDate).getTime() : NaN;
      const bMatchDate = b.ev && b.ev.analysisMatchDate ? new Date(b.ev.analysisMatchDate).getTime() : NaN;
      if (Number.isFinite(aMatchDate) && Number.isFinite(bMatchDate) && aMatchDate !== bMatchDate) {
        return aMatchDate - bMatchDate;
      }
      const aMatch = (a.ev && (a.ev.analysisMatchKey || a.ev.analysisMatchLabel)) || "";
      const bMatch = (b.ev && (b.ev.analysisMatchKey || b.ev.analysisMatchLabel)) || "";
      if (aMatch !== bMatch) return aMatch.localeCompare(bMatch, "it", { sensitivity: "base" });
      const aSet = normalizeSetNumber(a.ev && a.ev.set) || 1;
      const bSet = normalizeSetNumber(b.ev && b.ev.set) || 1;
      if (aSet !== bSet) return aSet - bSet;
      const timeDiff = getEventTimelineSortValue(a.ev, a.idx) - getEventTimelineSortValue(b.ev, b.idx);
      if (timeDiff !== 0) return timeDiff;
      return a.idx - b.idx;
    })
    .forEach(({ ev, idx }) => {
      const setNum = normalizeSetNumber(ev && ev.set) || 1;
      const matchKey = ev && ev.analysisMatchKey ? ev.analysisMatchKey : "__current__";
      const matchLabel = ev && ev.analysisMatchLabel ? ev.analysisMatchLabel : "";
      const key = `${matchKey}::${setNum}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          setNum,
          matchKey,
          matchLabel,
          title: matchLabel ? `${matchLabel} · Set ${setNum}` : `Set ${setNum}`,
          allEvents: [],
          points: []
        });
      }
      groups.get(key).allEvents.push({ ev, idx });
    });
  const overrideForSingleMatch = group =>
    group.matchKey === "__current__" ? getScoreOverrideForSet(group.setNum) : { for: 0, against: 0 };
  return Array.from(groups.values()).map(group => {
    const override = overrideForSingleMatch(group);
    let scoreFor = Math.max(0, override.for || 0);
    let scoreAgainst = Math.max(0, override.against || 0);
    let diff = scoreFor - scoreAgainst;
    const series = [
      {
        pointKey: `${group.key}::start`,
        x: 0,
        forScore: scoreFor,
        againstScore: scoreAgainst,
        diff,
        label: `${scoreFor}-${scoreAgainst}`,
        tone: "neutral",
        eventIndex: -1,
        allEventIndex: -1,
        ev: null
      }
    ];
    group.allEvents.forEach(({ ev }, eventIdx) => {
      const direction = getPointDirectionFor(scope, ev);
      if (!direction) return;
      const value = getEventPointValue(ev);
      if (direction === "for") scoreFor += value;
      if (direction === "against") scoreAgainst += value;
      diff = scoreFor - scoreAgainst;
      const tone = diff > 0 ? "positive" : diff < 0 ? "negative" : "neutral";
      series.push({
        pointKey: `${group.key}::${eventIdx}`,
        x: series.length,
        forScore: scoreFor,
        againstScore: scoreAgainst,
        diff,
        label: `${scoreFor}-${scoreAgainst}`,
        tone,
        eventIndex: series.length - 1,
        allEventIndex: eventIdx,
        ev
      });
    });
    group.points = series;
    group.final = series[series.length - 1] || series[0];
    group.maxAbs = series.reduce((acc, point) => Math.max(acc, Math.abs(point.diff)), 0);
    return group;
  });
}
function computeSetTrendTickIndexes(points) {
  if (!points || !points.length) return [];
  const maxIdx = points.length - 1;
  const seeds = [0, Math.round(maxIdx * 0.25), Math.round(maxIdx * 0.5), Math.round(maxIdx * 0.75), maxIdx];
  const unique = [];
  seeds.forEach(idx => {
    const safe = Math.max(0, Math.min(maxIdx, idx));
    if (!unique.includes(safe)) unique.push(safe);
  });
  return unique;
}
function getSetTrendEventSkillLabel(ev) {
  if (!ev) return "";
  if (ev.actionType === "timeout") return "Timeout";
  if (ev.actionType === "substitution") return "Cambio";
  const meta = SKILLS.find(skill => skill.id === ev.skillId);
  return meta ? meta.label : ev.skillId || "Evento";
}
function getSetTrendEventActorLabel(ev, scope) {
  if (!ev) return "Squadra";
  const eventScope = getTeamScopeFromEvent(ev);
  const numbers = getPlayerNumbersForScope(eventScope);
  const teamLabel = getTeamNameForScope(eventScope);
  if (ev.code === "team-error" || ev.code === "opp-point" || ev.code === "opp-error") {
    return teamLabel;
  }
  if (ev.playerName) {
    return formatNameWithNumberFor(ev.playerName, numbers);
  }
  return eventScope === scope ? "Squadra" : teamLabel;
}
function getSetTrendEventReasonLabel(ev, scope) {
  if (!ev) return "";
  const direction = getPointDirectionFor(scope, ev);
  const code = normalizeEvalCode(ev.code || ev.evaluation || "");
  const skillLabel = getSetTrendEventSkillLabel(ev);
  if (ev.skillId === "manual") {
    if (ev.code === "opp-error") return "Errore avversario manuale";
    if (ev.code === "opp-point") return "Punto avversario manuale";
    if (ev.code === "team-error") {
      const errorLabel = ev.errorType ? getErrorTypeLabel(ev.errorType) : "errore di squadra";
      return `Errore di squadra${errorLabel ? " · " + errorLabel : ""}`;
    }
    if (ev.code === "error") {
      const errorLabel = ev.errorType ? getErrorTypeLabel(ev.errorType) : "errore";
      return `Errore manuale${errorLabel ? " · " + errorLabel : ""}`;
    }
    return "Override manuale";
  }
  if (direction === "for") {
    return `${skillLabel} ${code || ""}`.trim();
  }
  if (direction === "against") {
    return `${skillLabel} ${code || ""}`.trim();
  }
  if (ev.errorType && (ev.code === "error" || ev.code === "team-error")) {
    return `${skillLabel} · ${getErrorTypeLabel(ev.errorType)}`;
  }
  return `${skillLabel}${code ? " " + code : ""}`.trim();
}
function buildSetTrendScoringHistory(group, selected, scope) {
  if (!group || !selected || selected.allEventIndex < 0) return [];
  const scoringEvents = group.allEvents
    .slice(0, selected.allEventIndex + 1)
    .map((entry, idx) => ({ ev: entry.ev, idx }))
    .filter(({ ev }) => ev && getPointDirectionFor(scope, ev) && !ev.pendingBlockEval && !ev.derivedFromPassServe && !ev.derivedFromBlock);
  const visibleEvents = scoringEvents.slice(-6);
  return visibleEvents.map(({ ev, idx: eventIdx }, idx) => {
    const direction = getPointDirectionFor(scope, ev);
    const isSelectedEvent = eventIdx === selected.allEventIndex;
    return {
      key: getEventKey(ev, eventIdx),
      actor: getSetTrendEventActorLabel(ev, scope),
      skill: getSetTrendEventSkillLabel(ev),
      reason: getSetTrendEventReasonLabel(ev, scope),
      scoreLabel: (() => {
        const point = group.points.find(entry => entry.allEventIndex === eventIdx);
        return point ? point.label : "";
      })(),
      pointLabel: direction === "for" ? "Punto nostro" : direction === "against" ? "Punto avversario" : "",
      tone: direction === "for" ? "pos" : direction === "against" ? "neg" : "neu",
      isScoringEvent: isSelectedEvent
    };
  });
}
function renderSetTrendDetailFromSelection(selectionKey = setTrendSelectionKey) {
  if (!elSetTrendDetail) return;
  const groups = buildSetTrendGroups(getAnalysisTeamScope());
  const group = groups.find(entry => entry.points.some(point => point.pointKey === selectionKey));
  const selected = group ? group.points.find(point => point.pointKey === selectionKey) : null;
  if (!group || !selected || selected.allEventIndex < 0) {
    elSetTrendDetail.innerHTML = '<div class="players-empty">Seleziona un punto del grafico per vedere il dettaglio.</div>';
    return;
  }
  const scope = getAnalysisTeamScope();
  const labels = getSetTrendScopeLabels(scope);
  const detailEvents = buildSetTrendScoringHistory(group, selected, scope);
  const decisiveEvent = detailEvents[detailEvents.length - 1] || null;
  const detailCards = [
    { label: "Punteggio", value: `${selected.forScore} - ${selected.againstScore}` },
    { label: "Delta", value: formatDelta(selected.diff) },
    { label: "Esito punto", value: decisiveEvent ? decisiveEvent.pointLabel || "-" : "-" },
    { label: "Perché", value: decisiveEvent ? decisiveEvent.reason : "-" }
  ];
  const timelineItems = detailEvents.length
    ? detailEvents
        .map(
          item => `<li class="set-trend-detail__event ${item.tone}${item.isScoringEvent ? " is-scoring" : ""}">
            <div class="set-trend-detail__event-main">
              <span class="set-trend-detail__event-actor">${item.actor}</span>
              <span class="set-trend-detail__event-skill">${item.skill}</span>
              ${item.scoreLabel ? `<span class="set-trend-detail__event-score">${item.scoreLabel}</span>` : ""}
            </div>
            <div class="set-trend-detail__event-reason">${item.reason}</div>
            ${item.pointLabel ? `<div class="set-trend-detail__event-point ${item.tone}">${item.pointLabel}</div>` : ""}
          </li>`
        )
        .join("")
    : '<li class="set-trend-detail__event empty">Nessuna azione utile trovata per questo rally.</li>';
  elSetTrendDetail.innerHTML = `
    <div class="set-trend-detail__head">
      <div class="set-trend-detail__title">${group.title}</div>
      <div class="set-trend-detail__score">${labels.focus} ${selected.forScore} - ${selected.againstScore} ${labels.opponent}</div>
    </div>
    <div class="set-trend-detail__summary">
      ${detailCards
        .map(
          card => `<div class="set-trend-detail__card">
            <span class="set-trend-detail__card-label">${card.label}</span>
            <div class="set-trend-detail__card-value">${card.value}</div>
          </div>`
        )
        .join("")}
    </div>
    <div class="set-trend-detail__events-wrap">
      <div class="set-trend-detail__events-title">Ultimi punti che hanno mosso il set</div>
      <ul class="set-trend-detail__events">${timelineItems}</ul>
    </div>
  `;
}
function renderSetTrendChartCard(group) {
  const width = 680;
  const height = 280;
  const pad = { top: 18, right: 14, bottom: 32, left: 42 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const points = group.points || [];
  const maxX = Math.max(1, points.length - 1);
  const maxAbs = Math.max(1, group.maxAbs || 0);
  const xToPx = x => pad.left + (x / maxX) * plotW;
  const yToPx = y => pad.top + (1 - (y + maxAbs) / (maxAbs * 2)) * plotH;
  const yTicks = [];
  for (let value = maxAbs; value >= -maxAbs; value -= Math.max(1, Math.ceil((maxAbs * 2) / 4))) {
    if (!yTicks.includes(value)) yTicks.push(value);
  }
  if (!yTicks.includes(0)) yTicks.push(0);
  yTicks.sort((a, b) => b - a);
  const tickIndexes = computeSetTrendTickIndexes(points);
  const segments = [];
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const next = points[i];
    const tone = next.diff > 0 ? "positive" : next.diff < 0 ? "negative" : "neutral";
    segments.push(
      `<line class="set-trend__segment is-${tone}" x1="${xToPx(prev.x).toFixed(1)}" y1="${yToPx(prev.diff).toFixed(
        1
      )}" x2="${xToPx(next.x).toFixed(1)}" y2="${yToPx(next.diff).toFixed(1)}"></line>`
    );
  }
  const guides = points
    .filter(point => point.ev)
    .map(point => {
      const selected = point.pointKey === setTrendSelectionKey;
      return `<line class="set-trend__guide${selected ? " is-selected" : ""}" data-point-key="${point.pointKey}" x1="${xToPx(
        point.x
      ).toFixed(1)}" y1="${pad.top}" x2="${xToPx(point.x).toFixed(1)}" y2="${(height - pad.bottom).toFixed(1)}"></line>`;
    })
    .join("");
  const dots = points
    .filter(point => point.ev)
    .map(point => {
      const selected = point.pointKey === setTrendSelectionKey;
      return `<circle class="set-trend__dot is-${point.tone}${selected ? " is-selected" : ""}" data-point-key="${
        point.pointKey
      }" cx="${xToPx(point.x).toFixed(1)}" cy="${yToPx(point.diff).toFixed(1)}" r="${selected ? 6 : 4.5}"></circle>`;
    })
    .join("");
  const hoverBands = points
    .filter(point => point.ev)
    .map(point => {
      const idx = point.x;
      const prev = points[idx - 1] || points[0];
      const next = points[idx + 1] || points[points.length - 1];
      const left = idx <= 1 ? xToPx(point.x) - (xToPx(next.x) - xToPx(point.x)) / 2 : (xToPx(prev.x) + xToPx(point.x)) / 2;
      const right =
        idx >= points.length - 1 ? xToPx(point.x) + (xToPx(point.x) - xToPx(prev.x)) / 2 : (xToPx(point.x) + xToPx(next.x)) / 2;
      return `<rect class="set-trend__hit" data-point-key="${point.pointKey}" x="${Math.max(pad.left, left).toFixed(
        1
      )}" y="${pad.top}" width="${Math.max(8, Math.min(width - pad.right, right) - Math.max(pad.left, left)).toFixed(
        1
      )}" height="${plotH.toFixed(1)}"></rect>`;
    })
    .join("");
  const yGrid = yTicks
    .map(
      tick => `<g class="set-trend__tick">
        <line x1="${pad.left}" y1="${yToPx(tick).toFixed(1)}" x2="${width - pad.right}" y2="${yToPx(tick).toFixed(1)}"></line>
        <text x="${pad.left - 8}" y="${(yToPx(tick) + 4).toFixed(1)}" text-anchor="end">${formatDelta(tick)}</text>
      </g>`
    )
    .join("");
  const xTicks = tickIndexes
    .map(idx => {
      const point = points[idx];
      return `<g class="set-trend__tick">
        <line x1="${xToPx(point.x).toFixed(1)}" y1="${height - pad.bottom}" x2="${xToPx(point.x).toFixed(1)}" y2="${
          height - pad.bottom + 6
        }"></line>
        <text x="${xToPx(point.x).toFixed(1)}" y="${height - 8}" text-anchor="middle">${point.label}</text>
      </g>`;
    })
    .join("");
  const card = document.createElement("div");
  card.className = "set-trend-card";
  card.innerHTML = `
    <div class="set-trend-card__head">
      <div class="set-trend-card__title">${group.title}</div>
      <div class="set-trend-card__score">${group.final ? group.final.label : "0-0"}</div>
    </div>
    <div class="set-trend-card__plot">
      <svg viewBox="0 0 ${width} ${height}" class="set-trend-svg" preserveAspectRatio="xMidYMid meet" aria-label="Andamento set">
        <rect class="set-trend__bg" x="0" y="0" width="${width}" height="${height}" rx="12" ry="12"></rect>
        <g class="set-trend__grid">${yGrid}</g>
        <line class="set-trend__zero" x1="${pad.left}" y1="${yToPx(0).toFixed(1)}" x2="${width - pad.right}" y2="${yToPx(0).toFixed(1)}"></line>
        <line class="set-trend__axis" x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}"></line>
        <g class="set-trend__segments">${segments.join("")}</g>
        <g class="set-trend__guides">${guides}</g>
        <g class="set-trend__hits">${hoverBands}</g>
        <g class="set-trend__dots">${dots}</g>
        <g class="set-trend__x-ticks">${xTicks}</g>
        <text class="set-trend__label" x="${pad.left}" y="${pad.top - 4}">Delta punti</text>
      </svg>
      <div class="set-trend-card__tooltip hidden"></div>
    </div>
  `;
  const plot = card.querySelector(".set-trend-card__plot");
  const tooltip = card.querySelector(".set-trend-card__tooltip");
  const syncActivePoint = pointKey => {
    card.querySelectorAll(".set-trend__guide").forEach(guide => {
      guide.classList.toggle("is-hover", !!pointKey && guide.getAttribute("data-point-key") === pointKey);
    });
    card.querySelectorAll(".set-trend__dot").forEach(dot => {
      dot.classList.toggle("is-hover", !!pointKey && dot.getAttribute("data-point-key") === pointKey);
    });
  };
  card.querySelectorAll(".set-trend__hit").forEach(hit => {
    const pointKey = hit.getAttribute("data-point-key");
    const point = points.find(entry => entry.pointKey === pointKey);
    if (!point || !tooltip) return;
    const showTooltip = () => {
      syncActivePoint(pointKey);
      tooltip.innerHTML = `<strong>${point.label}</strong><div>Delta ${formatDelta(point.diff)}</div>`;
      tooltip.classList.remove("hidden");
      const dotX = xToPx(point.x) / width;
      const dotY = yToPx(point.diff) / height;
      const plotRect = plot.getBoundingClientRect();
      requestAnimationFrame(() => {
        const tipRect = tooltip.getBoundingClientRect();
        let left = dotX * plotRect.width + 10;
        if (left + tipRect.width > plotRect.width - 6) left = dotX * plotRect.width - tipRect.width - 10;
        let top = dotY * plotRect.height - tipRect.height - 10;
        if (top < 6) top = dotY * plotRect.height + 10;
        tooltip.style.left = `${Math.max(6, left)}px`;
        tooltip.style.top = `${Math.max(6, top)}px`;
      });
    };
    const hideTooltip = () => {
      tooltip.classList.add("hidden");
      syncActivePoint("");
    };
    hit.addEventListener("mouseenter", showTooltip);
    hit.addEventListener("mouseleave", hideTooltip);
    hit.addEventListener("click", () => {
      setTrendSelectionKey = point.pointKey;
      renderSetTrendAnalysis();
    });
  });
  return card;
}
function renderSetTrendAnalysis() {
  if (!elSetTrendGrid) return;
  if (!isAggSubtabVisible("set-trend")) return;
  const groups = buildSetTrendGroups(getAnalysisTeamScope());
  elSetTrendGrid.innerHTML = "";
  if (!groups.length) {
    elSetTrendGrid.innerHTML = '<div class="players-empty">Registra alcuni eventi per vedere l’andamento del set.</div>';
    setTrendSelectionKey = "";
    renderSetTrendDetailFromSelection("");
    return;
  }
  const validKeys = new Set(groups.flatMap(group => group.points.map(point => point.pointKey)));
  if (!setTrendSelectionKey || !validKeys.has(setTrendSelectionKey)) {
    const fallbackGroup = groups.find(group => group.points.length > 1) || groups[0];
    const fallbackPoint = fallbackGroup.points[fallbackGroup.points.length - 1] || null;
    setTrendSelectionKey = fallbackPoint ? fallbackPoint.pointKey : "";
  }
  groups.forEach(group => {
    elSetTrendGrid.appendChild(renderSetTrendChartCard(group));
  });
  renderSetTrendDetailFromSelection(setTrendSelectionKey);
}
function getPlayByPlayEventCode(ev) {
  if (!ev) return "";
  if (ev.dv && ev.dv.rawCode) return ev.dv.rawCode;
  if (ev.actionType === "timeout") return ev.team === "opponent" ? "aT" : "*T";
  if (ev.actionType === "substitution") return ev.team === "opponent" ? "aCH" : "*CH";
  const prefix = getTeamScopeFromEvent(ev) === "opponent" ? "a" : "*";
  const number = ev.playerNumberAtEvent || "";
  return `${prefix}${number}${getShortSkill(ev.skillId)}${ev.code || ""}`;
}
function getPlayByPlayEventCompact(ev, scope) {
  if (!ev) return "";
  const skill = getSetTrendEventSkillLabel(ev, scope);
  const actor = getSetTrendEventActorLabel(ev, scope);
  const code = getPlayByPlayEventCode(ev);
  const extras = [];
  if (ev.skillId === "attack" && ev.attackType) extras.push(ev.attackType);
  if (ev.skillId === "serve" && ev.serveType) extras.push(ev.serveType);
  if (ev.skillId === "second" && (ev.base || (ev.combination && ev.combination.code))) {
    extras.push(ev.base || ev.combination.code);
  }
  if (ev.dv && (ev.dv.startZone || ev.dv.endZone)) {
    extras.push(`${ev.dv.startZone || "-"}>${ev.dv.endZone || "-"}`);
  }
  return {
    code,
    skill,
    actor,
    extras: extras.join(" · "),
    team: getTeamScopeFromEvent(ev) === "opponent" ? "V" : "H"
  };
}
function getPlayByPlayPhaseLabel(rally, scope) {
  if (!rally || !rally.servingTeam) return "";
  return rally.servingTeam === getTeamNameForScope(scope) ? "BP" : "SO";
}
function ensurePlayByPlayUiState() {
  if (!state.uiPlayByPlay || typeof state.uiPlayByPlay !== "object") {
    state.uiPlayByPlay = { set: "" };
  }
  return state.uiPlayByPlay;
}
function getPlayByPlayActionLabel(ev) {
  if (!ev) return "";
  if (ev.skillId === "attack") {
    return (ev.dv && ev.dv.attackCode) || ev.attackType || (ev.combination && ev.combination.code) || ev.code || "A";
  }
  if (ev.skillId === "serve") return ev.code === "#" ? "ACE" : ev.code === "=" ? "ERR" : ev.serveType || ev.code || "S";
  if (ev.skillId === "pass") return ev.code || "R";
  if (ev.skillId === "second") return ev.base || (ev.combination && ev.combination.code) || ev.code || "E";
  if (ev.skillId === "block") return ev.code === "#" ? "Block" : ev.code || "B";
  if (ev.skillId === "defense") return ev.code || "D";
  if (ev.skillId === "freeball") return ev.code || "F";
  if (ev.actionType === "timeout") return "Timeout";
  if (ev.actionType === "substitution") return "Cambio";
  return ev.code || "";
}
function getPlayByPlayCellKey(ev, rally, focusScope) {
  if (!ev) return null;
  const eventScope = getTeamScopeFromEvent(ev);
  const side = eventScope === focusScope ? "focus" : "opponent";
  if (ev.skillId === "serve" || ev.skillId === "pass") return `${side}Sr`;
  return `${side}Tr`;
}
function getPlayByPlayTone(ev, rally, focusScope) {
  if (!ev) return "neutral";
  const direction = getPointDirectionFor(focusScope, ev);
  if (direction === "for") return "positive";
  if (direction === "against") return "negative";
  if (ev.skillId === "serve" && ev.code === "#") return "ace";
  if ((ev.skillId === "serve" || ev.skillId === "attack") && ev.code === "=") return "error";
  if (ev.code === "#") return "positive";
  if (ev.code === "=" || ev.code === "/") return "negative";
  return "neutral";
}
function getPlayByPlayPlayerNumber(ev) {
  if (!ev) return "";
  if (ev.playerNumberAtEvent !== undefined && ev.playerNumberAtEvent !== null && ev.playerNumberAtEvent !== "") {
    return String(ev.playerNumberAtEvent).replace(/^0+/, "") || "0";
  }
  const numbers = getPlayerNumbersForScope(getTeamScopeFromEvent(ev));
  return ev.playerName && numbers && numbers[ev.playerName] ? String(numbers[ev.playerName]) : "";
}
function getPlayByPlayTooltipHtml(rally, focusScope) {
  const rows = (rally.actions || []).map(entry => {
    const ev = entry.ev;
    const item = getPlayByPlayEventCompact(ev, focusScope);
    const evalLabel = getSetTrendEventReasonLabel(ev, focusScope);
    return `<tr>
      <td>${escapeDvwScoutHtml(getTeamNameForScope(getTeamScopeFromEvent(ev)))}</td>
      <td>${escapeDvwScoutHtml(item.actor || "-")}</td>
      <td>${escapeDvwScoutHtml(item.skill || "-")}</td>
      <td>${escapeDvwScoutHtml(item.extras || getPlayByPlayEventCode(ev) || "-")}</td>
      <td>${escapeDvwScoutHtml(evalLabel || ev.code || "-")}</td>
    </tr>`;
  }).join("");
  return `
    <div class="play-by-play-tooltip__title">
      <span>Point ${rally.rallyNumber} · Set ${rally.setNum}</span>
      <strong>${escapeDvwScoutHtml(rally.startScoreLabel)} → ${escapeDvwScoutHtml(rally.scoreLabel)}</strong>
    </div>
    <table>
      <thead><tr><th>Team</th><th>Player</th><th>Skill</th><th>Code</th><th>Evaluation</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}
function positionPlayByPlayTooltip(root, tooltip, ev) {
  if (!root || !tooltip || !ev) return;
  const gap = 12;
  const margin = 8;
  const tipWidth = tooltip.offsetWidth || 260;
  const tipHeight = tooltip.offsetHeight || 120;
  const maxLeft = Math.max(margin, window.innerWidth - tipWidth - margin);
  const maxTop = Math.max(margin, window.innerHeight - tipHeight - margin);
  let left = ev.clientX + gap;
  let top = ev.clientY + gap;
  if (left > maxLeft) left = ev.clientX - tipWidth - gap;
  if (top > maxTop) top = ev.clientY - tipHeight - gap;
  tooltip.style.left = `${Math.min(maxLeft, Math.max(margin, left))}px`;
  tooltip.style.top = `${Math.min(maxTop, Math.max(margin, top))}px`;
}
function createPlayByPlayTooltip() {
  document.querySelectorAll(".play-by-play-tooltip").forEach(el => el.remove());
  const tooltip = document.createElement("div");
  tooltip.className = "play-by-play-tooltip hidden";
  document.body.appendChild(tooltip);
  return tooltip;
}
function hidePlayByPlayTooltip(tooltip) {
  if (!tooltip) return;
  tooltip.classList.add("hidden");
  tooltip.innerHTML = "";
  tooltip.style.left = "";
  tooltip.style.top = "";
}
function renderPlayByPlaySetSelect(rallies) {
  if (!elAnalysisPlayByPlaySet) return "";
  const ui = ensurePlayByPlayUiState();
  const setNums = Array.from(new Set((rallies || []).map(rally => rally.setNum).filter(Boolean))).sort((a, b) => a - b);
  if (!setNums.length) {
    elAnalysisPlayByPlaySet.innerHTML = "";
    return "";
  }
  if (!ui.set || !setNums.includes(Number(ui.set))) ui.set = String(setNums[0]);
  elAnalysisPlayByPlaySet.innerHTML = setNums.map(setNum => `<option value="${setNum}">Set ${setNum}</option>`).join("");
  elAnalysisPlayByPlaySet.value = String(ui.set);
  if (!elAnalysisPlayByPlaySet.dataset.playByPlayBound) {
    elAnalysisPlayByPlaySet.addEventListener("change", () => {
      ensurePlayByPlayUiState().set = elAnalysisPlayByPlaySet.value || "";
      saveState({ persistLocal: true });
      renderPlayByPlayAnalysis();
    });
    elAnalysisPlayByPlaySet.dataset.playByPlayBound = "1";
  }
  return String(ui.set);
}
function buildPlayByPlayRallies(scope = getAnalysisTeamScope()) {
  const groups = buildSetTrendGroups(scope);
  const rallies = [];
  groups.forEach(group => {
    let previousScoringIndex = -1;
    (group.points || []).forEach(point => {
      if (!point || !point.ev || point.allEventIndex < 0) return;
      const direction = getPointDirectionFor(scope, point.ev);
      if (!direction) return;
      const rallyEntries = group.allEvents
        .slice(previousScoringIndex + 1, point.allEventIndex + 1)
        .map((entry, localIdx) => ({
          ev: entry.ev,
          globalEventIndex: previousScoringIndex + 1 + localIdx
        }))
        .filter(entry => entry.ev);
      previousScoringIndex = point.allEventIndex;
      const scoringEvent = point.ev;
      const serveEntry = rallyEntries.find(entry => entry.ev && entry.ev.skillId === "serve");
      const winnerScope = direction === "for" ? scope : getOppositeScope(scope);
      const winner = getTeamNameForScope(winnerScope);
      const pointValue = typeof scoringEvent.value === "number" && isFinite(scoringEvent.value) ? scoringEvent.value : 1;
      rallies.push({
        key: point.pointKey,
        setNum: group.setNum,
        matchLabel: group.matchLabel || "",
        rallyNumber: rallies.length + 1,
        scoreLabel: point.label,
        startScoreLabel: `${Math.max(0, point.forScore - (direction === "for" ? pointValue : 0))}-${Math.max(0, point.againstScore - (direction === "against" ? pointValue : 0))}`,
        direction,
        winner,
        servingTeam: serveEntry ? getTeamNameForScope(getTeamScopeFromEvent(serveEntry.ev)) : "",
        scoringReason: getSetTrendEventReasonLabel(scoringEvent, scope),
        scoringActor: getSetTrendEventActorLabel(scoringEvent, scope),
        actions: rallyEntries
      });
    });
  });
  return rallies;
}
function renderPlayByPlayAnalysis() {
  if (!elAnalysisPlayByPlay) return;
  if (!isAggSubtabVisible("play-by-play")) return;
  const scope = getAnalysisTeamScope();
  const rallies = buildPlayByPlayRallies(scope);
  elAnalysisPlayByPlay.innerHTML = "";
  if (!rallies.length) {
    document.querySelectorAll(".play-by-play-tooltip").forEach(el => el.remove());
    if (elAnalysisPlayByPlaySummary) elAnalysisPlayByPlaySummary.innerHTML = "";
    elAnalysisPlayByPlay.innerHTML = '<div class="players-empty">Registra o importa eventi con punteggio per vedere il play by play.</div>';
    return;
  }
  const selectedSet = renderPlayByPlaySetSelect(rallies);
  const visibleRallies = selectedSet ? rallies.filter(rally => String(rally.setNum) === String(selectedSet)) : rallies;
  const won = rallies.filter(rally => rally.direction === "for").length;
  const lost = rallies.length - won;
  const avgTouches = rallies.reduce((sum, rally) => sum + rally.actions.length, 0) / rallies.length;
  if (elAnalysisPlayByPlaySummary) {
    elAnalysisPlayByPlaySummary.innerHTML = `
      <span><strong>${rallies.length}</strong> rally</span>
      <span class="positive"><strong>${won}</strong> vinti</span>
      <span class="negative"><strong>${lost}</strong> persi</span>
      <span><strong>${avgTouches.toFixed(1)}</strong> tocchi scoutati/rally</span>
    `;
  }
  const rowsHtml = visibleRallies.map((rally, idx) => {
    const tone = rally.direction === "for" ? "positive" : "negative";
    const phase = getPlayByPlayPhaseLabel(rally, scope);
    const actionTokens = (rally.actions || []).map((entry, actionIdx) => {
      const ev = entry.ev;
      const item = getPlayByPlayEventCompact(ev, scope);
      const actionTone = getPlayByPlayTone(ev, rally, scope);
      const label = getPlayByPlayActionLabel(ev);
      return `<span class="play-by-play-token is-${actionTone}" data-rally-index="${idx}" data-action-index="${actionIdx}">
        <span class="play-by-play-token__idx">${actionIdx + 1}</span>
        <code>${escapeDvwScoutHtml(item.code || label || "-")}</code>
        <span>${escapeDvwScoutHtml(item.actor || "-")}</span>
      </span>`;
    }).join("");
    return `<tr class="play-by-play-row is-${tone}">
      <td class="num">${rally.rallyNumber}</td>
      <td class="score">${escapeDvwScoutHtml(rally.startScoreLabel)}</td>
      <td class="score final">${escapeDvwScoutHtml(rally.scoreLabel)}</td>
      <td>${escapeDvwScoutHtml(rally.servingTeam || "-")}</td>
      <td class="phase">${escapeDvwScoutHtml(phase || "-")}</td>
      <td class="winner">${escapeDvwScoutHtml(rally.winner || "-")}</td>
      <td>${escapeDvwScoutHtml(rally.scoringReason || "-")}</td>
      <td><div class="play-by-play-sequence">${actionTokens || '<span class="play-by-play-token is-neutral">Nessuna azione</span>'}</div></td>
    </tr>`;
  }).join("");
  const tooltipData = visibleRallies.map(rally => getPlayByPlayTooltipHtml(rally, scope));
  elAnalysisPlayByPlay.innerHTML = `
    <div class="play-by-play-table-shell">
      <table class="play-by-play-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Start</th>
            <th>Score</th>
            <th>Servizio</th>
            <th>Fase</th>
            <th>Punto</th>
            <th>Motivo</th>
            <th>Sequenza scout</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
  `;
  const root = elAnalysisPlayByPlay.querySelector(".play-by-play-table-shell");
  const tooltip = root ? createPlayByPlayTooltip() : null;
  if (root && tooltip) {
    root.addEventListener("scroll", () => hidePlayByPlayTooltip(tooltip), { passive: true });
    root.querySelectorAll(".play-by-play-token").forEach(bar => {
      const rallyIdx = parseInt(bar.dataset.rallyIndex, 10);
      const showTooltip = ev => {
        tooltip.innerHTML = tooltipData[rallyIdx] || "";
        tooltip.classList.remove("hidden");
        positionPlayByPlayTooltip(root, tooltip, ev);
      };
      bar.addEventListener("mouseenter", ev => {
        showTooltip(ev);
      });
      bar.addEventListener("mousemove", ev => {
        showTooltip(ev);
      });
      bar.addEventListener("mouseleave", () => {
        hidePlayByPlayTooltip(tooltip);
      });
    });
  }
}
function computePlayerPointsMap(events = state.events || [], scope = "our") {
  const map = {};
  (events || []).forEach(ev => {
    if (typeof ev.playerIdx !== "number") return;
    const dir = state.useOpponentTeam ? getPointDirectionForScope(ev, scope) : getPointDirection(ev);
    if (!dir) return;
    const val = getEventPointValue(ev);
    if (!map[ev.playerIdx]) {
      map[ev.playerIdx] = { for: 0, against: 0 };
    }
    if (dir === "for") {
      map[ev.playerIdx].for += val;
    } else if (dir === "against") {
      map[ev.playerIdx].against += val;
    }
  });
  return map;
}
function computePlayerErrorsMap(events = state.events || []) {
  const map = {};
  (events || []).forEach(ev => {
    const rawIdx = ev && ev.playerIdx;
    const idx =
      typeof rawIdx === "number"
        ? rawIdx
        : typeof rawIdx === "string" && rawIdx.trim() !== ""
          ? parseInt(rawIdx, 10)
          : null;
    if (idx === null || isNaN(idx)) return;
    const val = getEventPointValue(ev);
    const code = ev && ev.code;
    const isErrorButton = code === "error" || code === "team-error";
    const isBlockError = ev.skillId === "block" && code === "/";
    if (!isErrorButton && !isBlockError) return;
    map[idx] = (map[idx] || 0) + Math.max(0, val);
  });
  return map;
}
function computeOpponentErrorsMap(events = state.events || []) {
  const map = {};
  (events || []).forEach(ev => {
    if (!ev || ev.code !== "opp-error") return;
    const rawIdx = ev.playerIdx;
    const idx =
      typeof rawIdx === "number"
        ? rawIdx
        : typeof rawIdx === "string" && rawIdx.trim() !== ""
          ? parseInt(rawIdx, 10)
          : null;
    if (idx === null || isNaN(idx)) return;
    const val = getEventPointValue(ev);
    map[idx] = (map[idx] || 0) + Math.max(0, val);
  });
  return map;
}
function computeOpponentErrorsTotal(events = state.events || []) {
  let total = 0;
  (events || []).forEach(ev => {
    if (!ev || ev.code !== "opp-error") return;
    const val = getEventPointValue(ev);
    total += Math.max(0, val);
  });
  return total;
}
function computePlayerPassAceMap(events = state.events || [], scope = "our") {
  const map = {};
  (events || []).forEach(ev => {
    if (!ev || ev.skillId !== "pass") return;
    const rawIdx = ev.playerIdx;
    const idx =
      typeof rawIdx === "number"
        ? rawIdx
        : typeof rawIdx === "string" && rawIdx.trim() !== ""
          ? parseInt(rawIdx, 10)
          : null;
    if (idx === null || isNaN(idx)) return;
    const direction = getPointDirectionFor(scope, ev);
    if (direction !== "against") return;
    map[idx] = (map[idx] || 0) + getEventPointValue(ev);
  });
  return map;
}
function computeStatsByPlayerForEvents(events, players) {
  const stats = {};
  (events || []).forEach(ev => {
    if (!ev || ev.skillId === "manual" || ev.actionType === "timeout" || ev.actionType === "substitution") {
      return;
    }
    if (typeof ev.playerIdx !== "number" || !players[ev.playerIdx]) return;
    if (!stats[ev.playerIdx]) {
      stats[ev.playerIdx] = {};
    }
    if (!stats[ev.playerIdx][ev.skillId]) {
      stats[ev.playerIdx][ev.skillId] = { "#": 0, "+": 0, "!": 0, "-": 0, "=": 0, "/": 0 };
    }
    stats[ev.playerIdx][ev.skillId][ev.code] =
      (stats[ev.playerIdx][ev.skillId][ev.code] || 0) + 1;
  });
  return stats;
}
function ensureAnalysisStatsCache() {
  const scope = getAnalysisTeamScope();
  if (analysisStatsCache && analysisStatsScope === scope) return analysisStatsCache;
  const players = getPlayersForScope(scope);
  const events = filterEventsByAnalysisTeam();
  analysisStatsCache = computeStatsByPlayerForEvents(events, players);
  analysisStatsScope = scope;
  return analysisStatsCache;
}
function formatDelta(value) {
  if (value === null || value === undefined || isNaN(value)) return "0";
  if (value > 0) return "+" + value;
  return String(value);
}
