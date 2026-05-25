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
    const p = act.payload;
    const onChange = ctx.onChange || function () {};
    const refresh = ctx.refresh || function () {};

    // Template editor — syntax-highlighted with line numbers, plus an
    // "Insert blank" button that injects a {{n}} placeholder.
    const tpl = DOM.field(host, "Code template", "code", p.code_template || "",
      v => { p.code_template = v; onChange(); },
      { rows: 7, language: "python", lineNumbers: true,
        hint: "Use {{id}} placeholders for blanks. Or click the button below to insert one." });
    // Insert-blank button sits underneath the editor. We bypass the
    // code-editor's syntax layer and write directly to the underlying
    // textarea so the cursor position is honoured.
    const insBtn = DOM.button("Insert blank at cursor", () => {
      const id = nextBlankId(p.blanks || []);
      const newBlank = { id: id, mode: "free_text", answer: "", accepted: [], case_sensitive: true, width_hint: 4 };
      p.blanks = p.blanks || [];
      p.blanks.push(newBlank);
      const start = tpl.selectionStart != null ? tpl.selectionStart : tpl.value.length;
      const before = tpl.value.slice(0, start);
      const after = tpl.value.slice(start);
      tpl.value = before + "{{" + id + "}}" + after;
      p.code_template = tpl.value;
      // Trigger an input event so the syntax-highlighted overlay refreshes
      tpl.dispatchEvent(new Event("input", { bubbles: true }));
      onChange();
      refresh();
    }, "ghost");
    insBtn.style.marginTop = "6px";
    insBtn.style.marginBottom = "10px";
    host.appendChild(insBtn);

    host.appendChild(DOM.h3("Blanks"));
    const blanksHost = DOM.el("div");
    host.appendChild(blanksHost);

    function redrawBlanks() {
      blanksHost.innerHTML = "";
      if (!p.blanks || !p.blanks.length) {
        blanksHost.appendChild(DOM.el("p", { class: "form-empty" }, "No blanks yet — insert one above to begin."));
      }
      (p.blanks || []).forEach((b, i) => {
        const card = DOM.el("div", { class: "form-card" });
        const headRow = DOM.el("div", { class: "form-card-head" });
        headRow.appendChild(DOM.el("strong", null, "Blank {{" + b.id + "}}"));
        headRow.appendChild(DOM.button("✕", () => {
          p.blanks.splice(i, 1);
          onChange(); redrawBlanks();
        }, "icon"));
        card.appendChild(headRow);

        DOM.field(card, "Id", "text", b.id, v => {
          const old = b.id;
          if (v && v !== old) {
            b.id = v;
            p.code_template = (p.code_template || "").split("{{" + old + "}}").join("{{" + v + "}}");
            tpl.value = p.code_template;
            tpl.dispatchEvent(new Event("input", { bubbles: true }));
            onChange();
          }
        });
        DOM.field(card, "Mode", "radio", b.mode, v => { b.mode = v; onChange(); redrawBlanks(); }, [
          ["free_text", "Free text"], ["select", "Drop-down"], ["bank", "Word bank"]
        ]);
        if (b.mode === "free_text") {
          DOM.field(card, "Answer", "text", b.answer, v => { b.answer = v; onChange(); });
          DOM.field(card, "Also accepted", "text", (b.accepted || []).join(", "), v => { b.accepted = v.split(",").map(s => s.trim()).filter(s => s.length); onChange(); }, { hint: "Comma-separated alternative answers." });
          DOM.field(card, "Case sensitive", "checkbox", b.case_sensitive !== false, v => { b.case_sensitive = v; onChange(); });
          DOM.field(card, "Width hint", "number", b.width_hint || 6, v => { b.width_hint = parseInt(v, 10) || 6; onChange(); }, { hint: "Approximate width of the input in characters." });
        } else if (b.mode === "select") {
          DOM.field(card, "Options", "text", (b.options || []).join(", "), v => { b.options = v.split(",").map(s => s.trim()).filter(s => s.length); onChange(); }, { hint: "Comma-separated — these become the drop-down options." });
          DOM.field(card, "Answer", "text", b.answer, v => { b.answer = v; onChange(); });
        } else if (b.mode === "bank") {
          DOM.field(card, "Answer", "text", b.answer, v => { b.answer = v; onChange(); }, { hint: "Must match one of the shared bank items below." });
        }
        blanksHost.appendChild(card);
      });
    }
    redrawBlanks();

    // Shared pool — collapsible block
    const poolSec = DOM.el("div", { class: "form-section", style: "margin-top:10px" });
    poolSec.appendChild(DOM.h3("Shared bank"));
    DOM.field(poolSec, "Use shared bank", "checkbox", !!p.shared_pool, v => {
      p.shared_pool = v ? { items: [], has_distractors: true, single_use: true } : null;
      onChange(); refresh();
    }, { hint: "Required if any blank uses 'Word bank' mode." });
    if (p.shared_pool) {
      DOM.field(poolSec, "Items", "text", (p.shared_pool.items || []).join(", "), v => { p.shared_pool.items = v.split(",").map(s => s.trim()).filter(s => s.length); onChange(); }, { hint: "Comma-separated values shown as chips for students to pick." });
      DOM.field(poolSec, "Has distractors", "checkbox", p.shared_pool.has_distractors !== false, v => { p.shared_pool.has_distractors = v; onChange(); }, { hint: "When off, the pool size must equal the number of bank blanks." });
      DOM.field(poolSec, "Single use", "checkbox", p.shared_pool.single_use !== false, v => { p.shared_pool.single_use = v; onChange(); }, { hint: "Each item can only be placed once." });
    }
    host.appendChild(poolSec);
  });
})();
