/* === inlined from js/editors/index.js === */
/* =====================================================================
 * PyQuiz.Editors — teacher-tool activity editors
 *
 * Per-type form editor for the teacher tool. Same registration pattern
 * as Renderers: each editor self-registers. Editors are NOT bundled
 * into the student tool.
 *
 * An editor is a function(host, activity, ctx) where:
 *   host    — element to render the form into (already cleared)
 *   activity — the activity object being edited (mutated in place)
 *   ctx     — { onChange, refresh }
 *               onChange()  call after any mutation so the shell can save
 *               refresh()   rebuild this editor pane (e.g. after switching
 *                           a mode that adds/removes fields)
 *
 * Public API:
 *   PyQuiz.Editors.register(type, editFn)
 *   PyQuiz.Editors.edit(activity, host, ctx) → void
 *   PyQuiz.Editors.has(type) → boolean
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const _types = {};

  const Editors = {
    register: function (type, editFn) { _types[type] = editFn; },
    has: function (type) { return typeof _types[type] === "function"; },
    edit: function (activity, host, ctx) {
      host.innerHTML = "";
      const fn = _types[activity.type];
      if (typeof fn !== "function") {
        host.textContent = "No editor registered for type " + activity.type;
        return;
      }
      fn(host, activity, ctx || {});
    }
  };

  PyQuiz.Editors = Editors;
})();
