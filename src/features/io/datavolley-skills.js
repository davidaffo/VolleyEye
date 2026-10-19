// A single mapping serves imports, live entry, signatures and export codes.
export const DV_SKILL_CODES = {
  serve: 'S', pass: 'R', attack: 'A', block: 'B', defense: 'D', second: 'E', freeball: 'F',
};
export const DV_SKILLS_BY_CODE = Object.fromEntries(
  Object.entries(DV_SKILL_CODES).map(([skill, code]) => [code, skill]),
);
