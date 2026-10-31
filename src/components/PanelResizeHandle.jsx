
import { useViewStore } from "../hooks/useViewStore.js";

import { runtimeStore } from "../state/runtime-store.mjs";
import { events as appEvents } from "../app/actions.mjs";
const panelHandles = {
  left: ['scout-resize-left', 'scout-column-resizer', 'Ridimensiona colonna partita'],
  right: ['scout-resize-right', 'scout-column-resizer', 'Ridimensiona colonna log'],
  scoutHeight: ['video-scout-resize-handle', 'video-resize-handle', 'Ridimensiona altezza video scout'],
  analysisHeight: ['video-analysis-resize-handle', 'video-resize-handle', 'Ridimensiona altezza video'],
};
export function PanelResizeHandle({ panel, ...props }) {
  const view = useViewStore(runtimeStore);
  const [id, className, label] = panelHandles[panel];
  const column = panel === 'left' || panel === 'right';
  return (
    <button
      type="button" id={id} className={className} aria-label={label}
      role={column ? 'separator' : undefined} aria-orientation={column ? 'vertical' : undefined}
      title={column ? 'Trascina per ridimensionare. Doppio clic per ripristinare.' : 'Trascina per ridimensionare. Doppio clic per ripristinare.'}
      {...props}
      disabled={panel !== "analysisHeight" && !!view.scoutControlsDisabled}
      onPointerDown={(event) =>
        appEvents.resizeReactPanel(panel,
          "start",
          event.nativeEvent,
        )
      }
      onDoubleClick={(event) =>
        appEvents.resizeReactPanel(panel,
          "reset",
          event.nativeEvent,
        )
      }
      onKeyDown={(event) =>
        appEvents.resizeReactPanel(panel, "key", event.nativeEvent)
      }
    />
  );
}
