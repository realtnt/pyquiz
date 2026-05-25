/* =====================================================================
 * PyQuiz.Editors — "spot_the_bug" form editor
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const DOM = PyQuiz.DOM;

  function bugOrModifyEditor(host, act, ctx) {
    const p = act.payload;
    const onChange = ctx.onChange || function () {};
    const isModify = act.type === "modify";

    DOM.field(host,
      isModify ? "Required behaviour" : "Expected behaviour",
      "textarea", p.expected_behaviour || "",
      v => { p.expected_behaviour = v; onChange(); },
      { rows: 2, hint: isModify ? "What the code should do AFTER the student's change." : "What the code should do." });
    DOM.field(host,
      isModify ? "Current behaviour" : "Actual behaviour",
      "textarea", p.actual_behaviour || "",
      v => { p.actual_behaviour = v; onChange(); },
      { rows: 2, hint: isModify ? "What it does now, before the change." : "What the buggy code does instead." });
    DOM.field(host, "Mode", "radio", p.mode || "select_and_fix", v => { p.mode = v; onChange(); }, [
      ["select_line", "Select only"],
      ["select_and_fix", "Select & fix"],
      ["rewrite", "Rewrite"]
    ]);
    DOM.field(host, "Constraint", "radio", p.constraint || "none", v => { p.constraint = v; onChange(); }, [
      ["none", "None"],
      ["one_line", "1 line"],
      ["one_char", "1 char"],
      ["add_line", "Add line"],
      ["remove_line", "Remove line"]
    ]);

    // Code editor — line-numbered, syntax-highlighted Python. The value
    // is the array p.code_lines joined by newlines and split back on
    // edit so existing pack structure is preserved.
    DOM.field(host, "Code", "code", (p.code_lines || []).join("\n"),
      v => { p.code_lines = v.split("\n"); onChange(); },
      { rows: 8, language: "python", lineNumbers: true });

    const bSec = DOM.el("div", { style: "margin-top:12px" });
    bSec.appendChild(DOM.h3(isModify ? "Required changes" : "Bugs"));
    const bList = DOM.el("div");
    bSec.appendChild(bList);

    function redrawBugs() {
      bList.innerHTML = "";
      if (!p.bugs || !p.bugs.length) {
        bList.appendChild(DOM.el("p", { class: "form-empty" },
          isModify ? "No changes yet." : "No bugs yet."));
      }
      (p.bugs || []).forEach((b, i) => {
        const card = DOM.el("div", { class: "form-card" });
        const head = DOM.el("div", { class: "form-card-head" });
        head.appendChild(DOM.el("strong", null, (isModify ? "Change " : "Bug ") + (i + 1)));
        head.appendChild(DOM.button("✕", () => { p.bugs.splice(i, 1); onChange(); redrawBugs(); }, "icon"));
        card.appendChild(head);
        DOM.field(card, "Line", "number", b.line, v => { b.line = parseInt(v, 10) || 1; onChange(); });
        DOM.field(card, "Category", "select", b.category || "logic", v => { b.category = v; onChange(); }, [
          ["syntax", "syntax"], ["runtime", "runtime"], ["logic", "logic"], ["type", "type"],
          ["indentation", "indentation"], ["name", "name"], ["off_by_one", "off-by-one"],
          ["operator", "operator"], ["variable", "variable"]
        ]);
        DOM.field(card, isModify ? "New line" : "Canonical fix",
          "text", b.fix, v => { b.fix = v; onChange(); });
        DOM.field(card, "Other accepted",
          "textarea", (b.accepted_fixes || []).join("\n"),
          v => { b.accepted_fixes = v.split("\n").filter(x => x.length); onChange(); },
          { rows: 2, hint: "One per line — alternatives also accepted." });
        bList.appendChild(card);
      });
    }
    redrawBugs();
    bSec.appendChild(DOM.button(isModify ? "+ Add change" : "+ Add bug", () => {
      p.bugs.push({ line: 1, category: "logic", fix: "", accepted_fixes: [] });
      onChange(); redrawBugs();
    }, "ghost"));
    host.appendChild(bSec);
  }
  PyQuiz.Editors.register("spot_the_bug", bugOrModifyEditor);
  PyQuiz.Editors.register("modify",       bugOrModifyEditor);
})();
