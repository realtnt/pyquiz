/* =====================================================================
 * PyQuiz.Schema — machine-readable schema descriptors
 *
 * Two distinct jobs:
 *   1. Authoritative documentation of pack/activity shape, type-by-type.
 *   2. Serialisation to a prompt-ready spec for AI activity generation.
 *
 * This module is INFORMATIONAL. Validation lives in PyQuiz.Validator.
 * If you change activity field shapes, update BOTH this file (for the
 * prompt) and the validator (for runtime checks).
 *
 * Public API:
 *   PyQuiz.Schema.packEnvelope     — top-level pack fields
 *   PyQuiz.Schema.activityEnvelope — common activity fields
 *   PyQuiz.Schema.payloads[type]   — per-type payload descriptor
 *   PyQuiz.Schema.describeType(t)  — markdown describing one payload
 *   PyQuiz.Schema.describeAll()    — markdown describing the whole schema
 *   PyQuiz.Schema.promptSpec(opts) — returns a string ready to embed in an
 *                                    LLM prompt. Opts: { types: [..] }.
 *
 * Conventions used in field descriptors:
 *   { type, required?, description?, fixed?, values?, items?, shape?,
 *     default?, example? }
 *   - type: "string" | "number" | "boolean" | "enum" | "array" | "object" |
 *           "id" (string-as-identifier) | "code" (multiline Python source)
 *   - fixed: literal value the field must equal
 *   - values: for enum, the allowed strings
 *   - items: for arrays, the item descriptor or a back-reference like "activity"
 *   - shape: for objects, a map of nested field descriptors
 *   - example: a sample value used by promptSpec()
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const C = PyQuiz.Constants;

  const Schema = {};

  Schema.packEnvelope = {
    description: "A pack of activities for a single lesson or revision session.",
    fields: {
      pack_format_version: { type: "string", required: true, fixed: C.PACK_FORMAT_VERSION },
      schema_version:      { type: "string", required: true, fixed: C.SCHEMA_VERSION },
      id:                  { type: "id", required: true, description: "Unique pack id (UUID or slug)." },
      title:               { type: "string", required: true, example: "Loops — Week 1" },
      description:         { type: "string", required: false, example: "Introductory loop practice for Year 8." },
      language:            { type: "enum", required: true, values: ["python"], default: "python" },
      audience:            { type: "enum", required: false, values: ["ks3", "ks4", "ks5", "other"], default: "ks3" },
      author:              { type: "string", required: false, description: "Stripped on student export." },
      created_at:          { type: "string", required: false, description: "ISO timestamp." },
      updated_at:          { type: "string", required: false, description: "ISO timestamp." },
      spec_refs:           { type: "array", required: false, items: { type: "string" }, description: "External spec codes. Stripped on student export.", example: ["OCR_J277_2.2"] },
      tags:                { type: "array", required: false, items: { type: "string" }, example: ["loops", "iteration"] },
      settings: {
        type: "object", required: true,
        shape: {
          shuffle:               { type: "boolean", default: false },
          show_hints:            { type: "boolean", default: true },
          show_solutions_after:  { type: "enum", values: ["submission", "correct_only", "never"], default: "submission" },
          show_runner_after:     { type: "enum", values: ["correct", "always", "never"], default: "correct", description: "When to reveal the in-browser Pyodide runner panel under each activity." },
          pass_threshold:        { type: "number", default: 0.7, description: "0..1" }
        }
      },
      sections: {
        type: "array", required: false,
        description: "Optional grouping of activities into sections. When present the student UI groups the task list by section, in 'number' order. Section numbers must form a contiguous 1..N sequence with no gaps or duplicates. If sections are omitted activities show as a flat list.",
        items: {
          type: "object",
          shape: {
            id:     { type: "id", required: true, description: "Unique section id within the pack." },
            number: { type: "number", required: true, description: "Section number, 1..N. Must be contiguous and unique. Sections are sorted by this on render." },
            title:  { type: "string", required: true, description: "Display title, e.g. 'Loops and iteration'." },
            colour: { type: "string", required: false, description: "Optional hex colour override (e.g. '#2D5BA6'). When omitted a stable colour is chosen by hashing the section id." }
          }
        }
      },
      activities: { type: "array", required: true, items: "activity" }
    }
  };

  Schema.activityEnvelope = {
    description: "Common fields present on every activity, regardless of type.",
    fields: {
      id:                     { type: "id", required: true, description: "Unique within the pack." },
      type:                   { type: "enum", required: true, values: C.ACTIVITY_TYPES },
      section_id:             { type: "id", required: false, description: "Optional section grouping id, matching a sections[].id on the pack. Activities without a section_id appear in an 'Unsectioned' group when sections exist." },
      title:                  { type: "string", required: true, example: "Print numbers 1 to 5" },
      instructions:           { type: "string", required: true, description: "What the student must do." },
      context:                { type: "string", required: false, description: "Optional scenario shown above instructions." },
      difficulty:             { type: "number", required: false, default: 1, description: "1..5" },
      topics:                 { type: "array", required: false, items: { type: "string" } },
      spec_refs:              { type: "array", required: false, items: { type: "string" }, description: "Stripped on student export." },
      estimated_time_seconds: { type: "number", required: false, default: 60 },
      points:                 { type: "number", required: false, default: 1 },
      colour:                 { type: "string", required: false, description: "Optional hex colour (e.g. '#2D5BA6') to override the default per-type colour. Used for the small pill next to the activity in the task list and the badge in the activity header." },
      timing: {
        type: "object", required: false, description: "Null or a timer descriptor.",
        shape: {
          mode:          { type: "enum", values: ["countdown", "count_up"], required: true },
          limit_seconds: { type: "number", required: true, description: "> 0" },
          on_expire:     { type: "enum", values: ["submit", "lock", "warn"], required: true }
        }
      },
      hints:                  { type: "array", required: false, items: { type: "string" }, description: "Revealed one at a time on demand." },
      solution_explanation:   { type: "string", required: false, description: "Shown via Reveal solution, gated by pack setting." },
      feedback: {
        type: "object", required: false,
        shape: {
          correct:    { type: "string", required: false, description: "Shown on correct submission." },
          incorrect:  { type: "string", required: false, description: "Shown on incorrect submission." },
          per_option: { type: "object", required: false, description: "Per-option feedback (predict_output MC and cloze select only). Map of option_id -> string." }
        }
      },
      teacher_notes:          { type: "string", required: false, description: "STRIPPED on student export." },
      metadata:               { type: "object", required: false, description: "Free-form bag for authoring tools. STRIPPED on student export." },
      runner_inputs:          { type: "array", required: false, items: { type: "string" }, description: "Optional list of strings fed to input() calls in order when the Pyodide runner executes the assembled code. Lets activities that read input() run non-interactively." },
      payload:                { type: "object", required: true, description: "Type-specific. See per-type schema." }
    }
  };

  Schema.payloads = {
    parsons: {
      description: "Reorder code lines into a working program. Distractor lines (if any) render identically to non-distractors and should be left unused in the source area.",
      fields: {
        lines: {
          type: "array", required: true,
          items: {
            type: "object",
            shape: {
              id:         { type: "id", required: true, description: "Short unique id, e.g. 'a', 'b'." },
              code:       { type: "string", required: true, description: "The code on this line (no leading whitespace — indent is separate)." },
              indent:     { type: "number", required: true, default: 0, description: "Indent level, 0 = no indent." },
              distractor: { type: "boolean", required: true, default: false, description: "If true, NOT part of the correct solution. Rendered identically to non-distractors; students must work out which to leave unused." },
              fixed:      { type: "boolean", required: true, default: false, description: "If true, pre-placed in the solution area and cannot be moved." }
            }
          }
        },
        solution: { type: "array", required: true, items: { type: "id" }, description: "Ordered list of line ids that form the correct solution. Must NOT include any distractor ids." },
        indent_baked_in:    { type: "boolean", required: true, fixed: true, description: "v0.1: always true. Students do not control indentation." },
        indent_size_spaces: { type: "number", required: true, default: 4 },
        runner_call:        { type: "string", required: false, description: "Optional Python appended when running in Pyodide if the solution defines a function but doesn't call it." }
      },
      example: {
        lines: [
          { id: "a", code: "for i in range(1, 6):", indent: 0, distractor: false, fixed: false },
          { id: "b", code: "print(i)",              indent: 1, distractor: false, fixed: false },
          { id: "c", code: "print(I)",              indent: 1, distractor: true,  fixed: false },
          { id: "d", code: "for i in range(5):",    indent: 0, distractor: true,  fixed: false }
        ],
        solution: ["a", "b"],
        indent_baked_in: true,
        indent_size_spaces: 4
      }
    },

    cloze: {
      description: "Fill in blanks in a code template. Blanks may be free text, drop-downs or items from a shared pool.",
      fields: {
        code_template: { type: "code", required: true, description: "Python code with {{id}} placeholders for each blank." },
        blanks: {
          type: "array", required: true,
          items: {
            type: "object",
            shape: {
              id:             { type: "id", required: true, description: "Matches a {{id}} in code_template." },
              mode:           { type: "enum", required: true, values: ["free_text", "select", "bank"] },
              answer:         { type: "string", required: true, description: "Canonical answer." },
              accepted:       { type: "array", required: false, items: { type: "string" }, description: "free_text only: list of accepted strings after normalisation." },
              options:        { type: "array", required: false, items: { type: "string" }, description: "select only: drop-down options (must include answer, and at least 2 total)." },
              case_sensitive: { type: "boolean", required: false, default: true, description: "free_text only." },
              width_hint:     { type: "number", required: false, default: 6, description: "free_text only: approximate input width in characters." }
            }
          }
        },
        shared_pool: {
          type: "object", required: false,
          description: "Required when any blank is mode 'pool' or 'bank'. Items shown as draggable chips.",
          shape: {
            items:           { type: "array", required: true, items: { type: "string" } },
            has_distractors: { type: "boolean", required: true, default: true, description: "If false, items.length must equal the number of pool/bank blanks." },
            single_use:      { type: "boolean", required: true, default: true, description: "If true, an item leaves the pool once placed." }
          }
        },
        runner_call: { type: "string", required: false, description: "Optional Python appended when running in Pyodide if the cloze defines a function but doesn't call it." }
      },
      example: {
        code_template: "total = {{1}}\nfor n in {{2}}:\n    total = total {{3}} n\nprint(total)",
        blanks: [
          { id: "1", mode: "free_text", answer: "0", accepted: ["0"], case_sensitive: true, width_hint: 3 },
          { id: "2", mode: "select",    answer: "numbers", options: ["numbers", "total", "n"] },
          { id: "3", mode: "bank",      answer: "+" }
        ],
        shared_pool: { items: ["+", "-", "*", "="], has_distractors: true, single_use: true }
      }
    },

    trace_table: {
      description: "Fill in a step-by-step trace of program state. The student fills in line numbers and may add rows as needed. Empty cells mean 'value unchanged from previous row'.",
      fields: {
        code: { type: "code", required: true, description: "The program being traced." },
        columns: {
          type: "array", required: true,
          items: {
            type: "object",
            shape: {
              id:    { type: "id", required: true },
              label: { type: "string", required: true, description: "Column header shown to the student." },
              kind:  { type: "enum", required: true, values: ["variable", "output", "other"] }
            }
          }
        },
        rows: {
          type: "array", required: true,
          description: "The CANONICAL expected trace. Cells left empty mean 'unchanged from previous shown value' (same convention as student responses).",
          items: {
            type: "object",
            shape: {
              line:   { type: "number", required: true, description: "1-indexed line of `code` this row describes (state AFTER executing that line)." },
              values: { type: "object", required: true, description: "Map of column_id -> visible string value, or '' for unchanged." }
            }
          }
        },
        marking:         { type: "enum", required: true, values: ["exact_cells"], fixed: "exact_cells" },
        undefined_token: { type: "string", required: false, default: "", description: "Visible string for 'not yet assigned'. Default empty string; no token needed if leaving the cell blank." }
      },
      example: {
        code: "x = 0\nfor i in range(3):\n    x = x + i\nprint(x)",
        columns: [
          { id: "i",   label: "i",      kind: "variable" },
          { id: "x",   label: "x",      kind: "variable" },
          { id: "out", label: "Output", kind: "output" }
        ],
        rows: [
          { line: 1, values: { i: "",  x: "0", out: "" } },
          { line: 2, values: { i: "0", x: "",  out: "" } },
          { line: 3, values: { i: "",  x: "0", out: "" } },
          { line: 2, values: { i: "1", x: "",  out: "" } },
          { line: 3, values: { i: "",  x: "1", out: "" } },
          { line: 2, values: { i: "2", x: "",  out: "" } },
          { line: 3, values: { i: "",  x: "3", out: "" } },
          { line: 4, values: { i: "",  x: "",  out: "3" } }
        ],
        marking: "exact_cells",
        undefined_token: ""
      }
    },

    spot_the_bug: {
      description: "Identify (and optionally fix) one or more bugs in a snippet.",
      fields: {
        code_lines:         { type: "array", required: true, items: { type: "string" }, description: "One element per line. Do not include line numbers." },
        expected_behaviour: { type: "string", required: false, description: "What the code should do." },
        actual_behaviour:   { type: "string", required: false, description: "What the buggy code does instead." },
        mode:               { type: "enum", required: true, values: ["select_line", "select_and_fix", "rewrite"] },
        constraint:         { type: "enum", required: true, values: ["none", "one_line", "one_char", "add_line", "remove_line"], default: "none" },
        bugs: {
          type: "array", required: true,
          items: {
            type: "object",
            shape: {
              id:             { type: "id", required: false },
              line:           { type: "number", required: true, description: "1-indexed line within code_lines." },
              category:       { type: "enum", required: true, values: ["syntax", "runtime", "logic", "type", "indentation", "name", "off_by_one", "operator", "variable"] },
              fix:            { type: "string", required: false, description: "Canonical replacement line (with correct indentation). The marker strips leading whitespace before comparing, so students don't have to get indentation right." },
              accepted_fixes: { type: "array", required: false, items: { type: "string" }, description: "Alternative accepted replacement lines." }
            }
          }
        },
        runner_call: { type: "string", required: false, description: "Optional Python to append when running the assembled code in Pyodide. Use this when the code defines a function but doesn't call it (e.g. `print(average([1, 2, 3]))`). Ignored if the code already calls the function." }
      },
      example: {
        code_lines: ["def average(nums):", "    total = 0", "    for n in nums:", "        total + n", "    return total / len(nums)"],
        expected_behaviour: "Return the mean of the list.",
        actual_behaviour: "Returns 0 / len(nums).",
        mode: "select_and_fix",
        constraint: "one_line",
        bugs: [{ line: 4, category: "logic", fix: "        total = total + n", accepted_fixes: ["        total += n", "        total = total + n"] }]
      }
    },

    /* Modify uses the same payload shape as spot_the_bug — same renderer,
       same marker, same editor — but the activity TYPE is distinct so
       teachers pick "Modify" from the type list when authoring the
       Investigate/Modify step of a PRIMM journey. The renderer branches
       on activity.type to swap labels (Expected → Required, Actual →
       Currently) and to skip the "this code is broken" framing. */
    modify: {
      description: "The code works. Change one line so it does something different. Investigate/Modify step in a PRIMM journey.",
      fields: {
        code_lines:         { type: "array", required: true, items: { type: "string" }, description: "One element per line. Do not include line numbers." },
        expected_behaviour: { type: "string", required: false, description: "What the code should do AFTER the student's change." },
        actual_behaviour:   { type: "string", required: false, description: "What the code does currently, before the change." },
        mode:               { type: "enum", required: true, values: ["select_line", "select_and_fix", "rewrite"] },
        constraint:         { type: "enum", required: true, values: ["none", "one_line", "one_char", "add_line", "remove_line"], default: "one_line" },
        bugs: {
          type: "array", required: true,
          items: {
            type: "object",
            shape: {
              id:             { type: "id", required: false },
              line:           { type: "number", required: true, description: "1-indexed line within code_lines — the line the student must change." },
              category:       { type: "enum", required: true, values: ["syntax", "runtime", "logic", "type", "indentation", "name", "off_by_one", "operator", "variable"], description: "For modify activities, category is informational only — usually 'logic'." },
              fix:            { type: "string", required: false, description: "Canonical replacement line (with correct indentation). The marker strips leading whitespace before comparing." },
              accepted_fixes: { type: "array", required: false, items: { type: "string" }, description: "Alternative accepted replacement lines." }
            }
          }
        },
        runner_call: { type: "string", required: false, description: "Optional Python to append when running the assembled code in Pyodide." }
      },
      example: {
        code_lines: ["for i in range(5):", "    print(i)"],
        expected_behaviour: "Prints 0 through 9 (range bumped to 10).",
        actual_behaviour: "Prints 0 through 4.",
        mode: "select_and_fix",
        constraint: "one_line",
        bugs: [{ line: 1, category: "logic", fix: "for i in range(10):" }]
      }
    },

    predict_output: {
      description: "Predict the output of a snippet (or match given output to candidate code).",
      fields: {
        code:             { type: "code", required: true, description: "The code stem (or, if direction is output_to_code, the output stem)." },
        direction:        { type: "enum", required: true, values: ["code_to_output", "output_to_code"], default: "code_to_output" },
        mode:             { type: "enum", required: true, values: ["multiple_choice", "free_text"], description: "If direction is output_to_code, mode MUST be multiple_choice." },
        answer:           { type: "string", required: true, description: "free_text: the canonical output. multiple_choice: an option id." },
        accepted_answers: { type: "array", required: false, items: { type: "string" }, description: "free_text: alternative accepted outputs." },
        options: {
          type: "array", required: false,
          description: "multiple_choice only.",
          items: {
            type: "object",
            shape: {
              id:      { type: "id", required: true },
              content: { type: "string", required: true, description: "Pre-formatted text shown to the student." }
            }
          }
        }
      },
      example: {
        code: "for i in range(3):\n    print(i * 2)",
        direction: "code_to_output",
        mode: "free_text",
        answer: "0\n2\n4",
        accepted_answers: ["0\n2\n4"]
      }
    },

    starter_challenge: {
      description: "Copy-to-IDE programming task. v0.1 does not execute student code.",
      fields: {
        instructions:        { type: "string", required: true, description: "Restates the brief inside the activity body." },
        starter_code:        { type: "code", required: true, description: "Skeleton with TODO comments." },
        function_name:       { type: "string", required: false, description: "The function the student should define. Strongly recommended." },
        example_calls: {
          type: "array", required: false,
          description: "Example call / expected pairs for self-checking. Strongly recommended.",
          items: {
            type: "object",
            shape: {
              call:     { type: "string", required: true, description: "e.g. double(2)" },
              expected: { type: "string", required: true, description: "Visible representation, e.g. '4'." }
            }
          }
        },
        model_solution:      { type: "code", required: false, description: "Shown via Reveal solution when allowed." },
        self_check_guidance: { type: "string", required: false }
      },
      example: {
        instructions: "Write a function double(n) that returns n doubled.",
        starter_code: "def double(n):\n    # your code here\n    pass\n",
        function_name: "double",
        example_calls: [
          { call: "double(2)",  expected: "4" },
          { call: "double(0)",  expected: "0" },
          { call: "double(-7)", expected: "-14" }
        ],
        model_solution: "def double(n):\n    return n * 2\n",
        self_check_guidance: "Try each example call in your IDE and compare the result."
      }
    }
  };

  /* -------- Markdown rendering for AI prompts -------- */
  function fieldLine(name, d) {
    const parts = [name];
    parts.push("`" + d.type + (d.values ? " of " + d.values.map(v => '"' + v + '"').join(" | ") : "") + "`");
    if (d.required === true) parts.push("**required**");
    if (d.fixed !== undefined) parts.push("must be `" + JSON.stringify(d.fixed) + "`");
    if (d.default !== undefined) parts.push("default `" + JSON.stringify(d.default) + "`");
    if (d.description) parts.push("— " + d.description);
    return "- " + parts.join(" ");
  }
  function renderFields(fields, depth) {
    depth = depth || 0;
    const out = [];
    const indent = "  ".repeat(depth);
    for (const name of Object.keys(fields)) {
      const d = fields[name];
      out.push(indent + fieldLine(name, d).slice(2));
      if (d.shape) out.push(renderFields(d.shape, depth + 1));
      if (d.items && typeof d.items === "object" && d.items.shape) {
        out.push(indent + "  Each item:");
        out.push(renderFields(d.items.shape, depth + 2));
      }
    }
    return out.map(line => (line.startsWith("- ") ? indent + "- " + line.slice(2) : line)).join("\n");
  }

  Schema.describeType = function (type) {
    const p = Schema.payloads[type];
    if (!p) return "(unknown type)";
    const parts = [];
    parts.push("## " + type);
    parts.push(p.description);
    parts.push("");
    parts.push("### Payload fields");
    parts.push(renderFields(p.fields));
    if (p.example) {
      parts.push("");
      parts.push("### Example payload");
      parts.push("```json");
      parts.push(JSON.stringify(p.example, null, 2));
      parts.push("```");
    }
    return parts.join("\n");
  };

  Schema.describeAll = function () {
    const parts = [];
    parts.push("# PyQuiz schema v" + C.SCHEMA_VERSION);
    parts.push("");
    parts.push("## Pack envelope");
    parts.push(Schema.packEnvelope.description);
    parts.push("");
    parts.push(renderFields(Schema.packEnvelope.fields));
    parts.push("");
    parts.push("## Activity envelope");
    parts.push(Schema.activityEnvelope.description);
    parts.push("");
    parts.push(renderFields(Schema.activityEnvelope.fields));
    parts.push("");
    parts.push("## Payloads (per type)");
    for (const t of C.ACTIVITY_TYPES) {
      parts.push("");
      parts.push(Schema.describeType(t));
    }
    return parts.join("\n");
  };

  /**
   * Produce a prompt-ready spec for AI activity generation.
   * @param {Object} [opts]
   * @param {string[]} [opts.types]      restrict to a subset of activity types
   * @param {boolean}  [opts.envelopes]  include pack + activity envelopes (default true)
   */
  Schema.promptSpec = function (opts) {
    opts = opts || {};
    const types = opts.types || C.ACTIVITY_TYPES;
    const includeEnvelopes = opts.envelopes !== false;
    const parts = [];
    parts.push("PyQuiz schema v" + C.SCHEMA_VERSION + ". Output JSON exactly matching this spec.");
    parts.push("");
    if (includeEnvelopes) {
      parts.push("### Activity envelope (every activity has these top-level fields)");
      parts.push(renderFields(Schema.activityEnvelope.fields));
      parts.push("");
    }
    for (const t of types) {
      parts.push(Schema.describeType(t));
      parts.push("");
    }
    return parts.join("\n");
  };

  PyQuiz.Schema = Schema;
})();
