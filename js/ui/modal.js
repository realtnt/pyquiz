/* =====================================================================
 * PyQuiz.Modal — accessible modal dialog helper
 *
 * Public API:
 *   PyQuiz.Modal.open(opts) → { root, close }
 *     opts.title      string (required)
 *     opts.body       Element | string
 *     opts.footer     Element | null
 *     opts.maxWidth   CSS string, e.g. "720px"
 *     opts.dismissible boolean (default true) — clicking outside / Escape closes
 *     opts.onClose    function called after close
 *
 *   PyQuiz.Modal.closeAll() — close every open modal
 *
 * Focus is moved into the modal on open and returned to the trigger on close.
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const DOM = PyQuiz.DOM;

  function open(opts) {
    opts = opts || {};
    const trigger = document.activeElement;
    const dismissible = opts.dismissible !== false;

    const back = DOM.el("div", { class: "modal-backdrop", role: "presentation" });
    const modal = DOM.el("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-label": opts.title || "Dialog" });
    if (opts.maxWidth) modal.style.maxWidth = opts.maxWidth;

    const closeBtn = DOM.el("button", { class: "btn icon", "aria-label": "Close" }, "✕");
    const header = DOM.el("header", null,
      DOM.el("h2", null, opts.title || ""),
      closeBtn);

    const body = DOM.el("div", { class: "modal-body" });
    if (opts.body instanceof Element) body.appendChild(opts.body);
    else if (typeof opts.body === "string") body.textContent = opts.body;

    modal.appendChild(header);
    modal.appendChild(body);
    if (opts.footer instanceof Element) modal.appendChild(opts.footer);
    back.appendChild(modal);

    function close() {
      back.remove();
      document.removeEventListener("keydown", onKey);
      if (typeof opts.onClose === "function") opts.onClose();
      if (trigger && typeof trigger.focus === "function") trigger.focus();
    }
    function onKey(ev) {
      if (ev.key === "Escape" && dismissible) { ev.preventDefault(); close(); }
    }
    closeBtn.addEventListener("click", close);
    back.addEventListener("click", e => { if (e.target === back && dismissible) close(); });
    document.addEventListener("keydown", onKey);

    document.body.appendChild(back);
    // Focus first focusable element inside the modal
    setTimeout(() => {
      const f = modal.querySelector("input, textarea, select, button, [tabindex]");
      if (f && typeof f.focus === "function") f.focus();
    }, 0);

    return { root: modal, body: body, close: close };
  }

  function closeAll() {
    document.querySelectorAll(".modal-backdrop").forEach(b => b.remove());
  }

  PyQuiz.Modal = { open: open, closeAll: closeAll };
})();
