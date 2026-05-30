/* === inlined from js/editors/cloze.js === */
/* =====================================================================
 * PyQuiz.Editors — "cloze" form editor
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const DOM = PyQuiz.DOM;

  function nextBlankId(blanks) {
    const used = new Set(blanks.map(b => b.id));
    let i = 1;
    while (used.has(String(i))) i++;
    return String(i);
  }

  PyQuiz.Editors.register("cloze", function (host, act, ctx) {
    host.appendChild(DOM.el("p", { class: "le-note", style: "margin:0" },
      "Everything for this activity is edited in the centre — switch the middle pane to \u201cEdit\u201d."));
  });
})();
