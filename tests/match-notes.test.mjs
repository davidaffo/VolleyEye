import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {
  normalizeMatchNotes,
  findNoteAnchorKey,
} from "../src/domain/match-notes.js";
import { featureSource } from "./helpers/feature-source.mjs";

function setup() {
  let saved = 0;
  const context = vm.createContext({
    state: {
      events: [{ eventId: 4, set: 2, videoTime: 30 }],
      currentSet: 2,
      notes: [],
    },
    normalizeMatchNotes,
    findNoteAnchorKey,
    getEventKey: (event) => event.eventId,
    computePointsSummary: () => ({ totalFor: 12, totalAgainst: 9 }),
    saveState: () => saved++,
    renderEventsLog() {},
    getActiveVideoPlaybackSeconds: () => 42,
    seekVideoToTime: (time) => (context.seekTime = time),
    computeEventVideoTime: (event) => event.videoTime,
    getVideoBaseTimeMs: () => 0,
  });
  vm.runInContext(featureSource("src/features/notes/commands.js"), context);
  return { context, saved: () => saved };
}

test("le note restano separate dagli eventi con punteggio, set e posizione stabili", () => {
  const { context: c, saved } = setup();
  const events = c.state.events;
  const before = JSON.stringify(events);
  assert.equal(c.addMatchNote("   "), false);
  assert.equal(saved(), 0);
  assert.equal(c.addMatchNote("  Rivedere il tocco a muro  "), true);
  assert.equal(c.state.events, events);
  assert.equal(JSON.stringify(events), before);
  const note = c.state.notes[0];
  assert.equal(note.text, "Rivedere il tocco a muro");
  assert.equal(note.set, 2);
  assert.equal(note.homeScore, 12);
  assert.equal(note.visitorScore, 9);
  events.push({ eventId: 5, set: 2, videoTime: 50 });
  assert.equal(
    findNoteAnchorKey(
      note,
      events.map((event) => event.eventId),
    ),
    "4",
  );
  c.resolveMatchNote(note.id, true);
  assert.equal(c.state.notes[0].resolved, true);
  c.resolveMatchNote(note.id, false);
  assert.equal(c.state.notes[0].resolved, false);
  c.seekMatchNote(note.id);
  assert.equal(c.seekTime, 30);
  c.deleteMatchNote(note.id);
  assert.equal(c.state.notes.length, 0);
  assert.equal(events.length, 2);
});

test("note consecutive e note iniziali non richiedono un evento e conservano l'ordine", () => {
  const { context: c } = setup();
  c.state.events = [];
  c.addMatchNote("Prima della partita");
  c.addMatchNote("Controllare formazione");
  assert.notEqual(c.state.notes[0].id, c.state.notes[1].id);
  assert.equal(findNoteAnchorKey(c.state.notes[0], [1]), null);
  assert.equal(c.state.events.length, 0);
});

test("cancellare l'azione di riferimento conserva la nota dopo il predecessore superstite", () => {
  const note = { precedingEventKeys: ["1", "2", "4"] };
  assert.equal(findNoteAnchorKey(note, [1, 2, 4, 5]), "4");
  assert.equal(findNoteAnchorKey(note, [1, 2, 5]), "2");
  assert.equal(findNoteAnchorKey(note, [5]), null);
});

test("lo scout da video conserva il tempo della nota e lo usa per la revisione", () => {
  const { context: c } = setup();
  c.state.videoScoutMode = true;
  c.addMatchNote("Rivedere questo istante");
  const note = c.state.notes[0];
  assert.equal(note.videoTime, 42);
  c.seekMatchNote(note.id);
  assert.equal(c.seekTime, 42);
});

test("normalizzazione compatibile con vecchi match e senza oggetti evento nelle note", () => {
  assert.deepEqual(normalizeMatchNotes(undefined), []);
  const notes = normalizeMatchNotes([
    {
      id: "n1",
      text: "Nota",
      set: 2,
      resolved: true,
      precedingEventKeys: [4],
      event: { eventId: 4 },
    },
    { id: "n1", text: "Duplicato" },
    null,
    { id: "n2", text: "  " },
  ]);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].resolved, true);
  assert.deepEqual(notes[0].precedingEventKeys, ["4"]);
  assert.equal("event" in notes[0], false);
  assert.deepEqual(
    normalizeMatchNotes(JSON.parse(JSON.stringify(notes))),
    notes,
  );
});
