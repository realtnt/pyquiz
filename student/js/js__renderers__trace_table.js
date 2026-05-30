/* === inlined from js/renderers/trace_table.js === */
/* =====================================================================
 * PyQuiz.Renderers — "trace_table"
 *
 * Code panel with line numbers above an editable table. The student
 * fills in every step: the line number AND the variable/output values.
 * The table starts empty (no rows). Students add rows themselves:
 *   - Click "+ Add row" button
 *   - Or press Tab/Enter from the rightmost cell of the last row
 *
 * Empty cells mean "value unchanged from previous row" — so students
 * only need to fill in what changed on that line.
 *
 * Response shape:
 *   { rows: [ { line: <num>, values: { <colId>: <string>, ... } }, ... ] }
 *
 * Backwards compat: an older { cells: { "<rowIdx>:<colId>": v } } shape
 * is accepted by setResponse so existing progress records still restore.
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const DOM = PyQuiz.DOM;

  PyQuiz.Renderers.register("trace_table", function (activity, host, cb) {
    const p = activity.payload || {};
    const cols = p.columns || [];

    // Student state: array of { line: "", values: { colId: "" } }
    let studentRows = [];

    const root = DOM.el("div", { class: "trace" });
    root.appendChild(DOM.codeBlock(p.code || "", { lineNumbers: true, label: "Code to trace" }));
    // Inline helper text removed — the same tips live in the Help section
    // pinned to the bottom of the side panel.

    const wrap = DOM.el("div", { class: "trace-table-wrap" });
    const table = DOM.el("table", { class: "trace-table", "aria-label": "Trace table" });
    const thead = DOM.el("thead");
    const trh = DOM.el("tr");
    trh.appendChild(DOM.el("th", { scope: "col" }, "Line"));
    cols.forEach(c => trh.appendChild(DOM.el("th", { scope: "col" }, c.label)));
    trh.appendChild(DOM.el("th", { scope: "col", "aria-label": "Remove row" }, ""));
    thead.appendChild(trh);
    table.appendChild(thead);
    const tbody = DOM.el("tbody");
    table.appendChild(tbody);
    // Footer row holds the centred + button so it aligns with the table,
    // not with the surrounding container width.
    const tfoot = DOM.el("tfoot");
    const tfootRow = DOM.el("tr");
    const addCell = DOM.el("td", { class: "trace-add-cell", colspan: String(cols.length + 2) });
    const addBtn = DOM.el("button", {
      type: "button",
      class: "trace-add-row",
      "aria-label": "Add a new trace row",
      title: "Add row"
    }, "+");
    addBtn.addEventListener("click", () => { addRow(); focusRow(studentRows.length - 1, "__line__"); });
    addCell.appendChild(addBtn);
    tfootRow.appendChild(addCell);
    tfoot.appendChild(tfootRow);
    table.appendChild(tfoot);
    wrap.appendChild(table);
    root.appendChild(wrap);

    host.appendChild(root);

    function snapshot() {
      return { rows: studentRows.map(r => ({ line: r.line, values: Object.assign({}, r.values) })) };
    }

    function addRow() {
      const values = {};
      cols.forEach(c => values[c.id] = "");
      studentRows.push({ line: "", values: values });
      renderBody();
      if (cb.onChange) cb.onChange(snapshot());
    }

    function removeRow(idx) {
      studentRows.splice(idx, 1);
      renderBody();
      if (cb.onChange) cb.onChange(snapshot());
    }

    function renderBody() {
      tbody.innerHTML = "";
      studentRows.forEach((row, ri) => {
        const tr = DOM.el("tr");
        // Line cell
        const lineTd = DOM.el("td");
        const lineInput = DOM.el("input", {
          type: "number",
          class: "trace-input trace-line",
          min: "1",
          "aria-label": "Line number for row " + (ri + 1),
          "data-row": String(ri),
          "data-col": "__line__",
          autocomplete: "off"
        });
        lineInput.value = row.line == null ? "" : String(row.line);
        lineInput.addEventListener("input", () => {
          row.line = lineInput.value === "" ? "" : (parseInt(lineInput.value, 10) || "");
          if (cb.onChange) cb.onChange(snapshot());
        });
        lineInput.addEventListener("keydown", ev => handleKey(ev, ri, "__line__"));
        lineTd.appendChild(lineInput);
        tr.appendChild(lineTd);

        // Value cells
        cols.forEach(c => {
          const td = DOM.el("td");
          const inp = DOM.el("input", {
            type: "text",
            class: "trace-input",
            "aria-label": c.label + " for row " + (ri + 1) + " (leave empty if unchanged)",
            "data-row": String(ri),
            "data-col": c.id,
            autocomplete: "off",
            spellcheck: "false"
          });
          inp.value = row.values[c.id] || "";
          inp.addEventListener("input", () => {
            row.values[c.id] = inp.value;
            if (cb.onChange) cb.onChange(snapshot());
          });
          inp.addEventListener("keydown", ev => handleKey(ev, ri, c.id));
          td.appendChild(inp);
          tr.appendChild(td);
        });

        // Remove
        const delTd = DOM.el("td");
        const del = DOM.el("button", { type: "button", class: "btn icon", "aria-label": "Remove row " + (ri + 1), title: "Remove row" }, "✕");
        del.style.minHeight = "32px";
        del.addEventListener("click", () => removeRow(ri));
        delTd.appendChild(del);
        tr.appendChild(delTd);

        tbody.appendChild(tr);
      });
    }

    function focusRow(rowIdx, colId) {
      const sel = 'input[data-row="' + rowIdx + '"][data-col="' + colId + '"]';
      const inp = table.querySelector(sel);
      if (inp) inp.focus();
    }

    function handleKey(ev, rowIdx, colId) {
      // Enter or Tab from any cell — advance to next cell in row, or
      // to first cell of next row, or add a new row if we're at the very end.
      if (ev.key !== "Enter" && ev.key !== "Tab") return;
      // For Tab with shift, let the browser handle backwards navigation
      if (ev.key === "Tab" && ev.shiftKey) return;
      ev.preventDefault();

      // Determine the order of column IDs for navigation: line first, then payload cols
      const order = ["__line__"].concat(cols.map(c => c.id));
      const idx = order.indexOf(colId);
      if (idx < order.length - 1) {
        focusRow(rowIdx, order[idx + 1]);
        return;
      }
      // We're on the last column of this row
      if (rowIdx === studentRows.length - 1) {
        addRow();
        // After re-render, focus the new row's line cell
        focusRow(studentRows.length - 1, "__line__");
      } else {
        focusRow(rowIdx + 1, "__line__");
      }
    }

    renderBody();
    // Start with one empty row visible. Push directly rather than calling
    // addRow() so we don't mark the activity as 'in_progress' on load.
    {
      const values = {};
      cols.forEach(c => values[c.id] = "");
      studentRows.push({ line: "", values: values });
      renderBody();
    }

    return {
      getResponse: snapshot,
      setResponse: function (r) {
        if (!r) return;
        // New shape
        if (Array.isArray(r.rows)) {
          studentRows = r.rows.map(row => ({
            line: row.line || "",
            values: Object.assign({}, row.values || {})
          }));
          renderBody();
          return;
        }
        // Old shape: { cells: { "<rowIdx>:<colId>": value } } — best-effort
        if (r.cells && typeof r.cells === "object") {
          const tmp = {};
          for (const key of Object.keys(r.cells)) {
            const [riStr, cid] = key.split(":");
            const ri = parseInt(riStr, 10);
            if (!tmp[ri]) tmp[ri] = { line: "", values: {} };
            tmp[ri].values[cid] = r.cells[key];
          }
          studentRows = Object.keys(tmp).map(i => tmp[i]);
          renderBody();
        }
      },
      reset: function () {
        studentRows = [];
        const values = {};
        cols.forEach(c => values[c.id] = "");
        studentRows.push({ line: "", values: values });
        renderBody();
      },
      highlight: function (per_part) {
        /* per_part === null clears all cell marks. */
        if (per_part === null) {
          table.querySelectorAll("tbody input").forEach(i => i.classList.remove("mark-ok", "mark-bad"));
          return;
        }
        if (!per_part || !per_part.rows) return;
        for (const key of Object.keys(per_part.rows)) {
          const ok = per_part.rows[key];
          const [riStr, cid] = key.split(":");
          const ri = parseInt(riStr, 10);
          const sel = 'input[data-row="' + ri + '"][data-col="' + cid + '"]';
          const inp = table.querySelector(sel);
          if (inp) {
            inp.classList.remove("mark-ok", "mark-bad");
            inp.classList.add(ok ? "mark-ok" : "mark-bad");
          }
        }
      },
      focus: function () {
        const first = table.querySelector("tbody input");
        if (first) first.focus();
      }
    };
  });
})();
