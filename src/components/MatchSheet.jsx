import { useState, useSyncExternalStore } from "react";
import { matchSheetStore } from "../state/roster-import-store.mjs";
import { invokeRuntime } from "../compat/runtime.js";
const run = (command, ...args) =>
  invokeRuntime(command, ...args).catch(console.error);
function useSheet() {
  return useSyncExternalStore(
    matchSheetStore.subscribe,
    matchSheetStore.getSnapshot,
    matchSheetStore.getSnapshot,
  );
}
function Arrow({ arrow }) {
  return arrow ? <polygon points={arrow.points} fill={arrow.color} /> : null;
}
export function MatchSheetCourt({ court, notes = {} }) {
  const c = court,
    note = notes[c.noteKey] || "",
    lines = note.split(/\r?\n/).slice(0, 3);
  while (lines.length < 2) lines.push("");
  return (
    <div className={"match-sheet-court " + c.className}>
      {c.title && <div className="match-sheet-court__title">{c.title}</div>}
      <svg
        viewBox={`0 ${c.top} 100 ${c.viewHeight}`}
        role="img"
        aria-label={c.title || "Campo"}
      >
        <rect x="1" y="1" width="98" height={c.height - 2} rx="1.5" />
        <line
          x1="34"
          y1="1"
          x2="34"
          y2={c.height - 1}
          className="court-line-soft"
        />
        <line
          x1="66"
          y1="1"
          x2="66"
          y2={c.height - 1}
          className="court-line-soft"
        />
        {c.full && (
          <line
            x1="1"
            y1={c.height / 2}
            x2="99"
            y2={c.height / 2}
            className="net"
          />
        )}
        <line
          x1="1"
          y1={c.height / 3}
          x2="99"
          y2={c.height / 3}
          className="attack-line"
        />
        {c.full && (
          <line
            x1="1"
            y1={(c.height * 2) / 3}
            x2="99"
            y2={(c.height * 2) / 3}
            className="attack-line"
          />
        )}
        {c.source && (
          <>
            <line
              className="match-sheet-source-arrow"
              x1={c.source.start.x}
              y1={c.source.start.y}
              x2={c.source.end.x}
              y2={c.source.end.y}
            />
            <Arrow arrow={c.source.arrow} />
          </>
        )}
        {c.lines.map((line, index) => (
          <g key={index} opacity={line.opacity}>
            <line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={line.color}
              strokeWidth="1.7"
              strokeLinecap="round"
            />
            <Arrow arrow={line.arrow} />
          </g>
        ))}
        {c.players.map((player, index) => (
          <g key={index} className="match-sheet-court-player">
            <circle cx={player.x} cy={player.y} r="6.5" />
            <text x={player.x} y={player.y + (player.role ? -0.5 : 2.2)}>
              {player.label}
            </text>
            {player.role && (
              <text
                className="match-sheet-court-player__role"
                x={player.x}
                y={player.y + 4}
              >
                {player.role}
              </text>
            )}
          </g>
        ))}
      </svg>
      {c.noteKey && (
        <div className="match-sheet-notes" data-note-key={c.noteKey}>
          <label>Note</label>
          <textarea
            data-match-sheet-note={c.noteKey}
            rows="3"
            value={note}
            onChange={(event) =>
              run("changeReactMatchSheetNote", c.noteKey, event.target.value)
            }
          />
          <div className="match-sheet-notes-print">
            {lines.map((line, index) => (
              <div key={index} className="match-sheet-note-line">
                {line}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
export function MatchSheetControls() {
  const view = useSheet(),
    [open, setOpen] = useState(false);
  const option = (kind, value, label, selected) => (
    <label key={value}>
      <input
        type="checkbox"
        data-sideout-filter={kind}
        value={String(value)}
        checked={selected?.includes(String(value)) || false}
        onChange={(event) => {
          setOpen(true);
          run(
            "changeReactMatchSheetFilter",
            kind,
            String(value),
            event.target.checked,
          );
        }}
      />{" "}
      {label}
    </label>
  );
  return (
    <div
      id="match-sheet-controls"
      className="match-sheet-controls"
      data-react-managed="true"
    >
      <label className="match-sheet-filter">
        <input
          type="checkbox"
          data-match-sheet-filter="includeAttackErrors"
          checked={!!view.filters.includeAttackErrors}
          onChange={(event) => {
            setOpen(false);
            run(
              "changeReactMatchSheetFilter",
              "includeAttackErrors",
              null,
              event.target.checked,
            );
          }}
        />
        <span>Includi attacchi errore</span>
      </label>
      <details
        className="match-sheet-sideout-filters"
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary>Filtri cambio palla · set e giocatrici</summary>
        <p>
          Nessuna selezione: tutti i set e tutte le giocatrici. Restano validi i
          filtri generali dell’analisi.
        </p>
        <fieldset>
          <legend>Set</legend>
          {view.sets.map((set) =>
            option("sets", set, `Set ${set}`, view.filters.sets),
          )}
        </fieldset>
        <fieldset>
          <legend>Giocatrici</legend>
          {view.roster.map((player) =>
            option("players", player.index, player.name, view.filters.players),
          )}
        </fieldset>
      </details>
    </div>
  );
}
export function MatchSheetPage() {
  const view = useSheet();
  return (
    <div
      id="match-sheet-page"
      className="match-sheet-page"
      data-react-managed="true"
    >
      <header className="match-sheet-header">
        <div>
          <h2>{view.matchLabel}</h2>
          <p>
            Squadra analizzata: <strong>{view.teamLabel}</strong>
          </p>
        </div>
        <div className="match-sheet-header__meta">
          <span>{view.players.length} giocatrici</span>
          <span>{view.eventCount} eventi filtrati</span>
        </div>
      </header>
      <section className="match-sheet-section match-sheet-section--players match-sheet-section--with-label">
        <h3>Dati individuali giocatrici</h3>
        <div className="match-sheet-player-matrix">
          <div className="match-sheet-player-row-labels">
            <span />
            <span>Servizio</span>
            <span>Attacco</span>
          </div>
          <div
            className="match-sheet-player-grid"
            style={{
              "--match-sheet-player-count": Math.max(1, view.players.length),
            }}
          >
            {view.players.length ? (
              view.players.map((player) => (
                <div
                  key={player.idx}
                  className={
                    "match-sheet-player " + (player.starter ? "is-starter" : "")
                  }
                >
                  <div className="match-sheet-player__head">
                    <strong>{player.number ? `#${player.number}` : "#"}</strong>
                    <span>{player.label}</span>
                    <em>{player.role || (player.starter ? "T" : "R")}</em>
                  </div>
                  <MatchSheetCourt court={player.serve} notes={view.notes} />
                  <MatchSheetCourt court={player.attack} notes={view.notes} />
                </div>
              ))
            ) : (
              <div className="players-empty">
                Nessuna giocatrice disponibile.
              </div>
            )}
          </div>
        </div>
      </section>
      <section className="match-sheet-section match-sheet-section--with-label">
        <h3>Difesa</h3>
        <div className="match-sheet-court-grid match-sheet-court-grid--defense">
          {view.defense.map((court) => (
            <MatchSheetCourt
              key={court.noteKey}
              court={court}
              notes={view.notes}
            />
          ))}
        </div>
      </section>
      <section className="match-sheet-section match-sheet-section--with-label">
        <h3>Cambio palla</h3>
        <div className="match-sheet-court-grid match-sheet-court-grid--sideout">
          {view.sideout.map((court) => (
            <MatchSheetCourt
              key={court.noteKey}
              court={court}
              notes={view.notes}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
