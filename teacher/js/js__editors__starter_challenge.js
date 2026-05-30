/* === inlined from js/editors/starter_challenge.js === */
/* =====================================================================
 * PyQuiz.Editors — "starter_challenge" form editor
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const DOM = PyQuiz.DOM;

  PyQuiz.Editors.register("starter_challenge", function (host, act, ctx) {
    const p = act.payload || (act.payload = {});
    // The challenge brief now lives in the activity's Core instructions, like
    // every other type. Migrate any legacy payload.instructions up once.
    if (p.instructions && !act.instructions) { act.instructions = p.instructions; }
    if (p.instructions != null) delete p.instructions;
    host.appendChild(DOM.el("p", { class: "le-note", style: "margin:0" },
      "Everything for this activity is edited in the centre — switch the middle pane to \u201cEdit\u201d."));
  });
})();
