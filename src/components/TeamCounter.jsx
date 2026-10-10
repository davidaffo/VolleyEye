import { useSyncExternalStore } from "react";
import { runtimeStore } from "../state/runtime-store.mjs";

export function TeamCounter({ counter }) {
  const snapshot = useSyncExternalStore(
    runtimeStore.subscribe,
    runtimeStore.getSnapshot,
    runtimeStore.getSnapshot,
  );
  return snapshot[counter] ?? 0;
}
