/* === inlined from js/renderers/io_panel.js === */
/* =====================================================================
 * PyQuiz.Renderers.ioPanel
 *
 * Standard I/O summary block shown at the top of every activity (in
 * the student tool). The format is intentionally consistent across
 * activity types so students always know where to look:
 *
 *   ┌──────────┬─────────────┬─────────────┐
 *   │          │ Current     │ Expected    │   <- columns
 *   ├──────────┼─────────────┼─────────────┤
 *   │ Input    │  (or "—")   │  (or "—")   │
 *   │ Output   │  printed    │  expected   │
 *   └──────────┴─────────────┴─────────────┘
 *
 * Layout rules:
 *   • Input row ALWAYS shown — value or em-dash placeholder if none.
 *   • Output row ALWAYS shown.
 *   • Current column ONLY shown when the activity has a meaningful
 *     "current_output" (typically spot_the_bug and modify, where the
 *     existing code already produces something and the student needs
 *     to change it).
 *   • Expected column highlighted in light blue so it's the dominant
 *     visual anchor — that's what the student is aiming for.
 *
 * Data shape (all optional, all on `act` directly):
 *   • act.expected_input   string  — fed to input() at runtime
 *   • act.expected_output  string  — what the program should print
 *   • act.current_output   string  — what the buggy/unchanged code
 *                                    prints today (bug / modify only)
 *
 * Falls back gracefully for predict_output (which has act.payload.answer
 * as its expected output) so older packs without the new fields still
 * render a useful panel.
 * ===================================================================== */
(function () {
  const DOM = PyQuiz.DOM;

  /* Naive "extract literal print() output" helper, used as a fallback
     for Parsons and Cloze when the teacher hasn't set expected_output
     explicitly. Mirrors the same logic in build-primm-pack.js — if the
     assembled program is just `print("X")` lines, we can show "X" in
     the Output cell. Anything else returns null and we skip the
     fallback. */
  function deriveFromPrints(code) {
    if (!code) return null;
    const lines = String(code).split("\n");
    const out = [];
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      const m = line.match(/^print\(\s*(['"])([\s\S]*?)\1\s*\)$/);
      if (!m) return null;
      out.push(m[2]);
    }
    return out.length ? out.join("\n") : null;
  }
  function deriveParsons(payload) {
    if (!payload) return null;
    /* New schema: canonical_code is already the assembled program. */
    if (typeof payload.canonical_code === "string" && payload.canonical_code.trim()) {
      return deriveFromPrints(payload.canonical_code);
    }
    /* Legacy fallback: lines + solution ids. */
    if (!Array.isArray(payload.lines) || !Array.isArray(payload.solution)) return null;
    const byId = {};
    payload.lines.forEach(l => { byId[l.id] = l; });
    const assembled = payload.solution.map(id => {
      const l = byId[id]; if (!l) return "";
      const indent = " ".repeat((l.indent || 0) * (payload.indent_size_spaces || 4));
      return indent + l.code;
    }).join("\n");
    return deriveFromPrints(assembled);
  }
  function deriveCloze(payload) {
    if (!payload || !payload.code_template || !Array.isArray(payload.blanks)) return null;
    let code = payload.code_template;
    for (const b of payload.blanks) {
      if (b.answer == null) return null;
      code = code.split("{{" + b.id + "}}").join(String(b.answer));
    }
    return deriveFromPrints(code);
  }

  function pickExpectedOutput(act) {
    /* Predict activities exist precisely so the student works the
       output out themselves. Showing it in the I/O panel would defeat
       the activity. Skip unconditionally even if the teacher set
       expected_output by mistake. */
    if (act.type === "predict_output") return "";
    if (act.expected_output != null && act.expected_output !== "") return String(act.expected_output);
    if (act.type === "parsons") {
      const d = deriveParsons(act.payload); if (d != null) return d;
    }
    if (act.type === "cloze") {
      const d = deriveCloze(act.payload); if (d != null) return d;
    }
    if (act.type === "starter_challenge") {
      const ex = ((act.payload || {}).example_calls || [])[0];
      if (ex && ex.expected != null) return String(ex.expected);
    }
    return "";
  }

  function pickInput(act) {
    if (act.expected_input != null && act.expected_input !== "") return String(act.expected_input);
    /* `runner_inputs` is the array used by the Pyodide runner; if the
       teacher set it, treat each entry as a separate line of input. */
    if (Array.isArray(act.runner_inputs) && act.runner_inputs.length) {
      return act.runner_inputs.join("\n");
    }
    return "";
  }

  function pickSampleCall(act) {
    /* An explicit "—" means the teacher has said "this activity isn't
       function-call-shaped, don't show this row at all". Treat it as
       suppression rather than rendering the dash literally. */
    if (act.sample_call === "—" || act.sample_call === "-") return "";
    if (act.sample_call != null && act.sample_call !== "") return String(act.sample_call);
    /* starter_challenge has example_calls — use the first one as the
       implicit sample call so function-based tasks get a meaningful
       row without the teacher repeating themselves. */
    if (act.type === "starter_challenge" && act.payload && Array.isArray(act.payload.example_calls)) {
      const first = act.payload.example_calls[0];
      if (first && first.call) return String(first.call);
    }
    return "";
  }

  /* Build a <div class="io-panel"> with the 2-column or 3-column table.
     Rows are added conditionally — only those with content show up, so
     activities with nothing to show (e.g. a Parsons block where the
     teacher hasn't set output yet) get no panel at all and activities
     with partial info get a tidy 1-row panel rather than rows of "—". */
  function build(act) {
    const expected = pickExpectedOutput(act);
    const input = pickInput(act);
    const sample = pickSampleCall(act);
    const current = (act.current_output != null && act.current_output !== "") ? String(act.current_output) : "";
    // Prose behaviour descriptions (bug/modify): show them in the panel too so
    // students see what the code does now vs what it should do.
    const pl = act.payload || {};
    const behExpected = (pl.expected_behaviour != null && pl.expected_behaviour !== "") ? String(pl.expected_behaviour) : "";
    const behCurrent  = (pl.actual_behaviour  != null && pl.actual_behaviour  !== "") ? String(pl.actual_behaviour)  : "";

    /* Skip the panel entirely if every cell would be empty. */
    if (!expected && !input && !sample && !current && !behExpected && !behCurrent) return null;

    const hasCurrent = current !== "" || behCurrent !== "";
    const wrap = DOM.el("div", { class: "io-panel" + (hasCurrent ? " io-panel-3col" : " io-panel-2col") });
    const grid = DOM.el("div", { class: "io-grid" });

    if (hasCurrent) {
      grid.appendChild(DOM.el("div", { class: "io-corner" }));
      grid.appendChild(DOM.el("div", { class: "io-col-head io-col-current" }, "Current"));
      grid.appendChild(DOM.el("div", { class: "io-col-head io-col-expected" }, "Expected"));
    } else {
      grid.appendChild(DOM.el("div", { class: "io-corner" }));
      grid.appendChild(DOM.el("div", { class: "io-col-head io-col-expected" }, "Expected"));
    }

    function addRow(label, value, valueCurrent, opts) {
      opts = opts || {};
      const pcls = opts.prose ? " io-cell-prose" : "";
      if (hasCurrent && opts.splitColumns) {
        grid.appendChild(DOM.el("div", { class: "io-row-head" }, label));
        grid.appendChild(DOM.el("pre", { class: "io-cell io-cell-current" + pcls + (valueCurrent ? "" : " io-empty") }, valueCurrent || "—"));
        grid.appendChild(DOM.el("pre", { class: "io-cell io-cell-expected" + pcls + (value ? "" : " io-empty") }, value || "—"));
      } else if (hasCurrent) {
        grid.appendChild(DOM.el("div", { class: "io-row-head" }, label));
        grid.appendChild(DOM.el("pre", { class: "io-cell io-cell-span2" + pcls }, value));
      } else {
        grid.appendChild(DOM.el("div", { class: "io-row-head" }, label));
        grid.appendChild(DOM.el("pre", { class: "io-cell io-cell-expected" + pcls }, value));
      }
    }

    /* Behaviour row first (the framing), then concrete I/O. */
    if (behExpected || behCurrent) addRow("Behaviour", behExpected || "—", behCurrent || "—", { splitColumns: true, prose: true });
    if (input)    addRow("Input",       input);
    if (sample)   addRow("Sample call", sample);
    if (expected || current) addRow("Output", expected || "—", current || "—", { splitColumns: true });

    wrap.appendChild(grid);
    return wrap;
  }

  PyQuiz.Renderers = PyQuiz.Renderers || {};
  PyQuiz.Renderers.ioPanel = { build: build };
})();
