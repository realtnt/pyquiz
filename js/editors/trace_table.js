/* =====================================================================
 * PyQuiz.Editors — "trace_table" form editor
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const DOM = PyQuiz.DOM;

  PyQuiz.Editors.register("trace_table", function (host, act, ctx) {
    const p = act.payload;
    const onChange = ctx.onChange || function () {};

    // Line-numbered Python editor for the code to trace.
    DOM.field(host, "Code", "code", p.code || "",
      v => { p.code = v; onChange(); },
      { rows: 8, language: "python", lineNumbers: true });

    DOM.field(host, "Undefined token", "text", p.undefined_token || "—",
      v => { p.undefined_token = v || "—"; onChange(); },
      { hint: "Shown in cells where the variable hasn't been assigned yet." });

    // Columns
    const cSec = DOM.el("div", { class: "form-section", style: "margin-top:12px" });
    cSec.appendChild(DOM.h3("Columns"));
    const cList = DOM.el("div");
    cSec.appendChild(cList);

    function redrawCols() {
      cList.innerHTML = "";
      (p.columns || []).forEach((c, i) => {
        const row = DOM.el("div", { style: "display:grid;grid-template-columns:1fr 1fr 1fr 36px;gap:8px;margin-bottom:6px" });
        const idIn = DOM.el("input", { type: "text", value: c.id, placeholder: "id", title: "id", style: "padding:6px;border:1px solid var(--border);border-radius:4px" });
        idIn.addEventListener("input", () => {
          const old = c.id;
          c.id = idIn.value;
          (p.rows || []).forEach(r => {
            if (r.values && old in r.values) { r.values[c.id] = r.values[old]; delete r.values[old]; }
            r.prefilled = (r.prefilled || []).map(x => x === old ? c.id : x);
          });
          onChange();
        });
        const labelIn = DOM.el("input", { type: "text", value: c.label, placeholder: "label", style: "padding:6px;border:1px solid var(--border);border-radius:4px" });
        labelIn.addEventListener("input", () => { c.label = labelIn.value; onChange(); });
        const kindSel = DOM.el("select", { style: "padding:6px;border:1px solid var(--border);border-radius:4px" });
        [["variable", "variable"], ["output", "output"], ["other", "other"]].forEach(([v, l]) => {
          const o = DOM.el("option", { value: v }, l);
          if (v === c.kind) o.selected = true;
          kindSel.appendChild(o);
        });
        kindSel.addEventListener("change", () => { c.kind = kindSel.value; onChange(); });
        const del = DOM.button("✕", () => { p.columns.splice(i, 1); onChange(); redrawCols(); redrawRows(); }, "danger");
        del.style.minHeight = "32px";
        row.appendChild(idIn); row.appendChild(labelIn); row.appendChild(kindSel); row.appendChild(del);
        cList.appendChild(row);
      });
    }
    redrawCols();
    cSec.appendChild(DOM.button("+ Add column", () => {
      p.columns.push({ id: "c" + ((p.columns || []).length + 1), label: "new", kind: "variable" });
      onChange(); redrawCols(); redrawRows();
    }, "ghost"));
    host.appendChild(cSec);

    // Rows
    const rSec = DOM.el("div", { class: "form-section", style: "margin-top:12px" });
    rSec.appendChild(DOM.h3("Rows"));
    const rList = DOM.el("div");
    rSec.appendChild(rList);

    function span(text, cls) { return DOM.el("span", cls ? { class: cls } : null, text); }

    function redrawRows() {
      rList.innerHTML = "";
      const cols = p.columns || [];
      const headTpl = "60px " + cols.map(() => "1fr").join(" ") + " 36px";
      const head = DOM.el("div", { style: "display:grid;gap:6px;align-items:center;margin-bottom:4px;grid-template-columns:" + headTpl });
      head.appendChild(span("Line", "muted"));
      cols.forEach(c => head.appendChild(span(c.label, "muted")));
      head.appendChild(span("", "muted"));
      rList.appendChild(head);

      (p.rows || []).forEach((r, ri) => {
        const row = DOM.el("div", { style: "display:grid;gap:6px;align-items:center;margin-bottom:4px;grid-template-columns:" + headTpl });
        const lineIn = DOM.el("input", { type: "number", value: r.line, min: "1", style: "padding:4px;border:1px solid var(--border);border-radius:4px" });
        lineIn.addEventListener("input", () => { r.line = parseInt(lineIn.value, 10) || 1; onChange(); });
        row.appendChild(lineIn);
        cols.forEach(c => {
          const cell = DOM.el("div");
          const inp = DOM.el("input", { type: "text", placeholder: "value (blank = unchanged)", style: "width:100%;padding:4px;border:1px solid var(--border);border-radius:4px;font-family:var(--font-mono)" });
          inp.value = (r.values && r.values[c.id] != null) ? r.values[c.id] : "";
          inp.addEventListener("input", () => { r.values = r.values || {}; r.values[c.id] = inp.value; onChange(); });
          cell.appendChild(inp);
          row.appendChild(cell);
        });
        const del = DOM.button("✕", () => { p.rows.splice(ri, 1); onChange(); redrawRows(); }, "danger");
        del.style.minHeight = "32px";
        row.appendChild(del);
        rList.appendChild(row);
      });
    }
    redrawRows();
    rSec.appendChild(DOM.button("+ Add row", () => {
      const vals = {};
      (p.columns || []).forEach(c => vals[c.id] = "");
      p.rows.push({ line: 1, values: vals });
      onChange(); redrawRows();
    }, "ghost"));
    rSec.appendChild(DOM.el("p", { class: "kbd-help", style: "margin-top:6px", html: "Leave a cell empty to mean <em>unchanged from the previous row</em>. The student fills in line numbers themselves and may add as many rows as they need." }));
    host.appendChild(rSec);
  });
})();
