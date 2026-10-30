import { session as scoutUiState } from "../state/scout-ui.js";
import { makePlayerKey } from "../teams/selectors.js";
import { listenRuntime, unlistenRuntime } from "../../app/browser-effects.js";

export function bindServeTypeInlineListener(playerIdx, onSelect, scope = "our") {
  const key = makePlayerKey(scope, playerIdx);
  scoutUiState.serveTypeSelectHandlers[key] = onSelect;
  if (scoutUiState.serveTypeInlineHandler) return;
  scoutUiState.serveTypeInlineHandler = e => {
    const key = (e.key || "").toUpperCase();
    if (key !== "F" && key !== "J" && key !== "S") return;
    const activePlayer =
      scoutUiState.serveTypeInlinePlayer !== null ? scoutUiState.serveTypeInlinePlayer : scoutUiState.serveTypeFocusPlayer;
    if (activePlayer === null || activePlayer === undefined) return;
    const handler = scoutUiState.serveTypeSelectHandlers[activePlayer];
    if (typeof handler === "function") {
      handler(key === "J" ? "JF" : key);
    }
  };
  listenRuntime(window, "keydown", scoutUiState.serveTypeInlineHandler);
}
export function setServeTypeFocusPlayer(playerIdx, scope = "our") {
  scoutUiState.serveTypeFocusPlayer = makePlayerKey(scope, playerIdx);
}
export function removeServeTypeInlineKeyListener() {
  if (scoutUiState.serveTypeInlineHandler) {
    unlistenRuntime(window, "keydown", scoutUiState.serveTypeInlineHandler);
    scoutUiState.serveTypeInlineHandler = null;
  }
}
export function clearServeTypeInlineListener() {
  removeServeTypeInlineKeyListener();
  scoutUiState.serveTypeInlinePlayer = null;
  scoutUiState.serveTypeFocusPlayer = null;
  Object.keys(scoutUiState.serveTypeSelectHandlers).forEach(key => {
    delete scoutUiState.serveTypeSelectHandlers[key];
  });
}
