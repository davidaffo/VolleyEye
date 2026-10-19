import { createViewStore } from './view-store.mjs';

export function createTeamsManagerStore() {
  const store = createViewStore({ open: false, selectedName: '', teams: Object.freeze([]) });
  return {
    ...store,
    publish(patch) {
      store.publish({ ...patch, ...(patch.teams ? { teams: Object.freeze([...patch.teams]) } : {}) });
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
