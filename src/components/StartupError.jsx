
import { useViewStore } from "../hooks/useViewStore.js";

import { runtimeStore } from "../state/runtime-store.mjs";
export function StartupError() {
  const view = useViewStore(runtimeStore);
  return view.startupError ? (
    <div role="alert" className="startup-error">
      Impossibile aprire l’archivio. {view.startupError}
    </div>
  ) : null;
}
