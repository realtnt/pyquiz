/* =====================================================================
 * PyQuiz.Editors — "parsons" form editor
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const DOM = PyQuiz.DOM;

  function nextLineId(lines) {
    const used = new Set(lines.map(l => l.id));
    let i = 0;
    while (true) {
      const candidate = String.fromCharCode(97 + (i % 26)) + (i >= 26 ? String(Math.floor(i / 26)) : "");
      if (!used.has(candidate)) return candidate;
      i++;
    }
  }

  PyQuiz.Editors.register("parsons", function (host, act, ctx) {
    const p = act.payload;
    const onChange = ctx.onChange || function () {};

    DOM.field(host, "Indent size (spaces)", "number", p.indent_size_spaces || 4, v => { p.indent_size_spaces = parseInt(v, 10) || 4; onChange(); });

    const head = DOM.el("div", { style: "margin-top:12px;margin-bottom:6px" });
    head.appendChild(DOM.h3("Lines"));
    const note = DOM.el("p", { class: "kbd-help" }, "Non-distractor lines form the solution in the order shown. Distractor lines are extra blocks the student should leave unused. Use ↑/↓ to reorder.");
    head.appendChild(note);
    host.appendChild(head);

    const list = DOM.el("div", { class: "lines-editor" });
    host.appendChild(list);

    const previewWrap = DOM.el("div", { style: "margin-top:16px" });
    previewWrap.appendChild(DOM.h3("Solution preview"));
    const pre = DOM.el("pre", { class: "code-block", style: "font-family:var(--font-mono)" });
    previewWrap.appendChild(pre);

    function updateSolutionFromList() {
      p.solution = p.lines.filter(l => !l.distractor && l.id).map(l => l.id);
    }
    function refreshPreview() {
      const indent = p.indent_size_spaces || 4;
      pre.textContent = p.lines.filter(l => !l.distractor)
        .map(l => " ".repeat((l.indent || 0) * indent) + l.code).join("\n");
    }

    function redraw() {
      list.innerHTML = "";
      p.lines.forEach((line, i) => {
        const row = DOM.el("div", { class: "line-row" });
        row.appendChild(DOM.el("span", { class: "line-grip", "aria-hidden": "true" }, "⋮⋮"));

        const codeIn = DOM.el("input", { type: "text", value: line.code, placeholder: "code" });
        codeIn.addEventListener("input", () => { line.code = codeIn.value; updateSolutionFromList(); onChange(); refreshPreview(); });
        row.appendChild(codeIn);

        const indentIn = DOM.el("input", { type: "number", value: line.indent || 0, min: "0", title: "indent level" });
        indentIn.addEventListener("input", () => { line.indent = parseInt(indentIn.value, 10) || 0; onChange(); refreshPreview(); });
        row.appendChild(indentIn);

        const distLab = DOM.el("label");
        const distChk = DOM.el("input", { type: "checkbox" });
        distChk.checked = !!line.distractor;
        distChk.addEventListener("change", () => { line.distractor = distChk.checked; updateSolutionFromList(); onChange(); redraw(); });
        distLab.appendChild(distChk);
        distLab.appendChild(document.createTextNode(" distractor"));
        row.appendChild(distLab);

        const fixLab = DOM.el("label");
        const fixChk = DOM.el("input", { type: "checkbox" });
        fixChk.checked = !!line.fixed;
        fixChk.addEventListener("change", () => { line.fixed = fixChk.checked; onChange(); });
        fixLab.appendChild(fixChk);
        fixLab.appendChild(document.createTextNode(" fixed"));
        row.appendChild(fixLab);

        const ctrl = DOM.el("div", { class: "line-ctrl" });
        const up = DOM.el("button", { type: "button", title: "Move up" }, "↑");
        up.disabled = i === 0;
        up.addEventListener("click", () => {
          if (i > 0) { const t = p.lines[i]; p.lines[i] = p.lines[i - 1]; p.lines[i - 1] = t; updateSolutionFromList(); onChange(); redraw(); refreshPreview(); }
        });
        const dn = DOM.el("button", { type: "button", title: "Move down" }, "↓");
        dn.disabled = i === p.lines.length - 1;
        dn.addEventListener("click", () => {
          if (i < p.lines.length - 1) { const t = p.lines[i]; p.lines[i] = p.lines[i + 1]; p.lines[i + 1] = t; updateSolutionFromList(); onChange(); redraw(); refreshPreview(); }
        });
        const del = DOM.el("button", { type: "button", class: "del", title: "Remove" }, "✕");
        del.addEventListener("click", () => {
          p.lines.splice(i, 1); updateSolutionFromList(); onChange(); redraw(); refreshPreview();
        });
        ctrl.appendChild(up); ctrl.appendChild(dn); ctrl.appendChild(del);
        row.appendChild(ctrl);

        list.appendChild(row);
      });
      refreshPreview();
    }
    redraw();

    const addBtn = DOM.button("+ Add line", () => {
      const id = nextLineId(p.lines);
      p.lines.push({ id: id, code: "", indent: 0, distractor: false, fixed: false });
      updateSolutionFromList(); onChange(); redraw();
    }, "ghost");
    addBtn.style.marginTop = "8px";
    host.appendChild(addBtn);

    host.appendChild(previewWrap);
  });
})();
