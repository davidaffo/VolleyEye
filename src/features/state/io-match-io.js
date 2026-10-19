import { createDomainState } from "../../app/domain-state.mjs";

export const session = createDomainState({
"DEFAULT_DEMO_MATCH_URL": () => ("./match_demo.json"),
"DEFAULT_DEMO_MATCH_NAME": () => ("Match demo - Aurora Volley - Riviera Volley"),
"DEFAULT_DEMO_TEAM_NAMES": () => (["Aurora Volley Demo", "Riviera Volley Demo"]),
"DEFAULT_DEMO_PREFERENCE_KEY": () => ("volleyeye-default-demo-preference")
});
const matchIoState = session;
