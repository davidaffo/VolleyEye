import { listenRuntime } from "../../app/browser-effects.js";
import { shouldSuppressClick } from "../live/lineup-editor.js";

export function bindScoreAndSetControls() {
  listenRuntime(document, "click", event => shouldSuppressClick(event), true);
}
