import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useViewStore } from "../hooks/useViewStore.js";
import { matchNotesStore } from "../state/match-notes-store.mjs";
import { events as appEvents } from "../app/actions.mjs";

export function MatchNote({ note, video = false, onSeek }) {
  return (
    <article
      className={"match-note" + (note.resolved ? " match-note--resolved" : "")}
    >
      <div className="match-note__context">
        <strong>
          Set {note.set} · {note.homeScore}–{note.visitorScore}
        </strong>
        <span>
          {note.afterEventLabel
            ? `Dopo evento ${note.afterEventLabel}`
            : "Prima del primo evento"}
        </span>
        <span>{note.resolved ? "Risolta" : "Da risolvere"}</span>
      </div>
      <p>{note.text}</p>
      <div className="match-note__actions">
        <label>
          <input
            type="checkbox"
            checked={note.resolved}
            onChange={(event) =>
              appEvents.resolveMatchNote(note.id, event.target.checked)
            }
          />{" "}
          Risolta
        </label>
        {video && (note.anchorKey !== null || note.videoTime !== null) && (
          <button
            type="button"
            className="small secondary"
            onClick={() => {
              appEvents.seekMatchNote(note.id);
              onSeek?.();
            }}
          >
            Vai al video
          </button>
        )}
        <button
          type="button"
          className="small danger"
          aria-label="Elimina nota"
          onClick={() => appEvents.deleteMatchNote(note.id)}
        >
          Elimina
        </button>
      </div>
    </article>
  );
}

function NoteIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h6" />
    </svg>
  );
}

function NoteDialog({ open, onClose, title, children, wide = false }) {
  const dialog = useRef(null);
  useEffect(() => {
    if (open) {
      dialog.current.showModal();
      (
        dialog.current.querySelector("textarea") ||
        dialog.current.querySelector("button")
      )?.focus();
    } else if (dialog.current?.open) dialog.current.close();
  }, [open]);
  if (typeof document === "undefined" || !open) return null;
  return createPortal(
    <dialog
      ref={dialog}
      className={"match-note-dialog" + (wide ? " match-note-dialog--wide" : "")}
      aria-label={title}
      onCancel={onClose}
      onClose={onClose}
      onKeyDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <div className="match-note-dialog__head">
        <h3>{title}</h3>
        <button
          type="button"
          className="secondary small"
          aria-label="Chiudi annotazioni"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      {children}
    </dialog>,
    document.body,
  );
}

export function MatchNoteMarker({ note }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={
          "match-note-marker" +
          (note.resolved ? " match-note-marker--resolved" : "")
        }
        aria-label={`Apri annotazione: ${note.text}`}
        title={note.text}
        onClick={() => setOpen(true)}
      >
        <NoteIcon />
        <span className="match-note-marker__context">
          Set {note.set} · {note.homeScore}–{note.visitorScore}
        </span>
        <span className="match-note-marker__text">{note.text}</span>
        {note.resolved && <span aria-label="Risolta">✓</span>}
      </button>
      <NoteDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Annotazione"
      >
        <MatchNote note={note} />
      </NoteDialog>
    </>
  );
}

export function MatchNoteComposer() {
  const { matchKey } = useViewStore(matchNotesStore);
  return <NoteComposerForm key={matchKey} />;
}

function NoteComposerForm() {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
    setText("");
  };
  return (
    <>
      <button
        id="btn-add-match-note"
        type="button"
        className="small net-action-btn match-note-add"
        onClick={() => setOpen(true)}
      >
        Aggiungi nota
      </button>
      <NoteDialog open={open} onClose={close} title="Aggiungi nota">
        <form
          className="match-note-composer"
          onSubmit={(event) => {
            event.preventDefault();
            if (appEvents.addMatchNote(text)) close();
          }}
        >
          <label htmlFor="match-note-text">
            Annotazione dopo l’ultimo evento
          </label>
          <textarea
            id="match-note-text"
            rows={5}
            value={text}
            placeholder="Cosa vuoi rivedere?"
            onChange={(event) => setText(event.target.value)}
          />
          <div className="match-note-dialog__actions">
            <button type="button" className="secondary" onClick={close}>
              Annulla
            </button>
            <button
              type="submit"
              className="match-note-add"
              disabled={!text.trim()}
            >
              Salva nota
            </button>
          </div>
        </form>
      </NoteDialog>
    </>
  );
}

export function VideoMatchNotes() {
  const { notes, unresolved, matchKey } = useViewStore(matchNotesStore);
  return (
    <VideoNotesButton key={matchKey} notes={notes} unresolved={unresolved} />
  );
}

function VideoNotesButton({ notes, unresolved }) {
  const [open, setOpen] = useState(false);
  const [onlyOpen, setOnlyOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="secondary video-notes-button"
        aria-label={`Annotazioni: ${unresolved} da risolvere su ${notes.length}`}
        title={`${unresolved} note da risolvere su ${notes.length}`}
        onClick={() => setOpen(true)}
      >
        <NoteIcon /> Note{" "}
        <span
          className={
            "match-notes-counter" +
            (unresolved ? " match-notes-counter--pending" : "")
          }
          aria-live="polite"
        >
          {unresolved}
        </span>
      </button>
      <NoteDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Annotazioni partita"
        wide
      >
        <p className="section-note" aria-live="polite">
          {unresolved
            ? `Note da risolvere: ${unresolved} su ${notes.length}`
            : notes.length
              ? "Tutte le note sono risolte"
              : "Nessuna annotazione per questa partita."}
        </p>
        {notes.length > 0 && (
          <label className="match-notes-filter">
            <input
              type="checkbox"
              checked={onlyOpen}
              onChange={(event) => setOnlyOpen(event.target.checked)}
            />{" "}
            Solo da risolvere
          </label>
        )}
        {notes
          .filter((note) => !onlyOpen || !note.resolved)
          .map((note) => (
            <MatchNote
              key={note.id}
              note={note}
              video
              onSeek={() => setOpen(false)}
            />
          ))}
        {onlyOpen && !unresolved && notes.length > 0 && (
          <p>Nessuna nota da risolvere.</p>
        )}
      </NoteDialog>
    </>
  );
}
