/* === inlined from js/core/validator.js === */
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
    /* Hints — accept legacy string[] OR new [{type, text}]. The renderer
       migrates strings to {type:"nudge", text} at display time, so storing
       either form is fine. */
    if (Array.isArray(act.hints)) {
      act.hints.forEach((h, i) => {
        const hp = base + ".hints[" + i + "]";
        if (typeof h === "string") return;  // legacy form, OK
        if (!h || typeof h !== "object") {
          issues.push({ level: "error", path: hp, message: "Hint must be a string or an object {type, text}." });
          return;
        }
        if (["nudge", "concept", "partial_solution"].indexOf(h.type) < 0) {
          issues.push({ level: "error", path: hp + ".type", message: "Hint type must be nudge, concept or partial_solution." });
        }
        if (typeof h.text !== "string" || !h.text.length) {
          issues.push({ level: "error", path: hp + ".text", message: "Hint text is required." });
        }
      });
    }
    /* primm_phase / concept_level — accept any of the documented values. */
    if (act.primm_phase && ["predict", "run", "investigate", "modify", "make"].indexOf(act.primm_phase) < 0) {
      issues.push({ level: "warning", path: base + ".primm_phase", message: "Unknown primm_phase: " + act.primm_phase });
    }
    if (act.concept_level && ["introduce", "practise", "consolidate", "extend"].indexOf(act.concept_level) < 0) {
      issues.push({ level: "warning", path: base + ".concept_level", message: "Unknown concept_level: " + act.concept_level });
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
    const code = p.canonical_code || "";
    if (!code.trim()) {
      issues.push({ level: "error", path: base + ".payload.canonical_code", message: "Parsons needs canonical_code (the correct solution as Python source)." });
      return;   /* nothing else to check meaningfully */
    }
    /* Count non-blank canonical lines — this is N, the length of any
       valid ordering. */
    const canonicalCount = code.split("\n").filter(l => l.trim() !== "").length;

    /* Swap groups: each must be an array of ≥2 line numbers, all in
       range, no duplicates within a group, no overlap between groups. */
    const usedInGroups = new Set();
    (p.swap_groups || []).forEach((g, i) => {
      const path = base + ".payload.swap_groups[" + i + "]";
      if (!Array.isArray(g) || g.length < 2) {
        issues.push({ level: "error", path: path, message: "Swap group needs at least 2 line numbers." });
        return;
      }
      const seen = new Set();
      g.forEach(n => {
        if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > canonicalCount) {
          issues.push({ level: "error", path: path, message: "Swap group references line " + n + " which doesn't exist (canonical has " + canonicalCount + " lines)." });
        } else if (seen.has(n)) {
          issues.push({ level: "error", path: path, message: "Duplicate line " + n + " within a swap group." });
        } else if (usedInGroups.has(n)) {
          issues.push({ level: "error", path: path, message: "Line " + n + " appears in more than one swap group (groups must not overlap)." });
        } else {
          seen.add(n); usedInGroups.add(n);
        }
      });
    });

    /* Extra accepted orderings: each must be a permutation of
       [1..canonicalCount]. */
    (p.extra_accepted_orderings || []).forEach((ord, i) => {
      const path = base + ".payload.extra_accepted_orderings[" + i + "]";
      if (!Array.isArray(ord)) {
        issues.push({ level: "error", path: path, message: "Ordering must be an array of line numbers." });
        return;
      }
      if (ord.length !== canonicalCount) {
        issues.push({ level: "error", path: path, message: "Ordering must have exactly " + canonicalCount + " line numbers." });
        return;
      }
      const seen = new Set();
      let bad = false;
      ord.forEach(n => {
        if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > canonicalCount || seen.has(n)) {
          bad = true;
        } else { seen.add(n); }
      });
      if (bad) issues.push({ level: "error", path: path, message: "Ordering must be a permutation of 1.." + canonicalCount + "." });
    });
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
    /* Tolerant normalisation of constraint. The schema now exposes only
       three values (in_place, add_line, remove_line). Legacy packs
       authored before the simplification may still contain the old
       values none/one_line/one_char — all three of those had identical
       runtime behaviour (in-place edit UI), so we treat them as
       aliases for in_place. The validator doesn't mutate the activity
       — it just uses the canonical value for its checks. The migrator
       in `Pack.normalisePack` writes the canonical value back. */
    let constraint = p.constraint || "in_place";
    if (constraint === "none" || constraint === "one_line" || constraint === "one_char") {
      constraint = "in_place";
    }
    /* remove_line activities use payload.solution_code (the expected
       code AFTER removal) instead of bugs[]. Both shapes are accepted —
       solution_code is the new preferred form. */
    if (constraint === "remove_line") {
      if (!p.solution_code && !bugs.length) {
        issues.push({ level: "error", path: base + ".payload.solution_code", message: "Either solution_code (preferred) or at least one bug entry is required." });
      }
    } else if (!bugs.length) {
      issues.push({ level: "error", path: base + ".payload.bugs", message: "At least one bug required." });
    }
    bugs.forEach((b, i) => {
      const bpath = base + ".payload.bugs[" + i + "]";
      /* Range check varies by constraint:
         • remove_line: bug.line names which existing line to remove,
           so it must be 1..N (in range).
         • add_line:    bug.line names the line AFTER which the new
           line should sit, so the valid range is 0..N (0 = at top).
         • in_place:    bug.line names an existing line, 1..N. */
      if (constraint === "add_line") {
        if (b.line < 0 || b.line > lines.length)
          issues.push({ level: "error", path: bpath + ".line", message: "Insertion point out of range (0–" + lines.length + ")." });
      } else {
        if (b.line < 1 || b.line > lines.length)
          issues.push({ level: "error", path: bpath + ".line", message: "Bug line out of range." });
      }
      /* select_and_fix needs a fix string EXCEPT in remove_line mode,
         where there's nothing to type — the action is purely a
         deletion and the marker just compares line numbers. */
      if (p.mode === "select_and_fix" && constraint !== "remove_line" && !b.fix)
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
    if (!(p.example_calls || []).length) issues.push({ level: "warning", path: base + ".payload.example_calls", message: "At least one example call recommended." });
  };


  Validator.types.testing = function (act, base, issues) {
    const p = act.payload || {};
    const cols = Array.isArray(p.input_columns) ? p.input_columns : [];
    const rows = Array.isArray(p.rows) ? p.rows : [];
    if (!p.code) issues.push({ level: "warning", path: base + ".payload.code", message: "Code under test is recommended." });
    if (!cols.length) issues.push({ level: "error", path: base + ".payload.input_columns", message: "At least one input column is required." });
    const ids = new Set();
    cols.forEach((c, i) => {
      const cp = base + ".payload.input_columns[" + i + "]";
      if (!c.id) issues.push({ level: "error", path: cp + ".id", message: "Input id is required." });
      else if (ids.has(c.id)) issues.push({ level: "error", path: cp + ".id", message: "Duplicate input id: " + c.id });
      else ids.add(c.id);
      if (!c.type) issues.push({ level: "error", path: cp + ".type", message: "Type is required (int, float, str or bool)." });
      else if (["int", "float", "str", "bool"].indexOf(c.type) < 0) {
        issues.push({ level: "error", path: cp + ".type", message: "Unsupported type: " + c.type });
      }
      if ((c.type === "int" || c.type === "float") && c.min != null && c.max != null && c.min > c.max) {
        issues.push({ level: "error", path: cp + ".min", message: "min must be ≤ max." });
      }
    });
    if (!rows.length) issues.push({ level: "warning", path: base + ".payload.rows", message: "At least one test case is recommended." });
    function teacherOut(v) {
      if (v && v.expected_output != null && v.expected_output !== "") return v.expected_output;
      if (v && v.output != null && v.output !== "") return v.output;
      return "";
    }
    rows.forEach((r, i) => {
      const rp = base + ".payload.rows[" + i + "]";
      if (!r || typeof r !== "object") {
        issues.push({ level: "error", path: rp, message: "Row must be an object." });
        return;
      }
      const v = r.values || {};
      const tt = v.test_type;
      if (tt && ["normal", "boundary", "invalid", "erroneous"].indexOf(tt) < 0) {
        issues.push({ level: "error", path: rp + ".values.test_type", message: "test_type must be one of normal, boundary, invalid, erroneous (or empty for the student to fill)." });
      }
      // 2-of-3 rule: a test case needs at least two of {test data, type,
      // expected output}, so the student fills at most one verifiable blank.
      const dataSet = cols.length > 0 && cols.every(c => v[c.id] != null && String(v[c.id]) !== "");
      const typeSet = (tt || "") !== "";
      const outSet  = teacherOut(v) !== "";
      // Expected output is REQUIRED; then exactly one of {input, type} is
      // given and the other is left blank for the student.
      if (!outSet) {
        issues.push({ level: "error", path: rp + ".values.expected_output", message: "Expected output is required for every test case." });
      }
      const otherCount = (dataSet ? 1 : 0) + (typeSet ? 1 : 0);
      if (otherCount === 0) {
        issues.push({ level: "error", path: rp + ".values", message: "Fill in either the Input or the Type of test — leave the other blank for the student to work out." });
      } else if (otherCount === 2) {
        issues.push({ level: "error", path: rp + ".values", message: "Leave one of the Input or Type of test blank for the student to work out." });
      }
    });
  };


  Validator.types.flowchart = function (act, base, issues) {
    const p = act.payload || {};
    const fc = p.flowchart || {};
    const shapes = Array.isArray(fc.shapes) ? fc.shapes : [];
    const edges = Array.isArray(fc.edges) ? fc.edges : [];
    const blanks = Array.isArray(p.blanks) ? p.blanks : [];

    if (!shapes.length) {
      issues.push({ level: "error", path: base + ".payload.flowchart.shapes", message: "At least one shape is required." });
    }

    // Shape id uniqueness + cell uniqueness
    const ids = new Set();
    const cells = new Set();
    shapes.forEach((s, i) => {
      const sp = base + ".payload.flowchart.shapes[" + i + "]";
      if (!s.id) issues.push({ level: "error", path: sp + ".id", message: "Shape id is required." });
      else if (ids.has(s.id)) issues.push({ level: "error", path: sp + ".id", message: "Duplicate shape id: " + s.id });
      else ids.add(s.id);
      if (!s.kind || ["terminator", "process", "decision", "io"].indexOf(s.kind) < 0) {
        issues.push({ level: "error", path: sp + ".kind", message: "Shape kind must be terminator, process, decision or io." });
      }
      if (typeof s.row !== "number" || typeof s.col !== "number") {
        issues.push({ level: "error", path: sp + ".row", message: "Shape requires numeric row and col." });
      } else {
        const cell = s.row + "," + s.col;
        if (cells.has(cell)) {
          issues.push({ level: "error", path: sp, message: "Two shapes share cell (" + s.row + "," + s.col + ")." });
        } else {
          cells.add(cell);
        }
      }
      // Label-overflow warning. Mirrors the renderer text-fitting: at the
      // smallest font (10px, ~0.6em/char) and widest box, does the longest
      // line still not fit? {{blank}} markers count as a fixed slot.
      if (s.text) {
        const MINF = 10, CR = 0.6, SLOT = 30;
        const pad = s.kind === "decision" ? 34 : (s.kind === "io" ? 22 : 14);
        const maxW = (s.kind === "decision" ? 220 - 8 : 220 - 24) - pad * 2;
        const lineW = function (line) {
          const re = /\{\{[^}]+\}\}/g; let w = 0, last = 0, m;
          while ((m = re.exec(line)) !== null) { w += (m.index - last) * MINF * CR; w += SLOT; last = m.index + m[0].length; }
          w += (line.length - last) * MINF * CR; return w;
        };
        let longest = 0;
        String(s.text).split("\n").forEach(function (l) { const w = lineW(l); if (w > longest) longest = w; });
        if (longest > maxW) {
          issues.push({ level: "warning", path: sp + ".text", message: "Label on shape '" + (s.id || i) + "' is too long to fit and will be truncated with an ellipsis (students can click to reveal it). Consider shortening it or splitting across lines." });
        }
      }
    });

    // Edge references
    const outDegree = {};
    edges.forEach((e, i) => {
      const ep = base + ".payload.flowchart.edges[" + i + "]";
      if (!e.from || !ids.has(e.from)) {
        issues.push({ level: "error", path: ep + ".from", message: "Edge references unknown shape id '" + e.from + "'." });
      }
      if (!e.to || !ids.has(e.to)) {
        issues.push({ level: "error", path: ep + ".to", message: "Edge references unknown shape id '" + e.to + "'." });
      }
      outDegree[e.from] = (outDegree[e.from] || 0) + 1;
      const sides = ["top", "right", "bottom", "left"];
      if (e.from_side && sides.indexOf(e.from_side) < 0) {
        issues.push({ level: "error", path: ep + ".from_side", message: "from_side must be top/right/bottom/left." });
      }
      if (e.to_side && sides.indexOf(e.to_side) < 0) {
        issues.push({ level: "error", path: ep + ".to_side", message: "to_side must be top/right/bottom/left." });
      }
    });

    // Decisions need exactly two outgoing edges
    shapes.forEach((s, i) => {
      if (s.kind === "decision") {
        const od = outDegree[s.id] || 0;
        if (od !== 2) {
          issues.push({ level: "warning", path: base + ".payload.flowchart.shapes[" + i + "]", message: "Decision shape '" + s.id + "' has " + od + " outgoing edges (expected 2 — Yes and No)." });
        }
      }
    });

    // Blanks vs {{id}} markers
    const blankIds = new Set();
    blanks.forEach((b, i) => {
      const bp = base + ".payload.blanks[" + i + "]";
      if (!b.id) issues.push({ level: "error", path: bp + ".id", message: "Blank id is required." });
      else if (blankIds.has(b.id)) issues.push({ level: "error", path: bp + ".id", message: "Duplicate blank id: " + b.id });
      else blankIds.add(b.id);
      if (!b.mode || ["free_text", "select", "bank"].indexOf(b.mode) < 0) {
        issues.push({ level: "error", path: bp + ".mode", message: "Blank mode must be free_text, select or bank." });
      }
      if (b.answer == null) issues.push({ level: "error", path: bp + ".answer", message: "Blank answer is required." });
      if (b.mode === "select") {
        const opts = Array.isArray(b.options) ? b.options : [];
        if (opts.length < 2) issues.push({ level: "error", path: bp + ".options", message: "Select blank needs at least two options." });
        else if (opts.indexOf(b.answer) < 0) issues.push({ level: "error", path: bp + ".options", message: "Select blank's answer is not in its options." });
      }
      if (b.mode === "bank") {
        const pool = (act.payload.shared_pool && Array.isArray(act.payload.shared_pool.items)) ? act.payload.shared_pool.items : null;
        if (!pool) issues.push({ level: "error", path: bp + ".mode", message: "Word-bank blank needs a shared_pool with items." });
        else if (pool.indexOf(b.answer) < 0) issues.push({ level: "warning", path: bp + ".answer", message: "Word-bank answer '" + b.answer + "' is not in the word bank." });
      }
    });

    // Marker references in shapes vs blanks
    const markerRe = /\{\{([^}]+)\}\}/g;
    const referenced = new Set();
    shapes.forEach((s, i) => {
      const txt = s.text || "";
      let m;
      while ((m = markerRe.exec(txt)) !== null) {
        const id = m[1].trim();
        referenced.add(id);
        if (!blankIds.has(id)) {
          issues.push({ level: "error", path: base + ".payload.flowchart.shapes[" + i + "].text", message: "{{" + id + "}} has no matching entry in payload.blanks." });
        }
      }
    });
    blankIds.forEach(id => {
      if (!referenced.has(id)) {
        issues.push({ level: "warning", path: base + ".payload.blanks", message: "Blank '" + id + "' is defined but no shape text references it." });
      }
    });
  };

  PyQuiz.Validator = Validator;
})();
