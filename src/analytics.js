window.dataLayer = window.dataLayer || [];
window.gtag = function gtag() {
  window.dataLayer.push(arguments);
};
window.gtag("js", new Date());

window.gtag("config", "G-GZWZ7KBCLM");

// Eventi applicativi ridotti ai soli passaggi significativi.
window.__volleyEyeAnalyticsSeen = window.__volleyEyeAnalyticsSeen || new Set();
window.trackVolleyEyeEventOnce = function (eventName, params) {
  if (!eventName || window.__IS_LOCALHOST_DEV__ || typeof window.gtag !== "function") return;
  const payload = params || {};
  const key = eventName + (payload.export_format ? ":" + payload.export_format : "");
  if (window.__volleyEyeAnalyticsSeen.has(key)) return;
  window.__volleyEyeAnalyticsSeen.add(key);
  window.gtag("event", eventName, payload);
};
