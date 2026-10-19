
export function getEventKey(ev, fallbackIdx = 0) {
  if (!ev) return "ev-" + fallbackIdx;
  if (typeof ev.eventId === "number" || typeof ev.eventId === "string") return ev.eventId;
  if (!ev.__tmpKey) {
    ev.__tmpKey = "tmp-" + (ev.t || Date.now()) + "-" + fallbackIdx;
  }
  return ev.__tmpKey;
}
