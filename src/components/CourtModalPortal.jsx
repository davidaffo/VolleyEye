import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Keep one portal container per dialog so changing court/popup placement never
// remounts its controls or invalidates the media/gesture service references.
export function CourtModalPortal({ children }) {
  const anchor = useRef(null);
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
  if (!host) return children;
  return (
    <>
      <span ref={anchor} hidden aria-hidden="true" />
      {createPortal(children, host)}
    </>
  );
}
