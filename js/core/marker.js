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
    const solution = p.solution || [];
    const order = response.solution_order || [];
    const binned = response.binned || [];
    const orderOk = order.length === solution.length && order.every((id, i) => id === solution[i]);
    // Distractors are any non-fixed lines that are NOT in the solution.
    // For correctness, every distractor must be in the bin and no
    // non-distractor may be there.
    const lines = p.lines || [];
    const expectedBinned = lines
      .filter(l => !l.fixed && !solution.includes(l.id))
      .map(l => l.id);
    const binSet = new Set(binned);
    const expBinSet = new Set(expectedBinned);
    const binOk =
      binned.length === expectedBinned.length &&
      expectedBinned.every(id => binSet.has(id));
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
    const codeLines = p.code_lines || [];
    const bugLines = bugs.map(b => b.line).sort((a, b) => a - b);
    const selected = (response.selected_lines || []).slice().sort((a, b) => a - b);
    const lineOk = bugLines.length === selected.length && bugLines.every((l, i) => l === selected[i]);
    if (p.mode === "select_line") {
      return result(lineOk ? "correct" : "incorrect", lineOk ? 1 : 0, { lineOk: lineOk }, activity);
    }
    // For fixes: strip leading whitespace from both sides, then normalise.
    // This means students don't have to get indentation exactly right;
    // we auto-fix it to match the original buggy line.
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

  PyQuiz.Marker = Marker;
})();
