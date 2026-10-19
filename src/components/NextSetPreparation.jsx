import { RotationControls } from './ui/RotationControls.jsx';
import { useLineupInteractions } from "../hooks/useLineupInteractions.js";
import { LineupSlot, LineupChip } from "./ui/LineupPlayer.jsx";

import { useViewStore } from "../hooks/useViewStore.js";
import { useRef } from "react";
import { nextSetStore } from "../state/next-set-store.mjs";
import { actions as appActions } from "../app/actions.mjs";
function run(command, ...args) {
  return appActions[command]( ...args).catch((error) => {
    console.error("Preparazione set non riuscita", error);
    window.alert(error.message);
  });
}
const emptyTeam = {
  name: "",
  rotation: 1,
  court: [],
  bench: [],
  liberos: [],
  preferredLibero: "",
  hasDefaults: false,
};
function NextSetTeam({ scope, team, visible, drag }) {
  const suffix = scope === "opponent" ? "opp" : "our";
  const interactions = useLineupInteractions({
    context: "next-set", scope, drag,
    place: (name, index) => run("changeNextSetPlayer", scope, index, name),
    move: (from, to) => run("moveNextSetSlot", scope, from, to),
  });
  return (
    <div
      ref={interactions.root}
      className={"next-set-lineup-block" + (visible ? "" : " hidden")}
      id={"next-set-block-" + suffix}
    >
      <div className="next-set-lineup-head">
        <h4 id={"next-set-team-" + suffix}>
          {team.name || (scope === "our" ? "Squadra nostra" : "Avversarie")}
        </h4>
        <RotationControls
          className="rotation-controls next-set-rotation-controls"
          ids={['next-set-rotate-cw-' + suffix, 'next-set-rotation-select-' + suffix, 'next-set-rotate-ccw-' + suffix]}
          value={team.rotation}
          onChange={value => run('setNextSetRotation', scope, value)}
          onRotate={direction => run('rotateNextSetCourt', scope, direction)}
        />
        <button
          id={"next-set-default-" + suffix}
          type="button"
          className="secondary small"
          disabled={!team.hasDefaults}
          onClick={() => run("restoreNextSetDefaults", scope)}
        >
          Imposta default
        </button>
      </div>
      <div
        id={"next-set-court-" + suffix}
        className="lineup-court-grid next-set-court-grid"
      >
        {team.court.map((slot, index) => (
          <LineupSlot
                key={index}
                interactions={interactions}
                name={slot.main}
                index={index}
                onClick={() => {
              if (slot.main) run("changeNextSetPlayer", scope, index, "");
            }}
              >
            <div className="slot-body">
              <div className="slot-name">{slot.label}</div>
            </div>
          </LineupSlot>
        ))}
      </div>
      <div className="next-set-bench">
        <div id={"next-set-bench-" + suffix} className="lineup-bench-chips">
          {team.bench.length ? (
            team.bench.map((player) => (
              <LineupChip
                key={player.name}
                interactions={interactions}
                name={player.name}
                onClick={() => {
                  const index = team.court.findIndex((slot) => !slot.main);
                  run(
                    "changeNextSetPlayer",
                    scope,
                    index === -1 ? 0 : index,
                    player.name,
                  );
                }}
              >
                <span>{player.label}</span>
              </LineupChip>
            ))
          ) : (
            <div className="bench-empty">Nessuna riserva disponibile.</div>
          )}
        </div>
      </div>
      <div className="next-set-libero">
        <label htmlFor={"next-set-preferred-libero-" + suffix}>
          Libero principale
        </label>
        <select
          id={"next-set-preferred-libero-" + suffix}
          className="rotation-select"
          value={team.preferredLibero}
          disabled={!team.liberos.length}
          onChange={(event) =>
            run("setNextSetPreferredLibero", scope, event.target.value)
          }
        >
          <option value="">-</option>
          {team.liberos.map((player) => (
            <option key={player.name} value={player.name}>
              {player.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
export function NextSetPreparation() {
  const view = useViewStore(nextSetStore);
  const drag = useRef(null);
  const first = view.setNum === 1;
  const names = {
    our: view.teams.our?.name || "Noi",
    opp: view.teams.opponent?.name || "Avversarie",
  };
  return (
    <div
      id="next-set-inline"
      className={"next-set-inline" + (view.open ? "" : " hidden")}
      aria-hidden={!view.open}
    >
      <div className="next-set-inline__card">
        <div className="next-set-inline__head">
          <h3 id="next-set-title">Preparazione set {view.setNum}</h3>
          <button
            id="next-set-close"
            className={"pill-remove" + (first ? " hidden" : "")}
            type="button"
            aria-label="Chiudi"
            onClick={() => run("closeNextSetModal")}
          >
            ✕
          </button>
        </div>
        <div className="next-set__body">
          <div
            className={
              "next-set-lineups" +
              (view.double ? " next-set-lineups--double" : "")
            }
            id="next-set-lineups"
          >
            <NextSetTeam
              scope="opponent"
              team={view.teams.opponent || emptyTeam}
              visible={view.double}
              drag={drag}
            />
            <NextSetTeam
              scope="our"
              team={view.teams.our || emptyTeam}
              visible
              drag={drag}
            />
          </div>
          <label
            className={"auto-rotate-toggle" + (first ? " hidden" : "")}
            id="next-set-swap-row"
          >
            <input
              type="checkbox"
              id="next-set-swap-court"
              checked={view.swapCourt}
              onChange={(event) =>
                run("changeNextSetOption", "swapCourt", event.target.checked)
              }
            />{" "}
            Cambia campo
          </label>
          <div
            className={"next-set-sides" + (first ? "" : " hidden")}
            id="next-set-sides"
          >
            <div className="next-set__serve-label">Campo vicino</div>
            {Object.entries(names).map(([suffix, name]) => (
              <label key={suffix} className="auto-rotate-toggle">
                <input
                  type="radio"
                  name="next-set-side"
                  id={"next-set-side-" + suffix}
                  checked={suffix === "opp" ? view.swapCourt : !view.swapCourt}
                  onChange={() =>
                    run("changeNextSetOption", "swapCourt", suffix === "opp")
                  }
                />
                <span id={"next-set-side-" + suffix + "-label"}>{name}</span>
              </label>
            ))}
          </div>
          <div className="next-set__serve">
            <div className="next-set__serve-label">Prima battuta</div>
            {Object.entries(names).map(([suffix, name]) => (
              <label key={suffix} className="auto-rotate-toggle">
                <input
                  type="radio"
                  name="next-set-serve"
                  id={"next-set-serve-" + suffix}
                  checked={suffix === "our" ? view.isServing : !view.isServing}
                  onChange={() =>
                    run("changeNextSetOption", "isServing", suffix === "our")
                  }
                />
                <span id={"next-set-serve-" + suffix + "-label"}>{name}</span>
              </label>
            ))}
          </div>
          <div className="settings-actions">
            <button
              id="next-set-start"
              className="primary"
              onClick={() => run("applyNextSetDraft")}
            >
              Avvia set
            </button>
            <button
              id="next-set-cancel"
              className={"secondary" + (first ? " hidden" : "")}
              onClick={() => run("closeNextSetModal")}
            >
              Annulla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
