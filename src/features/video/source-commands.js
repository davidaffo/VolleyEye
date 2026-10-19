import { mobileVideoSourceStore } from "../../state/roster-import-store.mjs";
import { parseYoutubeId } from "./timing.js";
import { handleYoutubeUrlLoad, openLocalVideoPicker } from "./video-sources.js";
import { session as matchState } from "../../../js/globals.js";

export function loadReactMobileYoutube() {
  const url = mobileVideoSourceStore.getSnapshot().url,
    id = parseYoutubeId(url);
  if (!id) {
    alert("Inserisci un link YouTube valido.");
    return;
  }
  handleYoutubeUrlLoad(url);
}

export function openReactLocalVideoPicker() {
  return openLocalVideoPicker(matchState.elVideoFileInput);
}
