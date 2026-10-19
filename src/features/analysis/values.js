import { valueToString } from '../../domain/value-string.js';
// Value normalization and option construction have no UI or controller dependencies.
import { RESULT_CODES } from '../../../js/globals.js';

export function normalizeBaseValue(val) {
  if (!val) return null;
  return String(val).trim().toUpperCase();
}

export function normalizePhaseValue(val) {
  if (val === true || val === "true" || val === 1 || val === "1") return "bp";
  if (val === false || val === "false" || val === 0 || val === "0") return "so";
  if (typeof val === "string") {
    const upper = val.toUpperCase();
    if (upper.includes("BP") || upper.includes("BREAK")) return "bp";
    if (upper.includes("SO") || upper.includes("SIDE")) return "so";
  }
  return null;
}

export function getEventPhaseValue(ev) {
  if (!ev) return null;
  let phaseVal = ev.attackBp;
  if (phaseVal === undefined || phaseVal === null) {
    phaseVal = ev.phase;
  }
  if (phaseVal === undefined || phaseVal === null) {
    phaseVal = ev.attackPhase;
  }
  return normalizePhaseValue(phaseVal);
}

export function normalizeEvalCode(val) {
  if (!val) return null;
  const str = String(val).trim();
  return RESULT_CODES.includes(str) ? str : null;
}

export function normalizeReceiveZone(val) {
  const num = Number(val);
  if (!Number.isFinite(num)) return null;
  return num;
}

export function normalizeSetNumber(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return null;
    const direct = Number(trimmed);
    if (Number.isFinite(direct)) return direct;
    const match = trimmed.match(/\d+/);
    if (match) {
      const parsed = Number(match[0]);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  }
  const num = Number(val);
  if (!Number.isFinite(num)) return null;
  return num;
}

export function buildUniqueOptions(values, { asNumber = false, labelFn } = {}) {
  const seen = new Set();
  const opts = [];
  (values || []).forEach(raw => {
    if (raw === null || raw === undefined || raw === "") return;
    const val = asNumber ? Number(raw) : String(raw);
    if (asNumber && Number.isNaN(val)) return;
    if (seen.has(val)) return;
    seen.add(val);
    opts.push({
      value: val,
      label: labelFn ? labelFn(val) : String(val)
    });
  });
  return opts;
}

export function getOptionLabel(options, value) {
  const match = (options || []).find(opt => String(opt.value) === String(value));
  if (match && match.label) return match.label;
  return String(value);
}

export function normalizeMatchKey(value) {
  return String(value || "").trim().toLowerCase();
}

export function clamp01Val(n) {
  if (n == null || isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function buildSetFilterOptions(events) {
  return buildUniqueOptions(events.map(event => normalizeSetNumber(event.set)), {
    asNumber: true, labelFn: value => 'Set ' + value,
  });
}

export function getAttackStartZone(event) {
  const trajectory = event.attackDirection || event.attackTrajectory || {};
  return event.attackStartZone || trajectory.startZone || event.zone || event.playerPosition || null;
}

export function buildAttackTypeLabel(value) {
  const normalized = valueToString(value).trim();
  return normalized || "Non specificato";
}
