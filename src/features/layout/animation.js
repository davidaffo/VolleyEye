

export function captureRects(selector, keyBuilder) {
  const map = new Map();
  document.querySelectorAll(selector).forEach(node => {
    if (!(node instanceof HTMLElement)) return;
    const key = keyBuilder(node);
    if (!key) return;
    map.set(key, node.getBoundingClientRect());
  });
  return map;
}

export function animateFlip(prevRects, selector, keyBuilder) {
  if (!prevRects || prevRects.size === 0) return;
  const nodes = document.querySelectorAll(selector);
  nodes.forEach(node => {
    if (!(node instanceof HTMLElement)) return;
    const key = keyBuilder(node);
    if (!key || !prevRects.has(key)) return;
    const prev = prevRects.get(key);
    const next = node.getBoundingClientRect();
    const dx = prev.left - next.left;
    const dy = prev.top - next.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    node.style.transition = "none";
    node.style.transform = `translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(() => {
      node.style.transition = "transform 360ms ease, opacity 360ms ease";
      node.style.transform = "translate(0px, 0px)";
    });
  });
}
