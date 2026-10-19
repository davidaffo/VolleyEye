import { attackShortcutStore } from "../../state/attack-shortcut-store.mjs";
import { getPlayersForScope, getPlayerNumbersForScope, getLiberosForScope } from "../teams/selectors.js";
import { ensureCourtShapeFor } from "../teams/court-model.js";
import { session as matchState } from "../../../js/globals.js";
import { formatNameWithNumberFor, formatNameWithNumber } from "../teams/roster-data.js";
import { isSetterPlayerForScope } from "../live/flow-model.js";

export function setAttackShortcutOpen(kind, open) {
  attackShortcutStore.publish({ [kind]: open });
}

export function getAttackShortcutOpen(id) {
  const kind = {
    "base-modal": "base",
    "attack-setter-modal": "setter",
    "attack-type-modal": "type",
    "block-number-modal": "block",
  }[id];
  return !!attackShortcutStore.getSnapshot()[kind];
}

export function publishAttackSetterOptions(scope, setterIndex) {
  const players = getPlayersForScope(scope),
    numbers = getPlayerNumbersForScope(scope),
    liberos = new Set(getLiberosForScope(scope));
  const shaped = ensureCourtShapeFor(
      scope === "opponent" ? matchState.state.opponentCourt : matchState.state.court,
    ),
    inCourt = new Set();
  shaped.forEach((slot) => {
    if (slot.main) inCourt.add(slot.main);
    if (slot.replaced) inCourt.add(slot.replaced);
  });
  if (document.body.dataset.activeTab === "video")
    liberos.forEach((name) => {
      if (name) inCourt.add(name);
    });
  const options = [
    Object.freeze({ index: null, label: "—", className: "base-modal-btn" }),
  ];
  players.forEach((name, index) => {
    if (!inCourt.has(name)) return;
    options.push(
      Object.freeze({
        index,
        label:
          (scope === "opponent"
            ? formatNameWithNumberFor(name, numbers)
            : formatNameWithNumber(name)) ||
          name ||
          "Giocatrice " + (index + 1),
        className:
          "base-modal-btn" +
          (liberos.has(name) ? " player-role-libero" : "") +
          (isSetterPlayerForScope(scope, index) ? " player-role-setter" : "") +
          (index === setterIndex ? " active" : ""),
      }),
    );
  });
  attackShortcutStore.publish({ setters: Object.freeze(options) });
}
