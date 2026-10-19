
import { useViewStore } from "../hooks/useViewStore.js";

import { runtimeStore } from "../state/runtime-store.mjs";

export function TeamCounter({ counter }) {
  const snapshot = useViewStore(runtimeStore);
  return snapshot[counter] ?? 0;
}
