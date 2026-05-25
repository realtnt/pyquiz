/* =====================================================================
 * PyQuiz.Confetti — minimal in-DOM confetti effect
 *
 * Used when the student finishes all the non-challenge activities in
 * the pack. Pure DOM + CSS, no canvas, no external libraries. Respects
 * `prefers-reduced-motion` (skips silently when set).
 *
 * Public API:
 *   PyQuiz.Confetti.celebrate(opts?)
 *     opts.count  — number of pieces (default 180)
 *     opts.duration — total animation time in ms (default 3800)
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});

  const COLOURS = ["#2D5BA6", "#1E6E3C", "#D97706", "#B12A38", "#7B2D6B", "#0F6E84", "#E0B400"];

  function prefersReducedMotion() {
    try {
      return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) { return false; }
  }

  function celebrate(opts) {
    opts = opts || {};
    // Honour user's reduced-motion preference and the app's own override.
    const motionAttr = document.documentElement.getAttribute("data-motion");
    if (motionAttr === "off" || (motionAttr !== "on" && prefersReducedMotion())) return;

    const count = opts.count || 180;
    const duration = opts.duration || 3800;

    const layer = document.createElement("div");
    layer.className = "confetti-layer";
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);

    const W = window.innerWidth;
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.left = (Math.random() * W) + "px";
      piece.style.backgroundColor = COLOURS[Math.floor(Math.random() * COLOURS.length)];
      // Slight random size and rotation
      const size = 6 + Math.random() * 8;
      piece.style.width = size + "px";
      piece.style.height = (size * (0.4 + Math.random() * 0.6)) + "px";
      piece.style.animationDelay = (Math.random() * 400) + "ms";
      piece.style.animationDuration = (duration * (0.7 + Math.random() * 0.5)) + "ms";
      piece.style.setProperty("--rot-end", (Math.random() * 720 - 360) + "deg");
      piece.style.setProperty("--drift", ((Math.random() - 0.5) * 220) + "px");
      layer.appendChild(piece);
    }

    setTimeout(() => layer.remove(), duration + 600);
  }

  PyQuiz.Confetti = { celebrate: celebrate };
})();
