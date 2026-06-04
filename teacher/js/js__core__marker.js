/* === inlined from js/core/marker.js === */
/* =====================================================================
 * PyQuiz.Marker — per-type marking (spec §10)
 *
 * Marking is OFFLINE and IMMEDIATE. Every mark goes through these
 * functions; renderers do not embed their own marking.
 *
 * Mark result shape (spec §10.2):
 *   { status:   "correct" | "incorrect" | "partial",   // v0.1: only correct/incorrect
 *     score:    number 0..1,
 *     per_part: { ... type-specific detail used by highlight() },
 *     feedback: string }
 *
 * Public API:
 *   PyQuiz.Marker.mark(activity, response) → MarkResult
 *   PyQuiz.Marker.types[<type>](activity, response) → MarkResult
 *
 * To add a new activity type, assign a function to
 * PyQuiz.Marker.types[<type>]; the new dispatcher will pick it up.
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const N = PyQuiz.Normalise;
  const S = PyQuiz.Strings;

  const Marker = { types: {} };

  function result(status, score, perPart, activity) {
    const fb = (activity && activity.feedback) || {};
    const feedback = status === "correct"
      ? (fb.correct || S.correctDefault)
      : (fb.incorrect || S.incorrectDefault);
    return { status: status, score: score, per_part: perPart || {}, feedback: feedback };
  }

  Marker.mark = function (activity, response) {
    if (!activity || !activity.type) return result("incorrect", 0, { error: "Unknown activity." }, null);
    const fn = Marker.types[activity.type];
    if (typeof fn !== "function") return result("incorrect", 0, { error: "No marker for type " + activity.type }, activity);
    return fn(activity, response || {});
  };

  /* -------- Type markers -------- */

  Marker.types.parsons = function (activity, response) {
    const p = activity.payload || {};
    /* Use the new expanded payload for accepted-orderings logic. The
       student is correct iff their order matches ANY accepted ordering
       AND every distractor is in the bin. */
    const expanded = (PyQuiz.Parsons && PyQuiz.Parsons.expand)
      ? PyQuiz.Parsons.expand(p)
      : null;
    const order = response.solution_order || [];
    const binned = response.binned || [];

    let acceptedOrderings, distractorIds;
    if (expanded) {
      acceptedOrderings = expanded.acceptedOrderings;
      distractorIds = expanded.distractorIds;
    } else {
      /* Defensive fallback in case the helper isn't loaded — treat the
         payload as if the canonical were the only accepted order. */
      acceptedOrderings = [(p.solution || []).slice()];
      const lines = p.lines || [];
      distractorIds = lines
        .filter(l => !l.fixed && !(p.solution || []).includes(l.id))
        .map(l => l.id);
    }

    /* Order is OK iff student's order matches any accepted ordering
       (same length, same IDs in same positions). */
    const orderOk = acceptedOrderings.some(acc =>
      acc.length === order.length && acc.every((id, i) => id === order[i])
    );
    /* Bin is OK iff every distractor is in the bin and nothing else. */
    const binSet = new Set(binned);
    const binOk =
      binned.length === distractorIds.length &&
      distractorIds.every(id => binSet.has(id));
    const ok = orderOk && binOk;
    return result(ok ? "correct" : "incorrect", ok ? 1 : 0,
      { orderOk: orderOk, binOk: binOk }, activity);
  };

  Marker.types.cloze = function (activity, response) {
    const p = activity.payload || {};
    const blanks = p.blanks || [];
    const responses = response.blanks || {};
    const detail = {};
    let allOk = true;
    for (const b of blanks) {
      const given = responses[b.id];
      let ok = false;
      if (given == null || given === "") {
        ok = false;
      } else if (b.mode === "free_text") {
        const accepted = b.accepted || [b.answer];
        const norm = b.case_sensitive === false
          ? function (x) { return N.pythonCode(x).toLowerCase(); }
          : function (x) { return N.pythonCode(x); };
        const g = norm(given);
        ok = accepted.some(a => norm(a) === g);
      } else if (b.mode === "select" || b.mode === "bank") {
        ok = String(given) === String(b.answer);
      }
      detail[b.id] = ok;
      if (!ok) allOk = false;
    }
    return result(allOk ? "correct" : "incorrect", allOk ? 1 : 0, { blanks: detail }, activity);
  };

  Marker.types.trace_table = function (activity, response) {
    const p = activity.payload || {};
    const expectedRows = p.rows || [];
    const cols = p.columns || [];
    const colIds = cols.map(c => c.id);

    function buildEffective(rows) {
      const out = [];
      const carry = {};
      colIds.forEach(cid => carry[cid] = "");
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const state = {};
        colIds.forEach(cid => {
          const v = r.values && r.values[cid];
          if (v == null || v === "") state[cid] = carry[cid];
          else { state[cid] = String(v); carry[cid] = String(v); }
        });
        out.push({ line: Number(r.line), state: state, origIdx: i });
      }
      return out;
    }

    // Strip rows whose effective state matches the previous row's. These
    // convey no new information; either style is accepted. Compress BOTH
    // expected and student before comparing.
    function stripRedundant(effective) {
      const out = [];
      for (const r of effective) {
        if (!out.length) { out.push(r); continue; }
        const prev = out[out.length - 1];
        const same = colIds.every(c => prev.state[c] === r.state[c]);
        if (!same) out.push(r);
      }
      return out;
    }

    const expected = stripRedundant(buildEffective(expectedRows));
    const studentRows = (response && response.rows) || [];
    const studentEffective = buildEffective(studentRows);
    const got = stripRedundant(studentEffective);

    const N_count = expected.length;
    const detail = {};
    let allOk = N_count === got.length;
    function cellKey(rowIdx, colId) { return rowIdx + ":" + colId; }
    function lineKey(rowIdx) { return rowIdx + ":__line__"; }

    // Track which student rows got marked OK so we can highlight stripped
    // rows as OK too (they're redundant duplicates of a correct row).
    const okOrigIdxs = new Set();

    for (let i = 0; i < N_count; i++) {
      const want = expected[i];
      const have = got[i];
      if (!have) { allOk = false; continue; }
      const origIdx = have.origIdx;
      const lineOk = Number(want.line) === Number(have.line);
      detail[lineKey(origIdx)] = lineOk;
      if (!lineOk) allOk = false;
      let rowOk = lineOk;
      for (const cid of colIds) {
        const wantV = N.traceCell(want.state[cid]);
        const haveV = N.traceCell(have.state[cid]);
        const ok = wantV === haveV;
        detail[cellKey(origIdx, cid)] = ok;
        if (!ok) { allOk = false; rowOk = false; }
      }
      if (rowOk) okOrigIdxs.add(origIdx);
    }
    if (got.length > N_count) allOk = false;

    // Redundant student rows (those stripped out): if the preceding kept
    // row was marked OK, treat the redundant ones as OK too. They don't
    // change the verdict but they shouldn't visually look 'unmarked'.
    for (const r of studentEffective) {
      if (detail[lineKey(r.origIdx)] != null) continue; // already marked
      // Find the most recent kept row before this one
      let okSoFar = false;
      for (let j = r.origIdx - 1; j >= 0; j--) {
        if (okOrigIdxs.has(j)) { okSoFar = true; break; }
        if (detail[lineKey(j)] === false) { okSoFar = false; break; }
        if (detail[lineKey(j)] === true) { okSoFar = true; break; }
      }
      detail[lineKey(r.origIdx)] = okSoFar;
      for (const cid of colIds) detail[cellKey(r.origIdx, cid)] = okSoFar;
    }

    return result(allOk ? "correct" : "incorrect", allOk ? 1 : 0,
      { rows: detail, expectedCount: N_count, studentCount: got.length }, activity);
  };

  Marker.types.spot_the_bug = function (activity, response) {
    const p = activity.payload || {};
    const bugs = p.bugs || [];
    /* Same tolerant alias as the validator — none/one_line/one_char
       all map to in_place since they always shared a runtime branch. */
    let constraint = p.constraint || "in_place";
    if (constraint === "none" || constraint === "one_line" || constraint === "one_char") {
      constraint = "in_place";
    }
    response = response || {};

    /* add_line: response = { inserted: { after, content } }. The single
       bug spec encodes where the new line should sit and what it should
       contain. `bug.line` is interpreted as the line AFTER which the
       insertion sits — same convention as the renderer's `after`. */
    if (constraint === "add_line") {
      if (!response.inserted) {
        return result("incorrect", 0, { inserted_ok: false, reason: "no_insertion" }, activity);
      }
      const bug = bugs[0] || {};
      const accepted = (bug.accepted_fixes && bug.accepted_fixes.length) ? bug.accepted_fixes : [bug.fix];
      const expectedAfter = (typeof bug.line === "number") ? bug.line : null;
      const givenAfter = response.inserted.after;
      const positionOk = expectedAfter == null || expectedAfter === givenAfter;
      const givenContent = String(response.inserted.content || "");
      const contentOk = accepted.some(function (a) {
        return N.pythonCode(String(a || "").replace(/^\s+/, "")) ===
               N.pythonCode(givenContent.replace(/^\s+/, ""));
      });
      const ok = positionOk && contentOk;
      return result(ok ? "correct" : "incorrect", ok ? 1 : 0,
        { inserted_ok: ok, positionOk: positionOk, contentOk: contentOk }, activity);
    }

    /* remove_line marking: compare the assembled post-removal code to
       the teacher's expected `solution_code`. This means removing ANY
       line that produces the same final program counts as correct —
       fixing the "remove the second duplicate" issue. Falls back to the
       legacy single-line bug spec when solution_code isn't set, so
       older packs still work. */
    if (constraint === "remove_line") {
      if (response.removed == null) {
        return result("incorrect", 0, { removed_ok: false, reason: "nothing_removed" }, activity);
      }
      const codeLinesArr = p.code_lines || [];
      // Prefer payload.solution_code. If absent but the legacy bug
      // spec names a line, derive it. This makes the new "remove ANY
      // line that produces this code" semantics apply to OLD packs
      // without needing a rebuild.
      let expectedCode = p.solution_code;
      if (expectedCode == null && bugs[0] && typeof bugs[0].line === "number") {
        const derived = codeLinesArr.slice();
        const di = bugs[0].line - 1;
        if (di >= 0 && di < derived.length) derived.splice(di, 1);
        expectedCode = derived.join("\n");
      }
      if (expectedCode == null) {
        return result("incorrect", 0, { removed_ok: false, reason: "no_solution" }, activity);
      }
      const idx = response.removed - 1;
      const remaining = codeLinesArr.slice();
      if (idx >= 0 && idx < remaining.length) remaining.splice(idx, 1);
      const studentCode = remaining.join("\n");
      const ok = N.baseClean(studentCode) === N.baseClean(expectedCode);
      return result(ok ? "correct" : "incorrect", ok ? 1 : 0,
        { removed_ok: ok, expected_code: expectedCode, given_line: response.removed }, activity);
    }

    /* Default branch — in-place "select + edit" marking. */
    const codeLines = p.code_lines || [];
    const bugLines = bugs.map(b => b.line).sort((a, b) => a - b);
    const selected = (response.selected_lines || []).slice().sort((a, b) => a - b);
    const lineOk = bugLines.length === selected.length && bugLines.every((l, i) => l === selected[i]);
    if (p.mode === "select_line") {
      return result(lineOk ? "correct" : "incorrect", lineOk ? 1 : 0, { lineOk: lineOk }, activity);
    }
    function stripIndent(s) { return String(s || "").replace(/^\s+/, ""); }
    const fixes = response.fixes || {};
    const fixDetail = {};
    let allFixOk = true;
    for (const bug of bugs) {
      const accepted = (bug.accepted_fixes && bug.accepted_fixes.length) ? bug.accepted_fixes : [bug.fix];
      const given = fixes[bug.line] || "";
      const ok = accepted.some(a => N.pythonCode(stripIndent(a)) === N.pythonCode(stripIndent(given)));
      fixDetail[bug.line] = ok;
      if (!ok) allFixOk = false;
    }
    const ok = lineOk && allFixOk;
    return result(ok ? "correct" : "incorrect", ok ? 1 : 0, { lineOk: lineOk, fixes: fixDetail }, activity);
  };
  // Modify uses the same response shape as spot_the_bug.
  Marker.types.modify = Marker.types.spot_the_bug;

  Marker.types.predict_output = function (activity, response) {
    const p = activity.payload || {};
    if (p.mode === "multiple_choice") {
      const ok = response.selected_option === p.answer;
      return result(ok ? "correct" : "incorrect", ok ? 1 : 0, { selected: response.selected_option }, activity);
    }
    const accepted = (p.accepted_answers && p.accepted_answers.length) ? p.accepted_answers : [p.answer];
    const given = response.value || "";
    const ok = accepted.some(a => N.outputText(a) === N.outputText(given));
    return result(ok ? "correct" : "incorrect", ok ? 1 : 0, {}, activity);
  };

  Marker.types.starter_challenge = function (activity, response) {
    // v0.1: no execution. Acknowledgement counts as "done" but not graded.
    const ack = !!(response && response.acknowledged);
    return result(ack ? "correct" : "incorrect", ack ? 1 : 0, { acknowledged: ack }, activity);
  };


  /* ----- testing activity classifier + marker -----
     The classifier infers Normal / Boundary / Erroneous from an input
     value plus the declared spec (type, range, decision_boundaries).
     The marker walks the rows, classifies each input, picks the
     most-extreme classification across inputs for the row, and checks
     the student's test_type pick (and input cells and output cell)
     against the spec. */

  /* Parse a textual value as a Python literal — restricted set, no
     eval. Returns { ok: bool, value, raw_type } where raw_type is
     one of "int", "float", "str", "bool", "none", "unknown". */
  function parseLiteral(raw) {
    if (raw == null) return { ok: false, raw_type: "unknown" };
    const s = String(raw).trim();
    if (s === "") return { ok: false, raw_type: "unknown" };
    if (s === "True")  return { ok: true, value: true,  raw_type: "bool" };
    if (s === "False") return { ok: true, value: false, raw_type: "bool" };
    if (s === "None")  return { ok: true, value: null,  raw_type: "none" };
    // Quoted string
    if ((s[0] === '"' && s[s.length - 1] === '"') ||
        (s[0] === "'" && s[s.length - 1] === "'")) {
      // Tolerate simple strings only — no escape processing.
      return { ok: true, value: s.slice(1, -1), raw_type: "str" };
    }
    // Integer
    if (/^-?\d+$/.test(s)) return { ok: true, value: parseInt(s, 10), raw_type: "int" };
    // Float
    if (/^-?\d+\.\d*$/.test(s) || /^-?\.\d+$/.test(s)) {
      return { ok: true, value: parseFloat(s), raw_type: "float" };
    }
    // Bareword — treat as a string only if the spec asks for str. The
    // marker decides; we just return the raw form.
    return { ok: true, value: s, raw_type: "bareword" };
  }

  /* Classify ONE input value against ONE column spec. Returns one of
     "normal" | "boundary" | "invalid" | "erroneous" per these definitions:
       normal    — correct type, comfortably inside the valid range
       boundary  — correct type, on the very edge (we define edge ±1)
       invalid   — correct type, but out of range (rejected), not a boundary
       erroneous — wrong data type (rejected)
     Boundary band for range [min,max] = { min-1, min, max, max+1 }. */
  function classifyInput(col, raw) {
    const declared = col.type || "str";
    const parsed = parseLiteral(raw);
    if (!parsed.ok) return "erroneous";

    if (declared === "int" || declared === "float") {
      const numericType = (declared === "int")
        ? (parsed.raw_type === "int")
        : (parsed.raw_type === "int" || parsed.raw_type === "float");
      if (!numericType) return "erroneous";  // wrong data type
      const v = parsed.value;
      const hasMin = col.min != null, hasMax = col.max != null;
      // Boundary: exactly on an edge or one step beyond it.
      if (hasMin && (v === col.min || v === col.min - 1)) return "boundary";
      if (hasMax && (v === col.max || v === col.max + 1)) return "boundary";
      // Explicit decision boundaries (e.g. an 18 threshold) — within ±1.
      const bs = Array.isArray(col.decision_boundaries) ? col.decision_boundaries : [];
      for (const b of bs) { if (Math.abs(v - b) <= 1) return "boundary"; }
      // Invalid: correct type but out of range (beyond the boundary band).
      if (hasMin && v < col.min - 1) return "invalid";
      if (hasMax && v > col.max + 1) return "invalid";
      return "normal";
    }
    if (declared === "str") {
      // A string must be quoted to count as the str type; otherwise the
      // wrong data type → erroneous.
      if (parsed.raw_type !== "str") return "erroneous";
      const len = parsed.value.length;
      const hasMin = col.min_length != null, hasMax = col.max_length != null;
      if (hasMin && (len === col.min_length || len === col.min_length - 1)) return "boundary";
      if (hasMax && (len === col.max_length || len === col.max_length + 1)) return "boundary";
      const bv = Array.isArray(col.boundary_values) ? col.boundary_values : [];
      if (bv.indexOf(parsed.value) >= 0) return "boundary";
      if (hasMin && len < col.min_length - 1) return "invalid";
      if (hasMax && len > col.max_length + 1) return "invalid";
      return "normal";
    }
    if (declared === "bool") {
      return (parsed.raw_type === "bool") ? "normal" : "erroneous";
    }
    return "normal";
  }

  /* Pick the most-severe classification across inputs of a row.
     Severity order: erroneous > invalid > boundary > normal. */
  function rollupClassifications(cs) {
    if (cs.indexOf("erroneous") >= 0) return "erroneous";
    if (cs.indexOf("invalid") >= 0)   return "invalid";
    if (cs.indexOf("boundary") >= 0)  return "boundary";
    return "normal";
  }

  Marker.types.testing = function (activity, response) {
    const p = activity.payload || {};
    const cols = Array.isArray(p.input_columns) ? p.input_columns : [];
    const specRows = Array.isArray(p.rows) ? p.rows : [];
    const respRows = (response && Array.isArray(response.rows)) ? response.rows : [];
    const cells = {};  // "ri:colId" -> bool
    let allOk = true;

    // The expected-output cell key was renamed output -> expected_output.
    // Accept both so old packs keep working.
    function outVal(v) { return (v && v.expected_output != null && v.expected_output !== "")
      ? v.expected_output : (v && v.output != null ? v.output : ""); }

    specRows.forEach(function (specRow, ri) {
      const sv = (specRow && specRow.values) || {};
      const stud = (respRows[ri] && respRows[ri].values) || {};
      // Back-compat: honour an explicit prefilled list if present; otherwise
      // a cell is teacher-GIVEN iff its teacher value is non-empty.
      const pre = Array.isArray(specRow && specRow.prefilled) ? specRow.prefilled : null;
      function given(colId) {
        if (pre) return pre.indexOf(colId) >= 0;
        if (colId === "test_type") return (sv.test_type || "") !== "";
        if (colId === "expected_output" || colId === "output") return outVal(sv) !== "";
        return sv[colId] != null && String(sv[colId]) !== "";
      }
      // Effective value of a cell: teacher's if given, else student's.
      function eff(colId) { return given(colId) ? sv[colId] : stud[colId]; }

      // Classify each input from its effective value, then roll up.
      const classifications = cols.map(c => classifyInput(c, eff(c.id)));
      const rowClass = rollupClassifications(classifications);

      const typeGiven = given("test_type");
      const effType   = (typeGiven ? sv.test_type : (stud.test_type || "")) || "";

      // ---- test type cell (graded only when the student fills it) ----
      if (!typeGiven) {
        const ok = (effType !== "" && effType === rowClass);
        cells[ri + ":test_type"] = ok;
        if (!ok) allOk = false;
      }

      // ---- input (test data) cells (graded only when student-filled) ----
      // The student's value must classify as the row's effective test type
      // (teacher-given, or the type the student themselves selected).
      const targetType = typeGiven ? effType : (effType || rowClass);
      cols.forEach(function (c) {
        if (given(c.id)) return;  // teacher supplied — not graded
        const cls = classifyInput(c, stud[c.id]);
        // A single-input row: the input's class must match the target type.
        // (Multi-input rows: each input must be consistent with the row type
        //  via the rollup, so accept if this input's class is no more severe
        //  than the target and the rollup matches.)
        let ok;
        if (cols.length === 1) {
          ok = (cls === targetType);
        } else {
          ok = (rowClass === targetType);
        }
        cells[ri + ":" + c.id] = ok;
        if (!ok) allOk = false;
      });

      // Expected output is teacher-authored context — never student-graded
      // (we don't execute code), so it is not added to `cells`.
    });

    return result(allOk ? "correct" : "incorrect", allOk ? 1 : 0,
      { cells: cells }, activity);
  };


  Marker.types.flowchart = function (activity, response) {
    const p = activity.payload || {};
    const blanks = Array.isArray(p.blanks) ? p.blanks : [];
    const given = (response && response.blanks) || {};
    const detail = {};
    let allOk = true;
    blanks.forEach(b => {
      const studentVal = given[b.id] == null ? "" : String(given[b.id]);
      let ok;
      if (b.mode === "select") {
        // Exact match against answer (or accepted options if you wanted that).
        ok = studentVal === b.answer;
      } else {
        // free_text — same normalisation as cloze.
        const accepted = [b.answer].concat(Array.isArray(b.accepted) ? b.accepted : []);
        const norm = function (s) {
          let v = N.pythonCode(s);
          if (b.case_sensitive === false) v = v.toLowerCase();
          return v;
        };
        const studentN = norm(studentVal);
        ok = accepted.some(a => norm(String(a == null ? "" : a)) === studentN);
      }
      detail[b.id] = ok;
      if (!ok) allOk = false;
    });
    return result(allOk ? "correct" : "incorrect", allOk ? 1 : 0,
      { blanks: detail }, activity);
  };

  PyQuiz.Marker = Marker;
})();
