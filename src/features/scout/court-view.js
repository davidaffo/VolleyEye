import { POSITIONS_META } from "../../../js/globals.js";
import { getTeamNumbers, getTeamLiberos, getTeamPlayers, formatNameWithNumberFor, getTeamCourt } from "../teams/roster-data.js";
import { getUsedNamesForScope, getLockedMapForScope, getReplacedByLiberosForScope, restorePlayerFromLiberoForScope } from "../teams/court/court-engine.js";
import { ensureCourtShapeFor } from "../teams/court-model.js";
import { orderLiberosByPreference, handleBenchClickForScope, captureRects } from "../teams/court/court-ui-bootstrap.js";
import { getRoleLabelForRotation } from "../teams/roles.js";
import { getCaptainsForScope, getPlayersForScope, getPlayerNumbersForScope, getLiberosForScope } from "../teams/selectors.js";
import { getPlayerPhotoForScope } from "../teams/player-identity.js";
import { liberoBenchStore } from "../../state/roster-import-store.mjs";
import { scoutCourtStore } from "../../state/scout-court-store.mjs";
import { session as matchState } from "../../../js/globals.js";
import { getScoutCourtSkill } from "../live/team-rendering.js";
import { isAnySelectedSkillForScope, isSetterPlayerForScope } from "../live/flow-model.js";
import { getAutoRoleDisplayCourt } from "../live/team-management.js";
import { isErrorPickModeForScope, isPointPickModeForScope, applyPointForPickedPlayer, openErrorModalForPickedPlayer, getBenchEntriesForScope, stopPointPickMode, stopErrorPickMode, openErrorModal } from "../live/live-entry.js";
import { buildScoutSkillView } from "../live/court-view-model.js";
import { handleTeamPoint } from "../live/live-score-and-set.js";

export function publishLiberoBench() {
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
      onClick: () =>
        locked[name] !== undefined
          ? restorePlayerFromLiberoForScope(locked[name], scope)
          : handleBenchClickForScope(name, scope),
    }));
  }
  liberoBenchStore.publish(view);
}

export function publishScoutCourtView(
  scope,
  { hidden, compact, nextSkillId, animate },
) {
  if (hidden) {
    scoutCourtStore.publish(scope, {
      hidden: true,
      cards: Object.freeze([]),
      bench: Object.freeze([]),
    });
    return;
  }
  const selector = `.court-card[data-team-scope="${scope}"]`;
  const animationKey = (element) =>
    element.dataset.playerName || "pos-" + (element.dataset.posIndex || "");
  const previousRects = animate ? captureRects(selector, animationKey) : null;
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
  const cards = [3, 2, 1, 4, 5, 0].map((index) => {
    const info = displayCourt[index] || { slot: { main: "" }, idx: index };
    const slot = info.slot || { main: "" };
    const posIndex = info.idx != null ? info.idx : index;
    const effective = !slot.main && court[index]?.main ? court[index] : slot;
    const name = effective.main;
    const playerIndex = name ? players.indexOf(name) : -1;
    const libero = liberos.has(effective.main);
    const setter =
      playerIndex >= 0 && isSetterPlayerForScope(scope, playerIndex);
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
      role:
        (getRoleLabelForRotation(
              (posIndex || 0) + 1,
              (scope === "opponent"
                ? matchState.state.opponentRotation
                : matchState.state.rotation) || 1,
            )),
      gridArea: POSITIONS_META[index]?.gridArea,
      restoreLabel:
        libero && effective.replaced ? "Rientra " + effective.replaced : null,
      onRestore:
        libero && effective.replaced
          ? () => restorePlayerFromLiberoForScope(posIndex, scope)
          : null,
      onPick:
        name && playerIndex !== -1
          ? pointPick
            ? () => applyPointForPickedPlayer(scope, playerIndex, name)
            : errorPick
              ? () => openErrorModalForPickedPlayer(scope, playerIndex, name)
              : null
          : null,
      skills:
        name && playerIndex !== -1 && !pointPick && !errorPick
          ? buildScoutSkillView(playerIndex, name, {
              nextSkillId: predicted,
              scope,
            })
          : null,
    });
  });
  const bench = errorPick
    ? getBenchEntriesForScope(scope).map(({ name, idx }) =>
        Object.freeze({
          name,
          label: formatNameWithNumberFor(name, numbers, { scope }),
          onPick: () => openErrorModalForPickedPlayer(scope, idx, name),
        }),
      )
    : [];
  scoutCourtStore.publish(scope, {
    hidden: false,
    compact,
    mirrored: !!mirrored,
    previousRects,
    cards: Object.freeze(cards),
    bench: Object.freeze(bench),
    errorPick,
    pointPick,
    far:
      scope === "opponent" ? !matchState.state.courtSideSwapped : !!matchState.state.courtSideSwapped,
    onCancelPick: pointPick ? stopPointPickMode : stopErrorPickMode,
    onTeamPoint: () => {
      handleTeamPoint(scope);
      stopPointPickMode();
    },
    onTeamError: () => openErrorModal({ scope, teamFromPicker: true }),
  });
}
