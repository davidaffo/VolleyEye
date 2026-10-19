
import { events as appEvents } from "../app/actions.mjs";
export function ScoutWidgetHandle({ label }) {
  return (
    <button
      type="button"
      className="scout-widget-handle"
      draggable={false}
      title="Trascina per spostare"
      aria-label={"Sposta " + label}
      onPointerDown={(event) =>
        appEvents.handleScoutWidgetPointerDown(event,
          event.currentTarget.parentElement,
        )
      }
      onKeyDown={(event) =>
        appEvents.moveScoutWidgetWithKeyboard(event,
          event.currentTarget.parentElement,
        )
      }
    >
      ⠿
    </button>
  );
}
