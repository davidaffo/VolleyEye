import { session as matchState } from "../../../js/globals.js";

export function captureScoutActionSnapshot({ includeSetState = false } = {}) {
  // Una ricevuta contiene solo lo stato di gioco, mai storico, archivi o video.
  const keys = [
    "currentSet", "rotation", "opponentRotation", "isServing", "matchFinished",
    "court", "opponentCourt", "courtSideSwapped", "autoRotatePending",
    "opponentAutoRotatePending", "autoRoleBaseCourt", "opponentAutoRoleBaseCourt",
    "liberoAutoMap", "opponentLiberoAutoMap", "preferredLibero", "opponentPreferredLibero",
    "pendingServe", "freeballPending", "freeballPendingScope", "flowTeamScope"
  ];
  if (includeSetState) keys.push(
    "setResults", "setStarts", "skillClock", "videoClock",
    "matchEndSetSnapshot", "matchEndSetRecorded"
  );
  const before = {};
  const missing = [];
  keys.forEach(key => {
    if (matchState.state[key] === undefined) missing.push(key);
    else before[key] = matchState.state[key];
  });
  const events = matchState.state.events || [];
  return JSON.parse(JSON.stringify({
    version: 1,
    eventCount: events.length,
    previousEventId: events.length ? events[events.length - 1].eventId ?? null : null,
    before,
    missing
  }));
}

export function attachScoutActionSnapshot(event, snapshot) {
  if (!event || !snapshot) return event;
  // Identifica gli eventi dell'operazione: il log può ricevere inserimenti
  // dall'analisi anche tra due eventi già registrati.
  if (event.eventId != null) {
    snapshot.actionEventIds = Array.from(new Set((matchState.state.events || []).slice(snapshot.eventCount)
      .concat(event).map(item => item && item.eventId).filter(id => id != null)));
  }
  // Il dato enumerabile sopravvive a JSON, IndexedDB e archivio partite.
  event.undoState = snapshot;
  Object.defineProperty(event, "__undoSnapshot", {
    value: snapshot,
    enumerable: false,
    configurable: true
  });
  return event;
}
