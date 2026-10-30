import { session as matchState } from "../../../js/globals.js";
import { loadTeamsMapFromStorage } from "../teams/storage/team-repository.js";
import { buildPlayersDbView } from "./database-model.js";
import { playersDbStore } from "../../state/players-db-store.mjs";

export function publishPlayersDbView() {
  playersDbStore.publish(
    buildPlayersDbView(matchState.state.playersDb, loadTeamsMapFromStorage()),
  );
}

export function setPlayersDbOpen(open) {
  playersDbStore.publish({ open });
}
