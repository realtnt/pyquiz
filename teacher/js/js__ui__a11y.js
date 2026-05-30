/* === inlined from js/ui/a11y.js === */
/* =====================================================================
 * PyQuiz.A11y — accessibility helpers
 *
 * Wraps the two live regions (#live-polite and #live-assert) so the
 * apps don't have to know about them. If the regions aren't in the
 * DOM (e.g. tests, embedded use) the helpers no-op safely.
 *
 * Public API:
 *   PyQuiz.A11y.announce(message)         → polite live-region message
 *   PyQuiz.A11y.announceAssertive(message)→ assertive (timer expiry, errors)
 *   PyQuiz.A11y.focusMain()               → focus the main region
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});

  function announce(msg) {
    const el = document.getElementById("live-polite");
    if (el) el.textContent = msg;
  }
  function announceAssertive(msg) {
    const el = document.getElementById("live-assert");
    if (el) el.textContent = msg;
  }
  function focusMain() {
    const m = document.getElementById("main-region");
    if (m && typeof m.focus === "function") m.focus();
  }

  PyQuiz.A11y = { announce: announce, announceAssertive: announceAssertive, focusMain: focusMain };
})();
