/* === inlined from js/editors/trace_table.js === */
/* =====================================================================
 * PyQuiz.Editors — "trace_table" form editor
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const DOM = PyQuiz.DOM;

  PyQuiz.Editors.register("trace_table", function (host, act, ctx) {
    const p = act.payload || (act.payload = {});
    // Undefined token is handled internally — teachers don't need to set it.
    if (!p.undefined_token) p.undefined_token = "—";
    host.appendChild(DOM.el("p", { class: "le-note", style: "margin:0" },
      "Everything for this activity is edited in the centre — switch the middle pane to \u201cEdit\u201d."));
  });
})();
