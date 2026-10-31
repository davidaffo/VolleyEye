import { RotationControls } from './ui/RotationControls.jsx';
import { useLineupInteractions } from "../hooks/useLineupInteractions.js";
import { LineupSlot, LineupChip } from "./ui/LineupPlayer.jsx";

import { useViewStore } from "../hooks/useViewStore.js";
import { useEffect, useState } from "react";
import { teamEditorStore } from "../state/team-editor-store.mjs";
function useEditor() {
  return useViewStore(teamEditorStore);
}
function act(callback, ...args) {
  try {
    Promise.resolve(callback(...args)).catch(report);
  } catch (error) {
    report(error);
  }
}
function report(error) {
  console.error("Modifica squadra non riuscita", error);
  window.alert(error.message);
}
function PlayerRow({ player, liveEdit }) {
  const [first, setFirst] = useState(player.firstName || "");
  const [last, setLast] = useState(player.lastName || "");
  const [number, setNumber] = useState(player.number || "");
  useEffect(() => setFirst(player.firstName || ""), [player.firstName]);
  useEffect(() => setLast(player.lastName || ""), [player.lastName]);
  useEffect(() => setNumber(player.number || ""), [player.number]);
  const libero = String(player.role || "").toUpperCase() === "L";
  const nameChanged = (event) => {
    const row = event.currentTarget.closest("tr");
    act(
      player.onName,
      row.querySelector('input[placeholder="Nome"]').value,
      row.querySelector('input[placeholder="Cognome"]').value,
    );
  };
  return (
    <tr
      className={
        "team-manager-row" +
        (libero ? " team-manager-row--libero" : "") +
        (player.out ? " team-manager-row--out" : "")
      }
      data-player-id={player.id}
    >
      <RosterInputCell type="text" inputMode="numeric" pattern="[0-9]{0,2}" maxLength={2}
onFocus={event => event.target.select()} onClick={event => event.target.select()}
value={number}
onBlur={() => {
            if (number !== (player.number || "")) act(player.onNumber, number);
          }} onChange={value => setNumber(value.replace(/\D/g, "").slice(0, 2))} />
      <RosterInputCell placeholder="Cognome"
value={last}
onBlur={nameChanged} onChange={value => { setLast(value); act(player.onName, first, value, { matchDatabase: false }); }} />
      <RosterInputCell placeholder="Nome"
value={first}
onBlur={nameChanged} onChange={value => { setFirst(value); act(player.onName, value, last, { matchDatabase: false }); }} />
      <td>
        <div className="team-manager-photo-cell">
          <button
            type="button"
            className={
              "team-manager-photo-preview" + (player.photo ? "" : " empty")
            }
            title={player.photo ? "Modifica foto" : "Aggiungi foto"}
            aria-label={player.photo ? "Modifica foto" : "Aggiungi foto"}
            style={
              player.photo
                ? {
                    backgroundImage:
                      "url(" + JSON.stringify(player.photo) + ")",
                  }
                : undefined
            }
            onClick={() => act(player.onPhoto)}
          />
        </div>
      </td>
      <td>
        <input
          className="team-manager-input"
          type="checkbox"
          checked={!!player.isCaptain}
          onChange={(event) => act(player.onCaptain, event.target.checked)}
        />
      </td>
      <td>
        <input
          type="checkbox"
          checked={libero}
          onChange={(event) => act(player.onLibero, event.target.checked)}
        />
      </td>
      <td>
        <input
          className="team-manager-input"
          type="checkbox"
          checked={!!player.out}
          disabled={liveEdit}
          title={
            liveEdit ? "Fuori rosa disabilitato durante la partita." : undefined
          }
          onChange={(event) => act(player.onOut, event.target.checked)}
        />
      </td>
      <td>
        <span className="team-manager-id">{player.id || "—"}</span>
      </td>
      <td>
        <button
          type="button"
          className="small danger"
          disabled={liveEdit}
          title={
            liveEdit ? "Rimozione disabilitata durante la partita." : undefined
          }
          onClick={() => act(player.onDelete)}
        >
          ✕
        </button>
      </td>
    </tr>
  );
}
export function TeamEditorTable() {
  const view = useEditor();
  return (
    <tbody id="team-manager-body">
      {view.players.map((player) => (
        <PlayerRow key={player.id} player={player} liveEdit={view.liveEdit} />
      ))}
    </tbody>
  );
}
export function TeamDefaultLineup() {
  const view = useEditor();
  const interactions = useLineupInteractions({
    context: "default",
    place: (name, index) => act(view.court.find(slot => slot.index === index).onDrop, name),
  });
  return (
    <div ref={interactions.root} className="team-manager-default">
      <h4>Formazione di default</h4>
      <label className="default-lineup-rotation">
        <span>Rotazione iniziale</span>
        <RotationControls
          className="rotation-controls default-lineup-rotation-controls"
          ids={['default-lineup-rotate-cw', 'default-lineup-rotation', 'default-lineup-rotate-ccw']}
          value={view.rotation}
          onChange={value => act(view.onRotation, value)}
          onRotate={direction => act(view.onRotate, direction)}
        />
      </label>
      <label className="default-lineup-preferred-libero">
        <span>Libero principale</span>
        <select
          id="default-lineup-preferred-libero"
          className="rotation-select"
          value={view.preferredLibero}
          disabled={!view.liberos.length}
          onChange={(event) => act(view.onLibero, event.target.value)}
        >
          <option value="">-</option>
          {view.liberos.map((player) => (
            <option key={player.name} value={player.name}>
              {player.label}
            </option>
          ))}
        </select>
      </label>
      <div
        id="default-lineup-grid"
        className="default-lineup-grid"
      >
        {view.court.map((slot) => (
          <LineupSlot
                key={slot.index}
                interactions={interactions}
                name={slot.name}
                index={slot.index}
                onClick={() => {
              if (slot.name) act(slot.onClear);
            }}
              >
            <span
              className={
                "default-lineup-name" + (slot.out ? " default-lineup-out" : "")
              }
            >
              {slot.label}
            </span>
          </LineupSlot>
        ))}
      </div>
      <div className="default-lineup-bench">
        <div className="default-lineup-bench__title">
          Giocatrici disponibili
        </div>
        <div
          id="default-lineup-bench"
          className="default-lineup-bench__list"
        >
          {view.bench.length ? (
            view.bench.map((player) => (
              <LineupChip
                key={player.name}
                interactions={interactions}
                name={player.name}
                onClick={() => act(player.onChoose)}
                className={player.out ? " default-lineup-out" : ""}
              >
                {player.label}
              </LineupChip>
            ))
          ) : (
            <div className="players-empty">Nessuna giocatrice disponibile.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function RosterInputCell({ value, onChange, type = 'text', ...props }) {
  return <td><input className="team-manager-input" type={type} value={value}
    onChange={event => onChange(event.target.value)} {...props} /></td>;
}
