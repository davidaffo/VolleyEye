import { listenRuntime } from "../../app/browser-effects.js";
import { shouldSuppressClick } from "../layout/modals.js";

export function bindScoreAndSetControls() {
  listenRuntime(document, "click", event => shouldSuppressClick(event), true);
}
