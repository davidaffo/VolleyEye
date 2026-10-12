import { useSyncExternalStore } from "react";
import { floatingServeErrorStore } from "../../state/roster-import-store.mjs";
import { invokeRuntime } from "../../compat/runtime.js";
export function FloatingServeErrorBtn() {
  const view = useSyncExternalStore(
    floatingServeErrorStore.subscribe,
    floatingServeErrorStore.getSnapshot,
    floatingServeErrorStore.getSnapshot,
  );
  return (
    <button
      id="floating-serve-error-btn"
      data-react-managed="true"
      className={"floating-serve-error-btn" + (view.visible ? "" : " hidden")}
      type="button"
      aria-label="Battuta errore"
      data-scope={view.scope}
      data-player-idx={view.playerIdx ?? ""}
      data-player-name={view.playerName}
      onClick={() =>
        invokeRuntime("recordReactFloatingServeError").catch(console.error)
      }
    >
      =
    </button>
  );
}
