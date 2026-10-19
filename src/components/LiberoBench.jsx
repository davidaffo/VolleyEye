
import { useEffect, useRef } from "react";
import { useViewStore } from "../hooks/useViewStore.js";
import { liberoBenchStore } from "../state/roster-import-store.mjs";
import { events as appEvents } from "../app/actions.mjs";

export function LiberoBench({ scope }) {
  const players = useViewStore(liberoBenchStore)[scope],
    root = useRef(null);
  useEffect(() => {
    const element = root.current;
    const start = (event) => {
      const chip = event.target.closest("[data-player-name]");
      if (chip?.draggable && element.contains(chip))
        appEvents.handleBenchTouchStart(event,
          chip.dataset.playerName,
          scope,
        );
    };
    element.addEventListener("touchstart", start, { passive: false });
    return () => element.removeEventListener("touchstart", start);
  }, [scope]);
  return (
    <div
      ref={root}
      id={
        scope === "opponent" ? "libero-tags-inline-opp" : "libero-tags-inline"
      }
      className="libero-tags"
    >
      {players.length ? (
        players.map((player) => (
          <div
            key={player.name}
            className={player.className}
            data-player-name={player.name}
            data-team-scope={scope}
            draggable={!player.used && !player.replaced}
            aria-disabled={player.used ? "true" : undefined}
            onClick={player.used ? undefined : player.onClick}
            onDragStart={(event) =>
              appEvents.handleBenchDragStart(event)
            }
            onDragEnd={() => appEvents.handleBenchDragEnd()}
            onPointerDown={
              player.used || player.replaced
                ? undefined
                : (event) =>
                    appEvents.handleBenchPointerDown(event,
                      player.name,
                      scope,
                    )
            }
          >
            <span>{player.label}</span>
          </div>
        ))
      ) : (
        <span className="bench-empty">Nessun libero disponibile.</span>
      )}
    </div>
  );
}
