import { buildReactMatchSheetCourt } from "./match-sheet-model.js";

import { session as trajectoryRenderingState } from "../state/analysis-trajectory-rendering.js";
import {
  ensureMatchSheetFiltersState,
  groupMatchSheetTrajectoriesByPlayer,
  getMatchSheetDefenseGroups,
  getMatchSheetSideoutGroups,
  getMatchSheetEvents,
  getMatchSheetPlayers,
  abbreviateMatchSheetName,
  getMatchSheetLineupPlayersForEvents,
  getMatchSheetSideoutTrajectory,
  ensureMatchSheetNotesState,
} from "./match-sheet-model.js";
import { getAnalysisTeamScope } from "./filter-model.js";
import { matchSheetStore } from "../../state/roster-import-store.mjs";
import { buildMatchDisplayName } from "../teams/match-details.js";

import { session as matchState } from "../../../js/globals.js";
import { getTeamNameForScope, getPlayersForScope } from "../teams/selectors.js";

export function publishReactMatchSheet() {
  const scope = getAnalysisTeamScope(),
    filters = ensureMatchSheetFiltersState(),
    serve = groupMatchSheetTrajectoriesByPlayer(scope, "serve"),
    attack = groupMatchSheetTrajectoriesByPlayer(scope, "attack"),
    defense = getMatchSheetDefenseGroups(scope),
    sideout = getMatchSheetSideoutGroups(scope),
    events = getMatchSheetEvents(scope);
  const players = getMatchSheetPlayers(scope).map((player) => ({
    ...player,
    label: abbreviateMatchSheetName(player.name) || "-",
    serve: buildReactMatchSheetCourt(serve[player.idx] || [], {
      variant: "serve",
      noteKey: `player:${player.idx}:serve`,
    }),
    attack: buildReactMatchSheetCourt(attack[player.idx] || [], {
      variant: "attack",
      noteKey: `player:${player.idx}:attack`,
    }),
  }));
  const rotations = [
    ...trajectoryRenderingState.MATCH_SHEET_ROTATION_ORDER,
    ...((sideout.extra || []).length ? ["extra"] : []),
  ];
  matchSheetStore.publish({
    scope,
    matchLabel:
      buildMatchDisplayName(matchState.state.match || {}) ||
      (matchState.state.match && matchState.state.match.opponent) ||
      "Match",
    teamLabel: getTeamNameForScope(scope),
    eventCount: events.length,
    players,
    defense: trajectoryRenderingState.MATCH_SHEET_DEFENSE_ZONES.map((zone) =>
      buildReactMatchSheetCourt(defense[zone] || [], {
        title: `Difesa da Z${zone}`,
        variant: "attack",
        className: "match-sheet-court--defense",
        sourceZone: zone,
        noteKey: `defense:${zone}`,
      }),
    ),
    sideout: rotations.map((rot) => {
      const attackers = getMatchSheetLineupPlayersForEvents(scope, rot),
        trajectories = attackers.flatMap((attacker) =>
          attacker.events.map((ev) => ({
            ...getMatchSheetSideoutTrajectory(ev),
            start: attacker.point,
          })),
        );
      return buildReactMatchSheetCourt(trajectories, {
        title: rot === "extra" ? "CP extra" : `P${rot}`,
        variant: "attack",
        players: attackers,
        playersSide: "far",
        className: "match-sheet-court--sideout",
        fullCourt: true,
        noteKey: `sideout:${rot}`,
      });
    }),
    filters: {
      includeAttackErrors: filters.includeAttackErrors,
      sets: [...(filters.sideoutSets || [])],
      players: [...((filters.sideoutPlayers || {})[scope] || [])],
    },
    sets: [
      ...new Set(events.map((ev) => ev.set).filter((value) => value != null)),
    ].sort((a, b) => a - b),
    roster: getPlayersForScope(scope).map((name, index) => ({ name, index })),
    notes: { ...ensureMatchSheetNotesState() },
  });
}
