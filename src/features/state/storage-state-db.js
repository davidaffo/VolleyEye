import { createDomainState } from "../../app/domain-state.mjs";

export const session = createDomainState({
"STATE_DB_NAME": () => ("volleyScoutStateDb"),
"STATE_DB_VERSION": () => (2),
"STATE_DB_STORE": () => ("state"),
"stateDbPromise": () => (null)
});

