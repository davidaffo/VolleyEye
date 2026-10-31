import { session as matchState } from "../../../js/globals.js";
import { isolation } from "../../domain/isolation.js";

export function captureScoutActionSnapshot() {
  const clone = isolation
    ? isolation.cloneData
    : value => JSON.parse(JSON.stringify(value));
  return clone(matchState.state);
}

export function attachScoutActionSnapshot(event, snapshot) {
  if (!event || !snapshot) return event;
  Object.defineProperty(event, "__undoSnapshot", {
    value: snapshot,
    enumerable: false,
    configurable: true
  });
  return event;
}
