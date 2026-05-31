/* === inlined from js/renderers/index.js === */
/* =====================================================================
 * PyQuiz.Renderers — student-facing activity renderers
 *
 * Each per-type renderer self-registers by calling Renderers.register.
 * Adding a new activity type means: drop a renderer file under
 * js/renderers/, register the type, include the file in both shells.
 * No other code needs to change.
 *
 * A renderer is a function(activity, host, callbacks) that builds DOM
 * inside `host` and returns a "controller" with this shape:
 *   {
 *     getResponse()             → response object (type-specific)
 *     setResponse(response)     → restore prior response
 *     reset()                   → clear all input
 *     highlight(per_part)       → mark cells/blanks as ok/bad based on
 *                                 the per_part field of a MarkResult
 *   }
 *
 * Callbacks (all optional):
 *   onChange(response)          — fires on every edit; the shell stores it
 *
 * Public API:
 *   PyQuiz.Renderers.register(type, renderFn)
 *   PyQuiz.Renderers.render(activity, host, callbacks?) → controller
 *   PyQuiz.Renderers.has(type) → boolean
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const _types = {};

  /* Version-aware registry. Each type can register multiple renderer
     versions: register(type, fn, version). An activity carries
     `renderer_version` (an integer, default 1); render() picks the exact
     version if present, else the highest registered version <= requested,
     else the highest available — so a pack authored at v1 keeps rendering
     with the v1 renderer even after a v2 is added, and a newer pack degrades
     gracefully on an older app. */
  function pickVersion(type, want) {
    const byV = _types[type];
    if (!byV) return null;
    const versions = Object.keys(byV).map(Number).sort(function (a, b) { return a - b; });
    if (!versions.length) return null;
    if (byV[want]) return byV[want];
    let best = null;
    for (let i = 0; i < versions.length; i++) {
      if (versions[i] <= want) best = versions[i];
    }
    if (best == null) best = versions[0];          // requested older than anything we have
    return byV[best];
  }
  const Renderers = {
    register: function (type, renderFn, version) {
      const v = (version == null) ? 1 : version;
      if (!_types[type] || typeof _types[type] !== "object") _types[type] = {};
      _types[type][v] = renderFn;
    },
    has: function (type) { return !!_types[type] && Object.keys(_types[type]).length > 0; },
    versions: function (type) {
      return _types[type] ? Object.keys(_types[type]).map(Number).sort(function (a, b) { return a - b; }) : [];
    },
    render: function (activity, host, callbacks) {
      host.innerHTML = "";
      const want = (activity && activity.renderer_version) ? (parseInt(activity.renderer_version, 10) || 1) : 1;
      const fn = pickVersion(activity.type, want);
      if (typeof fn !== "function") {
        host.textContent = "No renderer registered for type " + activity.type;
        return null;
      }
      return fn(activity, host, callbacks || {});
    }
  };

  PyQuiz.Renderers = Renderers;
})();
