/* === inlined from js/editors/predict_output.js === */
/* =====================================================================
 * PyQuiz.Editors — "predict_output" form editor
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const DOM = PyQuiz.DOM;

  PyQuiz.Editors.register("predict_output", function (host, act, ctx) {
    host.appendChild(DOM.el("p", { class: "le-note", style: "margin:0" },
      "Everything for this activity is edited in the centre — switch the middle pane to \u201cEdit\u201d."));
  });
})();
