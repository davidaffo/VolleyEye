import { RESULT_CODES } from '../../../js/globals.js';
import { createDomainState } from '../../app/domain-state.mjs';
export const session = createDomainState({
"allowedMetricCodes": () => (new Set(RESULT_CODES)),
"SETTINGS_RESULT_CODES": () => (["#", "+", "!", "-", "/", "="]),
"allowedPointCodes": () => (new Set([...camp3ImportState.SETTINGS_RESULT_CODES, "for", "against", "error"]))
});
const camp3ImportState = session;