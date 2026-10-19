import { createDomainState } from "../../app/domain-state.mjs";

export const session = createDomainState({
"LINK_TIME_OPTIONS": () => ([
  {
    type: "serve-pass",
    label: "Battuta / Ricezione",
    source: { id: "serve", label: "Battuta" },
    target: { id: "pass", label: "Ricezione" }
  },
  {
    type: "set-attack",
    label: "Attacco / Alzata",
    source: { id: "attack", label: "Attacco" },
    target: { id: "second", label: "Alzata" }
  },
  {
    type: "attack-block",
    label: "Attacco / Muro",
    source: { id: "attack", label: "Attacco" },
    target: { id: "block", label: "Muro" }
  },
  {
    type: "attack-defense",
    label: "Attacco / Difesa",
    source: { id: "attack", label: "Attacco" },
    target: { id: "defense", label: "Difesa" }
  },
  {
    type: "block-defense",
    label: "Muro / Difesa",
    source: { id: "block", label: "Muro" },
    target: { id: "defense", label: "Difesa" }
  }
])
});
const videoEventsState = session;
