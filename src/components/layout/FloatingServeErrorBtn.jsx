
import { useViewStore } from "../../hooks/useViewStore.js";

import { floatingServeErrorStore } from "../../state/roster-import-store.mjs";
import { actions as appActions } from "../../app/actions.mjs";
export function FloatingServeErrorBtn() {
  const view = useViewStore(floatingServeErrorStore);
  return (
    <button
      id="floating-serve-error-btn"
      className={"floating-serve-error-btn" + (view.visible ? "" : " hidden")}
      type="button"
      aria-label="Battuta errore"
      data-scope={view.scope}
      data-player-idx={view.playerIdx ?? ""}
      data-player-name={view.playerName}
      onClick={() =>
        appActions.recordReactFloatingServeError().catch(console.error)
      }
    >
      =
    </button>
  );
}
