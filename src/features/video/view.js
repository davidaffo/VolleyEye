import { videoViewStore } from "../../state/video-view-store.mjs";
import { session as matchState } from "../../../js/globals.js";

import {
  getVideoOverlayEvent,
  buildVideoOverlayLinesForEvent,
} from "./overlay-model.js";

export function publishReactVideoMobileReview(rows, row, index, filterCount) {
  videoViewStore.publish({
    filterCount,
    resultCount: rows.length,
    previousDisabled: !row || index <= 0,
    nextDisabled: !row || index >= rows.length - 1,
  });
}

export function publishReactVideoOverlay() {
  const visible =
    !!matchState.state.videoPlayByPlay &&
    document.body?.dataset.activeTab === "video";
  const event = visible ? getVideoOverlayEvent() : null;
  const overlay = event ? buildVideoOverlayLinesForEvent(event)[0] || "" : "";
  videoViewStore.publish({ overlay, overlayVisible: !!overlay });
}
