
import { useViewStore } from "../../hooks/useViewStore.js";

import { runtimeStore } from "../../state/runtime-store.mjs";
import { actions as appActions } from "../../app/actions.mjs";
export function BtnToggleTopbar() {
  const view = useViewStore(runtimeStore),
    label = view.topbarHidden ? "Mostra barra" : "Nascondi barra";
  return (
    <button
      id="btn-toggle-topbar"
      className="topbar-toggle-btn"
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={!!view.topbarHidden}
      onClick={() => appActions.toggleReactTopbar().catch(console.error)}
    >
      {view.topbarHidden ? "▾" : "▴"}
    </button>
  );
}
