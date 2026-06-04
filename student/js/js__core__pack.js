/* === inlined from js/core/pack.js === */
/* =====================================================================
 * PyQuiz.Pack — pack factory and mutation helpers
 *
 * Centralised CRUD for packs and activities. All mutations go through
 * here so the teacher app, the importer, AND any future AI-generation
 * flow share one code path.
 *
 * Public API:
 *   PyQuiz.Pack.blank()                      → new empty pack
 *   PyQuiz.Pack.blankActivity(type)          → activity of given type with sane defaults
 *   PyQuiz.Pack.defaultPayload(type)         → just the payload portion
 *   PyQuiz.Pack.uid(prefix?)                 → short unique id
 *   PyQuiz.Pack.nowISO()                     → ISO timestamp string
 *
 *   PyQuiz.Pack.addActivity(pack, activity, opts?)
 *      Mutates pack.activities; assigns a fresh id if missing or duplicate.
 *      Returns { ok: boolean, activity, issues }.
 *      opts.position: insertion index (default end)
 *      opts.validate: if true (default), runs Validator.activity and
 *                     refuses on errors (returns { ok: false, issues }).
 *                     Use validate: false to insert known-incomplete
 *                     drafts (the teacher form needs this).
 *
 *   PyQuiz.Pack.removeActivity(pack, id)            → boolean (was removed)
 *   PyQuiz.Pack.moveActivity(pack, id, delta)       → boolean
 *   PyQuiz.Pack.duplicateActivity(pack, id)         → new activity or null
 *   PyQuiz.Pack.findActivity(pack, id)              → activity or null
 *   PyQuiz.Pack.touch(pack)                         → updates updated_at
 *
 *   PyQuiz.Pack.ingestActivity(pack, json, opts?)
 *      For external sources (AI, imported files, paste-in). Strict mode:
 *      always validates; returns { ok, issues, activity? }. On success
 *      adds to pack. opts.position as above.
 *
 *   PyQuiz.Pack.ingestPack(json)
 *      Validate a full pack object as it arrives from outside.
 *      Returns { ok, issues, pack }.
 *
 * The "AI generation" flow should call ingestActivity (or ingestPack)
 * on the raw model output, then surface issues for the teacher to fix.
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const C = PyQuiz.Constants;

  /* -------- id and timestamp helpers -------- */
  let _n = 0;
  function uid(prefix) {
    return (prefix || "id") + "-" + Date.now().toString(36) + "-" + (++_n).toString(36);
  }
  function nowISO() { return new Date().toISOString(); }

  /* -------- factories -------- */
  function blank() {
    return {
      pack_format_version: C.PACK_FORMAT_VERSION,
      schema_version: C.SCHEMA_VERSION,
      id: uid("pack"),
      title: "Untitled pack",
      description: "",
      language: "python",
      audience: "ages-11-14",
      author: "",
      created_at: nowISO(),
      updated_at: nowISO(),
      spec_refs: [],
      tags: [],
      settings: { shuffle: false, show_hints: true, show_solutions_after: "submission", pass_threshold: 0.7, show_runner_after: "correct" },
      sections: [],
      activities: []
    };
  }

  function defaultPayload(type) {
    switch (type) {
      case "parsons":
        return {
          canonical_code: "for i in range(5):\n    print(i)",
          distractors: "",
          swap_groups: [],
          extra_accepted_orderings: [],
          indent_size_spaces: 4,
          discard_required: true
        };
      case "cloze":
        return {
          code_template: "x = {{1}}\nprint(x)",
          blanks: [{ id: "1", mode: "free_text", answer: "0", accepted: ["0"], case_sensitive: true, width_hint: 4 }],
          shared_pool: null
        };
      case "trace_table":
        return {
          code: "x = 0\nx = x + 1\nprint(x)",
          columns: [
            { id: "x", label: "x", kind: "variable" },
            { id: "out", label: "Output", kind: "output" }
          ],
          rows: [
            { line: 1, values: { x: "0", out: "" } },
            { line: 2, values: { x: "1", out: "" } },
            { line: 3, values: { x: "",  out: "1" } }
          ],
          marking: "exact_cells",
          undefined_token: ""
        };
      case "spot_the_bug":
        return {
          code_lines: ["def f(x):", "    return x * 2"],
          expected_behaviour: "",
          actual_behaviour: "",
          mode: "select_and_fix",
          constraint: "in_place",
          bugs: [{ line: 2, category: "logic", fix: "    return x * 2", accepted_fixes: [] }]
        };
      case "modify":
        return {
          /* Same shape as spot_the_bug — both types share renderer,
             marker, editor, validator. The activity TYPE distinguishes
             them in the task list and changes the framing labels. */
          code_lines: ["name = \"Ada\"", "print(name)"],
          expected_behaviour: "",
          actual_behaviour: "",
          mode: "select_and_fix",
          constraint: "in_place",
          bugs: [{ line: 1, category: "logic", fix: "name = \"Ada\"", accepted_fixes: [] }]
        };
      case "predict_output":
        return {
          code: "print('hello')",
          direction: "code_to_output",
          mode: "free_text",
          answer: "hello",
          accepted_answers: ["hello"],
          options: null
        };
      case "starter_challenge":
        return {
          instructions: "Write a function that returns its argument doubled.",
          starter_code: "def double(n):\n    # your code here\n    pass\n",
          function_name: "double",
          example_calls: [{ call: "double(2)", expected: "4" }],
          model_solution: "def double(n):\n    return n * 2\n",
          self_check_guidance: "Try each example call in your IDE."
        };
      case "testing":
        return {
          code: "def is_adult(age):\n    return age >= 18\n",
          function_name: "is_adult",
          input_columns: [
            { id: "age", label: "age", type: "int", min: 0, max: 120, decision_boundaries: [18] }
          ],
          rows: [
            { values: { age: "17", output: "False", test_type: "boundary" }, prefilled: ["age", "output"] },
            { values: { age: "",   output: "",      test_type: "" },         prefilled: [] }
          ]
        };
      case "flowchart":
        return {
          flowchart: {
            shapes: [
              { id: "start", kind: "terminator", text: "Start",                row: 0, col: 1 },
              { id: "in1",   kind: "io",         text: "input age",            row: 1, col: 1 },
              { id: "dec",   kind: "decision",   text: "age >= {{c}}",         row: 2, col: 1 },
              { id: "yes",   kind: "process",    text: "print(\"adult\")",   row: 3, col: 0 },
              { id: "no",    kind: "process",    text: "print(\"child\")",   row: 3, col: 2 },
              { id: "end",   kind: "terminator", text: "End",                  row: 4, col: 1 }
            ],
            edges: [
              { from: "start", to: "in1" },
              { from: "in1",   to: "dec" },
              { from: "dec",   to: "yes", label: "Yes" },
              { from: "dec",   to: "no",  label: "No"  },
              { from: "yes",   to: "end" },
              { from: "no",    to: "end" }
            ]
          },
          blanks: [
            { id: "c", mode: "free_text", answer: "18", accepted: ["18"], case_sensitive: true, width_hint: 3 }
          ]
        };
      default:
        return {};
    }
  }

  function blankActivity(type) {
    const rv = (PyQuiz.Constants && PyQuiz.Constants.CURRENT_RENDERER_VERSION
                && PyQuiz.Constants.CURRENT_RENDERER_VERSION[type]) || 1;
    return {
      id: uid("act"),
      type: type,
      renderer_version: rv,
      title: "New " + type.replace(/_/g, " "),
      instructions: "",
      context: null,
      difficulty: 1,
      topics: [],
      spec_refs: [],
      estimated_time_seconds: 60,
      points: 1,
      timing: null,
      hints: [],
      solution_explanation: "",
      feedback: { correct: "", incorrect: "", per_option: null },
      teacher_notes: "",
      metadata: {},
      payload: defaultPayload(type)
    };
  }

  /* -------- mutation helpers -------- */
  function touch(pack) { if (pack) pack.updated_at = nowISO(); }

  function findActivity(pack, id) {
    if (!pack || !pack.activities) return null;
    return pack.activities.find(a => a.id === id) || null;
  }

  function _ensureUniqueId(pack, act) {
    const existing = new Set(pack.activities.map(a => a.id));
    if (!act.id || existing.has(act.id)) act.id = uid("act");
  }

  function addActivity(pack, activity, opts) {
    opts = opts || {};
    const validate = opts.validate !== false;
    activity = activity || {};
    _ensureUniqueId(pack, activity);
    if (validate) {
      const issues = PyQuiz.Validator.activity(activity, "activity");
      if (issues.some(i => i.level === "error")) return { ok: false, issues: issues };
      const pos = (opts.position == null) ? pack.activities.length : opts.position;
      pack.activities.splice(pos, 0, activity);
      touch(pack);
      return { ok: true, activity: activity, issues: issues };
    } else {
      const pos = (opts.position == null) ? pack.activities.length : opts.position;
      pack.activities.splice(pos, 0, activity);
      touch(pack);
      return { ok: true, activity: activity, issues: [] };
    }
  }

  function removeActivity(pack, id) {
    const i = pack.activities.findIndex(a => a.id === id);
    if (i < 0) return false;
    pack.activities.splice(i, 1);
    touch(pack);
    return true;
  }

  function moveActivity(pack, id, delta) {
    const i = pack.activities.findIndex(a => a.id === id);
    if (i < 0) return false;
    const j = i + delta;
    if (j < 0 || j >= pack.activities.length) return false;
    const t = pack.activities[i];
    pack.activities[i] = pack.activities[j];
    pack.activities[j] = t;
    touch(pack);
    return true;
  }

  function duplicateActivity(pack, id) {
    const orig = findActivity(pack, id);
    if (!orig) return null;
    const copy = JSON.parse(JSON.stringify(orig));
    copy.id = uid("act");
    copy.title = (orig.title || "Activity") + " (copy)";
    const i = pack.activities.indexOf(orig);
    pack.activities.splice(i + 1, 0, copy);
    touch(pack);
    return copy;
  }

  /* -------- section helpers --------
     Sections carry a 'number' field (1..N, contiguous). All helpers
     keep the array sorted by number after every mutation. */
  function renumberSections(pack) {
    // Assign 1..N in current array order. Helpers that change array
    // order (addSection / removeSection / moveSection) call this after
    // their structural change.
    if (!Array.isArray(pack.sections)) return;
    pack.sections.forEach(function (s, i) { s.number = i + 1; });
  }
  function sortAndRenumberSections(pack) {
    // Cleanup for imports / hand-edited JSON: sort by existing number
    // (missing → end, stable by id) and then renumber 1..N.
    if (!Array.isArray(pack.sections)) return;
    pack.sections.sort(function (a, b) {
      const an = typeof a.number === "number" ? a.number : Infinity;
      const bn = typeof b.number === "number" ? b.number : Infinity;
      if (an !== bn) return an - bn;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
    renumberSections(pack);
  }
  function addSection(pack, title) {
    if (!Array.isArray(pack.sections)) pack.sections = [];
    const sec = {
      id: uid("sec"),
      number: pack.sections.length + 1,
      title: title || "New section"
    };
    pack.sections.push(sec);
    renumberSections(pack);
    touch(pack);
    return sec;
  }
  function removeSection(pack, sectionId) {
    if (!Array.isArray(pack.sections)) return false;
    const i = pack.sections.findIndex(function (s) { return s.id === sectionId; });
    if (i < 0) return false;
    pack.sections.splice(i, 1);
    pack.activities.forEach(function (a) {
      if (a.section_id === sectionId) delete a.section_id;
    });
    renumberSections(pack);
    touch(pack);
    return true;
  }
  function moveSection(pack, sectionId, delta) {
    if (!Array.isArray(pack.sections)) return false;
    const i = pack.sections.findIndex(function (s) { return s.id === sectionId; });
    if (i < 0) return false;
    const j = i + delta;
    if (j < 0 || j >= pack.sections.length) return false;
    const t = pack.sections[i];
    pack.sections[i] = pack.sections[j];
    pack.sections[j] = t;
    renumberSections(pack);
    touch(pack);
    return true;
  }
  function setActivitySection(pack, activityId, sectionId) {
    const a = findActivity(pack, activityId);
    if (!a) return false;
    if (sectionId) a.section_id = sectionId;
    else delete a.section_id;
    touch(pack);
    return true;
  }

  /* -------- ingest (external JSON / AI output) -------- */
  function ingestActivity(pack, json, opts) {
    let obj = json;
    if (typeof json === "string") {
      try { obj = JSON.parse(json); }
      catch (e) { return { ok: false, issues: [{ level: "error", path: "", message: "Bad JSON: " + e.message }] }; }
    }
    if (!obj || typeof obj !== "object") return { ok: false, issues: [{ level: "error", path: "", message: "Activity must be an object." }] };
    // Always validate when ingesting
    return addActivity(pack, obj, Object.assign({ validate: true }, opts || {}));
  }

  function stampRendererVersions(pack) {
    // Fill in renderer_version on any activity that lacks one, using the
    // current default for its type. Activities authored against an explicit
    // version keep it. This runs on import so old packs are stamped v1.
    if (!pack || !Array.isArray(pack.activities)) return pack;
    const cur = (PyQuiz.Constants && PyQuiz.Constants.CURRENT_RENDERER_VERSION) || {};
    pack.activities.forEach(function (a) {
      if (a && a.renderer_version == null) a.renderer_version = cur[a.type] || 1;
    });
    return pack;
  }

  function ingestPack(json) {
    let obj = json;
    if (typeof json === "string") {
      try { obj = JSON.parse(json); }
      catch (e) { return { ok: false, issues: [{ level: "error", path: "", message: "Bad JSON: " + e.message }] }; }
    }
    if (!obj || typeof obj !== "object") return { ok: false, issues: [{ level: "error", path: "", message: "Pack must be an object." }] };
    stampRendererVersions(obj);
    const issues = PyQuiz.Validator.pack(obj);
    if (issues.some(i => i.level === "error")) return { ok: false, issues: issues, pack: obj };
    return { ok: true, issues: issues, pack: obj };
  }

  PyQuiz.Pack = {
    blank: blank,
    blankActivity: blankActivity,
    defaultPayload: defaultPayload,
    uid: uid,
    nowISO: nowISO,
    addActivity: addActivity,
    removeActivity: removeActivity,
    moveActivity: moveActivity,
    duplicateActivity: duplicateActivity,
    findActivity: findActivity,
    touch: touch,
    addSection: addSection,
    removeSection: removeSection,
    moveSection: moveSection,
    setActivitySection: setActivitySection,
    renumberSections: renumberSections,
    sortAndRenumberSections: sortAndRenumberSections,
    ingestActivity: ingestActivity,
    ingestPack: ingestPack
  };
})();
