import { publishLiberoBench, publishScoutCourtView } from "./court-view.js";
import {
  COURT_CARD_ORDER,
  getScoutCourtFarSide,
  buildLiberoBenchModel,
  prepareScoutCourtData,
  buildScoutCourtCard,
  buildScoutCourtBench,
} from "./court-model.js";
import { restorePlayerFromLiberoForScope } from "../teams/court/court-engine.js";
import {
  handleBenchClickForScope,
  captureRects,
} from "../teams/court/court-ui-bootstrap.js";
import {
  applyPointForPickedPlayer,
  openErrorModalForPickedPlayer,
  stopPointPickMode,
  stopErrorPickMode,
  openErrorModal,
} from "../live/live-entry.js";
import { prepareScoutSkillControls } from "./skill-preparation.js";
import { buildPreparedScoutSkillView } from "./skill-control-model.js";
import { handleTeamPoint } from "../live/live-score-and-set.js";
export function renderLiberoBench() {
  const model = buildLiberoBenchModel();
  const view = Object.fromEntries(
    Object.entries(model).map(([scope, players]) => [
      scope,
      players.map((player) => ({
        ...player,
        onClick: () =>
          player.restorePosition !== undefined
            ? restorePlayerFromLiberoForScope(player.restorePosition, scope)
            : handleBenchClickForScope(player.name, scope),
      })),
    ]),
  );
  publishLiberoBench(view);
}
export function renderScoutCourt(
  scope,
  { hidden, compact, nextSkillId, animate },
) {
  if (hidden) {
    publishScoutCourtView(scope, {
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
  const data = prepareScoutCourtData(scope, nextSkillId);
  const { predicted, errorPick, pointPick, mirrored } = data;
  // Build each card and its controls together: control preparation can advance the live flow.
  const cards = COURT_CARD_ORDER.map((index) => {
    const card = buildScoutCourtCard(data, index);
    const { name, playerIndex, posIndex, restoreLabel } = card;
    return Object.freeze({
      ...card,
      onRestore: restoreLabel
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
          ? buildPreparedScoutSkillView(
              prepareScoutSkillControls(playerIndex, name, {
                nextSkillId: predicted,
                scope,
              }),
            )
          : null,
    });
  });
  const bench = buildScoutCourtBench(data).map(({ name, idx, label }) =>
    Object.freeze({
      name,
      label,
      onPick: () => openErrorModalForPickedPlayer(scope, idx, name),
    }),
  );
  publishScoutCourtView(scope, {
    hidden: false,
    compact,
    mirrored,
    previousRects,
    cards: Object.freeze(cards),
    bench: Object.freeze(bench),
    errorPick,
    pointPick,
    far: getScoutCourtFarSide(scope),
    onCancelPick: pointPick ? stopPointPickMode : stopErrorPickMode,
    onTeamPoint: () => {
      handleTeamPoint(scope);
      stopPointPickMode();
    },
    onTeamError: () => openErrorModal({ scope, teamFromPicker: true }),
  });
}
