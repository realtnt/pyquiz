/* =====================================================================
 * PyQuiz.Editors — "starter_challenge" form editor
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const DOM = PyQuiz.DOM;

  PyQuiz.Editors.register("starter_challenge", function (host, act, ctx) {
    const p = act.payload;
    const onChange = ctx.onChange || function () {};

    DOM.field(host, "Instructions", "textarea", p.instructions || "",
      v => { p.instructions = v; onChange(); }, { rows: 2 });

    // Starter code — line-numbered Python.
    DOM.field(host, "Starter code", "code", p.starter_code || "",
      v => { p.starter_code = v; onChange(); },
      { rows: 6, language: "python", lineNumbers: true, hint: "Optional. Pre-filled in the student's editor." });

    DOM.field(host, "Function name", "text", p.function_name || "",
      v => { p.function_name = v; onChange(); },
      { hint: "Tells the runner which function to call when running examples." });

    // Example calls
    const exSec = DOM.el("div", { style: "margin-top:10px" });
    exSec.appendChild(DOM.h3("Example calls"));
    const list = DOM.el("div");
    exSec.appendChild(list);

    function redrawEx() {
      list.innerHTML = "";
      (p.example_calls || []).forEach((c, i) => {
        const row = DOM.el("div", { style: "display:grid;grid-template-columns:1fr 1fr 32px;gap:6px;align-items:center;margin-bottom:5px" });
        const a = DOM.el("input", { type: "text", value: c.call, placeholder: "e.g. double(2)", style: "font-family:var(--font-mono);padding:5px 7px;border:1px solid var(--border);border-radius:4px;font-size:0.9em" });
        a.addEventListener("input", () => { c.call = a.value; onChange(); });
        const b = DOM.el("input", { type: "text", value: c.expected, placeholder: "Expected", style: "font-family:var(--font-mono);padding:5px 7px;border:1px solid var(--border);border-radius:4px;font-size:0.9em" });
        b.addEventListener("input", () => { c.expected = b.value; onChange(); });
        const del = DOM.button("✕", () => { p.example_calls.splice(i, 1); onChange(); redrawEx(); }, "icon");
        del.title = "Remove example";
        row.appendChild(a); row.appendChild(b); row.appendChild(del);
        list.appendChild(row);
      });
    }
    redrawEx();
    exSec.appendChild(DOM.button("+ Add example call", () => {
      p.example_calls = p.example_calls || [];
      p.example_calls.push({ call: "", expected: "" });
      onChange(); redrawEx();
    }, "ghost"));
    host.appendChild(exSec);

    // Model solution — line-numbered Python.
    DOM.field(host, "Model solution", "code", p.model_solution || "",
      v => { p.model_solution = v; onChange(); },
      { rows: 6, language: "python", lineNumbers: true });

    DOM.field(host, "Self-check guidance", "textarea", p.self_check_guidance || "",
      v => { p.self_check_guidance = v; onChange(); }, { rows: 2 });
  });
})();
