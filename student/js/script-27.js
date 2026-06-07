/* === PyQuiz.Renderers — "theory" === */
/* =====================================================================
 * A short, non-assessed explanation: an ordered list of blocks, each a
 * text paragraph, a code snippet (with an optional note) or an image.
 * Reading it IS the acknowledgement — the controller reports
 * { acknowledged: true } on mount, so it completes on view (no checkbox).
 *
 * Response shape: { acknowledged: boolean }
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const DOM = PyQuiz.DOM;

  PyQuiz.Renderers.register("theory", function (activity, host, cb) {
    const p = activity.payload || {};
    const blocks = Array.isArray(p.blocks) ? p.blocks : [];
    const root = DOM.el("div", { class: "theory" });

    blocks.forEach(function (b) {
      if (!b || typeof b !== "object") return;
      if (b.kind === "code") {
        root.appendChild(DOM.codeBlock(b.code || "", { lineNumbers: true, label: "Code" }));
        if (b.note && String(b.note).trim()) {
          root.appendChild(DOM.el("p", { class: "theory-note" }, b.note));
        }
      } else if (b.kind === "image") {
        const fig = DOM.el("figure", { class: "theory-figure" });
        fig.appendChild(DOM.el("img", { class: "theory-img", src: b.src || "", alt: b.alt || "" }));
        if (b.caption && String(b.caption).trim()) {
          fig.appendChild(DOM.el("figcaption", { class: "theory-caption" }, b.caption));
        }
        root.appendChild(fig);
      } else {
        // text (the default kind)
        root.appendChild(DOM.el("div", { class: "theory-text" }, b.text || ""));
      }
    });

    if (!blocks.length) {
      root.appendChild(DOM.el("p", { class: "kbd-help" }, "This explanation has no content yet."));
    }

    host.appendChild(root);

    // Non-assessed: reading is the acknowledgement. Report it on mount so the
    // activity is complete on view — there is nothing to check.
    if (cb && cb.onChange) { try { cb.onChange({ acknowledged: true }); } catch (e) {} }

    return {
      getResponse: function () { return { acknowledged: true }; },
      setResponse: function () {},
      reset: function () {},
      highlight: function () {},
      focus: function () {}
    };
  });
})();
