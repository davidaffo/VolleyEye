import { createDomainState } from "../../app/domain-state.mjs";

export const session = createDomainState({
"videoMobileSourcePromptDismissed": () => (false),
"videoMobileSourcePromptTimer": () => (null)
});
const playbackState = session;
