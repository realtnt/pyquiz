/* === inlined from js/core/code_assembly.js === */
/* =====================================================================
 * PyQuiz.Code — pure code-assembly helpers
 *
 * Builds the runnable string of Python that an activity + response
 * represents. Used by:
 *   - the Copy button (codeForCopy) so the student can paste the
 *     activity's code into their IDE
 *   - tests that verify the assembly logic for each activity type
 *
 * No DOM dependencies. No Pyodide. Pure functions over the activity
 * payload + the student's response.
 *
 * Public API:
 *   PyQuiz.Code.assemble(activity, response) → string
 *      Returns the full runnable code including any auto-appended call
 *      to exercise a top-level def. Used by tests; not currently
 *      surfaced in the UI since v0.1 doesn't execute code at runtime.
 *
 *   PyQuiz.Code.codeForCopy(activity) → string
 *      Returns the code the student should see if they hit "Copy" —
 *      the canonical solution for parsons/cloze, the ORIGINAL (not
 *      the student's edit) for spot_the_bug/modify, and the displayed
 *      code for trace_table/predict_output. Suitable for clipboard.
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});

  function indentString(n, size) { return " ".repeat((n || 0) * (size || 4)); }

  function assembleParsons(act, resp) {
    const p = act.payload || {};
    const order = (resp && resp.solution_order) || [];
    /* Use the runtime-expanded payload (new schema) when available;
       fall back to the legacy `lines` array shape for safety. */
    if (PyQuiz.Parsons && PyQuiz.Parsons.expand) {
      const expanded = PyQuiz.Parsons.expand(p);
      return PyQuiz.Parsons.assemble(order, expanded.lines, expanded.indentSize);
    }
    const lines = p.lines || [];
    const byId = {};
    lines.forEach(l => byId[l.id] = l);
    return order
      .map(id => byId[id])
      .filter(Boolean)
      .map(l => indentString(l.indent || 0, p.indent_size_spaces || 4) + l.code)
      .join("\n");
  }

  function assembleCloze(act, resp) {
    const p = act.payload || {};
    const tpl = p.code_template || "";
    const blankResponses = (resp && resp.blanks) || {};
    return tpl.replace(/\{\{([^}]+)\}\}/g, (_, id) => {
      const v = blankResponses[id];
      return v != null && v !== "" ? v : "___";
    });
  }

  function assembleSpotTheBug(act, resp) {
    const p = act.payload || {};
    const lines = (p.code_lines || []).slice();
    resp = resp || {};

    /* add_line: { inserted: { after, content } }. Splice the new line
       into the original code at the requested position. */
    if (resp.inserted) {
      const ins = resp.inserted;
      const after = Math.max(0, Math.min(lines.length, ins.after || 0));
      lines.splice(after, 0, ins.content || "");
      return lines.join("\n");
    }
    /* remove_line: { removed: <lineNumber|null> }. */
    if (resp.removed != null) {
      const idx = resp.removed - 1;
      if (idx >= 0 && idx < lines.length) lines.splice(idx, 1);
      return lines.join("\n");
    }

    /* Default branch: per-line replacement (original behaviour). */
    const fixes = resp.fixes || {};
    const selected = resp.selected_lines || [];
    selected.forEach(lineNum => {
      const idx = lineNum - 1;
      if (idx < 0 || idx >= lines.length) return;
      const fix = fixes[lineNum];
      if (!fix) return;
      // Preserve original indentation if the student didn't supply leading
      // whitespace (matches the auto-fix-indent rule in Marker).
      const indentMatch = lines[idx].match(/^(\s*)/);
      const origIndent = indentMatch ? indentMatch[1] : "";
      const fixStripped = String(fix).replace(/^\s*/, "");
      lines[idx] = origIndent + fixStripped;
    });
    return lines.join("\n");
  }

  /* If `code` contains a `def name(...)` but the name is never
     referenced outside that definition, return a suitable call to
     append. Otherwise return null. Used by assemble() so the auto-
     appended call exercises an otherwise-dormant function definition. */
  function autoCallFor(code, examples) {
    if (!code) return null;
    const defs = [];
    const re = /^def\s+([A-Za-z_][A-Za-z_0-9]*)\s*\(([^)]*)\)/gm;
    let m;
    while ((m = re.exec(code)) !== null) {
      defs.push({ name: m[1], params: m[2].trim() });
    }
    if (!defs.length) return null;

    function isCalledElsewhere(name) {
      const stripped = code.replace(new RegExp("def\\s+" + name + "\\s*\\([^)]*\\)\\s*:", "g"), "");
      const callRe = new RegExp("\\b" + name + "\\s*\\(", "g");
      return callRe.test(stripped);
    }
    const uncalled = defs.find(d => !isCalledElsewhere(d.name));
    if (!uncalled) return null;

    if (examples && examples.length) {
      const ex = examples[0];
      if (ex && ex.call) return "print(" + ex.call + ")";
    }
    if (!uncalled.params) return "print(" + uncalled.name + "())";
    const argCount = uncalled.params.split(",").filter(s => s.trim()).length;
    return "print(" + uncalled.name + "(" + Array(argCount).fill("0").join(", ") + "))";
  }

  function assemble(activity, response) {
    if (!activity) return "";
    let code = "";
    switch (activity.type) {
      case "parsons":          code = assembleParsons(activity, response); break;
      case "cloze":            code = assembleCloze(activity, response); break;
      case "spot_the_bug":
      case "modify":           code = assembleSpotTheBug(activity, response); break;
      case "trace_table":      code = (activity.payload && activity.payload.code) || ""; break;
      case "predict_output":   code = (activity.payload && activity.payload.code) || ""; break;
      case "starter_challenge":
        code = (activity.payload && (activity.payload.model_solution || activity.payload.starter_code)) || "";
        break;
      default: code = "";
    }
    /* 1. If the activity specifies an explicit runner_call, use it
       UNLESS the code already calls the same function. */
    const explicit = activity.payload && activity.payload.runner_call;
    if (explicit) {
      const defNames = (code.match(/^def\s+([A-Za-z_][A-Za-z_0-9]*)/gm) || [])
        .map(s => s.replace(/^def\s+/, ""));
      const alreadyCalled = defNames.some(n => {
        const stripped = code.replace(new RegExp("def\\s+" + n + "\\s*\\([^)]*\\)\\s*:", "g"), "");
        return new RegExp("\\b" + n + "\\s*\\(", "g").test(stripped);
      });
      if (!alreadyCalled) {
        code = code.replace(/\s*$/, "") + "\n\n" + explicit + "\n";
        return code;
      }
    }
    /* 2. Otherwise fall back to the auto-call heuristic. */
    const examples = activity.payload && activity.payload.example_calls;
    const extra = autoCallFor(code, examples);
    if (extra) code = code.replace(/\s*$/, "") + "\n\n" + extra + "\n";
    return code;
  }

  /* Returns the code an activity is "about" — what the student sees
     on screen — suitable for placing on the clipboard. Differs from
     assemble() in two ways:
       1. No runner_call / auto-call is appended (runtime plumbing).
       2. For spot_the_bug / modify we return the ORIGINAL code, not
          the student's in-progress fix — the student typically wants
          to copy the starting code to their IDE so they can iterate.
     For activity types with no associated code (e.g. trace_table for
     reading-only) we still return the displayed code so the student
     can paste it into their editor. */
  function codeForCopy(activity) {
    if (!activity) return "";
    const p = activity.payload || {};
    switch (activity.type) {
      case "parsons": {
        /* Canonical ordering = the line numbers of canonical_code in
           order. Build a fake response in that order, then assemble. */
        if (PyQuiz.Parsons && PyQuiz.Parsons.expand) {
          const expanded = PyQuiz.Parsons.expand(p);
          return PyQuiz.Parsons.assemble(expanded.canonicalIds, expanded.lines, expanded.indentSize);
        }
        return assembleParsons(activity, { solution_order: p.solution || [] });
      }
      case "cloze":
        return assembleCloze(activity, { blanks: Object.fromEntries((p.blanks || []).map(b => [b.id, b.answer])) });
      case "spot_the_bug":
      case "modify":
        return (p.code_lines || []).join("\n");
      case "trace_table":
      case "predict_output":
        return p.code || "";
      case "starter_challenge":
        return p.starter_code || p.model_solution || "";
      default:
        return "";
    }
  }

  PyQuiz.Code = { assemble: assemble, codeForCopy: codeForCopy };
})();
