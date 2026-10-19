import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useViewStore } from '../hooks/useViewStore.js';
import { workspaceStore } from '../state/workspace-store.mjs';

const initialLayout = { 'center-top': ['video'], 'center-bottom': [], right: ['dvw', 'serve-trajectories', 'events'] };

// The portal owns its children; React's effect owns the stable host and its placement.
// Moving a widget never changes its portal target or remounts media/canvas controls.
export function ScoutWidgetPortal({ id, className, 'data-scout-widget': widget, children }) {
  const view = useViewStore(workspaceStore);
  const [host] = useState(() => typeof document === 'undefined' ? null : document.createElement('div'));
  const layout = view.layout || initialLayout;
  const zone = Object.keys(initialLayout).find(zone => layout[zone].includes(widget));
  const dragging = view.drag?.widget === widget;
  const rootClass = (widget === 'video' ? className.replace(/\s*\bhidden\b/g, '') + (view.videoVisible ? '' : ' hidden') : className)
    + (dragging ? ' is-dragging' : '');
  useLayoutEffect(() => {
    if (!host) return;
    if (id) host.id = id;
    host.dataset.scoutWidget = widget;
    host.className = rootClass;
  }, [host, id, widget, rootClass]);
  useLayoutEffect(() => {
    if (!host || !zone) return;
    const target = document.querySelector(`[data-scout-widget-zone="${zone}"]`);
    if (!target) return;
    const later = layout[zone].slice(layout[zone].indexOf(widget) + 1);
    const before = later.map(id => document.querySelector(`[data-scout-widget="${id}"]`))
      .find(element => element?.parentElement === target) || null;
    if (host.parentElement === target && host.nextElementSibling === before) return;
    const focused = host.contains(document.activeElement) ? document.activeElement : null;
    if (host.isConnected && target.isConnected && typeof target.moveBefore === 'function') target.moveBefore(host, before);
    else target.insertBefore(host, before);
    focused?.focus({ preventScroll: true });
  }, [host, widget, zone, layout]);
  useLayoutEffect(() => () => host?.remove(), [host]);
  if (!host) return <div id={id} className={rootClass} data-scout-widget={widget}>{children}</div>;
  return createPortal(children, host);
}

export function ScoutWidgetZone({ 'data-scout-widget-zone': zone, className, children, ...props }) {
  const { drag } = useViewStore(workspaceStore);
  return <div {...props} data-scout-widget-zone={zone}
    className={className + (drag?.target === zone ? ' is-drop-target' : '')}>{children}</div>;
}

export function ScoutWidgetDragFeedback() {
  const { drag } = useViewStore(workspaceStore);
  useLayoutEffect(() => {
    document.body.classList.toggle('scout-widget-dragging', !!drag);
    return () => document.body.classList.remove('scout-widget-dragging');
  }, [!!drag]);
  if (!drag || typeof document === 'undefined') return null;
  return createPortal(<div className="scout-widget-drag-ghost"
    style={{ transform: `translate3d(${Math.round(drag.x + 12)}px, ${Math.round(drag.y + 12)}px, 0)` }}>{drag.label}</div>, document.body);
}
