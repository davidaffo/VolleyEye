import { createViewStore } from './view-store.mjs';

// Form drafts never share references with the active match or its archived payload.
const blankDraft = Object.freeze({
  teamName: "",
  mode: "single",
  opponentTeam: "",
  opponentManual: "",
  category: "",
  date: "",
  matchType: "amichevole",
  leg: "",
});
export function createMatchDialogStore() {
  const store = createViewStore({
    open: false,
    mode: "create",
    archiveName: "",
    teamNames: Object.freeze([]),
    draft: blankDraft,
  });
  const publish = store.replace;
  return {
    ...store,
    open({
      mode,
      archiveName = "",
      details,
      teamNames,
      today,
      currentCategory = "",
    }) {
      const view = store.getSnapshot();
      const editing = mode === "edit";
      const match = details.match || {};
      const names = Object.freeze([...teamNames]);
      const previousHome = view.draft.teamName || details.selectedTeam || "";
      const teamName = editing
        ? details.selectedTeam || match.teamName || ""
        : names.includes(previousHome)
          ? previousHome
          : names[0] || "";
      const previousOpponent =
        view.draft.opponentTeam || details.selectedOpponentTeam || "";
      const opponentTeam = editing
        ? details.selectedOpponentTeam || match.opponent || ""
        : names.includes(previousOpponent) && previousOpponent !== teamName
          ? previousOpponent
          : names.find((name) => name !== teamName) || "";
      const draft = Object.freeze({
        teamName,
        opponentTeam,
        mode: details.useOpponentTeam ? "double" : "single",
        opponentManual: details.useOpponentTeam
          ? ""
          : match.opponentManual || match.opponent || "",
        category: editing ? match.category || "" : currentCategory,
        date: editing ? match.date || "" : today,
        matchType: editing ? match.matchType || "amichevole" : "amichevole",
        leg: editing ? match.leg || "" : "",
      });
      publish({ open: true, mode, archiveName, teamNames: names, draft });
    },
    update(field, value) {
      const view = store.getSnapshot();
      if (!view.open || !Object.hasOwn(view.draft, field)) return;
      if (
        view.mode === "edit" &&
        ["teamName", "mode", "opponentTeam"].includes(field)
      )
        return;
      const draft = { ...view.draft, [field]: value };
      if (
        field === "teamName" &&
        (draft.opponentTeam === value ||
          !view.teamNames.includes(draft.opponentTeam))
      ) {
        draft.opponentTeam =
          view.teamNames.find((name) => name !== value) || "";
      }
      publish({ ...view, draft: Object.freeze(draft) });
    },
    close() {
      if (store.getSnapshot().open) store.publish({ open: false });
    },
  };
}
export const matchDialogStore = createMatchDialogStore();
