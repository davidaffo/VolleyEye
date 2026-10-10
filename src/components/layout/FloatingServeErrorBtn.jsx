// The compatibility engine owns dynamic descendants until their renderer is migrated.
export function FloatingServeErrorBtn() {
  return (
    <button
      id={"floating-serve-error-btn"}
      className={"floating-serve-error-btn hidden"}
      type={"button"}
      aria-label={"Battuta errore"}
    >
      {"="}
    </button>
  );
}
