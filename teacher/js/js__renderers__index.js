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

  const Renderers = {
    register: function (type, renderFn) {
      _types[type] = renderFn;
    },
    has: function (type) { return typeof _types[type] === "function"; },
    render: function (activity, host, callbacks) {
      host.innerHTML = "";
      const fn = _types[activity.type];
      if (typeof fn !== "function") {
        host.textContent = "No renderer registered for type " + activity.type;
        return null;
      }
      return fn(activity, host, callbacks || {});
    }
  };

  PyQuiz.Renderers = Renderers;
})();
