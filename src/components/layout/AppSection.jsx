// The compatibility engine owns dynamic descendants until their renderer is migrated.
export function AppSection() {
  return <noscript>{"Questa applicazione richiede JavaScript abilitato."}</noscript>;
}
