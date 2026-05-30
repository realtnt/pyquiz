/* === inlined from js/editors/spot_the_bug.js === */
/* =====================================================================
 * PyQuiz.Editors — "spot_the_bug" form editor
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const DOM = PyQuiz.DOM;

  function bugOrModifyEditor(host, act, ctx) {
    host.appendChild(DOM.el("p", { class: "le-note", style: "margin:0" },
      "Everything for this activity is edited in the centre — switch the middle pane to \u201cEdit\u201d."));
  }
  PyQuiz.Editors.register("spot_the_bug", bugOrModifyEditor);
  PyQuiz.Editors.register("modify",       bugOrModifyEditor);
})();
