
import { actions as appActions, events as appEvents } from "../../app/actions.mjs";

// Immediate dispatch preserves the browser gesture for file pickers and clipboard.
export function CommandButton({
  command,
  args = [],
  immediate = false,
  onError = console.error,
  children,
  ...props
}) {
  const execute = () => {
    try {
      const action = immediate ? (appEvents[command] || appActions[command]) : appActions[command];
      Promise.resolve(action(...args)).catch(onError);
    } catch (error) {
      onError(error);
    }
  };
  return (
    <button {...props} onClick={execute}>
      {children}
    </button>
  );
}
