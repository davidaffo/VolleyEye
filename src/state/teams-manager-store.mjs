export function createTeamsManagerStore() {
  let snapshot = Object.freeze({
    open: false,
    selectedName: "",
    teams: Object.freeze([]),
  });
  const listeners = new Set();
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    publish(patch) {
      snapshot = Object.freeze({
        ...snapshot,
        ...patch,
        ...(patch.teams ? { teams: Object.freeze([...patch.teams]) } : {}),
      });
      listeners.forEach((listener) => listener());
    },
  };
}
export const teamsManagerStore = createTeamsManagerStore();
export function getTeamMergeChoices(primary, secondary) {
  return Object.fromEntries(
    secondary.players.map((player) => {
      const match =
        primary.players.find((p) => p.id === player.id) ||
        primary.players.find(
          (p) => p.name.toLowerCase() === player.name.toLowerCase(),
        );
      return [player.id, match?.id || ""];
    }),
  );
}
