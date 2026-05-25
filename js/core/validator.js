/* =====================================================================
 * PyQuiz.Validator — pack and activity validation (spec §12)
 *
 * Produces a flat list of issues:
 *   { level: "error" | "warning",
 *     path:  "activities[3].payload.blanks[1].answer",
 *     message: "Human-readable message" }
 *
 * Errors block export. Warnings do not.
 *
 * Public API:
 *   PyQuiz.Validator.pack(pack)            → issue[]
 *   PyQuiz.Validator.activity(act, path?)  → issue[]   (single-activity check)
 *   PyQuiz.Validator.errorsIn(issues)      → issue[]
 *   PyQuiz.Validator.warningsIn(issues)    → issue[]
 *
 * Per-type checks are registered on PyQuiz.Validator.types[<type>]
 * with signature (act, basePath, issues) => void. New types may
 * extend this map.
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const C = PyQuiz.Constants;

  const Validator = { types: {} };

  Validator.errorsIn   = function (issues) { return (issues || []).filter(i => i.level === "error"); };
  Validator.warningsIn = function (issues) { return (issues || []).filter(i => i.level === "warning"); };

  /* Activity-common checks (spec §12.2) */
  Validator.activity = function (act, basePath) {
    const base = basePath || "activity";
    const issues = [];
    if (!act || typeof act !== "object") {
      issues.push({ level: "error", path: base, message: "Activity is not an object." });
      return issues;
    }
    if (!act.id) issues.push({ level: "error", path: base + ".id", message: "Activity id missing." });
    if (!act.type) issues.push({ level: "error", path: base + ".type", message: "Activity type missing." });
    else if (!C.ACTIVITY_TYPES.includes(act.type)) issues.push({ level: "error", path: base + ".type", message: "Unknown activity type: " + act.type });
    if (!act.title) issues.push({ level: "error", path: base + ".title", message: "Activity title required." });
    if (!act.instructions) issues.push({ level: "warning", path: base + ".instructions", message: "Activity instructions are recommended." });
    if (act.difficulty != null && (act.difficulty < 1 || act.difficulty > 5)) {
      issues.push({ level: "error", path: base + ".difficulty", message: "Difficulty must be 1–5." });
    }
    if (act.timing && (!act.timing.limit_seconds || act.timing.limit_seconds <= 0)) {
      issues.push({ level: "error", path: base + ".timing.limit_seconds", message: "Timing limit must be > 0." });
    }
    if (act.colour && !/^#[0-9a-fA-F]{6}$/.test(String(act.colour))) {
      issues.push({ level: "warning", path: base + ".colour", message: "Colour should be a 6-digit hex string like #2D5BA6." });
    }
    const fn = Validator.types[act.type];
    if (typeof fn === "function") fn(act, base, issues);
    return issues;
  };

  /* Pack-level checks (spec §12.1) */
  Validator.pack = function (pack) {
    const issues = [];
    if (!pack || typeof pack !== "object") {
      issues.push({ level: "error", path: "", message: "Pack is not an object." });
      return issues;
    }
    if (pack.schema_version !== C.SCHEMA_VERSION) {
      issues.push({ level: "warning", path: "schema_version", message: "Schema version mismatch (" + pack.schema_version + " vs " + C.SCHEMA_VERSION + ")." });
    }
    if (pack.pack_format_version !== C.PACK_FORMAT_VERSION) {
      issues.push({ level: "warning", path: "pack_format_version", message: "Pack format version mismatch." });
    }
    if (!pack.id) issues.push({ level: "error", path: "id", message: "Pack id is required." });
    if (!pack.title) issues.push({ level: "error", path: "title", message: "Pack title is required." });
    const activities = Array.isArray(pack.activities) ? pack.activities : [];
    if (!activities.length) issues.push({ level: "warning", path: "activities", message: "Pack has no activities." });

    // Section checks (optional grouping)
    const sectionIds = new Set();
    const sections = Array.isArray(pack.sections) ? pack.sections : [];
    const numbersSeen = [];
    sections.forEach((sec, i) => {
      const base = "sections[" + i + "]";
      if (!sec.id) issues.push({ level: "error", path: base + ".id", message: "Section id is required." });
      else if (sectionIds.has(sec.id)) issues.push({ level: "error", path: base + ".id", message: "Duplicate section id: " + sec.id });
      else sectionIds.add(sec.id);
      if (!sec.title) issues.push({ level: "error", path: base + ".title", message: "Section title is required." });
      // Section numbers must be a positive integer; uniqueness and contiguity
      // are checked together after the loop.
      if (sec.number == null) {
        issues.push({ level: "error", path: base + ".number", message: "Section number is required (must be 1..N, contiguous across sections)." });
      } else if (typeof sec.number !== "number" || !Number.isInteger(sec.number) || sec.number < 1) {
        issues.push({ level: "error", path: base + ".number", message: "Section number must be a positive integer; got " + JSON.stringify(sec.number) });
      } else {
        numbersSeen.push({ idx: i, n: sec.number });
      }
      if (sec.colour && !/^#[0-9a-fA-F]{6}$/.test(String(sec.colour))) {
        issues.push({ level: "warning", path: base + ".colour", message: "Section colour should be a 6-digit hex string like #2D5BA6." });
      }
    });
    // Check contiguity: section numbers must form 1..N with no gaps or
    // duplicates. We only flag once, at the pack level, listing the
    // numbers we got so the teacher can spot the missing entry.
    if (sections.length && numbersSeen.length === sections.length) {
      const sortedNs = numbersSeen.map(x => x.n).slice().sort((a, b) => a - b);
      let expected = 1;
      let problem = null;
      for (const n of sortedNs) {
        if (n !== expected) {
          if (sortedNs.filter(x => x === n).length > 1) {
            problem = "Duplicate section number: " + n + ". Numbers seen: " + sortedNs.join(", ");
          } else {
            problem = "Section numbers must form a contiguous 1.." + sections.length + " sequence; expected " + expected + " but found " + n + ". Numbers seen: " + sortedNs.join(", ");
          }
          break;
        }
        expected++;
      }
      if (problem) issues.push({ level: "error", path: "sections", message: problem });
    }

    const seen = new Set();
    activities.forEach((act, i) => {
      const base = "activities[" + i + "]";
      // id uniqueness
      if (act.id) {
        if (seen.has(act.id)) issues.push({ level: "error", path: base + ".id", message: "Duplicate activity id: " + act.id });
        else seen.add(act.id);
      }
      // section reference
      if (act.section_id && sections.length && !sectionIds.has(act.section_id)) {
        issues.push({ level: "error", path: base + ".section_id", message: "Activity section_id does not match any section: " + act.section_id });
      }
      // Delegate the rest
      const actIssues = Validator.activity(act, base);
      for (const iss of actIssues) issues.push(iss);
    });
    return issues;
  };

  /* -------- per-type checks (spec §12.3) -------- */

  Validator.types.parsons = function (act, base, issues) {
    const p = act.payload || {};
    const lines = p.lines || [];
    if (!lines.length) issues.push({ level: "error", path: base + ".payload.lines", message: "Parsons needs at least one line." });
    const ids = new Set();
    const distIds = new Set();
    lines.forEach((l, i) => {
      if (!l.id) issues.push({ level: "error", path: base + ".payload.lines[" + i + "].id", message: "Line id required." });
      else if (ids.has(l.id)) issues.push({ level: "error", path: base + ".payload.lines[" + i + "].id", message: "Duplicate line id: " + l.id });
      else ids.add(l.id);
      if (l.distractor) distIds.add(l.id);
    });
    const sol = p.solution || [];
    if (!sol.length) issues.push({ level: "error", path: base + ".payload.solution", message: "Parsons solution is empty." });
    sol.forEach((id, i) => {
      if (!ids.has(id)) issues.push({ level: "error", path: base + ".payload.solution[" + i + "]", message: "Solution references unknown id: " + id });
      else if (distIds.has(id)) issues.push({ level: "error", path: base + ".payload.solution[" + i + "]", message: "Solution references a distractor: " + id });
    });
    const nonDist = lines.filter(l => !l.distractor).length;
    if (nonDist < 1) issues.push({ level: "error", path: base + ".payload.lines", message: "Parsons needs at least one non-distractor line." });
  };

  Validator.types.cloze = function (act, base, issues) {
    const p = act.payload || {};
    const tpl = p.code_template || "";
    const tplBlanks = Array.from(tpl.matchAll(/\{\{([^}]+)\}\}/g)).map(m => m[1]);
    const blanks = p.blanks || [];
    const blankIds = new Set(blanks.map(b => b.id));
    tplBlanks.forEach(id => {
      if (!blankIds.has(id)) issues.push({ level: "error", path: base + ".payload.code_template", message: "Template references missing blank: " + id });
    });
    blanks.forEach((b, i) => {
      const bpath = base + ".payload.blanks[" + i + "]";
      if (!tplBlanks.includes(b.id)) issues.push({ level: "error", path: bpath + ".id", message: "Blank " + b.id + " has no placeholder in template." });
      if (b.mode === "select") {
        if (!Array.isArray(b.options) || b.options.length < 2)
          issues.push({ level: "error", path: bpath + ".options", message: "Select blank needs ≥ 2 options." });
        else if (!b.options.includes(b.answer))
          issues.push({ level: "error", path: bpath + ".answer", message: "Answer not present in options." });
      } else if (b.mode === "bank") {
        if (!p.shared_pool) issues.push({ level: "error", path: base + ".payload.shared_pool", message: "bank blank requires shared_pool." });
        else if (!(p.shared_pool.items || []).includes(b.answer))
          issues.push({ level: "error", path: bpath + ".answer", message: "bank blank answer not in shared_pool.items." });
      } else if (b.mode === "free_text") {
        if (b.answer == null || b.answer === "") issues.push({ level: "error", path: bpath + ".answer", message: "Free text blank needs an answer." });
      } else {
        issues.push({ level: "error", path: bpath + ".mode", message: "Unknown blank mode: " + b.mode });
      }
    });
    if (p.shared_pool && p.shared_pool.has_distractors === false) {
      const poolBlanks = blanks.filter(b => b.mode === "bank").length;
      if ((p.shared_pool.items || []).length !== poolBlanks) {
        issues.push({ level: "error", path: base + ".payload.shared_pool.items", message: "Pool size must equal bank blank count when has_distractors is false." });
      }
    }
  };

  Validator.types.trace_table = function (act, base, issues) {
    const p = act.payload || {};
    const cols = p.columns || [];
    const codeLines = (p.code || "").split("\n").length;
    if (!(p.rows || []).length) issues.push({ level: "warning", path: base + ".payload.rows", message: "Trace table has no expected rows." });
    (p.rows || []).forEach((r, i) => {
      const rpath = base + ".payload.rows[" + i + "]";
      if (r.line < 1 || r.line > codeLines)
        issues.push({ level: "error", path: rpath + ".line", message: "Row line " + r.line + " out of range (1–" + codeLines + ")." });
    });
  };

  Validator.types.spot_the_bug = function (act, base, issues) {
    const p = act.payload || {};
    const lines = p.code_lines || [];
    const bugs = p.bugs || [];
    if (!bugs.length) issues.push({ level: "error", path: base + ".payload.bugs", message: "At least one bug required." });
    bugs.forEach((b, i) => {
      const bpath = base + ".payload.bugs[" + i + "]";
      if (b.line < 1 || b.line > lines.length)
        issues.push({ level: "error", path: bpath + ".line", message: "Bug line out of range." });
      if (p.mode === "select_and_fix" && !b.fix)
        issues.push({ level: "error", path: bpath + ".fix", message: "select_and_fix mode requires a fix." });
    });
  };
  // Modify shares the same payload shape as spot_the_bug; alias the
  // validator so authors get the same checks.
  Validator.types.modify = Validator.types.spot_the_bug;

  Validator.types.predict_output = function (act, base, issues) {
    const p = act.payload || {};
    if (p.direction === "output_to_code" && p.mode !== "multiple_choice")
      issues.push({ level: "error", path: base + ".payload.mode", message: "output_to_code direction requires multiple_choice mode." });
    if (p.mode === "multiple_choice") {
      const opts = p.options || [];
      if (opts.length < 2) issues.push({ level: "error", path: base + ".payload.options", message: "MC needs ≥ 2 options." });
      if (!opts.some(o => o.id === p.answer))
        issues.push({ level: "error", path: base + ".payload.answer", message: "Answer does not reference any option id." });
    } else if (p.mode === "free_text") {
      if (!p.answer) issues.push({ level: "error", path: base + ".payload.answer", message: "Free-text predict needs an answer." });
    } else {
      issues.push({ level: "error", path: base + ".payload.mode", message: "Unknown mode." });
    }
  };

  Validator.types.starter_challenge = function (act, base, issues) {
    const p = act.payload || {};
    if (!p.function_name) issues.push({ level: "warning", path: base + ".payload.function_name", message: "Function name recommended." });
    if (!(p.example_calls || []).length) issues.push({ level: "warning", path: base + ".payload.example_calls", message: "At least one example call recommended." });
  };

  PyQuiz.Validator = Validator;
})();
