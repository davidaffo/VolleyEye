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
  const listeners = new Set();
  let view = Object.freeze({
    open: false,
    mode: "create",
    archiveName: "",
    teamNames: Object.freeze([]),
    draft: blankDraft,
  });
  function publish(next) {
    view = Object.freeze(next);
    listeners.forEach((listener) => listener());
  }
  return {
    getSnapshot: () => view,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    open({
      mode,
      archiveName = "",
      details,
      teamNames,
      today,
      currentCategory = "",
    }) {
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
      if (view.open) publish({ ...view, open: false });
    },
  };
}
export const matchDialogStore = createMatchDialogStore();
