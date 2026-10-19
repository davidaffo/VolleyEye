import { getBaseZoneForPlayer } from "../teams/court-model.js";
import { totalFromCounts, formatPercent } from "../../domain/counts.js";
import { computeMetrics } from "./metrics.js";

import {
  getAnalysisEvents,
  matchesTeamFilter,
  matchesAdvancedFilters,
  getSetterFromEvent,
} from "./filter-model.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";
import { normalizeSetTypeValue } from "../../domain/skill-values.js";
import { attachDampCountsByRotation } from "./player-setting-model.js";
import { session as matchState } from "../../../js/globals.js";
import { getTeamScopeFromEvent } from "../teams/selectors.js";
import { emptyCounts } from "../../domain/counts.js";

export function getFilteredSecondEvents() {
  const events = getAnalysisEvents().filter(
    (ev) => ev && ev.skillId === "attack",
  );
  return events.filter((ev) => {
    const traj = ev.attackDirection || ev.attackTrajectory || {};
    const startZone =
      ev.attackStartZone ||
      traj.startZone ||
      ev.zone ||
      ev.playerPosition ||
      null;
    if (
      !matchesTeamFilter(ev, analysisFiltersState.analysisTeamFilterState.teams)
    )
      return false;
    if (
      !matchesAdvancedFilters(ev, analysisFiltersState.secondFilterState, {
        includeSetter: true,
      })
    )
      return false;
    if (analysisFiltersState.secondFilterState.setters.size) {
      const setterIdx = getSetterFromEvent(ev);
      if (
        setterIdx === null ||
        !analysisFiltersState.secondFilterState.setters.has(setterIdx)
      )
        return false;
    }
    if (
      analysisFiltersState.secondFilterState.players.size &&
      !analysisFiltersState.secondFilterState.players.has(ev.playerIdx)
    )
      return false;
    if (
      analysisFiltersState.secondFilterState.sets.size &&
      !analysisFiltersState.secondFilterState.sets.has(ev.set)
    )
      return false;
    if (
      analysisFiltersState.secondFilterState.codes.size &&
      !analysisFiltersState.secondFilterState.codes.has(ev.code)
    )
      return false;
    if (
      analysisFiltersState.secondFilterState.zones.size &&
      !analysisFiltersState.secondFilterState.zones.has(startZone)
    )
      return false;
    return true;
  });
}

export function getFilteredAttacksForSecondDistribution() {
  const all = getFilteredSecondEvents();
  const filtered = all.filter((ev) => {
    const setType = normalizeSetTypeValue(
      ev.setType ||
        (ev.combination && ev.combination.set_type) ||
        (ev.combination && ev.combination.setType),
    );
    return !(setType && setType.toLowerCase() === "damp");
  });
  return attachDampCountsByRotation(filtered, all);
}

export function computeAttackDistribution(
  events = matchState.state.events || [],
) {
  const rotations = {};
  const ensureRot = (rot) => {
    if (!rotations[rot]) {
      rotations[rot] = {
        zones: {
          1: emptyCounts(),
          2: emptyCounts(),
          3: emptyCounts(),
          4: emptyCounts(),
          5: emptyCounts(),
          6: emptyCounts(),
        },
        total: 0,
      };
    }
  };
  for (let r = 1; r <= 6; r++) ensureRot(r);
  ensureRot("all");
  (events || []).forEach((ev) => {
    if (!ev || ev.skillId !== "attack") return;
    let zone = ev.zone;
    if (zone === undefined || zone === null) {
      zone = getBaseZoneForPlayer(ev.playerIdx, getTeamScopeFromEvent(ev));
    }
    if (!zone || zone < 1 || zone > 6) return;
    const rot =
      ev.rotation && ev.rotation >= 1 && ev.rotation <= 6 ? ev.rotation : 1;
    ensureRot(rot);
    ensureRot("all");
    [rot, "all"].forEach((key) => {
      const bucket = rotations[key];
      bucket.total += 1;
      bucket.zones[zone][ev.code] = (bucket.zones[zone][ev.code] || 0) + 1;
    });
  });
  return rotations;
}

export function buildDistributionCards(events, compareEvents = null) {
  const dist = computeAttackDistribution(events),
    compare = Array.isArray(compareEvents)
      ? computeAttackDistribution(compareEvents)
      : null;
  const layout = [
    { key: 4, area: "r4" },
    { key: 3, area: "r3" },
    { key: 2, area: "r2" },
    { key: 5, area: "r5" },
    { key: 6, area: "r6" },
    { key: 1, area: "r1" },
    { key: "all", area: "all" },
  ];
  const cards = layout.map((item) => {
    const data = dist[item.key] || { zones: {}, total: 0 },
      other = compare ? compare[item.key] || { zones: {}, total: 0 } : null,
      total = data.total || 0;
    let bestVolumeZone = null,
      bestVolumeCount = -1,
      bestEffZone = null,
      bestEff = -Infinity;
    Object.keys(data.zones).forEach((key) => {
      const zone = Number(key),
        counts = data.zones[zone] || emptyCounts(),
        count = totalFromCounts(counts),
        eff = computeMetrics(counts, "attack").eff;
      if (count > bestVolumeCount) {
        bestVolumeCount = count;
        bestVolumeZone = zone;
      }
      if (eff !== null && eff > bestEff) {
        bestEff = eff;
        bestEffZone = zone;
      }
    });
    return {
      key: item.key,
      area: item.area,
      title: item.key === "all" ? "Tutte le rotazioni" : "P" + item.key,
      damp: Number(events?.dampByRotation?.[item.key]) || 0,
      zones: [4, 3, 2, 5, 6, 1].map((zone) => {
        const counts = data.zones[zone] || emptyCounts(),
          otherCounts = other
            ? other.zones[zone] || emptyCounts()
            : emptyCounts(),
          count = totalFromCounts(counts),
          otherCount = totalFromCounts(otherCounts),
          metrics = computeMetrics(counts, "attack"),
          otherMetrics = computeMetrics(otherCounts, "attack"),
          percent = total ? Math.round((count / total) * 100) : 0,
          otherPercent =
            other && other.total
              ? Math.round((otherCount / other.total) * 100)
              : null;
        return {
          zone,
          count,
          percent,
          eff: metrics.eff === null ? "-" : formatPercent(metrics.eff),
          className:
            "court-cell" +
            (bestVolumeZone === zone && count > 0 && total > 0
              ? " best-volume"
              : "") +
            (bestEffZone === zone && count > 0 && total > 0 ? " best-eff" : ""),
          mainClass:
            otherPercent !== null && percent !== otherPercent
              ? " player-analysis-compare-value " +
                (percent > otherPercent ? "is-better" : "is-worse")
              : "",
          subClass:
            other &&
            metrics.eff !== null &&
            otherMetrics.eff !== null &&
            metrics.eff !== otherMetrics.eff
              ? " player-analysis-compare-value " +
                (metrics.eff > otherMetrics.eff ? "is-better" : "is-worse")
              : "",
        };
      }),
    };
  });
  return cards;
}
