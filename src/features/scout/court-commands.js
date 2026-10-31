import { publishLiberoBench, publishScoutCourtView } from "./court-view.js";
import { COURT_CARD_ORDER, getScoutCourtFarSide, buildLiberoBenchModel, prepareScoutCourtData, buildScoutCourtCard, buildScoutCourtBench } from "./court-model.js";
import { captureRects } from "../layout/animation.js";
import { prepareScoutSkillControls } from "./skill-preparation.js";
import { buildPreparedScoutSkillView, createScoutAction } from "./skill-control-model.js";

export function renderLiberoBench() {
  const model = buildLiberoBenchModel();
  const view = Object.fromEntries(
    Object.entries(model).map(([scope, players]) => [
      scope,
      players.map((player) => ({
        ...player,
        action: player.restorePosition !== undefined
          ? createScoutAction("restorePlayerFromLiberoForScope", player.restorePosition, scope)
          : createScoutAction("handleBenchClickForScope", player.name, scope),
      })),
    ]),
  );
  publishLiberoBench(view);
}
export function renderScoutCourt(
  scope,
  { hidden, compact, nextSkillId, animate, effects },
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
      restoreAction: restoreLabel
        ? createScoutAction("restorePlayerFromLiberoForScope", posIndex, scope)
        : null,
      pickAction:
        name && playerIndex !== -1
          ? pointPick
            ? createScoutAction("applyPointForPickedPlayer", scope, playerIndex, name)
            : errorPick
              ? createScoutAction("openErrorModalForPickedPlayer", scope, playerIndex, name)
              : null
          : null,
      skills:
        name && playerIndex !== -1 && !pointPick && !errorPick
          ? buildPreparedScoutSkillView(
              prepareScoutSkillControls(playerIndex, name, {
                nextSkillId: predicted,
                scope,
              }, effects),
            )
          : null,
    });
  });
  const bench = buildScoutCourtBench(data).map(({ name, idx, label }) =>
    Object.freeze({
      name,
      label,
      pickAction: createScoutAction("openErrorModalForPickedPlayer", scope, idx, name),
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
    cancelPickAction: createScoutAction(pointPick ? "stopPointPickMode" : "stopErrorPickMode"),
    teamPointAction: createScoutAction("assignScoutTeamPoint", scope),
    teamErrorAction: createScoutAction("openErrorModal", { scope, teamFromPicker: true }),
  });
}
