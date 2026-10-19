export function createPreviousSkillOptions() {
  return [
    { value: "any", label: "Tutte" },
    { value: "freeball-positive", label: "Freeball o ricezione positiva" },
    { value: "receive-positive", label: "Solo ricezione positiva" },
    { value: "defense-negative", label: "Difesa + ricezione negativa" },
    { value: "freeball-only", label: "Solo freeball" },
    { value: "dig-only", label: "Solo difesa" },
  ];
}
