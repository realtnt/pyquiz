/* === PyQuiz.Editors — "theory" form editor === */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const DOM = PyQuiz.DOM;

  PyQuiz.Editors.register("theory", function (host, act, ctx) {
    host.appendChild(DOM.el("p", { class: "le-note", style: "margin:0" },
      "Build the explanation in the centre — switch the middle pane to Edit to add text, code and image blocks."));
  });
})();
