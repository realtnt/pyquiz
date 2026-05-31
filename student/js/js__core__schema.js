/* === inlined from js/core/schema.js === */
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
          pass_threshold:        { type: "number", default: 0.7, description: "0..1" },
          ask_confidence:        { type: "boolean", default: false, description: "When true, the student is offered an optional Low/Medium/High confidence selector before pressing Check. Choices are recorded in progress but never affect marking." },
          attempts_per_activity: { type: "number",  default: 2,     description: "Maximum number of Check presses per activity. After this many wrong attempts the activity is marked failed (red ✗, no point) and the solution is shown. Set to 0 for unlimited attempts." },
          sequential:            { type: "boolean", default: false, description: "When true, students must complete activities in order — later activities are locked until the current one is either correct or has run out of attempts." },
          focused:               { type: "boolean", default: false, description: "When true, only one section can be open in the task list at a time — opening a section closes the others. When false, sections can all be open at once." }
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
      renderer_version:       { type: "number", required: false, default: 1, description: "Which version of this activity type's renderer the activity was authored against. Defaults to 1. The app renders with that version if available, else the nearest older one, so old packs keep working when renderers change." },
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
      hints: {
        type: "array", required: false,
        description: "Revealed one at a time on demand. Each hint is either a plain string (legacy — treated as type 'nudge') or an object with a type and text. Use 'nudge' for a gentle pointer, 'concept' to explain the underlying idea, 'partial_solution' to give part of the answer.",
        items: {
          type: "object",
          shape: {
            type: { type: "enum",   required: true, values: ["nudge", "concept", "partial_solution"] },
            text: { type: "string", required: true }
          }
        }
      },
      skills:                 { type: "array", required: false, items: { type: "string" }, description: "Optional list of skill identifiers exercised, e.g. ['predict_output', 'trace_execution']. Free-form strings used by teachers and analytics." },
      misconceptions:         { type: "array", required: false, items: { type: "string" }, description: "Optional list of misconception identifiers this activity targets, e.g. ['assignment_vs_comparison']." },
      exam_refs:              { type: "array", required: false, items: { type: "string" }, description: "Optional exam-board reference codes, e.g. ['OCR_J277_2.2.1']. Alias of spec_refs — supported for clarity." },
      primm_phase:            { type: "enum",  required: false, values: ["predict", "run", "investigate", "modify", "make"], description: "Optional: which PRIMM phase this activity fits. Useful for teachers structuring a journey." },
      concept_level:          { type: "enum",  required: false, values: ["introduce", "practise", "consolidate", "extend"], description: "Optional: where in the concept arc this activity sits. introduce=first encounter, practise=repetition, consolidate=apply across contexts, extend=push beyond." },
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
      runner_inputs:          { type: "array", required: false, items: { type: "string" }, description: "Optional list of strings representing values fed to input() in order. Used to populate the Input row of the I/O panel when expected_input is not explicitly set, and as documentation of the inputs the code was designed for." },
      /* The fields below populate the standardised I/O panel rendered
         above the activity body. They're all optional — the panel is
         skipped entirely when none are set. */
      expected_input:         { type: "string", required: false, description: "Shown in the Input row of the I/O panel. Free-form: a value, a line of stdin, or short description. Use '—' to make the absence explicit." },
      expected_output:        { type: "string", required: false, description: "Shown in the Output row's Expected column. The text a correct program should print." },
      current_output:         { type: "string", required: false, description: "Shown in the Output row's Current column. Only meaningful for spot_the_bug and modify — what the existing code prints today, which the student must change." },
      sample_call:            { type: "string", required: false, description: "Shown in the Sample call row of the I/O panel. For function-based activities: a concrete call like 'double(5)' so the student sees how the function is exercised." },
      follow_up: {
        type: "object", required: false,
        description: "Optional short reflection prompt shown to the student after the first Check (whether correct or incorrect). The student's response is stored with progress and never auto-marked.",
        shape: {
          prompt:       { type: "string",  required: true,  description: "The question shown to the student, e.g. \"Why does this print Grace rather than Ada?\"." },
          mode:         { type: "enum",    required: true,  values: ["free_text"], default: "free_text", description: "Only free_text in v0.1." },
          teacher_only: { type: "boolean", required: true,  default: true, description: "When true, the response is collected for the teacher only — never marked, never shown back as right/wrong." }
        }
      },
      payload:                { type: "object", required: true, description: "Type-specific. See per-type schema." }
    }
  };

  Schema.payloads = {
    parsons: {
      description: "Reorder code lines into a working program. Distractor lines (if any) render identically to non-distractors and should be left unused in the source area.",
      fields: {
        canonical_code: { type: "string", required: true, description: "The canonical solution as Python source. One block per line. Leading spaces in each line determine the indent level (4 spaces = 1 level by default). The line numbering 1..N in this field is the reference used by swap_groups and extra_accepted_orderings." },
        distractors:    { type: "string", required: false, default: "", description: "One distractor block per line. Empty lines are ignored. May be empty if the activity has no distractors." },
        swap_groups:    { type: "array", required: false, default: [], items: { type: "array", items: { type: "number" } }, description: "Groups of canonical line numbers (1-indexed) that can be permuted freely. The marker accepts every permutation produced by any combination of group permutations. Groups must not overlap." },
        extra_accepted_orderings: { type: "array", required: false, default: [], items: { type: "array", items: { type: "number" } }, description: "Manually authored orderings, each a permutation of [1..N]. Use only when a swap-group doesn't cover a desired ordering." },
        indent_size_spaces: { type: "number", required: false, default: 4 },
        discard_required:   { type: "boolean", required: false, default: true, description: "If true and any distractors exist, the student must place every distractor in the bin." }
      },
      example: {
        canonical_code: "name = \"Ada\"\nage = 36\nprint(name)\nprint(age)",
        distractors: "age = \"36\"\nname = Ada",
        swap_groups: [[1, 2]],
        extra_accepted_orderings: [],
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
        constraint:         { type: "enum", required: true, values: ["in_place", "add_line", "remove_line"], default: "in_place", description: "Which UI paradigm the student uses. `in_place` = click a line and edit it in place; `add_line` = press a + button to insert a new line; `remove_line` = move a line to a bin. How much the student should change (one line, one character, etc) belongs in the activity instructions, not as a schema flag — the marker checks the `bugs[]` list regardless." },
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
        constraint: "in_place",
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
        constraint:         { type: "enum", required: true, values: ["in_place", "add_line", "remove_line"], default: "in_place", description: "Which UI paradigm the student uses. See spot_the_bug.constraint." },
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
        constraint: "in_place",
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
    },

    testing: {
      description: "Build a table of test cases for a snippet of code. The student fills any cells the teacher hasn't pre-filled, picks Normal/Boundary/Erroneous from a drop-down for the Test type column, and the marker auto-classifies the input against the declared type and range to check the student's choice. Designed for J277/H446-style testing questions.",
      fields: {
        code:          { type: "code", required: true, description: "The code under test." },
        function_name: { type: "string", required: false, description: "Used in I/O panel hints if the code defines a function." },
        input_columns: {
          type: "array", required: true,
          description: "One entry per input. Each one becomes a column in the test table to the left of Expected output and Test type.",
          items: {
            type: "object",
            shape: {
              id:    { type: "id",     required: true, description: "Stable identifier; used as the cell key in row.values." },
              label: { type: "string", required: true, description: "Column header shown to the student." },
              type:  { type: "enum",   required: true, values: ["int", "float", "str", "bool"] },
              min:                  { type: "number", required: false, description: "Inclusive lower bound for int/float." },
              max:                  { type: "number", required: false, description: "Inclusive upper bound for int/float." },
              min_length:           { type: "number", required: false, description: "Inclusive minimum length for str." },
              max_length:           { type: "number", required: false, description: "Inclusive maximum length for str." },
              decision_boundaries:  { type: "array",  required: false, items: { type: "number" }, description: "int/float only — values at or within ±1 of these are classified as Boundary." },
              boundary_values:      { type: "array",  required: false, items: { type: "string" }, description: "str only — literal values to flag as Boundary (e.g. \"\" for empty string)." }
            }
          }
        },
        rows: {
          type: "array", required: true,
          description: "One row per test case. Cells listed in `prefilled` are read-only with the teacher's value shown; the rest are editable by the student.",
          items: {
            type: "object",
            shape: {
              values:    { type: "object", required: true, description: "Map of column_id -> string. Special column ids: `output` (Expected output) and `test_type` (one of 'normal', 'boundary', 'erroneous')." },
              prefilled: { type: "array",  required: false, items: { type: "string" }, description: "Column ids whose values are shown read-only to the student." }
            }
          }
        }
      },
      example: {
        code: "def is_adult(age):\n    return age >= 18\n",
        function_name: "is_adult",
        input_columns: [
          { id: "age", label: "age", type: "int", min: 0, max: 120, decision_boundaries: [18] }
        ],
        rows: [
          { values: { age: "17", output: "False", test_type: "boundary" }, prefilled: ["age", "output"] },
          { values: { age: "",   output: "",      test_type: "" },          prefilled: [] }
        ]
      }
    },

    flowchart: {
      description: "Complete-flowchart activity. The teacher provides a flowchart drawn on a (row, col) grid; some shape labels include {{id}} placeholders that render as inline blanks. The student fills the blanks; the marker checks each blank separately, reusing the cloze acceptance logic. Optionally a code snippet can be shown above the chart (the 'create the flowchart from this code' framing). Grid coordinates: row 0 is the top, col 0 is the left. Shapes have fixed sizes — the teacher only chooses the cell. Edges auto-route as orthogonal lines: bottom→top by default; same-row edges go side-to-side; back-edges (target row < source row, i.e. loops) route around the right side when from_side='right' and to_side='right' are set.",
      fields: {
        flowchart: {
          type: "object", required: true,
          shape: {
            shapes: {
              type: "array", required: true,
              description: "One entry per shape. Cells must be unique (no two shapes at the same row+col).",
              items: {
                type: "object",
                shape: {
                  id:   { type: "id",     required: true, description: "Stable identifier used by edges and referenced by {{id}} markers." },
                  kind: { type: "enum",   required: true, values: ["terminator", "process", "decision", "io"], description: "terminator = Start/End (stadium); process = rectangle for assignment/call; decision = diamond with Yes/No edges; io = parallelogram for input()/print()." },
                  text: { type: "string", required: true, description: "Visible text inside the shape. Use {{id}} markers to make blanks — define the answer in payload.blanks." },
                  row:  { type: "number", required: true, description: "0-indexed row position (0 = top)." },
                  col:  { type: "number", required: true, description: "0-indexed column position (0 = left)." }
                }
              }
            },
            edges: {
              type: "array", required: true,
              description: "Directed connections between shapes. A decision shape MUST have exactly two outgoing edges, labelled 'Yes' and 'No'.",
              items: {
                type: "object",
                shape: {
                  from:      { type: "id",     required: true, description: "Source shape id." },
                  to:        { type: "id",     required: true, description: "Target shape id." },
                  label:     { type: "string", required: false, description: "Text shown on the edge — use 'Yes' / 'No' for decision branches." },
                  from_side: { type: "enum",   required: false, values: ["top", "right", "bottom", "left"], description: "Optional: which side of the source shape the edge exits. Default: bottom (or left/right when the source is a decision branching to side targets). For edges that must detour around a column of shapes (back-edges in a while loop; a No exit that has to pass shapes in its column), set from_side='right' or 'left' so the arrow routes around that side of the chart. If TWO edges in the same chart both need to detour (e.g. a while loop's back-edge AND its exit-when-false edge), put one on the right and the other on the left so they don't overlap." },
                  to_side:   { type: "enum",   required: false, values: ["top", "right", "bottom", "left"], description: "Optional: which side of the target shape the edge enters. Default: top. Pair with from_side: an edge routing on the right uses to_side='right'; one routing on the left uses to_side='left'." }
                }
              }
            }
          }
        },
        code_alongside: { type: "string", required: false, description: "Optional Python code shown above the chart. Use for 'build the flowchart from this code' framing." },
        blanks: {
          type: "array", required: true,
          description: "One entry per {{id}} marker that appears in any shape's text. Same shape as cloze blanks.",
          items: {
            type: "object",
            shape: {
              id:             { type: "id",     required: true, description: "Must match a {{id}} marker in some shape's text." },
              mode:           { type: "enum",   required: true, values: ["free_text", "select"], description: "free_text renders an <input>; select renders a drop-down." },
              answer:         { type: "string", required: true, description: "Canonical answer." },
              accepted:       { type: "array",  required: false, items: { type: "string" }, description: "free_text only: list of accepted strings after normalisation." },
              options:        { type: "array",  required: false, items: { type: "string" }, description: "select only: drop-down options (must include answer)." },
              case_sensitive: { type: "boolean", required: false, default: true, description: "free_text only." },
              width_hint:     { type: "number",  required: false, default: 6, description: "free_text only: approximate input width in characters." }
            }
          }
        }
      },
      example: {
        flowchart: {
          shapes: [
            { id: "start",  kind: "terminator", text: "Start",            row: 0, col: 1 },
            { id: "input",  kind: "io",         text: "input age",        row: 1, col: 1 },
            { id: "check",  kind: "decision",   text: "age >= {{c}}",     row: 2, col: 1 },
            { id: "adult",  kind: "process",    text: "print(\"adult\")", row: 3, col: 0 },
            { id: "child",  kind: "process",    text: "print(\"child\")", row: 3, col: 2 },
            { id: "end",    kind: "terminator", text: "End",              row: 4, col: 1 }
          ],
          edges: [
            { from: "start", to: "input" },
            { from: "input", to: "check" },
            { from: "check", to: "adult", label: "Yes" },
            { from: "check", to: "child", label: "No"  },
            { from: "adult", to: "end" },
            { from: "child", to: "end" }
          ]
        },
        blanks: [
          { id: "c", mode: "free_text", answer: "18", accepted: ["18"], case_sensitive: true, width_hint: 3 }
        ]
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
