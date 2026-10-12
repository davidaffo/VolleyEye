import { useSyncExternalStore } from "react";
import { runtimeStore } from "../state/runtime-store.mjs";
import { invokeRuntimeEvent } from "../compat/runtime.js";
export function PanelResizeHandle({ panel, ...props }) {
  const view = useSyncExternalStore(
    runtimeStore.subscribe,
    runtimeStore.getSnapshot,
    runtimeStore.getSnapshot,
  );
  return (
    <button
      {...props}
      data-react-managed="true"
      disabled={panel !== "analysisHeight" && !!view.scoutControlsDisabled}
      onPointerDown={(event) =>
        invokeRuntimeEvent(
          "resizeReactPanel",
          panel,
          "start",
          event.nativeEvent,
        )
      }
      onDoubleClick={(event) =>
        invokeRuntimeEvent(
          "resizeReactPanel",
          panel,
          "reset",
          event.nativeEvent,
        )
      }
      onKeyDown={(event) =>
        invokeRuntimeEvent("resizeReactPanel", panel, "key", event.nativeEvent)
      }
    />
  );
}
