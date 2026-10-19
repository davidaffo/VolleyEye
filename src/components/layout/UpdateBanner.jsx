
import { useViewStore } from "../../hooks/useViewStore.js";
import { useLayoutEffect, useRef } from "react";
import { updateBannerStore } from "../../state/roster-import-store.mjs";
export function UpdateBanner() {
  const view = useViewStore(updateBannerStore),
    root = useRef(null);
  useLayoutEffect(() => {
    const update = () =>
      document.documentElement.style.setProperty(
        "--update-banner-offset",
        `${view.visible ? root.current?.getBoundingClientRect().height || 0 : 0}px`,
      );
    update();
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(root.current);
    return () => observer?.disconnect();
  }, [view.visible, view.message]);
  return (
    <div
      id="update-banner"
      ref={root}
      className={"update-banner" + (view.visible ? "" : " hidden")}
      role="status"
      aria-live="polite"
    >
      <span className="update-banner-text">{view.message}</span>
      <div className="update-banner-actions">
        <button
          id="update-banner-refresh"
          className="small"
          onClick={() => view.refresh?.()}
        >
          Aggiorna
        </button>
        <button
          id="update-banner-dismiss"
          className="small secondary"
          onClick={() => view.dismiss?.()}
        >
          Chiudi
        </button>
      </div>
    </div>
  );
}
