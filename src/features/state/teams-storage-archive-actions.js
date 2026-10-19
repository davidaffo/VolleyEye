import { createDomainState } from "../../app/domain-state.mjs";

export const session = createDomainState({
"matchDetailsArchiveName": () => ("")
});
const archiveActionsState = session;
