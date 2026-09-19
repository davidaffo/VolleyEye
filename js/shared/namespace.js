/**
 * Unico namespace pubblico dell'applicazione.
 *
 * I moduli classici registrano qui soltanto le API che devono attraversare un
 * confine di dominio. Le funzioni interne restano private al rispettivo file.
 */
(function initializeVolleyEyeNamespace(root) {
  if (!root.VolleyEye || typeof root.VolleyEye !== "object") {
    root.VolleyEye = {};
  }
})(typeof window !== "undefined" ? window : self);
