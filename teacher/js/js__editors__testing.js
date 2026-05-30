/* === inlined from js/editors/testing.js === */
/* =====================================================================
 * PyQuiz.Editors — "testing" form editor
 *
 * Builds:
 *   - Code editor
 *   - Function name (optional)
 *   - Input columns: id, label, type, range (min/max or
 *     min_length/max_length), decision_boundaries (comma list)
 *   - Rows: each cell editable, with a "prefilled" checkbox per cell
 *     so the teacher chooses which cells the student sees vs fills.
 *
 * Warning surfaced when neither input nor test_type is prefilled for a
 * row — that's the unanchored "any consistent pair works" case the
 * design notes call out.
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const DOM = PyQuiz.DOM;

  PyQuiz.Editors.register("testing", function (host, act, ctx) {
    host.appendChild(DOM.el("p", { class: "le-note", style: "margin:0" },
      "Everything for this activity is edited in the centre — switch the middle pane to “Edit”."));
  });
})();
