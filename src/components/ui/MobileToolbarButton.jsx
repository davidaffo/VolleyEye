export function MobileToolbarButton({ as: Component = "button", className = "", ...props }) {
  return <Component {...props} className={`secondary small mobile-toolbar-button ${className}`.trim()} />;
}
