import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { courtPlacementStore } from "../state/roster-import-store.mjs";
import { createPortal } from "react-dom";

// Keep one portal container per dialog so changing court/popup placement never
// remounts its controls or invalidates the media/gesture service references.
export function CourtModalPortal({ children }) {
  const anchor = useRef(null);
  const placement = useSyncExternalStore(
    courtPlacementStore.subscribe,
    courtPlacementStore.getSnapshot,
    courtPlacementStore.getSnapshot,
  );
  const [host] = useState(() => {
    if (typeof document === "undefined") return null;
    const element = document.createElement("div");
    element.dataset.courtModalHost = "true";
    element.style.display = "contents";
    return element;
  });
  useLayoutEffect(() => {
    if (!host || !anchor.current) return;
    const parent = anchor.current.parentElement;
    host.__originalParent = parent;
    parent.insertBefore(host, anchor.current);
    return () => host.remove();
  }, [host]);
  useLayoutEffect(() => {
    if (!host || !host.__originalParent) return;
    const modal = host.firstElementChild;
    if (!modal) return;
    const useCourt =
      placement.useCourt && !placement.popupIds.includes(modal.id);
    const target = useCourt
      ? document.getElementById("court-overlay")
      : host.__originalParent;
    if (target && host.parentElement !== target) target.appendChild(host);
    modal.classList.toggle("court-modal", useCourt);
    Object.assign(modal.style, {
      position: useCourt ? "absolute" : "",
      inset: useCourt ? "0" : "",
      width: useCourt ? "100%" : "",
      height: useCourt ? "100%" : "",
      padding: useCourt ? "0" : "",
      overflow: useCourt ? "hidden" : "",
    });
  }, [host, placement]);
  if (!host) return children;
  return (
    <>
      <span ref={anchor} hidden aria-hidden="true" />
      {createPortal(children, host)}
    </>
  );
}
