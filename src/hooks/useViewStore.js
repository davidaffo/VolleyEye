import { useSyncExternalStore } from "react";

// Every view store uses the same subscription and server-rendering contract.
export function useViewStore(store) {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot || store.getSnapshot,
  );
}
