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
    const outputType = p.output_type || "lines";

    /* Column order: input columns (Test data), then Type of test, then
       Expected output. Responses are keyed by these column ids. The
       expected-output key was renamed output -> expected_output; we read
       both for back-compat. */
    const allCols = inputCols.map(c => ({
      id: c.id,
      label: "Input (" + (c.label || c.id) + ")",
      kind: "input",
      type: c.type || "str"
    }));
    allCols.push({ id: "test_type",       label: "Type of test",    kind: "type"   });
    allCols.push({ id: "expected_output", label: "Expected output", kind: "output" });

    const TEST_TYPES = [
      { v: "",          t: "—" },
      { v: "normal",    t: "Normal" },
      { v: "boundary",  t: "Boundary" },
      { v: "invalid",   t: "Invalid" },
      { v: "erroneous", t: "Erroneous" }
    ];

    function teacherOut(src) {
      if (src && src.expected_output != null && src.expected_output !== "") return src.expected_output;
      if (src && src.output != null) return src.output;
      return "";
    }
    /* Format the teacher's expected output for display per output_type.
       `lines` renders each line on its own row (fixes multi-line print
       output showing as one run-on string). Returns a DOM node. */
    function formatOutput(raw) {
      const s = raw == null ? "" : String(raw);
      if (s === "") return DOM.el("span", { class: "testing-out-empty" }, "—");
      return DOM.el("pre", { class: "testing-output" }, s);
    }

    /* A cell is teacher-GIVEN iff the teacher supplied a non-empty value
       (back-compat: an explicit prefilled list still wins). Blank cells are
       what the student fills. Expected output is display-only (never a
       student input). */
    function rowGiven(rowIdx) {
      const r = specRows[rowIdx] || {};
      const sv = r.values || {};
      const pre = Array.isArray(r.prefilled) ? r.prefilled : null;
      return function given(colId) {
        if (colId === "expected_output" || colId === "output") return true; // always display-only
        if (pre) return pre.indexOf(colId) >= 0;
        if (colId === "test_type") return (sv.test_type || "") !== "";
        return sv[colId] != null && String(sv[colId]) !== "";
      };
    }

    /* studentRows[i] holds EDITABLE state. Given cells mirror the teacher
       value (so snapshot emits a consistent response); blank cells start
       empty — never seed the canonical answer. */
    let studentRows = specRows.map((r, ri) => {
      const given = rowGiven(ri);
      const src = r.values || {};
      const v = {};
      allCols.forEach(c => {
        if (c.id === "expected_output") { v[c.id] = teacherOut(src); return; }
        v[c.id] = (given(c.id) && src[c.id] != null) ? src[c.id] : "";
      });
      return { values: v };
    });

    function isGiven(rowIdx, colId) { return rowGiven(rowIdx)(colId); }

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

    const note = DOM.el("p", { class: "testing-fill-note" });
    note.appendChild(DOM.el("span", { class: "swatch", "aria-hidden": "true" }));
    note.appendChild(document.createTextNode("Complete the highlighted cells."));
    root.appendChild(note);

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
          // Expected output is always display-only context.
          if (c.id === "expected_output") {
            td.classList.add("testing-prefilled");
            td.appendChild(formatOutput(row.values[c.id]));
            tr.appendChild(td);
            return;
          }
          const given = isGiven(ri, c.id);
          if (given) {
            td.classList.add("testing-prefilled");
            td.appendChild(DOM.el("span", { class: "testing-pre" }, row.values[c.id] == null ? "" : String(row.values[c.id])));
          } else if (c.id === "test_type") {
            td.classList.add("testing-fill");
            const sel = DOM.el("select", {
              class: "trace-input testing-type",
              "aria-label": "Type of test for row " + (ri + 1),
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
            td.classList.add("testing-fill");
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
      const order = allCols.map(c => c.id);
      const idx = order.indexOf(colId);
      for (let r = rowIdx; r < studentRows.length; r++) {
        const start = (r === rowIdx) ? idx + 1 : 0;
        for (let i = start; i < order.length; i++) {
          if (order[i] !== "expected_output" && !isGiven(r, order[i])) {
            ev.preventDefault();
            focusCell(r, order[i]);
            return;
          }
        }
      }
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
            if (c.id === "expected_output") return;        // display-only
            if (isGiven(ri, c.id)) return;                  // teacher value is authoritative
            if (v[c.id] != null) studentRows[ri].values[c.id] = String(v[c.id]);
          });
        });
        renderBody();
      },
      reset: function () {
        studentRows = specRows.map((r, ri) => {
          const given = rowGiven(ri);
          const src = r.values || {};
          const v = {};
          allCols.forEach(c => {
            if (c.id === "expected_output") { v[c.id] = teacherOut(src); return; }
            v[c.id] = (given(c.id) && src[c.id] != null) ? src[c.id] : "";
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
        for (let r = 0; r < studentRows.length; r++) {
          for (const c of allCols) {
            if (c.id !== "expected_output" && !isGiven(r, c.id)) { focusCell(r, c.id); return; }
          }
        }
      }
    };
  });
})();
