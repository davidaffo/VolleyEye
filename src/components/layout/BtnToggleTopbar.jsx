import { useSyncExternalStore } from "react";
import { runtimeStore } from "../../state/runtime-store.mjs";
import { invokeRuntime } from "../../compat/runtime.js";
export function BtnToggleTopbar() {
  const view = useSyncExternalStore(
      runtimeStore.subscribe,
      runtimeStore.getSnapshot,
      runtimeStore.getSnapshot,
    ),
    label = view.topbarHidden ? "Mostra barra" : "Nascondi barra";
  return (
    <button
      id="btn-toggle-topbar"
      className="topbar-toggle-btn"
      type="button"
      data-react-managed="true"
      aria-label={label}
      title={label}
      aria-pressed={!!view.topbarHidden}
      onClick={() => invokeRuntime("toggleReactTopbar").catch(console.error)}
    >
      {view.topbarHidden ? "▾" : "▴"}
    </button>
  );
}
