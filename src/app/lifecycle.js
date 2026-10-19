import { createDomainState } from './domain-state.mjs';
export const session = createDomainState({ ready: () => false, startup: () => undefined,
  archiveRows: () => Object.freeze([]), archiveSignature: () => '', scoutControlsDisabled: () => false });
