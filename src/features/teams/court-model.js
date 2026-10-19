import { getPlayersForScope } from "./selectors.js";
import { session as matchState } from "../../../js/globals.js";
import { lineup as lineupModel } from "../../domain/lineup.js";

export function ensureCourtShapeFor(court) {
  return lineupModel.ensureCourtShapeFor(court);
}
export function cloneCourtLineup(lineup = matchState.state.court) {
  return lineupModel.cloneCourtLineup(lineup);
}

export function getCourtShape(court) {
  return ensureCourtShapeFor(court);
}

export function cloneCourt(court) {
  return cloneCourtLineup(court);
}

export function getBaseZoneForPlayer(playerIdx, scope = "our") {
  const players = getPlayersForScope(scope);
  if (typeof playerIdx !== "number" || !players || !players[playerIdx])
    return null;
  const court =
    scope === "opponent"
      ? matchState.state.opponentCourt
      : matchState.state.court;
  if (!Array.isArray(court)) return null;
  const name = players[playerIdx];
  const index = court.findIndex(
    (slot) => slot && (slot.main === name || slot.replaced === name),
  );
  return index < 0 ? null : index + 1;
}
