import { createDomainState } from "../../app/domain-state.mjs";

export const session = createDomainState({
"BULK_EDIT_CONFIG": () => ({
"videoTime": {label: "Tempo video"},
"set": {label: "Set"},
"player": {label: "Giocatrice"},
"setter": {label: "Alzatore"},
"skill": {label: "Fondamentale"},
"code": {label: "Codice"},
"rotation": {label: "Rotazione"},
"zone": {label: "Zona"},
"setterPosition": {label: "Posizione palleggio"},
"opponentSetterPosition": {label: "Posizione palleggio avv"},
"receivePosition": {label: "Zona ricezione"},
"base": {label: "Base"},
"setType": {label: "Tipo alzata"},
"combination": {label: "Combinazione"},
"serveType": {label: "Tipo servizio"},
"receiveEvaluation": {label: "Valutazione ricezione"},
"attackEvaluation": {label: "Valutazione attacco"},
"attackBp": {label: "Fase attacco"},
"attackType": {label: "Tipo attacco"},
"blockNumber": {label: "Numero muro"},
"playerIn": {label: "In"},
"playerOut": {label: "Out"},
"durationMs": {label: "Durata (ms)"}
}),
"LOCAL_VIDEO_DB": () => ("volley-video-db"),
"LOCAL_VIDEO_STORE": () => ("videos"),
"LOCAL_VIDEO_HANDLE_KEY": () => ("current-handle"),
"TAB_ORDER": () => (["match", "info", "scout", "aggregated", "video"]),
"dvwScoutPendingTokens": () => ([])
}, {
"elBtnFreeball": () => (document.getElementById("btn-freeball")),
"elNetActionsDefault": () => (document.getElementById("net-actions-default")),
"elBtnNetBlockPrompt": () => (document.getElementById("btn-net-block-prompt")),
"elNextSkillIndicator": () => (document.getElementById("next-skill-indicator")),
"elSetTypeShortcuts": () => (document.getElementById("set-type-shortcuts")),
"elOffsetSkillGrid": () => (document.getElementById("offset-skill-grid")),
"elUnifyTimesGrid": () => (document.getElementById("unify-times-grid")),
"elSkillDurationGrid": () => (document.getElementById("skill-duration-grid")),
"elDvwScoutInput": () => (document.getElementById("dvw-scout-input")),
"elDvwScoutStatus": () => (document.getElementById("dvw-scout-status")),
"elBaseModal": () => (document.getElementById("base-modal")),
"elAttackTypeModal": () => (document.getElementById("attack-type-modal")),
"elAttackSetterModal": () => (document.getElementById("attack-setter-modal")),
"elAttackSetterModalGrid": () => (document.getElementById("attack-setter-modal-grid")),
"elBlockNumberModal": () => (document.getElementById("block-number-modal"))
});
const teamManagementState = session;
