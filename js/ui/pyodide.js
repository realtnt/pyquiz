/* =====================================================================
 * PyQuiz.Pyodide — lazy Pyodide loader and code runner
 *
 * Loads Pyodide from the jsDelivr CDN on first use. After that the
 * browser caches the wheels and subsequent runs are fast. Pyodide is
 * not bundled because it's ~10 MB; we only fetch it when the student
 * actually wants to run code.
 *
 * Network availability:
 *   - On first use the student needs internet (the runner panel shows
 *     a loading state and falls back to a clear error message if the
 *     CDN can't be reached).
 *   - Subsequent runs in the same browser/session are fully offline.
 *
 * Public API:
 *   PyQuiz.Pyodide.isReady()                       → boolean
 *   PyQuiz.Pyodide.load()                          → Promise<void>
 *   PyQuiz.Pyodide.run(code)                       → Promise<{stdout, stderr, error}>
 *   PyQuiz.Pyodide.assemble(activity, response)    → string  (the code
 *                                                   that "would" be run
 *                                                   for an activity +
 *                                                   student response)
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});

  const PYODIDE_VERSION = "0.26.4";
  const CDN_BASE = "https://cdn.jsdelivr.net/pyodide/v" + PYODIDE_VERSION + "/full/";
  const LOADER_SCRIPT = CDN_BASE + "pyodide.js";

  let pyodide = null;
  let loadingPromise = null;

  function isReady() { return pyodide !== null; }

  function load() {
    if (pyodide) return Promise.resolve();
    if (loadingPromise) return loadingPromise;
    loadingPromise = new Promise((resolve, reject) => {
      // Tests can stub loadPyodide globally
      if (typeof window.loadPyodide === "function") {
        window.loadPyodide({ indexURL: CDN_BASE }).then(p => { pyodide = p; resolve(); }, reject);
        return;
      }
      const script = document.createElement("script");
      script.src = LOADER_SCRIPT;
      script.onload = function () {
        window.loadPyodide({ indexURL: CDN_BASE }).then(p => { pyodide = p; resolve(); }, reject);
      };
      script.onerror = function () { reject(new Error("Could not load Pyodide from the CDN. Are you offline?")); };
      document.head.appendChild(script);
    });
    loadingPromise.catch(() => { loadingPromise = null; });
    return loadingPromise;
  }

  async function run(code, opts) {
    opts = opts || {};
    await load();
    try {
      // Set up stdout/stderr capture and (optionally) replace input() with
      // a feeder over a pre-supplied list of strings.
      const inputs = Array.isArray(opts.inputs) ? opts.inputs : null;
      const setup = [
        "import sys, io, builtins",
        "sys.stdout = io.StringIO()",
        "sys.stderr = io.StringIO()"
      ];
      if (inputs) {
        // Feed inputs from a queue; if exhausted, raise EOFError (the
        // default Python behaviour when input is closed).
        setup.push("__pyquiz_inputs = " + JSON.stringify(inputs));
        setup.push("__pyquiz_orig_input = builtins.input");
        setup.push("def __pyquiz_input(prompt=''):");
        setup.push("    if prompt: print(prompt, end='')");
        setup.push("    if not __pyquiz_inputs: raise EOFError('no more inputs supplied')");
        setup.push("    val = __pyquiz_inputs.pop(0)");
        setup.push("    print(val)");
        setup.push("    return val");
        setup.push("builtins.input = __pyquiz_input");
      }
      pyodide.runPython(setup.join("\n"));

      let err = "";
      try {
        await pyodide.runPythonAsync(code);
      } catch (e) {
        err = String(e && e.message || e);
      }
      const stdout = pyodide.runPython("sys.stdout.getvalue()");
      const stderr = pyodide.runPython("sys.stderr.getvalue()");
      // Reset streams (and input if we patched it)
      const teardown = ["sys.stdout = sys.__stdout__", "sys.stderr = sys.__stderr__"];
      if (inputs) teardown.push("builtins.input = __pyquiz_orig_input");
      pyodide.runPython(teardown.join("\n"));
      return { stdout: stdout || "", stderr: stderr || "", error: err };
    } catch (e) {
      return { stdout: "", stderr: "", error: String(e && e.message || e) };
    }
  }

  /* ----- Assemble what to run for a given activity + response ----- */

  function indentString(n, size) { return " ".repeat((n || 0) * (size || 4)); }

  function assembleParsons(act, resp) {
    const p = act.payload || {};
    const lines = p.lines || [];
    const order = (resp && resp.solution_order) || [];
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
    const fixes = (resp && resp.fixes) || {};
    const selected = (resp && resp.selected_lines) || [];
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

  /**
   * If `code` contains a `def name(...)` but the name is never referenced
   * outside that definition, return a suitable call to append. Otherwise
   * return null.
   *
   * - If `examples` is provided and non-empty, use the first example call.
   * - Otherwise emit `print(name())` for zero-arg functions, or just
   *   `print(name(0))` as a best-guess fallback for one-arg functions.
   */
  function autoCallFor(code, examples) {
    if (!code) return null;
    // Find all top-level def names
    const defs = [];
    const re = /^def\s+([A-Za-z_][A-Za-z_0-9]*)\s*\(([^)]*)\)/gm;
    let m;
    while ((m = re.exec(code)) !== null) {
      defs.push({ name: m[1], params: m[2].trim() });
    }
    if (!defs.length) return null;

    // Pick a definition whose name does not appear anywhere outside its def line
    function isCalledElsewhere(name) {
      // Strip the def line so we only check the rest of the file
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
    // One-or-more-arg function with no example: best-effort placeholder
    // Use 0 for each param (won't always make sense, but better than nothing).
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
    // 1. If the activity specifies an explicit runner_call, use it
    //    UNLESS the code already calls the same function.
    const explicit = activity.payload && activity.payload.runner_call;
    if (explicit) {
      // If a def is followed by a call to that name elsewhere, the explicit
      // runner_call is redundant — skip it. Otherwise append.
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
    // 2. Otherwise fall back to the auto-call heuristic.
    const examples = activity.payload && activity.payload.example_calls;
    const extra = autoCallFor(code, examples);
    if (extra) code = code.replace(/\s*$/, "") + "\n\n" + extra + "\n";
    return code;
  }

  PyQuiz.Pyodide = { isReady: isReady, load: load, run: run, assemble: assemble };
})();
