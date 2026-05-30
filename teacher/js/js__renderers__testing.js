/* === inlined from js/renderers/testing.js === */
/* =====================================================================
 * PyQuiz.Renderers — "testing"
 *
 * Code panel above an editable table of test cases. Columns are
 *   [each input declared in payload.input_columns] + Output + Test type
 * Test type is a Normal / Boundary / Erroneous dropdown.
 *
 * Cells listed in row.prefilled are read-only with the teacher's value
 * shown. The rest are editable by the student. Same model as
 * trace_table — for the visual paradigm — but rows are FIXED (the
 * teacher decides how many test cases there are); the student can't
 * add or delete rows.
 *
 * Response shape:
 *   { rows: [ { values: { <colId>: "<string>", ... } }, ... ] }
 *
 * Indices in rows[] match payload.rows[] one-for-one so the marker can
 * walk them in lock-step.
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const DOM = PyQuiz.DOM;

  PyQuiz.Renderers.register("testing", function (activity, host, cb) {
    const p = activity.payload || {};
    const inputCols = Array.isArray(p.input_columns) ? p.input_columns : [];
    const specRows = Array.isArray(p.rows) ? p.rows : [];

    /* Build the full column order: input columns, then Output, then
       Test type. The student responses are keyed by these column IDs. */
    const allCols = inputCols.map(c => ({
      id: c.id,
      label: c.label || c.id,
      kind: "input",
      type: c.type || "str"
    }));
    allCols.push({ id: "output",    label: "Expected output", kind: "output" });
    allCols.push({ id: "test_type", label: "Test type",       kind: "type"   });

    const TEST_TYPES = [
      { v: "",          t: "—" },
      { v: "normal",    t: "Normal" },
      { v: "boundary",  t: "Boundary" },
      { v: "erroneous", t: "Erroneous" }
    ];

    /* studentRows[i] holds the EDITABLE state for row i. Prefilled cells
       have their teacher value mirrored in here so snapshot() emits the
       same value regardless of who supplied it. EDITABLE (non-prefilled)
       cells start EMPTY — we must NOT seed them with the canonical answer
       from the pack data, or the student would see the answer pre-typed. */
    let studentRows = specRows.map(r => {
      const pre = Array.isArray(r.prefilled) ? r.prefilled : [];
      const src = r.values || {};
      const v = {};
      allCols.forEach(c => {
        v[c.id] = (pre.indexOf(c.id) >= 0 && src[c.id] != null) ? src[c.id] : "";
      });
      return { values: v };
    });

    function isPrefilled(rowIdx, colId) {
      const r = specRows[rowIdx];
      if (!r || !Array.isArray(r.prefilled)) return false;
      return r.prefilled.indexOf(colId) >= 0;
    }

    const root = DOM.el("div", { class: "trace testing" });
    root.appendChild(DOM.codeBlock(p.code || "", { lineNumbers: true, label: "Code under test" }));

    const wrap = DOM.el("div", { class: "trace-table-wrap" });
    const table = DOM.el("table", { class: "trace-table testing-table", "aria-label": "Test case table" });
    const thead = DOM.el("thead");
    const trh = DOM.el("tr");
    allCols.forEach(c => trh.appendChild(DOM.el("th", { scope: "col" }, c.label)));
    thead.appendChild(trh);
    table.appendChild(thead);
    const tbody = DOM.el("tbody");
    table.appendChild(tbody);
    wrap.appendChild(table);
    root.appendChild(wrap);

    host.appendChild(root);

    function snapshot() {
      return { rows: studentRows.map(r => ({ values: Object.assign({}, r.values) })) };
    }

    function renderBody() {
      tbody.innerHTML = "";
      studentRows.forEach((row, ri) => {
        const tr = DOM.el("tr", { "data-row": String(ri) });
        allCols.forEach(c => {
          const td = DOM.el("td", { "data-col": c.id });
          const pre = isPrefilled(ri, c.id);
          if (pre) {
            td.classList.add("testing-prefilled");
            td.appendChild(DOM.el("span", { class: "testing-pre" }, row.values[c.id] == null ? "" : String(row.values[c.id])));
          } else if (c.id === "test_type") {
            const sel = DOM.el("select", {
              class: "trace-input testing-type",
              "aria-label": "Test type for row " + (ri + 1),
              "data-row": String(ri),
              "data-col": c.id
            });
            TEST_TYPES.forEach(opt => {
              const o = DOM.el("option", { value: opt.v }, opt.t);
              if ((row.values[c.id] || "") === opt.v) o.selected = true;
              sel.appendChild(o);
            });
            sel.addEventListener("change", () => {
              row.values[c.id] = sel.value;
              if (cb.onChange) cb.onChange(snapshot());
            });
            td.appendChild(sel);
          } else {
            const inp = DOM.el("input", {
              type: "text",
              class: "trace-input",
              "aria-label": c.label + " for row " + (ri + 1),
              "data-row": String(ri),
              "data-col": c.id,
              autocomplete: "off",
              spellcheck: "false"
            });
            inp.value = row.values[c.id] == null ? "" : String(row.values[c.id]);
            inp.addEventListener("input", () => {
              row.values[c.id] = inp.value;
              if (cb.onChange) cb.onChange(snapshot());
            });
            inp.addEventListener("keydown", ev => handleKey(ev, ri, c.id));
            td.appendChild(inp);
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }

    function focusCell(ri, colId) {
      const sel = '[data-row="' + ri + '"][data-col="' + colId + '"]';
      const tr = tbody.querySelector('tr[data-row="' + ri + '"]');
      if (!tr) return;
      const cell = tr.querySelector(sel) || tr.querySelector('[data-col="' + colId + '"] input, [data-col="' + colId + '"] select');
      if (!cell) return;
      const focusable = cell.tagName === "INPUT" || cell.tagName === "SELECT" ? cell : cell.querySelector("input, select");
      if (focusable && typeof focusable.focus === "function") focusable.focus();
    }

    function handleKey(ev, rowIdx, colId) {
      if (ev.key !== "Enter" && ev.key !== "Tab") return;
      if (ev.key === "Tab" && ev.shiftKey) return;
      // Find the next editable cell across (current row), wrapping to
      // the next row's first editable cell if at the end.
      const order = allCols.map(c => c.id);
      const idx = order.indexOf(colId);
      // Walk forward from idx+1 to end of this row, then next rows.
      for (let r = rowIdx; r < studentRows.length; r++) {
        const start = (r === rowIdx) ? idx + 1 : 0;
        for (let i = start; i < order.length; i++) {
          if (!isPrefilled(r, order[i])) {
            ev.preventDefault();
            focusCell(r, order[i]);
            return;
          }
        }
      }
      // No further editable cell — let the browser advance focus out of
      // the table.
    }

    renderBody();

    return {
      getResponse: snapshot,
      setResponse: function (r) {
        if (!r || !Array.isArray(r.rows)) return;
        r.rows.forEach((stored, ri) => {
          if (!studentRows[ri]) return;
          const v = (stored && stored.values) || {};
          allCols.forEach(c => {
            // Never overwrite prefilled values with stale stored data —
            // the teacher's prefill is authoritative.
            if (isPrefilled(ri, c.id)) return;
            if (v[c.id] != null) studentRows[ri].values[c.id] = String(v[c.id]);
          });
        });
        renderBody();
      },
      reset: function () {
        studentRows = specRows.map(r => {
          const v = {};
          allCols.forEach(c => {
            if (isPrefilled(specRows.indexOf(r), c.id)) {
              v[c.id] = (r.values || {})[c.id] || "";
            } else {
              v[c.id] = "";
            }
          });
          return { values: v };
        });
        renderBody();
      },
      highlight: function (per_part) {
        if (!per_part || !per_part.cells) return;
        const cells = per_part.cells;
        studentRows.forEach((_, ri) => {
          const tr = tbody.querySelector('tr[data-row="' + ri + '"]');
          if (!tr) return;
          allCols.forEach(c => {
            const td = tr.querySelector('td[data-col="' + c.id + '"]');
            if (!td) return;
            td.classList.remove("cell-ok", "cell-bad");
            const key = ri + ":" + c.id;
            if (cells[key] === true)  td.classList.add("cell-ok");
            if (cells[key] === false) td.classList.add("cell-bad");
          });
        });
      },
      focus: function () {
        // Focus the first editable cell.
        for (let r = 0; r < studentRows.length; r++) {
          for (const c of allCols) {
            if (!isPrefilled(r, c.id)) { focusCell(r, c.id); return; }
          }
        }
      }
    };
  });
})();
