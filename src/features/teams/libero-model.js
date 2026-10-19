import { getTeamLiberos } from './roster-data.js';

import { ensureCourtShapeFor } from './court-model.js';

export function removeLiberosAndRestoreForScope(baseCourt, scope = "our") {
  const shaped = ensureCourtShapeFor(baseCourt).map(slot => Object.assign({}, slot));
  shaped.forEach((slot, idx) => {
    if (isLiberoForScope(slot.main, scope)) {
      if (slot.replaced) {
        shaped[idx] = { main: slot.replaced, replaced: "" };
      } else {
        shaped[idx] = { main: "", replaced: "" };
      }
    } else if (slot.replaced) {
      shaped[idx] = { main: slot.main || "", replaced: "" };
    }
  });
  return shaped;
}

export function isLiberoForScope(name, scope = "our") {
  if (!name) return false;
  return getTeamLiberos(scope).includes(name);
}
