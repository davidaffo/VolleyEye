import { createDomainState } from "../../app/domain-state.mjs";

export const session = createDomainState({
"videoObjectUrl": () => (""),
"videoLocalFile": () => (null),
"ytPlayer": () => (null),
"ytApiPromise": () => (null),
"ytPlayerReady": () => (false),
"currentYoutubeId": () => (""),
"youtubeFallback": () => (false),
"pendingYoutubeSeek": () => (null),
"ytPlayerScout": () => (null),
"ytPlayerScoutReady": () => (false),
"currentYoutubeIdScout": () => (""),
"youtubeScoutFallback": () => (false),
"lastVideoSnapshotMs": () => (0),
"videoSnapshotTimer": () => (null),
"playByPlayTimer": () => (null),
"playByPlayState": () => ({
  active: false,
  index: -1,
  key: null,
  endTime: null,
  endAtMs: null
}),
"bulkEditActive": () => (false),
"bulkEditSession": () => (null),
"videoUndoStack": () => ([]),
"VIDEO_UNDO_LIMIT": () => (30),
"BASE_KEY_MAP": () => ({
  "1": "K1",
  "2": "K2",
  C: "KC",
  B: "KB",
  "7": "K7",
  F: "KF"
}),
"baseModalTargetEvents": () => ([]),
"setterModalTargetEvents": () => ([]),
"ATTACK_TYPE_KEY_MAP": () => ({
  R: "Regolare",
  P: "Pallonetto",
  Z: "Piazzata",
  S: "Spinta"
}),
"attackTypeModalTargetEvents": () => ([]),
"BLOCK_NUMBER_KEY_MAP": () => ({
  "0": 0,
  "1": 1,
  "2": 2,
  "3": 3
}),
"blockNumberModalTargetEvents": () => ([])
});
const workspaceLayoutState = session;
