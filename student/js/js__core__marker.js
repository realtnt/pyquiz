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
    // convey no new information; OCR accepts either style. Compress BOTH
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
      /* Unlike an in-place fix (where the line sits in a fixed slot and we
         tolerate leading whitespace), an ADDED line's indentation is part of
         the answer — it decides whether the line lands inside or outside the
         loop. So compare WITH indentation: leading spaces must match, then the
         code body is normalised. Tabs are treated as the equivalent spaces. */
      function leadWs(s) {
        const m = String(s).match(/^[ \t]*/);
        return (m ? m[0] : "").replace(/\t/g, "    ");
      }
      function body(s) { return N.pythonCode(String(s).replace(/^[ \t]+/, "")); }
      const givenIndent = leadWs(givenContent);
      const givenBody = body(givenContent);
      const contentOk = accepted.some(function (a) {
        return leadWs(a) === givenIndent && body(a) === givenBody;
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

  /* Classify ONE input value against ONE column spec. */
  function classifyInput(col, raw) {
    const declared = col.type || "str";
    const parsed = parseLiteral(raw);
    if (!parsed.ok) return "erroneous";

    if (declared === "int") {
      // int accepts only an int literal — float, str, bool all wrong.
      if (parsed.raw_type !== "int") return "erroneous";
      const v = parsed.value;
      if (col.min != null && v < col.min) return "erroneous";
      if (col.max != null && v > col.max) return "erroneous";
      if (col.min != null && v === col.min) return "boundary";
      if (col.max != null && v === col.max) return "boundary";
      const bs = Array.isArray(col.decision_boundaries) ? col.decision_boundaries : [];
      for (const b of bs) {
        if (Math.abs(v - b) <= 1) return "boundary";
      }
      return "normal";
    }
    if (declared === "float") {
      if (parsed.raw_type !== "int" && parsed.raw_type !== "float") return "erroneous";
      const v = parsed.value;
      if (col.min != null && v < col.min) return "erroneous";
      if (col.max != null && v > col.max) return "erroneous";
      if (col.min != null && v === col.min) return "boundary";
      if (col.max != null && v === col.max) return "boundary";
      const bs = Array.isArray(col.decision_boundaries) ? col.decision_boundaries : [];
      for (const b of bs) {
        if (Math.abs(v - b) <= 1) return "boundary";
      }
      return "normal";
    }
    if (declared === "str") {
      // Student must wrap strings in quotes for it to count as a string.
      // Barewords are erroneous (they would error or behave unexpectedly
      // when passed to a function expecting a str).
      if (parsed.raw_type !== "str") return "erroneous";
      const v = parsed.value;
      const len = v.length;
      if (col.min_length != null && len < col.min_length) return "erroneous";
      if (col.max_length != null && len > col.max_length) return "erroneous";
      if (col.min_length != null && len === col.min_length) return "boundary";
      if (col.max_length != null && len === col.max_length) return "boundary";
      const bv = Array.isArray(col.boundary_values) ? col.boundary_values : [];
      if (bv.indexOf(v) >= 0) return "boundary";
      return "normal";
    }
    if (declared === "bool") {
      return (parsed.raw_type === "bool") ? "normal" : "erroneous";
    }
    return "normal";
  }

  /* Pick the most-extreme classification across inputs of a row. */
  function rollupClassifications(cs) {
    if (cs.indexOf("erroneous") >= 0) return "erroneous";
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

    specRows.forEach(function (specRow, ri) {
      const sv = (specRow && specRow.values) || {};
      const pre = Array.isArray(specRow && specRow.prefilled) ? specRow.prefilled : [];
      const stud = (respRows[ri] && respRows[ri].values) || {};
      // The effective value of each cell: teacher's for prefilled, student's otherwise.
      function eff(colId) {
        return pre.indexOf(colId) >= 0 ? sv[colId] : stud[colId];
      }
      // Classify each input from its effective value, then roll up.
      const classifications = cols.map(c => classifyInput(c, eff(c.id)));
      const rowClass = rollupClassifications(classifications);

      const effType    = eff("test_type") || "";
      const typeIsPre  = pre.indexOf("test_type") >= 0;
      const rowOk      = (effType !== "" && effType === rowClass);

      // ---- test_type cell (graded only when editable) ----
      if (!typeIsPre) {
        const ok = rowOk;
        cells[ri + ":test_type"] = ok;
        if (!ok) allOk = false;
      }

      // ---- input cells (graded only when editable) ----
      // Three cases:
      //   1. test_type anchored AND row is correct (rowClass matches
      //      effType): all editable input cells are green.
      //   2. test_type anchored AND row is wrong: all editable input
      //      cells are red — the student's inputs failed to satisfy
      //      the teacher's anchor.
      //   3. test_type student-supplied: the student is inventing a
      //      pair. Mark inputs by whether they parse as the declared
      //      type (or just parse at all, when the row classifies as
      //      erroneous — the wrong type IS the point).
      cols.forEach(function (c) {
        if (pre.indexOf(c.id) >= 0) return;  // teacher prefilled — not graded
        let ok;
        if (typeIsPre) {
          ok = rowOk;
        } else {
          const raw = stud[c.id];
          const parsed = parseLiteral(raw);
          let typeMatch = false;
          if (parsed.ok) {
            if      (c.type === "int")   typeMatch = parsed.raw_type === "int";
            else if (c.type === "float") typeMatch = parsed.raw_type === "int" || parsed.raw_type === "float";
            else if (c.type === "str")   typeMatch = parsed.raw_type === "str";
            else if (c.type === "bool")  typeMatch = parsed.raw_type === "bool";
          }
          // Erroneous classification accepts ANY parseable value (wrong
          // type is the test). Normal/boundary need a type match.
          ok = (rowClass === "erroneous") ? parsed.ok : typeMatch;
        }
        cells[ri + ":" + c.id] = ok;
        if (!ok) allOk = false;
      });

      // Output cell: exact-match after baseClean, IF the teacher
      // supplied an expected output for this row. Skip if blank.
      if (pre.indexOf("output") < 0) {
        const expected = (sv.output != null) ? String(sv.output) : "";
        const given    = (stud.output != null) ? String(stud.output) : "";
        if (expected !== "") {
          const ok = N.baseClean(expected) === N.baseClean(given);
          cells[ri + ":output"] = ok;
          if (!ok) allOk = false;
        }
      }
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
