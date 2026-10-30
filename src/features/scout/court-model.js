import { POSITIONS_META, session as matchState } from "../../../js/globals.js";
import {
  getTeamNumbers,
  getTeamLiberos,
  getTeamPlayers,
  formatNameWithNumberFor,
  getTeamCourt,
} from "../teams/roster-data.js";
import {
  getUsedNamesForScope,
  getLockedMapForScope,
  getReplacedByLiberosForScope,
  orderLiberosByPreference,
  getAutoRoleDisplayCourt,
} from "../teams/court-state-model.js";
import { ensureCourtShapeFor } from "../teams/court-model.js";
import { getRoleLabelForRotation } from "../teams/roles.js";
import {
  getCaptainsForScope,
  getPlayersForScope,
  getPlayerNumbersForScope,
  getLiberosForScope,
} from "../teams/selectors.js";
import { getPlayerPhotoForScope } from "../teams/player-identity.js";
import {
  getScoutCourtSkill,
  isAnySelectedSkillForScope,
  isSetterPlayerForScope,
} from "../live/flow-model.js";
import {
  isErrorPickModeForScope,
  isPointPickModeForScope,
  getBenchEntriesForScope,
} from "./pick-model.js";

export function buildLiberoBenchModel() {
  const view = {};
  for (const scope of ["our", "opponent"]) {
    const numbers = getTeamNumbers(scope),
      liberos = new Set(getTeamLiberos(scope));
    const used = getUsedNamesForScope(scope),
      locked = getLockedMapForScope(scope);
    const names = orderLiberosByPreference(
      [
        ...new Set([
          ...getTeamPlayers(scope).filter((name) => liberos.has(name)),
          ...getReplacedByLiberosForScope(scope),
        ]),
      ],
      scope,
      numbers,
    );
    const captainSet = new Set(
      getCaptainsForScope(scope).map((name) => name.toLowerCase()),
    );
    view[scope] = names.map((name) => ({
      name,
      used: used.has(name),
      replaced: locked[name] !== undefined,
      className:
        "bench-chip" +
        (liberos.has(name) ? " libero-flag" : " replaced-chip") +
        (used.has(name) || locked[name] !== undefined ? " bench-locked" : ""),
      label:
        formatNameWithNumberFor(name, numbers, { scope, captainSet }) +
        (used.has(name)
          ? " (in campo)"
          : locked[name] !== undefined
            ? " (sost. libero)"
            : ""),
      restorePosition: locked[name],
    }));
  }
  return view;
}

export const COURT_CARD_ORDER = Object.freeze([3, 2, 1, 4, 5, 0]);
export function prepareScoutCourtData(scope, nextSkillId) {
  const players = getPlayersForScope(scope);
  const valid = new Set(players);
  const court = ensureCourtShapeFor(getTeamCourt(scope)).map((slot) => ({
    main: valid.has(slot.main) ? slot.main : "",
    replaced: valid.has(slot.replaced) ? slot.replaced : "",
  }));
  if (scope === "opponent") matchState.state.opponentCourt = court;
  else matchState.state.court = court;
  const mirrored =
    scope === "opponent"
      ? matchState.state.opponentCourtViewMirrored
      : matchState.state.courtViewMirrored;
  const predicted = nextSkillId || getScoutCourtSkill(scope);
  const layoutSkill =
    matchState.state.predictiveSkillFlow && predicted
      ? predicted
      : isAnySelectedSkillForScope(scope, "pass")
        ? "pass"
        : isAnySelectedSkillForScope(scope, "serve")
          ? "serve"
          : null;
  const displayCourt = getAutoRoleDisplayCourt(layoutSkill, scope);
  const numbers = getPlayerNumbersForScope(scope);
  const captainSet = new Set(
    getCaptainsForScope(scope).map((name) => name.toLowerCase()),
  );
  const liberos = new Set(getLiberosForScope(scope));
  const errorPick = isErrorPickModeForScope(scope);
  const pointPick = isPointPickModeForScope(scope);

  return {
    scope,
    players,
    court,
    displayCourt,
    numbers,
    captainSet,
    liberos,
    predicted,
    errorPick,
    pointPick,
    mirrored: !!mirrored,
  };
}
export function buildScoutCourtCard(data, index) {
  const { scope, players, court, displayCourt, numbers, captainSet, liberos } =
    data;
  const info = displayCourt[index] || { slot: { main: "" }, idx: index };
  const slot = info.slot || { main: "" };
  const posIndex = info.idx != null ? info.idx : index;
  const effective = !slot.main && court[index]?.main ? court[index] : slot;
  const name = effective.main;
  const playerIndex = name ? players.indexOf(name) : -1;
  const libero = liberos.has(effective.main);
  const setter = playerIndex >= 0 && isSetterPlayerForScope(scope, playerIndex);
  const photo = name ? getPlayerPhotoForScope(scope, name) : "";
  return Object.freeze({
    index,
    posIndex,
    name,
    playerIndex,
    libero,
    setter,
    photo,
    label: name
      ? formatNameWithNumberFor(name, numbers, {
          scope,
          captainSet,
          compactCourt: true,
        })
      : "—",
    role: getRoleLabelForRotation(
      (posIndex || 0) + 1,
      (scope === "opponent"
        ? matchState.state.opponentRotation
        : matchState.state.rotation) || 1,
    ),
    gridArea: POSITIONS_META[index]?.gridArea,
    restoreLabel:
      libero && effective.replaced ? "Rientra " + effective.replaced : null,
  });
}
export function buildScoutCourtBench({ scope, errorPick, numbers }) {
  return errorPick
    ? getBenchEntriesForScope(scope).map(({ name, idx }) =>
        Object.freeze({
          name,
          idx,
          label: formatNameWithNumberFor(name, numbers, { scope }),
        }),
      )
    : [];
}

export function getScoutCourtFarSide(scope) {
  return scope === "opponent"
    ? !matchState.state.courtSideSwapped
    : !!matchState.state.courtSideSwapped;
}
