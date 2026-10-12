import { useSyncExternalStore } from "react";
import { runtimeStore } from "../state/runtime-store.mjs";
export function StartupError() {
  const view = useSyncExternalStore(
    runtimeStore.subscribe,
    runtimeStore.getSnapshot,
    runtimeStore.getSnapshot,
  );
  return view.startupError ? (
    <div role="alert" className="startup-error">
      Impossibile aprire l’archivio. {view.startupError}
    </div>
  ) : null;
}
