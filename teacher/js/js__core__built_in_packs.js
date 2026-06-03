/* === inlined from js/core/built_in_packs.js === */
/* =====================================================================
 * PyQuiz.BuiltInPacks — three bundled starter packs covering the
 * earliest beginner topics. Each pack is a complete learning journey
 * loosely following PRIMM (Predict → Run → Investigate → Modify →
 * Make) with fading scaffolds: hints are richer at the start of each
 * pack and lighter at the end.
 *
 * Every activity carries:
 *   topics, skills, exam_refs (OCR_J277_2.2.x), primm_phase,
 *   concept_level, misconceptions (where applicable), and structured
 *   hints in the new {type, text} shape.
 *
 * All packs have settings.ask_confidence: true so teachers can see
 * confidence patterns. The setting can be turned off per pack via the
 * teacher tool.
 *
 * This module is intentionally easy to remove later — drop it from the
 * inlined scripts and the welcome screen will simply not show built-in
 * pack cards.
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});

  function commonSettings() {
    return {
      shuffle: false,
      show_hints: true,
      show_solutions_after: "submission",
      pass_threshold: 0.7,
      show_runner_after: "correct",
      ask_confidence: false,           // built-in packs default to OFF; teachers can flip
      attempts_per_activity: 2,        // Dr-Frost-style two-attempt model
      sequential: false                // free navigation by default
    };
  }

  /* =====================================================================
   * PACK 1 — Variables & Assignment
   * OCR J277 spec ref 2.2.1 (variables and constants)
   * ===================================================================== */
  function packVariables() {
    return {
      pack_format_version: "0.1",
      schema_version: "0.1",
      id: "builtin-variables-intro",
      title: "Variables & Assignment",
      description: "A learning journey through variables and the assignment operator in Python. Loosely follows PRIMM with fading scaffolds.",
      language: "python",
      audience: "ks3",
      author: "PyQuiz built-in",
      created_at: "2026-05-28T00:00:00Z",
      updated_at: "2026-05-28T00:00:00Z",
      spec_refs: ["OCR_J277_2.2.1"],
      tags: ["builtin", "variables", "beginner"],
      settings: commonSettings(),
      sections: [
        { id: "var-predict",  number: 1, title: "Predict the output" },
        { id: "var-invest",   number: 2, title: "Investigate how variables work" },
        { id: "var-modify",   number: 3, title: "Fix and modify" },
        { id: "var-test",     number: 4, title: "Test and visualise" },
        { id: "var-make",     number: 5, title: "Write it yourself" }
      ],
      activities: [
        /* ---------- Section 1: Predict ---------- */
        {
          id: "v-p1", type: "predict_output", section_id: "var-predict",
          title: "Your very first variable", difficulty: 1,
          instructions: "Predict what this code prints. Type the output exactly as Python would print it.",
          topics: ["variables", "assignment", "print"],
          skills: ["predict_output"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "predict", concept_level: "introduce",
          estimated_time_seconds: 60,
          hints: [
            { type: "concept", text: "An assignment `x = 5` means 'put the value 5 into a box called x'. After that line, x stores 5." },
            { type: "nudge",   text: "What value is inside x when `print(x)` runs?" }
          ],
          feedback: {
            correct:   "Good — print(x) shows what x stores. After x = 5, x is 5.",
            incorrect: "Have another look. print(x) doesn't print the letter x — it prints the value stored in x."
          },
          payload: {
            code: "x = 5\nprint(x)",
            direction: "code_to_output",
            mode: "free_text",
            answer: "5",
            accepted_answers: ["5"]
          }
        },
        {
          id: "v-p2", type: "predict_output", section_id: "var-predict",
          title: "A variable can hold a string", difficulty: 1,
          instructions: "Predict the output.",
          topics: ["variables", "strings", "print"],
          skills: ["predict_output"],
          misconceptions: ["variable_name_is_a_string"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "predict", concept_level: "introduce",
          estimated_time_seconds: 60,
          hints: [
            { type: "concept", text: "`name` is the variable. `\"Ada\"` is the value it stores. `print(name)` shows the value, not the word 'name'." }
          ],
          feedback: {
            correct:   "Right. The quotes belong to the value, not to the variable name.",
            incorrect: "Careful — print(name) doesn't print the letters n-a-m-e. It prints whatever the variable holds."
          },
          payload: {
            code: "name = \"Ada\"\nprint(name)",
            direction: "code_to_output", mode: "free_text",
            answer: "Ada", accepted_answers: ["Ada"]
          }
        },
        {
          id: "v-p3", type: "predict_output", section_id: "var-predict",
          title: "Reassignment overwrites", difficulty: 2,
          instructions: "Predict the output. Be careful — the variable changes value before it is printed.",
          topics: ["variables", "assignment", "reassignment"],
          skills: ["predict_output", "trace_execution"],
          misconceptions: ["variable_keeps_first_value"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "predict", concept_level: "practise",
          estimated_time_seconds: 75,
          hints: [
            { type: "nudge",   text: "Only the most recent value matters when we get to `print`." },
            { type: "concept", text: "Each `=` overwrites whatever was in the variable before. The old value is lost." }
          ],
          feedback: {
            correct:   "Yes — by the time print runs, x has been overwritten to 10.",
            incorrect: "The first line stored 5, but the second line replaced it with 10. Only the most recent value survives."
          },
          payload: {
            code: "x = 5\nx = 10\nprint(x)",
            direction: "code_to_output", mode: "free_text",
            answer: "10", accepted_answers: ["10"]
          }
        },

        /* ---------- Section 2: Investigate ---------- */
        {
          id: "v-c1", type: "cloze", section_id: "var-invest",
          title: "Fill in the assignment", difficulty: 1,
          instructions: "Complete the missing variable name so the program prints 'Alice'.",
          topics: ["variables", "assignment"],
          skills: ["complete_code"],
          misconceptions: ["assignment_vs_comparison"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "investigate", concept_level: "practise",
          estimated_time_seconds: 60,
          hints: [
            { type: "nudge",   text: "On line 1 we want to create a variable that line 2 then prints." },
            { type: "concept", text: "`=` assigns. `==` compares (we'll meet that later)." }
          ],
          feedback: {
            correct:   "Exactly — both lines need to use the same variable name.",
            incorrect: "The variable on line 1 must match the name used in print() on line 2."
          },
          payload: {
            code_template: "{{1}} = \"Alice\"\nprint(name)",
            blanks: [
              { id: "1", mode: "free_text", answer: "name", accepted: ["name"], case_sensitive: true, width_hint: 6 }
            ]
          }
        },
        {
          id: "v-par1", type: "parsons", section_id: "var-invest",
          title: "Order the lines so it prints Ada then 36", difficulty: 2,
          instructions: "Drag the lines into the right order so the program prints Ada on one line and 36 on the next.",
          topics: ["variables", "assignment", "print", "order_of_execution"],
          skills: ["sequence_code"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "investigate", concept_level: "practise",
          estimated_time_seconds: 90,
          hints: [
            { type: "nudge",   text: "A variable must be created (assigned a value) before you can print it." },
            { type: "concept", text: "Python runs lines top to bottom. If `print(name)` runs before `name = ...`, Python won't know what `name` is." }
          ],
          feedback: {
            correct:   "Good — both variables are assigned before either is printed.",
            incorrect: "Check the order: both prints should happen AFTER both assignments."
          },
          payload: {
            canonical_code: "name = \"Ada\"\nage = 36\nprint(name)\nprint(age)",
            distractors: "",
            swap_groups: [[1, 2], [3, 4]],
            extra_accepted_orderings: [],
            indent_size_spaces: 4
          }
        },
        {
          id: "v-t1", type: "trace_table", section_id: "var-invest",
          title: "Trace each step", difficulty: 2,
          instructions: "Fill in the value of x after each line and the final output. Empty cells mean 'no change from the previous row'.",
          topics: ["variables", "reassignment", "trace"],
          skills: ["trace_execution"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "investigate", concept_level: "consolidate",
          estimated_time_seconds: 120,
          hints: [
            { type: "concept", text: "Each row records what changes AFTER the line on the left has run." },
            { type: "nudge",   text: "Line 2 reads the current x, adds 5, and stores the result back into x." }
          ],
          feedback: {
            correct:   "Right — x grows step by step and the final print shows 8.",
            incorrect: "Walk through each line carefully. x starts at 0, becomes 5, then 8."
          },
          payload: {
            code: "x = 0\nx = x + 5\nx = x + 3\nprint(x)",
            columns: [
              { id: "x",   label: "x",      kind: "variable" },
              { id: "out", label: "Output", kind: "output"   }
            ],
            rows: [
              { line: 1, values: { x: "0", out: "" } },
              { line: 2, values: { x: "5", out: "" } },
              { line: 3, values: { x: "8", out: "" } },
              { line: 4, values: { x: "",  out: "8" } }
            ],
            marking: "exact_cells", undefined_token: ""
          }
        },

        /* ---------- Section 3: Modify ---------- */
        {
          id: "v-b1", type: "spot_the_bug", section_id: "var-modify",
          title: "It always greets the same way", difficulty: 2,
          instructions: "This code is meant to store the name 'Ada' in a variable, then print it. Find the buggy line and fix it.",
          topics: ["variables", "assignment", "comparison"],
          skills: ["debug_code"],
          misconceptions: ["assignment_vs_comparison"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "modify", concept_level: "practise",
          estimated_time_seconds: 90,
          hints: [
            { type: "nudge",            text: "One operator stores a value. The other compares two values." },
            { type: "concept",          text: "`=` assigns (puts a value into a variable). `==` compares two values and returns True or False — but we don't want to compare here, we want to STORE." },
            { type: "partial_solution", text: "The correct line starts with `name =`" }
          ],
          feedback: {
            correct:   "Got it. == compares; = assigns. We wanted to assign.",
            incorrect: "The bug is on the first line. We're trying to create a variable, not compare two things."
          },
          payload: {
            code_lines: ["name == \"Ada\"", "print(name)"],
            expected_behaviour: "Prints Ada.",
            actual_behaviour: "Crashes — name was never assigned.",
            mode: "select_and_fix",
            constraint: "in_place",
            bugs: [
              { line: 1, category: "operator", fix: "name = \"Ada\"", accepted_fixes: ["name = \"Ada\"", "name = 'Ada'"] }
            ]
          }
        },
        {
          id: "v-b2", type: "spot_the_bug", section_id: "var-modify",
          title: "Why the crash?", difficulty: 2,
          instructions: "This program should store the word 'Alice' in a variable. Spot the bug and fix it.",
          topics: ["variables", "strings"],
          skills: ["debug_code"],
          misconceptions: ["unquoted_string"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "modify", concept_level: "practise",
          estimated_time_seconds: 75,
          hints: [
            { type: "nudge",   text: "Without quotes, Python thinks Alice is the name of another variable." },
            { type: "concept", text: "Text in Python needs quotes around it: `\"Alice\"` or `'Alice'`. Without quotes, Python looks for a variable with that name." }
          ],
          feedback: {
            correct:   "Right — strings need quotes so Python knows it's text, not a variable name.",
            incorrect: "Look at line 1. Python wouldn't recognise `Alice` without quotes — it would think Alice is a variable that hasn't been defined."
          },
          payload: {
            code_lines: ["name = Alice", "print(name)"],
            expected_behaviour: "Prints Alice.",
            actual_behaviour: "Crashes with NameError because Alice (no quotes) looks like a variable name.",
            mode: "select_and_fix",
            constraint: "in_place",
            bugs: [
              { line: 1, category: "syntax", fix: "name = \"Alice\"", accepted_fixes: ["name = \"Alice\"", "name = 'Alice'"] }
            ]
          }
        },
        {
          id: "v-m1", type: "modify", section_id: "var-modify",
          title: "Greet someone else", difficulty: 2,
          instructions: "This program greets Ada. Change just the variable's value so it greets Grace instead.",
          topics: ["variables", "modify"],
          skills: ["modify_code"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "modify", concept_level: "practise",
          estimated_time_seconds: 60,
          hints: [
            { type: "nudge", text: "Only one line needs to change. The print line is fine as it is." }
          ],
          feedback: {
            correct:   "Nice — change the data, not the print logic.",
            incorrect: "Look for the line that stores the name. That's the one to change."
          },
          payload: {
            code_lines: ["name = \"Ada\"", "print(\"Hello, \" + name)"],
            expected_behaviour: "Prints: Hello, Grace",
            actual_behaviour: "Prints: Hello, Ada",
            mode: "select_and_fix",
            constraint: "in_place",
            bugs: [
              { line: 1, category: "logic", fix: "name = \"Grace\"", accepted_fixes: ["name = \"Grace\"", "name = 'Grace'"] }
            ]
          }
        },

        /* ---------- Section 4: Test & visualise ---------- */
        {
          id: "v-tst1", type: "testing", section_id: "var-test",
          title: "Test a name validator", difficulty: 2,
          instructions: "check_name returns \"VALID\" when the name length is allowed, otherwise \"NOT VALID\".",
          topics: ["functions", "strings", "testing"],
          skills: ["classify_tests", "design_test_data", "predict_output"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "investigate", concept_level: "extend",
          estimated_time_seconds: 240,
          hints: [
            { type: "concept", text: "Normal is a length comfortably inside 2..12. Boundary is at the edge (length 2 or 12, or one beyond). Invalid is the right type but rejected (far too long). Erroneous is the wrong type, e.g. a number." }
          ],
          feedback: {
            correct:   "Right — three categories cover the kinds of input you should test.",
            incorrect: "Re-check each row. The category, the value and the expected output all have to be consistent with one another."
          },
          payload: {
            code: "def check_name(name):\n    if len(name) < 2 or len(name) > 12:\n        return \"NOT VALID\"\n    return \"VALID\"",
            function_name: "check_name",
            output_type: "string",
            input_columns: [
              { id: "name", label: "name", type: "str", min_length: 2, max_length: 12 }
            ],
            rows: [
              { values: { name: "\"Sam\"", test_type: "",          expected_output: "VALID" } },
              { values: { name: "",       test_type: "invalid",   expected_output: "NOT VALID" } },
              { values: { name: "42",     test_type: "",          expected_output: "TypeError" } }
            ]
          }
        },
        {
          id: "v-f1", type: "flowchart", section_id: "var-test",
          title: "Fill in the flowchart", difficulty: 1,
          instructions: "A score counter starts at zero. The player earns a bonus of five points, which is added to the score. The new total is then shown on screen. Fill in the two missing numbers in the flowchart.",
          topics: ["variables", "assignment", "flowchart"],
          skills: ["read_flowchart"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "investigate", concept_level: "consolidate",
          estimated_time_seconds: 90,
          hints: [
            { type: "nudge", text: "Pick out the two numbers in the description — the starting value and the amount being added — and write them as digits." }
          ],
          feedback: {
            correct:   "Good — you matched the words in the description to numbers in the right shapes.",
            incorrect: "Re-read the description. There are two numbers: the value the score STARTS at, and the amount that gets ADDED to it."
          },
          payload: {
            flowchart: {
              shapes: [
                { id: "s",  kind: "terminator", text: "Start",         row: 0, col: 0 },
                { id: "a",  kind: "process",    text: "x = {{init}}",  row: 1, col: 0 },
                { id: "b",  kind: "process",    text: "x = x + {{n}}", row: 2, col: 0 },
                { id: "p",  kind: "io",         text: "print(x)",      row: 3, col: 0 },
                { id: "e",  kind: "terminator", text: "End",           row: 4, col: 0 }
              ],
              edges: [
                { from: "s", to: "a" },
                { from: "a", to: "b" },
                { from: "b", to: "p" },
                { from: "p", to: "e" }
              ]
            },
            blanks: [
              { id: "init", mode: "free_text", answer: "0", accepted: ["0"], case_sensitive: true, width_hint: 2 },
              { id: "n",    mode: "free_text", answer: "5", accepted: ["5"], case_sensitive: true, width_hint: 2 }
            ]
          }
        },

        /* ---------- Section 5: Make ---------- */
        {
          id: "v-mk1", type: "starter_challenge", section_id: "var-make",
          title: "Write a tiny greeting program", difficulty: 2,
          instructions: "In your own IDE, write a short program that uses TWO variables — one for a name, one for an age — and prints a sentence using both.",
          topics: ["variables", "assignment", "print", "concatenation"],
          skills: ["compose_program"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "make", concept_level: "extend",
          estimated_time_seconds: 240,
          hints: [
            { type: "nudge",            text: "Start with two assignment lines, then a single print." },
            { type: "concept",          text: "When you mix a number with a string, you need `str(age)` to convert it first." },
            { type: "partial_solution", text: "`print(\"My name is \" + name + \" and I am \" + str(age))`" }
          ],
          feedback: {
            correct:   "Well done — variables make the program easy to change.",
            incorrect: ""
          },
          payload: {
            instructions: "Use one variable for a name (a string), one for an age (an integer), and print one sentence that uses both.",
            starter_code: "# Your code here\n# Use a name variable and an age variable\n# Print a sentence that uses both\n",
            function_name: "",
            example_calls: [],
            model_solution: "name = \"Ada\"\nage = 36\nprint(\"My name is \" + name + \" and I am \" + str(age))",
            self_check_guidance: "Run your code in your IDE. Try changing the age to a different number and check the output updates."
          }
        }
      ]
    };
  }

  /* =====================================================================
   * PACK 2 — Selection (if / elif / else)
   * OCR J277 spec ref 2.2.1 (selection)
   * ===================================================================== */
  function packSelection() {
    return {
      pack_format_version: "0.1",
      schema_version: "0.1",
      id: "builtin-selection-intro",
      title: "Selection (if / else)",
      description: "A learning journey through branching with if and else. Loosely follows PRIMM with fading scaffolds.",
      language: "python",
      audience: "ks3",
      author: "PyQuiz built-in",
      created_at: "2026-05-28T00:00:00Z",
      updated_at: "2026-05-28T00:00:00Z",
      spec_refs: ["OCR_J277_2.2.1"],
      tags: ["builtin", "selection", "if", "beginner"],
      settings: commonSettings(),
      sections: [
        { id: "sel-predict", number: 1, title: "Predict the branch" },
        { id: "sel-invest",  number: 2, title: "Investigate selection" },
        { id: "sel-modify",  number: 3, title: "Fix and modify" },
        { id: "sel-test",    number: 4, title: "Test and visualise" },
        { id: "sel-make",    number: 5, title: "Write it yourself" }
      ],
      activities: [
        /* ---------- Predict ---------- */
        {
          id: "s-p1", type: "predict_output", section_id: "sel-predict",
          title: "Which branch runs?", difficulty: 1,
          instructions: "Predict the output.",
          topics: ["selection", "if", "comparison"],
          skills: ["predict_output"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "predict", concept_level: "introduce",
          estimated_time_seconds: 75,
          hints: [
            { type: "concept", text: "An `if` only runs its indented lines when the condition is True. Otherwise it does nothing." },
            { type: "nudge",   text: "Is 5 greater than 3? If yes, what gets printed?" }
          ],
          feedback: {
            correct:   "Right — the condition is True, so the body runs.",
            incorrect: "Check the condition: is 5 > 3 true or false?"
          },
          payload: {
            code: "if 5 > 3:\n    print(\"yes\")",
            direction: "code_to_output", mode: "free_text",
            answer: "yes", accepted_answers: ["yes"]
          }
        },
        {
          id: "s-p2", type: "predict_output", section_id: "sel-predict",
          title: "Else branch", difficulty: 1,
          instructions: "Predict the output.",
          topics: ["selection", "if", "else"],
          skills: ["predict_output"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "predict", concept_level: "introduce",
          estimated_time_seconds: 75,
          hints: [
            { type: "concept", text: "If the `if` condition is False, the `else` block runs instead. Exactly ONE of the two blocks always runs." }
          ],
          feedback: {
            correct:   "Yes — 5 is not greater than 10, so the else branch runs.",
            incorrect: "Trace through: is 5 > 10? If not, which block runs?"
          },
          payload: {
            code: "x = 5\nif x > 10:\n    print(\"big\")\nelse:\n    print(\"small\")",
            direction: "code_to_output", mode: "free_text",
            answer: "small", accepted_answers: ["small"]
          }
        },
        {
          id: "s-p3", type: "predict_output", section_id: "sel-predict",
          title: "elif — the middle case", difficulty: 2,
          instructions: "Predict the output. Be careful — only one branch ever runs.",
          topics: ["selection", "elif", "comparison"],
          skills: ["predict_output", "trace_execution"],
          misconceptions: ["all_branches_run"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "predict", concept_level: "practise",
          estimated_time_seconds: 90,
          hints: [
            { type: "concept", text: "Python checks each condition in order, top to bottom. The FIRST one that is True wins — the rest are skipped." }
          ],
          feedback: {
            correct:   "Yes — 50 is not > 80, but it IS > 40, so elif runs.",
            incorrect: "Walk through each condition in order. The first one that is True is the only branch that runs."
          },
          payload: {
            code: "score = 50\nif score > 80:\n    print(\"A\")\nelif score > 40:\n    print(\"C\")\nelse:\n    print(\"F\")",
            direction: "code_to_output", mode: "free_text",
            answer: "C", accepted_answers: ["C"]
          }
        },

        /* ---------- Investigate ---------- */
        {
          id: "s-c1", type: "cloze", section_id: "sel-invest",
          title: "Fill in the condition", difficulty: 2,
          instructions: "Complete the condition so the program prints \"adult\" when age is 18 or more, and \"child\" otherwise.",
          topics: ["selection", "comparison", "operators"],
          skills: ["complete_code"],
          misconceptions: ["off_by_one_comparison"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "investigate", concept_level: "practise",
          estimated_time_seconds: 75,
          hints: [
            { type: "nudge",   text: "'18 or more' is the giveaway — which operator means 'greater than or equal to'?" },
            { type: "concept", text: "`&gt;` is strictly greater; `&gt;=` is greater than or equal. If the cut-off is 18 and 18 should count as adult, you need `&gt;=`." }
          ],
          feedback: {
            correct:   "Right — >= is inclusive of 18 itself.",
            incorrect: "Re-read the spec. Does 18 count as adult? If yes, the operator must include 18."
          },
          payload: {
            code_template: "age = 18\nif age {{1}} 18:\n    print(\"adult\")\nelse:\n    print(\"child\")",
            blanks: [
              { id: "1", mode: "free_text", answer: ">=", accepted: [">="], case_sensitive: true, width_hint: 3 }
            ]
          }
        },
        {
          id: "s-par1", type: "parsons", section_id: "sel-invest",
          title: "Order an if/else", difficulty: 2,
          instructions: "Arrange the lines so the program prints 'pass' if score is 50 or more, and 'fail' otherwise. Indentation matters.",
          topics: ["selection", "if", "else", "indentation"],
          skills: ["sequence_code"],
          misconceptions: ["missing_indentation"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "investigate", concept_level: "practise",
          estimated_time_seconds: 120,
          hints: [
            { type: "concept", text: "In Python the lines INSIDE an if (or else) must be indented by 4 spaces. That's how Python knows what belongs to each branch." },
            { type: "nudge",   text: "Each print belongs to a different branch. One sits under `if`, the other under `else`." }
          ],
          feedback: {
            correct:   "Perfect — the colons end each header and the indents show what belongs to each branch.",
            incorrect: "Read top to bottom: a value, a condition with a colon, the indented body, the else with a colon, its indented body."
          },
          payload: {
            canonical_code: "score = 60\nif score >= 50:\n    print(\"pass\")\nelse:\n    print(\"fail\")",
            distractors: "",
            swap_groups: [],
            extra_accepted_orderings: [],
            indent_size_spaces: 4
          }
        },
        {
          id: "s-t1", type: "trace_table", section_id: "sel-invest",
          title: "Trace the if/elif chain", difficulty: 3,
          instructions: "Trace the program. Record the score variable and what gets printed. Only the lines that actually run produce output.",
          topics: ["selection", "elif", "trace"],
          skills: ["trace_execution"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "investigate", concept_level: "consolidate",
          estimated_time_seconds: 150,
          hints: [
            { type: "concept", text: "Python checks `if`, then each `elif` in order. The FIRST condition that's true runs its body. The rest are skipped — including the print lines underneath them." }
          ],
          feedback: {
            correct:   "Right — only the matching branch's print ran.",
            incorrect: "The trace should show ONE print line being reached. The other elif/else bodies are skipped entirely."
          },
          payload: {
            code: "score = 75\nif score >= 90:\n    print(\"A\")\nelif score >= 60:\n    print(\"B\")\nelse:\n    print(\"C\")",
            columns: [
              { id: "score", label: "score",  kind: "variable" },
              { id: "out",   label: "Output", kind: "output"   }
            ],
            rows: [
              { line: 1, values: { score: "75", out: "" } },
              { line: 4, values: { score: "",   out: "" } },
              { line: 5, values: { score: "",   out: "B" } }
            ],
            marking: "exact_cells", undefined_token: ""
          }
        },

        /* ---------- Modify ---------- */
        {
          id: "s-b1", type: "spot_the_bug", section_id: "sel-modify",
          title: "The condition misbehaves", difficulty: 2,
          instructions: "This code should print 'match' when x equals 5. It crashes. Spot and fix the bug.",
          topics: ["selection", "comparison", "operators"],
          skills: ["debug_code"],
          misconceptions: ["assignment_vs_comparison"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "modify", concept_level: "practise",
          estimated_time_seconds: 75,
          hints: [
            { type: "nudge",            text: "Inside an `if` condition we want to COMPARE two values, not assign." },
            { type: "partial_solution", text: "The fix swaps `=` for `==`." }
          ],
          feedback: {
            correct:   "Got it — inside conditions, == compares.",
            incorrect: "A single = means assignment, which isn't allowed in an if condition."
          },
          payload: {
            code_lines: ["x = 5", "if x = 5:", "    print(\"match\")"],
            expected_behaviour: "Prints match.",
            actual_behaviour: "SyntaxError on line 2.",
            mode: "select_and_fix",
            constraint: "in_place",
            bugs: [
              { line: 2, category: "operator", fix: "if x == 5:", accepted_fixes: ["if x == 5:"] }
            ]
          }
        },
        {
          id: "s-b2", type: "spot_the_bug", section_id: "sel-modify",
          title: "It won't run", difficulty: 1,
          instructions: "This program should print 'cold' but it has a syntax error. Find the missing punctuation.",
          topics: ["selection", "syntax"],
          skills: ["debug_code"],
          misconceptions: ["missing_colon"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "modify", concept_level: "practise",
          estimated_time_seconds: 60,
          hints: [
            { type: "concept", text: "Every `if`, `elif` and `else` line ends with a colon. The colon tells Python 'a block of code follows'." }
          ],
          feedback: {
            correct:   "Right — the colon is non-negotiable.",
            incorrect: "Check the punctuation at the end of the if line."
          },
          payload: {
            code_lines: ["temp = 2", "if temp < 5", "    print(\"cold\")"],
            expected_behaviour: "Prints cold.",
            actual_behaviour: "SyntaxError because of the missing colon on line 2.",
            mode: "select_and_fix",
            constraint: "in_place",
            bugs: [
              { line: 2, category: "syntax", fix: "if temp < 5:", accepted_fixes: ["if temp < 5:"] }
            ]
          }
        },
        {
          id: "s-m1", type: "modify", section_id: "sel-modify",
          title: "Flip the condition", difficulty: 2,
          instructions: "This program prints 'big' when x is at least 100. Change just the condition so it instead prints 'big' when x is at most 100 (100 still counts as big).",
          topics: ["selection", "comparison"],
          skills: ["modify_code"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "modify", concept_level: "consolidate",
          estimated_time_seconds: 75,
          hints: [
            { type: "nudge",            text: "'at most' is the opposite of 'at least'. Which symbol means 'less than or equal'?" },
            { type: "partial_solution", text: "The fixed line uses `&lt;=`." }
          ],
          feedback: {
            correct:   "Right — flipping >= to <= reverses the condition while keeping 100 included.",
            incorrect: "Only the operator on the if line changes. 'At most' uses <=."
          },
          payload: {
            code_lines: ["x = 50", "if x >= 100:", "    print(\"big\")", "else:", "    print(\"small\")"],
            expected_behaviour: "Prints 'big' for x at most 100 (50 → big).",
            actual_behaviour: "Prints 'big' only when x is 100 or more (50 → small).",
            mode: "select_and_fix",
            constraint: "in_place",
            bugs: [
              { line: 2, category: "operator", fix: "if x <= 100:", accepted_fixes: ["if x <= 100:"] }
            ]
          }
        },

        /* ---------- Test & visualise ---------- */
        {
          id: "s-tst1", type: "testing", section_id: "sel-test",
          title: "Test a score validator", difficulty: 3,
          instructions: "is_valid returns True when the score is within 0..1000, otherwise False.",
          topics: ["functions", "testing", "boundary"],
          skills: ["classify_tests", "design_test_data", "predict_output"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "investigate", concept_level: "extend",
          estimated_time_seconds: 240,
          hints: [
            { type: "concept", text: "Boundary sits at the edge of 0..1000 (0, -1, 1000, 1001). Normal is comfortably inside. Invalid is the right type but out of range. Erroneous is the wrong type entirely." }
          ],
          feedback: {
            correct:   "Right — three categories cover the inputs you should test.",
            incorrect: "Re-check each row. The category, the value and the expected output all have to be consistent."
          },
          payload: {
            code: "def is_valid(score):\n    if score < 0 or score > 1000:\n        return False\n    return True",
            function_name: "is_valid",
            output_type: "boolean",
            input_columns: [
              { id: "score", label: "score", type: "int", min: 0, max: 1000 }
            ],
            rows: [
              { values: { score: "500",  test_type: "",          expected_output: "True" } },
              { values: { score: "",     test_type: "boundary",  expected_output: "True" } },
              { values: { score: "",     test_type: "invalid",   expected_output: "False" } },
              { values: { score: "\"x\"",  test_type: "",          expected_output: "TypeError" } }
            ]
          }
        },
        {
          id: "s-f1", type: "flowchart", section_id: "sel-test",
          title: "Complete the if/else flowchart", difficulty: 2,
          instructions: "A program asks the user for their age. If the person is 18 or older it labels them 'adult'; otherwise it labels them 'child'. Fill in the missing parts of the flowchart so it carries out that decision.",
          topics: ["selection", "flowchart"],
          skills: ["read_flowchart"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "investigate", concept_level: "consolidate",
          estimated_time_seconds: 120,
          hints: [
            { type: "concept", text: "A diamond is a decision. The label IS the condition. The Yes/No edges show which branch runs based on whether the condition is true." }
          ],
          feedback: {
            correct:   "Good — the condition decides which branch the data flows down.",
            incorrect: "The diamond should hold the condition, not an action. The two rectangles below it are the actions."
          },
          payload: {
            flowchart: {
              shapes: [
                { id: "s",  kind: "terminator", text: "Start",                row: 0, col: 1 },
                { id: "i",  kind: "io",         text: "input age",            row: 1, col: 1 },
                { id: "d",  kind: "decision",   text: "age >= {{c}}",         row: 2, col: 1 },
                { id: "y",  kind: "io",         text: "print(\"{{yes}}\")",   row: 3, col: 0 },
                { id: "n",  kind: "io",         text: "print(\"{{no}}\")",    row: 3, col: 2 },
                { id: "e",  kind: "terminator", text: "End",                  row: 4, col: 1 }
              ],
              edges: [
                { from: "s", to: "i" },
                { from: "i", to: "d" },
                { from: "d", to: "y", label: "Yes" },
                { from: "d", to: "n", label: "No"  },
                { from: "y", to: "e" },
                { from: "n", to: "e" }
              ]
            },
            blanks: [
              { id: "c",   mode: "free_text", answer: "18",    accepted: ["18"],    case_sensitive: true, width_hint: 3 },
              { id: "yes", mode: "free_text", answer: "adult", accepted: ["adult"], case_sensitive: false, width_hint: 6 },
              { id: "no",  mode: "free_text", answer: "child", accepted: ["child"], case_sensitive: false, width_hint: 6 }
            ]
          }
        },

        /* ---------- Make ---------- */
        {
          id: "s-mk1", type: "starter_challenge", section_id: "sel-make",
          title: "Write a simple grade classifier", difficulty: 3,
          instructions: "In your IDE, write a function classify(score) that returns 'pass' if score is 50 or more, otherwise 'fail'. Test it with a few values.",
          topics: ["selection", "functions"],
          skills: ["compose_program"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "make", concept_level: "extend",
          estimated_time_seconds: 300,
          hints: [
            { type: "nudge", text: "You only need one if and one else. Return a string from each branch." }
          ],
          feedback: {
            correct:   "Well done — selection lets your code make decisions.",
            incorrect: ""
          },
          payload: {
            instructions: "Write a function classify(score) that returns 'pass' (score >= 50) or 'fail' otherwise.",
            starter_code: "def classify(score):\n    # your code here\n    pass\n\nprint(classify(60))\nprint(classify(40))\nprint(classify(50))",
            function_name: "classify",
            example_calls: [
              { call: "classify(60)", expected: "pass" },
              { call: "classify(40)", expected: "fail" },
              { call: "classify(50)", expected: "pass" }
            ],
            model_solution: "def classify(score):\n    if score >= 50:\n        return \"pass\"\n    else:\n        return \"fail\"",
            self_check_guidance: "Try classify(50) — does it return 'pass'? The boundary is the trickiest case."
          }
        }
      ]
    };
  }

  /* =====================================================================
   * PACK 3 — Count-Controlled Loops (for + range)
   * OCR J277 spec ref 2.2.1 (iteration)
   * ===================================================================== */
  function packLoops() {
    return {
      pack_format_version: "0.1",
      schema_version: "0.1",
      id: "builtin-loops-intro",
      title: "Count-Controlled Loops",
      description: "A learning journey through for loops and range(). Loosely follows PRIMM with fading scaffolds.",
      language: "python",
      audience: "ks3",
      author: "PyQuiz built-in",
      created_at: "2026-05-28T00:00:00Z",
      updated_at: "2026-05-28T00:00:00Z",
      spec_refs: ["OCR_J277_2.2.1"],
      tags: ["builtin", "iteration", "for", "range", "beginner"],
      settings: commonSettings(),
      sections: [
        { id: "loop-predict", number: 1, title: "Predict the iterations" },
        { id: "loop-invest",  number: 2, title: "Investigate the loop" },
        { id: "loop-modify",  number: 3, title: "Fix and modify" },
        { id: "loop-test",    number: 4, title: "Test and visualise" },
        { id: "loop-make",    number: 5, title: "Write it yourself" }
      ],
      activities: [
        /* ---------- Predict ---------- */
        {
          id: "l-p1", type: "predict_output", section_id: "loop-predict",
          title: "for i in range(3)", difficulty: 1,
          instructions: "Predict the output. Each print goes on a separate line.",
          topics: ["iteration", "for", "range"],
          skills: ["predict_output"],
          misconceptions: ["range_includes_stop"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "predict", concept_level: "introduce",
          estimated_time_seconds: 75,
          hints: [
            { type: "concept", text: "`range(n)` produces values 0, 1, ..., n-1. The stop number is NOT included." }
          ],
          feedback: {
            correct:   "Right — range(3) gives three values: 0, 1 and 2. Three is not included.",
            incorrect: "Where does range start, and does it include the number you pass in? List the values it produces."
          },
          payload: {
            code: "for i in range(3):\n    print(i)",
            direction: "code_to_output", mode: "free_text",
            answer: "0\n1\n2", accepted_answers: ["0\n1\n2"]
          }
        },
        {
          id: "l-p2", type: "predict_output", section_id: "loop-predict",
          title: "range(start, stop)", difficulty: 2,
          instructions: "Predict the output. Each print on a separate line.",
          topics: ["iteration", "for", "range"],
          skills: ["predict_output"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "predict", concept_level: "practise",
          estimated_time_seconds: 75,
          hints: [
            { type: "concept", text: "`range(a, b)` starts at a and stops BEFORE b. So range(2, 5) gives 2, 3, 4 — never 5." }
          ],
          feedback: {
            correct:   "Right — the start is included, the stop is excluded.",
            incorrect: "range(a, b) starts at a. Does it include b? Work out which values appear."
          },
          payload: {
            code: "for i in range(2, 5):\n    print(i)",
            direction: "code_to_output", mode: "free_text",
            answer: "2\n3\n4", accepted_answers: ["2\n3\n4"]
          }
        },
        {
          id: "l-p3", type: "predict_output", section_id: "loop-predict",
          title: "range with a step", difficulty: 3,
          instructions: "Predict the output. Each print on a separate line.",
          topics: ["iteration", "for", "range", "step"],
          skills: ["predict_output"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "predict", concept_level: "consolidate",
          estimated_time_seconds: 90,
          hints: [
            { type: "concept", text: "`range(start, stop, step)` jumps by step each time. Start at 0, add 2, add 2 ... stop before 10." }
          ],
          feedback: {
            correct:   "Yes — the step is 2, so it skips every other number.",
            incorrect: "Count up from 0 in steps of 2 and stop BEFORE 10: 0, 2, 4, 6, 8."
          },
          payload: {
            code: "for i in range(0, 10, 2):\n    print(i)",
            direction: "code_to_output", mode: "free_text",
            answer: "0\n2\n4\n6\n8", accepted_answers: ["0\n2\n4\n6\n8"]
          }
        },

        /* ---------- Investigate ---------- */
        {
          id: "l-c1", type: "cloze", section_id: "loop-invest",
          title: "Fill the range so it repeats 5 times", difficulty: 1,
          instructions: "Complete the range so that 'hi' is printed exactly 5 times.",
          topics: ["iteration", "for", "range"],
          skills: ["complete_code"],
          misconceptions: ["range_includes_stop"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "investigate", concept_level: "practise",
          estimated_time_seconds: 60,
          hints: [
            { type: "concept", text: "range(n) gives n values: 0, 1, ..., n-1. So range(5) loops 5 times." }
          ],
          feedback: {
            correct:   "Right — range(5) loops 5 times (i = 0, 1, 2, 3, 4).",
            incorrect: "To loop 5 times you need range(5). The variable i isn't used here, but the loop still runs once per value."
          },
          payload: {
            code_template: "for i in range({{1}}):\n    print(\"hi\")",
            blanks: [
              { id: "1", mode: "free_text", answer: "5", accepted: ["5"], case_sensitive: true, width_hint: 2 }
            ]
          }
        },
        {
          id: "l-par1", type: "parsons", section_id: "loop-invest",
          title: "Order a counting loop", difficulty: 2,
          instructions: "Arrange the lines so the program prints 0, 1, 2 and then 'done' (in that order).",
          topics: ["iteration", "for", "indentation"],
          skills: ["sequence_code"],
          misconceptions: ["loop_body_indentation"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "investigate", concept_level: "practise",
          estimated_time_seconds: 90,
          hints: [
            { type: "concept", text: "Lines INSIDE the loop are indented. Lines AFTER the loop are not." },
            { type: "nudge",   text: "print(\"done\") should only run once, after the loop finishes — so it's NOT indented." }
          ],
          feedback: {
            correct:   "Yes — indented lines repeat; the unindented line runs once at the end.",
            incorrect: "Walk through it: the for line starts the loop; the indented print runs once per iteration; the final print runs once after the loop is done."
          },
          payload: {
            canonical_code: "for i in range(3):\n    print(i)\nprint(\"done\")",
            distractors: "",
            swap_groups: [],
            extra_accepted_orderings: [],
            indent_size_spaces: 4
          }
        },
        {
          id: "l-t1", type: "trace_table", section_id: "loop-invest",
          title: "Trace a summing loop", difficulty: 3,
          instructions: "Fill in i, total and the output after each line executes. Empty cells mean 'unchanged'.",
          topics: ["iteration", "accumulator", "trace"],
          skills: ["trace_execution"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "investigate", concept_level: "consolidate",
          estimated_time_seconds: 240,
          hints: [
            { type: "concept", text: "Each pass through the loop, line 2 binds the next value of i, then line 3 updates total. After the loop, line 4 prints once." },
            { type: "nudge",   text: "Total starts at 0. After i=0, total stays 0. After i=1, total becomes 1. After i=2, total becomes 3." }
          ],
          feedback: {
            correct:   "Right — total accumulates 0 + 1 + 2 = 3.",
            incorrect: "Re-run the loop in your head. Each pass adds the current value of i onto total."
          },
          payload: {
            code: "total = 0\nfor i in range(3):\n    total = total + i\nprint(total)",
            columns: [
              { id: "i",     label: "i",      kind: "variable" },
              { id: "total", label: "total",  kind: "variable" },
              { id: "out",   label: "Output", kind: "output"   }
            ],
            rows: [
              { line: 1, values: { i: "",  total: "0", out: "" } },
              { line: 2, values: { i: "0", total: "",  out: "" } },
              { line: 3, values: { i: "",  total: "0", out: "" } },
              { line: 2, values: { i: "1", total: "",  out: "" } },
              { line: 3, values: { i: "",  total: "1", out: "" } },
              { line: 2, values: { i: "2", total: "",  out: "" } },
              { line: 3, values: { i: "",  total: "3", out: "" } },
              { line: 4, values: { i: "",  total: "",  out: "3" } }
            ],
            marking: "exact_cells", undefined_token: ""
          }
        },

        /* ---------- Modify ---------- */
        {
          id: "l-b1", type: "spot_the_bug", section_id: "loop-modify",
          title: "The loop won't run", difficulty: 1,
          instructions: "This program should print 0 1 2 (each on its own line). It crashes with a SyntaxError. Fix it.",
          topics: ["iteration", "syntax"],
          skills: ["debug_code"],
          misconceptions: ["missing_colon"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "modify", concept_level: "practise",
          estimated_time_seconds: 60,
          hints: [
            { type: "concept", text: "Every for loop's header line ends in a colon. The colon tells Python 'a block of code follows'." }
          ],
          feedback: {
            correct:   "Right — the colon is what introduces the loop body.",
            incorrect: "Look at the punctuation at the end of the for line."
          },
          payload: {
            code_lines: ["for i in range(3)", "    print(i)"],
            expected_behaviour: "Prints 0, 1 and 2 on separate lines.",
            actual_behaviour: "SyntaxError on line 1.",
            mode: "select_and_fix",
            constraint: "in_place",
            bugs: [
              { line: 1, category: "syntax", fix: "for i in range(3):", accepted_fixes: ["for i in range(3):"] }
            ]
          }
        },
        {
          id: "l-b2", type: "spot_the_bug", section_id: "loop-modify",
          title: "Not quite the right count", difficulty: 2,
          instructions: "This program is meant to print numbers 1 through 5 (inclusive) but it prints 1 through 4. Fix the range.",
          topics: ["iteration", "range", "off_by_one"],
          skills: ["debug_code"],
          misconceptions: ["range_includes_stop"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "modify", concept_level: "consolidate",
          estimated_time_seconds: 90,
          hints: [
            { type: "concept",          text: "`range(a, b)` stops BEFORE b. To include 5 in the output, the stop value must be 6." },
            { type: "partial_solution", text: "Change the second argument to `range`." }
          ],
          feedback: {
            correct:   "Right — range stops one short of the second number, so we need 6 to include 5.",
            incorrect: "range stops BEFORE its second number. What stop value would let 5 appear in the output?"
          },
          payload: {
            code_lines: ["for i in range(1, 5):", "    print(i)"],
            expected_behaviour: "Prints 1, 2, 3, 4 and 5 on separate lines.",
            actual_behaviour: "Prints only 1, 2, 3, 4 — five is missing.",
            mode: "select_and_fix",
            constraint: "in_place",
            bugs: [
              { line: 1, category: "off_by_one", fix: "for i in range(1, 6):", accepted_fixes: ["for i in range(1, 6):"] }
            ]
          }
        },
        {
          id: "l-m1", type: "modify", section_id: "loop-modify",
          title: "Count downwards", difficulty: 3,
          instructions: "This loop prints 1 to 5. Change it so it prints 5, 4, 3, 2, 1 instead (counting down). Change only the for line.",
          topics: ["iteration", "range", "step"],
          skills: ["modify_code"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "modify", concept_level: "extend",
          estimated_time_seconds: 150,
          hints: [
            { type: "concept",          text: "range can take three numbers: start, stop, step. A negative step counts down." },
            { type: "partial_solution", text: "`range(5, 0, -1)` gives 5, 4, 3, 2, 1." }
          ],
          feedback: {
            correct:   "Right — start at 5, stop before 0, step down by 1.",
            incorrect: "Three things change: the start, the stop and the step. The stop must be one PAST the last value you want."
          },
          payload: {
            code_lines: ["for i in range(1, 6):", "    print(i)"],
            expected_behaviour: "Prints 5, 4, 3, 2, 1 — counting down.",
            actual_behaviour: "Prints 1, 2, 3, 4, 5 — counting up.",
            mode: "select_and_fix",
            constraint: "in_place",
            bugs: [
              { line: 1, category: "logic", fix: "for i in range(5, 0, -1):", accepted_fixes: ["for i in range(5, 0, -1):"] }
            ]
          }
        },

        /* ---------- Test & visualise ---------- */
        {
          id: "l-tst1", type: "testing", section_id: "loop-test",
          title: "Test sum_to(n)", difficulty: 3,
          instructions: "sum_to returns the total of 0..n when n is within 0..1000, otherwise it returns -1.",
          topics: ["functions", "iteration", "testing", "boundary"],
          skills: ["classify_tests", "design_test_data", "predict_output"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "investigate", concept_level: "extend",
          estimated_time_seconds: 300,
          hints: [
            { type: "concept", text: "0 is a Boundary (the minimum). A value well inside is Normal. A large in-range-type value past 1000 is Invalid (returns -1). A non-integer is Erroneous." }
          ],
          feedback: {
            correct:   "Right — boundary at 0, normal somewhere inside, erroneous outside the valid range.",
            incorrect: "Re-check each row. The category, the value and the expected output all have to be consistent."
          },
          payload: {
            code: "def sum_to(n):\n    if n < 0 or n > 1000:\n        return -1\n    total = 0\n    for i in range(n + 1):\n        total = total + i\n    return total",
            function_name: "sum_to",
            output_type: "number",
            input_columns: [
              { id: "n", label: "n", type: "int", min: 0, max: 1000 }
            ],
            rows: [
              { values: { n: "5",   test_type: "",          expected_output: "15" } },
              { values: { n: "",    test_type: "boundary",  expected_output: "0" } },
              { values: { n: "",    test_type: "invalid",   expected_output: "-1" } },
              { values: { n: "3.5", test_type: "",          expected_output: "TypeError" } }
            ]
          }
        },
        {
          id: "l-f1", type: "flowchart", section_id: "loop-test",
          title: "Flowchart for a counting loop", difficulty: 2,
          instructions: "This flowchart shows a counting loop. The loop prints the numbers 0, 1, 2, 3 and 4 — each on its own line — and then stops. Fill in the missing number that controls when the loop ends.",
          topics: ["iteration", "flowchart"],
          skills: ["read_flowchart"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "investigate", concept_level: "consolidate",
          estimated_time_seconds: 120,
          hints: [
            { type: "concept", text: "A count-controlled loop continues WHILE the counter is less than some limit. When the condition becomes false, control leaves the loop." },
            { type: "nudge",   text: "The last number printed is 4. On the next pass, i has just become one bigger — that's the value at which the condition has to flip to false." }
          ],
          feedback: {
            correct:   "Right — when i becomes that number, the condition becomes false and the No branch ends the loop.",
            incorrect: "Work out what value i has when the loop is about to stop. The condition uses < (strictly less than), so the limit must be ONE more than the last value printed."
          },
          payload: {
            flowchart: {
              shapes: [
                { id: "s",  kind: "terminator", text: "Start",      row: 0, col: 0 },
                { id: "a",  kind: "process",    text: "i = 0",      row: 1, col: 0 },
                { id: "d",  kind: "decision",   text: "i < {{n}}",  row: 2, col: 0 },
                { id: "p",  kind: "io",         text: "print(i)",   row: 3, col: 0 },
                { id: "u",  kind: "process",    text: "i = i + 1",  row: 4, col: 0 },
                { id: "e",  kind: "terminator", text: "End",        row: 5, col: 0 }
              ],
              edges: [
                { from: "s", to: "a" },
                { from: "a", to: "d" },
                { from: "d", to: "p", label: "Yes" },
                { from: "d", to: "e", label: "No",  from_side: "left",  to_side: "left" },
                { from: "p", to: "u" },
                { from: "u", to: "d", from_side: "right", to_side: "right" }
              ]
            },
            blanks: [
              { id: "n", mode: "free_text", answer: "5", accepted: ["5"], case_sensitive: true, width_hint: 2 }
            ]
          }
        },

        /* ---------- Make ---------- */
        {
          id: "l-mk1", type: "starter_challenge", section_id: "loop-make",
          title: "Print the first N even numbers", difficulty: 3,
          instructions: "Write a function print_evens(n) that prints the first n even numbers (starting from 0). For n = 4 it should print 0, 2, 4, 6 each on its own line.",
          topics: ["iteration", "functions", "range"],
          skills: ["compose_program"],
          exam_refs: ["OCR_J277_2.2.1"],
          primm_phase: "make", concept_level: "extend",
          estimated_time_seconds: 360,
          hints: [
            { type: "nudge",            text: "There are two ways: use range(0, 2*n, 2), OR loop i from 0 to n-1 and print(i * 2)." },
            { type: "partial_solution", text: "`for i in range(n):\\n    print(i * 2)`" }
          ],
          feedback: {
            correct:   "Well done — count-controlled loops with arithmetic give you any sequence you need.",
            incorrect: ""
          },
          payload: {
            instructions: "Write a function print_evens(n) that prints the first n even numbers starting from 0, each on its own line.",
            starter_code: "def print_evens(n):\n    # your code here\n    pass\n\nprint_evens(4)",
            function_name: "print_evens",
            example_calls: [
              { call: "print_evens(0)", expected: "(nothing)" },
              { call: "print_evens(1)", expected: "0" },
              { call: "print_evens(4)", expected: "0\n2\n4\n6" }
            ],
            model_solution: "def print_evens(n):\n    for i in range(n):\n        print(i * 2)",
            self_check_guidance: "Watch the edge cases — print_evens(0) should print nothing at all."
          }
        }
      ]
    };
  }


  /* =====================================================================
   * PACK 4 — Flowchart Workout (stress test, 24 activities)
   * ===================================================================== */
  function packFlowchartStress() {
  // Small helpers to keep blank definitions terse.
  function ft(id, answer, opts) {
    return Object.assign({ id: id, mode: "free_text", answer: String(answer),
      accepted: [String(answer)], case_sensitive: true, width_hint: Math.max(2, String(answer).length) }, opts || {});
  }
  function ftCI(id, answer, width) {
    return { id: id, mode: "free_text", answer: String(answer),
      accepted: [String(answer)], case_sensitive: false, width_hint: width || 6 };
  }

  const A = [];

  /* ---------- 1. Linear: three steps ---------- */
  A.push({
    id: "fc01", type: "flowchart", section_id: "fc-basic", difficulty: 1,
    title: "Linear sequence",
    instructions: "A program sets a score to zero, adds ten to it, then displays the score. Fill in the two missing numbers.",
    topics: ["sequence", "flowchart"], skills: ["read_flowchart"],
    exam_refs: ["OCR_J277_2.2.1"], primm_phase: "investigate", concept_level: "introduce",
    hints: [{ type: "nudge", text: "Two numbers appear in the description: the starting value and the amount added." }],
    feedback: { correct: "Good — a straight run of steps, top to bottom.", incorrect: "Re-read: the score starts at one number and has another added to it." },
    payload: {
      flowchart: { shapes: [
        { id: "s", kind: "terminator", text: "Start", row: 0, col: 0 },
        { id: "a", kind: "process", text: "score = {{init}}", row: 1, col: 0 },
        { id: "b", kind: "process", text: "score = score + {{add}}", row: 2, col: 0 },
        { id: "o", kind: "io", text: "display score", row: 3, col: 0 },
        { id: "e", kind: "terminator", text: "End", row: 4, col: 0 }
      ], edges: [
        { from: "s", to: "a" }, { from: "a", to: "b" }, { from: "b", to: "o" }, { from: "o", to: "e" }
      ] },
      blanks: [ ft("init", "0"), ft("add", "10") ]
    }
  });

  /* ---------- 2. Linear with input ---------- */
  A.push({
    id: "fc02", type: "flowchart", section_id: "fc-basic", difficulty: 1,
    title: "Read, double, show",
    instructions: "A program reads a number from the user, doubles it, and shows the result. Fill in the operation that doubles the number.",
    topics: ["sequence", "io"], skills: ["read_flowchart"],
    exam_refs: ["OCR_J277_2.2.1"], primm_phase: "investigate", concept_level: "introduce",
    hints: [{ type: "concept", text: "Doubling a number is the same as multiplying it by 2." }],
    feedback: { correct: "Right — n times 2 doubles it.", incorrect: "To double n you multiply it by 2." },
    payload: {
      flowchart: { shapes: [
        { id: "s", kind: "terminator", text: "Start", row: 0, col: 0 },
        { id: "i", kind: "io", text: "input n", row: 1, col: 0 },
        { id: "d", kind: "process", text: "n = n {{op}} 2", row: 2, col: 0 },
        { id: "o", kind: "io", text: "display n", row: 3, col: 0 },
        { id: "e", kind: "terminator", text: "End", row: 4, col: 0 }
      ], edges: [
        { from: "s", to: "i" }, { from: "i", to: "d" }, { from: "d", to: "o" }, { from: "o", to: "e" }
      ] },
      blanks: [ ft("op", "*") ]
    }
  });

  /* ---------- 3. Single decision (if/else) ---------- */
  A.push({
    id: "fc03", type: "flowchart", section_id: "fc-decision", difficulty: 2,
    title: "Pass or fail",
    instructions: "A program reads a score. If the score is 50 or more it shows 'pass', otherwise it shows 'fail'. Fill in the condition and the two messages.",
    topics: ["selection"], skills: ["read_flowchart"],
    exam_refs: ["OCR_J277_2.2.1"], primm_phase: "investigate", concept_level: "practise",
    hints: [{ type: "concept", text: "'50 or more' means greater-than-or-equal. The Yes branch is taken when the condition is true." }],
    feedback: { correct: "Right — the diamond decides which message is shown.", incorrect: "The condition decides the branch. Yes leads to 'pass', No leads to 'fail'." },
    payload: {
      flowchart: { shapes: [
        { id: "s", kind: "terminator", text: "Start", row: 0, col: 1 },
        { id: "i", kind: "io", text: "input score", row: 1, col: 1 },
        { id: "d", kind: "decision", text: "score {{cmp}} 50", row: 2, col: 1 },
        { id: "p", kind: "io", text: "display \"{{yes}}\"", row: 3, col: 0 },
        { id: "f", kind: "io", text: "display \"{{no}}\"", row: 3, col: 2 },
        { id: "e", kind: "terminator", text: "End", row: 4, col: 1 }
      ], edges: [
        { from: "s", to: "i" }, { from: "i", to: "d" },
        { from: "d", to: "p", label: "Yes" }, { from: "d", to: "f", label: "No" },
        { from: "p", to: "e" }, { from: "f", to: "e" }
      ] },
      blanks: [ ft("cmp", ">="), ftCI("yes", "pass", 6), ftCI("no", "fail", 6) ]
    }
  });

  /* ---------- 4. Single decision, one-sided (if only) ---------- */
  A.push({
    id: "fc04", type: "flowchart", section_id: "fc-decision", difficulty: 2,
    title: "Warn if too hot",
    instructions: "A program reads a temperature. If it is above 30 it shows a warning. Either way the program then ends. Fill in the condition.",
    topics: ["selection"], skills: ["read_flowchart"],
    exam_refs: ["OCR_J277_2.2.1"], primm_phase: "investigate", concept_level: "practise",
    hints: [{ type: "nudge", text: "'Above 30' is a strict greater-than — 30 itself does not trigger the warning." }],
    feedback: { correct: "Right — the No branch skips straight to the end.", incorrect: "'Above 30' means strictly greater than 30." },
    payload: {
      flowchart: { shapes: [
        { id: "s", kind: "terminator", text: "Start", row: 0, col: 0 },
        { id: "i", kind: "io", text: "input temp", row: 1, col: 0 },
        { id: "d", kind: "decision", text: "temp {{cmp}} 30", row: 2, col: 0 },
        { id: "w", kind: "io", text: "display \"too hot\"", row: 3, col: 0 },
        { id: "e", kind: "terminator", text: "End", row: 4, col: 0 }
      ], edges: [
        { from: "s", to: "i" }, { from: "i", to: "d" },
        { from: "d", to: "w", label: "Yes" },
        { from: "d", to: "e", label: "No", from_side: "right", to_side: "right" },
        { from: "w", to: "e" }
      ] },
      blanks: [ ft("cmp", ">") ]
    }
  });

  /* ---------- 5. Count-controlled loop ---------- */
  A.push({
    id: "fc05", type: "flowchart", section_id: "fc-loops", difficulty: 2,
    title: "Count to five",
    instructions: "A loop prints the numbers 0, 1, 2, 3 and 4 — each on its own line — then stops. Fill in the number that controls when the loop ends.",
    topics: ["iteration"], skills: ["read_flowchart"],
    exam_refs: ["OCR_J277_2.2.1"], primm_phase: "investigate", concept_level: "practise",
    hints: [{ type: "concept", text: "The loop continues while the counter is strictly less than the limit. The last value printed is 4." }],
    feedback: { correct: "Right — i < 5 keeps going for 0,1,2,3,4 then stops.", incorrect: "The last value printed is 4, and the test is strictly less-than, so the limit is one more than 4." },
    payload: {
      flowchart: { shapes: [
        { id: "s", kind: "terminator", text: "Start", row: 0, col: 0 },
        { id: "a", kind: "process", text: "i = 0", row: 1, col: 0 },
        { id: "d", kind: "decision", text: "i < {{lim}}", row: 2, col: 0 },
        { id: "p", kind: "io", text: "print i", row: 3, col: 0 },
        { id: "u", kind: "process", text: "i = i + 1", row: 4, col: 0 },
        { id: "e", kind: "terminator", text: "End", row: 5, col: 0 }
      ], edges: [
        { from: "s", to: "a" }, { from: "a", to: "d" },
        { from: "d", to: "p", label: "Yes" },
        { from: "d", to: "e", label: "No", from_side: "left", to_side: "left" },
        { from: "p", to: "u" },
        { from: "u", to: "d", from_side: "right", to_side: "right" }
      ] },
      blanks: [ ft("lim", "5") ]
    }
  });

  /* ---------- 6. Condition-controlled loop (while) ---------- */
  A.push({
    id: "fc06", type: "flowchart", section_id: "fc-loops", difficulty: 3,
    title: "Halve until small",
    instructions: "Starting from a value n, the program repeatedly halves it while it is greater than 1. Fill in the loop condition.",
    topics: ["iteration", "while"], skills: ["read_flowchart"],
    exam_refs: ["OCR_J277_2.2.1"], primm_phase: "investigate", concept_level: "consolidate",
    hints: [{ type: "concept", text: "A while loop checks its condition BEFORE each pass. 'While greater than 1' continues as long as n > 1." }],
    feedback: { correct: "Right — the loop runs while n is still greater than 1.", incorrect: "The loop continues while n is greater than 1." },
    payload: {
      flowchart: { shapes: [
        { id: "s", kind: "terminator", text: "Start", row: 0, col: 0 },
        { id: "i", kind: "io", text: "input n", row: 1, col: 0 },
        { id: "d", kind: "decision", text: "n {{cmp}} 1", row: 2, col: 0 },
        { id: "h", kind: "process", text: "n = n / 2", row: 3, col: 0 },
        { id: "o", kind: "io", text: "display n", row: 4, col: 0 },
        { id: "e", kind: "terminator", text: "End", row: 5, col: 0 }
      ], edges: [
        { from: "s", to: "i" }, { from: "i", to: "d" },
        { from: "d", to: "h", label: "Yes" },
        { from: "d", to: "o", label: "No", from_side: "left", to_side: "left" },
        { from: "h", to: "d", from_side: "right", to_side: "right" },
        { from: "o", to: "e" }
      ] },
      blanks: [ ft("cmp", ">") ]
    }
  });

  /* ---------- 7. Accumulator loop ---------- */
  A.push({
    id: "fc07", type: "flowchart", section_id: "fc-loops", difficulty: 3,
    title: "Sum 1 to N",
    instructions: "The program adds up the numbers from 1 to N. A running total starts at zero and each pass adds the current counter. Fill in the starting value of the total and the loop's continue-condition (the loop runs while the counter is less than or equal to N).",
    topics: ["iteration", "accumulator"], skills: ["read_flowchart"],
    exam_refs: ["OCR_J277_2.2.1"], primm_phase: "investigate", concept_level: "consolidate",
    hints: [
      { type: "concept", text: "An accumulator must start at 0 so the first addition is correct." },
      { type: "nudge", text: "'Less than or equal to N' includes N itself, so the operator is <=." }
    ],
    feedback: { correct: "Right — total starts at 0 and the loop includes N.", incorrect: "The total starts at 0. The loop must include N, so the test is i <= N." },
    payload: {
      flowchart: { shapes: [
        { id: "s", kind: "terminator", text: "Start", row: 0, col: 0 },
        { id: "t", kind: "process", text: "total = {{init}}", row: 1, col: 0 },
        { id: "c", kind: "process", text: "i = 1", row: 2, col: 0 },
        { id: "d", kind: "decision", text: "i {{cmp}} N", row: 3, col: 0 },
        { id: "a", kind: "process", text: "total = total + i", row: 4, col: 0 },
        { id: "u", kind: "process", text: "i = i + 1", row: 5, col: 0 },
        { id: "o", kind: "io", text: "display total", row: 6, col: 0 },
        { id: "e", kind: "terminator", text: "End", row: 7, col: 0 }
      ], edges: [
        { from: "s", to: "t" }, { from: "t", to: "c" }, { from: "c", to: "d" },
        { from: "d", to: "a", label: "Yes" },
        { from: "d", to: "o", label: "No", from_side: "left", to_side: "left" },
        { from: "a", to: "u" },
        { from: "u", to: "d", from_side: "right", to_side: "right" },
        { from: "o", to: "e" }
      ] },
      blanks: [ ft("init", "0"), ft("cmp", "<=") ]
    }
  });

  /* ---------- 8. Nested decision (grade bands) ---------- */
  A.push({
    id: "fc08", type: "flowchart", section_id: "fc-nested", difficulty: 3,
    title: "Three-way grade",
    instructions: "A program grades a score: 70 or more is 'A', otherwise 40 or more is 'C', otherwise 'F'. Fill in the two conditions and the three grades.",
    topics: ["selection", "nested"], skills: ["read_flowchart"],
    exam_refs: ["OCR_J277_2.2.1"], primm_phase: "investigate", concept_level: "consolidate",
    hints: [{ type: "concept", text: "The first diamond checks the highest band. If it fails, the second diamond checks the middle band. The final else catches everything left." }],
    feedback: { correct: "Right — each diamond narrows the range further.", incorrect: "Top diamond: score >= 70 → A. Second diamond: score >= 40 → C. Else → F." },
    payload: {
      flowchart: { shapes: [
        { id: "s", kind: "terminator", text: "Start", row: 0, col: 1 },
        { id: "d1", kind: "decision", text: "score >= {{hi}}", row: 1, col: 1 },
        { id: "a", kind: "io", text: "display \"{{ga}}\"", row: 2, col: 0 },
        { id: "d2", kind: "decision", text: "score >= {{mid}}", row: 2, col: 2 },
        { id: "c", kind: "io", text: "display \"{{gc}}\"", row: 3, col: 1 },
        { id: "f", kind: "io", text: "display \"{{gf}}\"", row: 3, col: 3 },
        { id: "e", kind: "terminator", text: "End", row: 4, col: 1 }
      ], edges: [
        { from: "s", to: "d1" },
        { from: "d1", to: "a", label: "Yes" },
        { from: "d1", to: "d2", label: "No" },
        { from: "d2", to: "c", label: "Yes" },
        { from: "d2", to: "f", label: "No" },
        { from: "a", to: "e" },
        { from: "c", to: "e" },
        { from: "f", to: "e", from_side: "right", to_side: "right" }
      ] },
      blanks: [ ft("hi", "70"), ft("mid", "40"), ftCI("ga", "A", 3), ftCI("gc", "C", 3), ftCI("gf", "F", 3) ]
    }
  });

  /* ---------- 9. Even or odd ---------- */
  A.push({
    id: "fc09", type: "flowchart", section_id: "fc-decision", difficulty: 2,
    title: "Even or odd",
    instructions: "A program decides if a number is even or odd by checking the remainder when divided by 2. If the remainder is 0 it is even, otherwise odd. Fill in the remainder operator and the value compared against.",
    topics: ["selection", "modulo"], skills: ["read_flowchart"],
    exam_refs: ["OCR_J277_2.2.1"], primm_phase: "investigate", concept_level: "consolidate",
    hints: [{ type: "concept", text: "The remainder (modulo) operator in Python is %. A number is even when n % 2 equals 0." }],
    feedback: { correct: "Right — n % 2 == 0 means even.", incorrect: "Use the remainder operator % and compare the remainder against 0." },
    payload: {
      flowchart: { shapes: [
        { id: "s", kind: "terminator", text: "Start", row: 0, col: 1 },
        { id: "i", kind: "io", text: "input n", row: 1, col: 1 },
        { id: "d", kind: "decision", text: "n {{op}} 2 == {{val}}", row: 2, col: 1 },
        { id: "ev", kind: "io", text: "display \"even\"", row: 3, col: 0 },
        { id: "od", kind: "io", text: "display \"odd\"", row: 3, col: 2 },
        { id: "e", kind: "terminator", text: "End", row: 4, col: 1 }
      ], edges: [
        { from: "s", to: "i" }, { from: "i", to: "d" },
        { from: "d", to: "ev", label: "Yes" }, { from: "d", to: "od", label: "No" },
        { from: "ev", to: "e" }, { from: "od", to: "e" }
      ] },
      blanks: [ ft("op", "%"), ft("val", "0") ]
    }
  });

  /* ---------- 10. Largest of two ---------- */
  A.push({
    id: "fc10", type: "flowchart", section_id: "fc-decision", difficulty: 2,
    title: "Bigger of two",
    instructions: "A program reads two numbers a and b and displays the larger one. Fill in the comparison so that the Yes branch shows a.",
    topics: ["selection", "comparison"], skills: ["read_flowchart"],
    exam_refs: ["OCR_J277_2.2.1"], primm_phase: "investigate", concept_level: "consolidate",
    hints: [{ type: "nudge", text: "If a is to be shown on the Yes branch, the condition must be true when a is the bigger one." }],
    feedback: { correct: "Right — a > b sends control to 'display a'.", incorrect: "For the Yes branch to display a, the test should be a > b." },
    payload: {
      flowchart: { shapes: [
        { id: "s", kind: "terminator", text: "Start", row: 0, col: 1 },
        { id: "i", kind: "io", text: "input a, b", row: 1, col: 1 },
        { id: "d", kind: "decision", text: "a {{cmp}} b", row: 2, col: 1 },
        { id: "sa", kind: "io", text: "display a", row: 3, col: 0 },
        { id: "sb", kind: "io", text: "display b", row: 3, col: 2 },
        { id: "e", kind: "terminator", text: "End", row: 4, col: 1 }
      ], edges: [
        { from: "s", to: "i" }, { from: "i", to: "d" },
        { from: "d", to: "sa", label: "Yes" }, { from: "d", to: "sb", label: "No" },
        { from: "sa", to: "e" }, { from: "sb", to: "e" }
      ] },
      blanks: [ ft("cmp", ">") ]
    }
  });

  /* ---------- 11. Loop with inside decision (count evens) ---------- */
  A.push({
    id: "fc11", type: "flowchart", section_id: "fc-nested", difficulty: 4,
    title: "Count evens to N",
    instructions: "The program loops the counter i from 0 up to (but not including) N. Each pass, if i is even it adds one to a count. At the end it displays the count. Fill in the loop limit comparison, the even-test operator, and the value the remainder is compared with.",
    topics: ["iteration", "selection", "nested"], skills: ["read_flowchart"],
    exam_refs: ["OCR_J277_2.2.1"], primm_phase: "investigate", concept_level: "extend",
    hints: [
      { type: "concept", text: "The loop continues while i is strictly less than N. Inside it, i % 2 == 0 tests for even." },
      { type: "nudge", text: "Three blanks: the loop test (<), the remainder operator (%), and the value (0)." }
    ],
    feedback: { correct: "Right — a decision nested inside the loop body.", incorrect: "Loop while i < N. Inside, test i % 2 == 0 for even." },
    payload: {
      flowchart: { shapes: [
        { id: "s", kind: "terminator", text: "Start", row: 0, col: 1 },
        { id: "z1", kind: "process", text: "count = 0", row: 1, col: 1 },
        { id: "z2", kind: "process", text: "i = 0", row: 2, col: 1 },
        { id: "d", kind: "decision", text: "i {{lt}} N", row: 3, col: 1 },
        { id: "de", kind: "decision", text: "i {{op}} 2 == {{val}}", row: 4, col: 1 },
        { id: "inc", kind: "process", text: "count = count + 1", row: 5, col: 0 },
        { id: "u", kind: "process", text: "i = i + 1", row: 6, col: 1 },
        { id: "o", kind: "io", text: "display count", row: 7, col: 2 },
        { id: "e", kind: "terminator", text: "End", row: 8, col: 2 }
      ], edges: [
        { from: "s", to: "z1" }, { from: "z1", to: "z2" }, { from: "z2", to: "d" },
        { from: "d", to: "de", label: "Yes" },
        { from: "d", to: "o", label: "No", from_side: "right", to_side: "right" },
        { from: "de", to: "inc", label: "Yes" },
        { from: "de", to: "u", label: "No", from_side: "right", to_side: "right" },
        { from: "inc", to: "u" },
        { from: "u", to: "d", from_side: "left", to_side: "left" },
        { from: "o", to: "e" }
      ] },
      blanks: [ ft("lt", "<"), ft("op", "%"), ft("val", "0") ]
    }
  });

  /* ---------- 12. Guess the number (loop + decision) ---------- */
  A.push({
    id: "fc12", type: "flowchart", section_id: "fc-nested", difficulty: 4,
    title: "Keep guessing",
    instructions: "A game keeps asking the player for a guess while the guess is not equal to the secret. When the guess matches, it shows 'correct' and stops. Fill in the loop condition operator (not-equal).",
    topics: ["iteration", "while", "selection"], skills: ["read_flowchart"],
    exam_refs: ["OCR_J277_2.2.1"], primm_phase: "investigate", concept_level: "extend",
    hints: [{ type: "concept", text: "'Not equal to' in Python is written !=. The loop keeps going while guess != secret." }],
    feedback: { correct: "Right — loop while the guess is wrong, stop when it matches.", incorrect: "'Not equal' is !=. The loop continues while guess != secret." },
    payload: {
      flowchart: { shapes: [
        { id: "s", kind: "terminator", text: "Start", row: 0, col: 0 },
        { id: "g", kind: "io", text: "input guess", row: 1, col: 0 },
        { id: "d", kind: "decision", text: "guess {{cmp}} secret", row: 2, col: 0 },
        { id: "g2", kind: "io", text: "input guess", row: 3, col: 0 },
        { id: "ok", kind: "io", text: "display \"correct\"", row: 4, col: 0 },
        { id: "e", kind: "terminator", text: "End", row: 5, col: 0 }
      ], edges: [
        { from: "s", to: "g" }, { from: "g", to: "d" },
        { from: "d", to: "g2", label: "Yes" },
        { from: "d", to: "ok", label: "No", from_side: "left", to_side: "left" },
        { from: "g2", to: "d", from_side: "right", to_side: "right" },
        { from: "ok", to: "e" }
      ] },
      blanks: [ ft("cmp", "!=") ]
    }
  });

  /* ---------- 13. FizzBuzz-lite (two nested decisions in a loop) ---------- */
  A.push({
    id: "fc13", type: "flowchart", section_id: "fc-nested", difficulty: 5,
    title: "Fizz on threes",
    instructions: "For each number i from 1 to N inclusive, the program shows 'Fizz' if i is divisible by 3, otherwise it shows the number itself. Fill in the loop's continue-condition operator (includes N) and the divisibility-test operator.",
    topics: ["iteration", "selection", "modulo"], skills: ["read_flowchart"],
    exam_refs: ["OCR_J277_2.2.1"], primm_phase: "investigate", concept_level: "extend",
    hints: [
      { type: "concept", text: "Divisible by 3 means the remainder i % 3 is 0." },
      { type: "nudge", text: "'1 to N inclusive' needs <= so N is included." }
    ],
    feedback: { correct: "Right — modulo test inside a counting loop.", incorrect: "Loop while i <= N. Divisible by 3 is i % 3 == 0." },
    payload: {
      flowchart: { shapes: [
        { id: "s", kind: "terminator", text: "Start", row: 0, col: 1 },
        { id: "z", kind: "process", text: "i = 1", row: 1, col: 1 },
        { id: "d", kind: "decision", text: "i {{le}} N", row: 2, col: 1 },
        { id: "dd", kind: "decision", text: "i {{op}} 3 == 0", row: 3, col: 1 },
        { id: "fz", kind: "io", text: "display \"Fizz\"", row: 4, col: 0 },
        { id: "nm", kind: "io", text: "display i", row: 4, col: 2 },
        { id: "u", kind: "process", text: "i = i + 1", row: 5, col: 1 },
        { id: "e", kind: "terminator", text: "End", row: 6, col: 2 }
      ], edges: [
        { from: "s", to: "z" }, { from: "z", to: "d" },
        { from: "d", to: "dd", label: "Yes" },
        { from: "d", to: "e", label: "No", from_side: "right", to_side: "right" },
        { from: "dd", to: "fz", label: "Yes" },
        { from: "dd", to: "nm", label: "No" },
        { from: "fz", to: "u" },
        { from: "nm", to: "u" },
        { from: "u", to: "d", from_side: "left", to_side: "left" }
      ] },
      blanks: [ ft("le", "<="), ft("op", "%") ]
    }
  });

  /* ---------- 14. Input validation loop ---------- */
  A.push({
    id: "fc14", type: "flowchart", section_id: "fc-loops", difficulty: 4,
    title: "Validate the age",
    instructions: "A program repeatedly asks for an age until a value of at least 0 is entered (it rejects negatives). Fill in the condition that keeps the loop going while the age is invalid (less than 0).",
    topics: ["iteration", "validation"], skills: ["read_flowchart"],
    exam_refs: ["OCR_J277_2.2.1"], primm_phase: "investigate", concept_level: "extend",
    hints: [{ type: "concept", text: "The loop should repeat while the input is INVALID. An age below 0 is invalid, so the loop continues while age < 0." }],
    feedback: { correct: "Right — re-prompt while the age is negative.", incorrect: "Invalid means below zero. Loop while age < 0." },
    payload: {
      flowchart: { shapes: [
        { id: "s", kind: "terminator", text: "Start", row: 0, col: 0 },
        { id: "i", kind: "io", text: "input age", row: 1, col: 0 },
        { id: "d", kind: "decision", text: "age {{cmp}} 0", row: 2, col: 0 },
        { id: "r", kind: "io", text: "input age", row: 3, col: 0 },
        { id: "o", kind: "io", text: "display age", row: 4, col: 0 },
        { id: "e", kind: "terminator", text: "End", row: 5, col: 0 }
      ], edges: [
        { from: "s", to: "i" }, { from: "i", to: "d" },
        { from: "d", to: "r", label: "Yes" },
        { from: "d", to: "o", label: "No", from_side: "left", to_side: "left" },
        { from: "r", to: "d", from_side: "right", to_side: "right" },
        { from: "o", to: "e" }
      ] },
      blanks: [ ft("cmp", "<") ]
    }
  });

  /* ---------- 15. Wide branching (menu, 1 of 3) ---------- */
  A.push({
    id: "fc15", type: "flowchart", section_id: "fc-wide", difficulty: 4,
    title: "Three-option menu",
    instructions: "A menu reads a choice. If it equals 1 it runs 'New', else if it equals 2 it runs 'Load', otherwise it runs 'Quit'. Fill in the two values compared against.",
    topics: ["selection", "nested"], skills: ["read_flowchart"],
    exam_refs: ["OCR_J277_2.2.1"], primm_phase: "investigate", concept_level: "extend",
    hints: [{ type: "nudge", text: "The first diamond checks choice == 1, the second checks choice == 2." }],
    feedback: { correct: "Right — a chain of equality checks.", incorrect: "First diamond compares with 1, second with 2." },
    payload: {
      flowchart: { shapes: [
        { id: "s", kind: "terminator", text: "Start", row: 0, col: 1 },
        { id: "i", kind: "io", text: "input choice", row: 1, col: 1 },
        { id: "d1", kind: "decision", text: "choice == {{v1}}", row: 2, col: 1 },
        { id: "n", kind: "io", text: "run New", row: 3, col: 0 },
        { id: "d2", kind: "decision", text: "choice == {{v2}}", row: 3, col: 2 },
        { id: "l", kind: "io", text: "run Load", row: 4, col: 1 },
        { id: "q", kind: "io", text: "run Quit", row: 4, col: 3 },
        { id: "e", kind: "terminator", text: "End", row: 5, col: 1 }
      ], edges: [
        { from: "s", to: "i" }, { from: "i", to: "d1" },
        { from: "d1", to: "n", label: "Yes" },
        { from: "d1", to: "d2", label: "No" },
        { from: "d2", to: "l", label: "Yes" },
        { from: "d2", to: "q", label: "No" },
        { from: "n", to: "e" },
        { from: "l", to: "e" },
        { from: "q", to: "e", from_side: "right", to_side: "right" }
      ] },
      blanks: [ ft("v1", "1"), ft("v2", "2") ]
    }
  });

  /* ---------- 16. Two sequential decisions (leap-year-lite) ---------- */
  A.push({
    id: "fc16", type: "flowchart", section_id: "fc-wide", difficulty: 4,
    title: "Ticket price",
    instructions: "A cinema sets a ticket price. If age is under 16 the price is 5, otherwise if age is 65 or over the price is 6, otherwise it is 9. Fill in the two age thresholds and the three prices.",
    topics: ["selection", "nested"], skills: ["read_flowchart"],
    exam_refs: ["OCR_J277_2.2.1"], primm_phase: "investigate", concept_level: "extend",
    hints: [{ type: "concept", text: "'Under 16' is age < 16. '65 or over' is age >= 65." }],
    feedback: { correct: "Right — child, senior, then standard.", incorrect: "First diamond: age < 16 → 5. Second: age >= 65 → 6. Else → 9." },
    payload: {
      flowchart: { shapes: [
        { id: "s", kind: "terminator", text: "Start", row: 0, col: 1 },
        { id: "d1", kind: "decision", text: "age < {{t1}}", row: 1, col: 1 },
        { id: "c", kind: "process", text: "price = {{p1}}", row: 2, col: 0 },
        { id: "d2", kind: "decision", text: "age >= {{t2}}", row: 2, col: 2 },
        { id: "se", kind: "process", text: "price = {{p2}}", row: 3, col: 1 },
        { id: "st", kind: "process", text: "price = {{p3}}", row: 3, col: 3 },
        { id: "o", kind: "io", text: "display price", row: 4, col: 1 },
        { id: "e", kind: "terminator", text: "End", row: 5, col: 1 }
      ], edges: [
        { from: "s", to: "d1" },
        { from: "d1", to: "c", label: "Yes" },
        { from: "d1", to: "d2", label: "No" },
        { from: "d2", to: "se", label: "Yes" },
        { from: "d2", to: "st", label: "No" },
        { from: "c", to: "o" },
        { from: "se", to: "o" },
        { from: "st", to: "o", from_side: "right", to_side: "right" }
      ] },
      blanks: [ ft("t1", "16"), ft("t2", "65"), ft("p1", "5"), ft("p2", "6"), ft("p3", "9") ]
    }
  });

  /* ---------- 17. Running maximum in a loop ---------- */
  A.push({
    id: "fc17", type: "flowchart", section_id: "fc-nested", difficulty: 5,
    title: "Find the largest",
    instructions: "The program reads N numbers and keeps track of the largest seen so far. For each new value, if it is greater than the current best, the best is updated. Fill in the comparison that decides whether to update the best.",
    topics: ["iteration", "selection", "accumulator"], skills: ["read_flowchart"],
    exam_refs: ["OCR_J277_2.2.1"], primm_phase: "investigate", concept_level: "extend",
    hints: [{ type: "nudge", text: "You update the best only when the new value is bigger than it: value > best." }],
    feedback: { correct: "Right — update best when a bigger value appears.", incorrect: "Update only when value > best." },
    payload: {
      flowchart: { shapes: [
        { id: "s", kind: "terminator", text: "Start", row: 0, col: 1 },
        { id: "b", kind: "process", text: "best = first value", row: 1, col: 1 },
        { id: "d", kind: "decision", text: "more values?", row: 2, col: 1 },
        { id: "rd", kind: "io", text: "read value", row: 3, col: 1 },
        { id: "dd", kind: "decision", text: "value {{cmp}} best", row: 4, col: 1 },
        { id: "up", kind: "process", text: "best = value", row: 5, col: 1 },
        { id: "o", kind: "io", text: "display best", row: 3, col: 2 },
        { id: "e", kind: "terminator", text: "End", row: 4, col: 2 }
      ], edges: [
        { from: "s", to: "b" }, { from: "b", to: "d" },
        { from: "d", to: "rd", label: "Yes" },
        { from: "d", to: "o", label: "No", from_side: "right", to_side: "left" },
        { from: "rd", to: "dd" },
        { from: "dd", to: "up", label: "Yes" },
        { from: "dd", to: "d", label: "No", from_side: "left", to_side: "left" },
        { from: "up", to: "d", from_side: "left", to_side: "left" },
        { from: "o", to: "e" }
      ] },
      blanks: [ ft("cmp", ">") ]
    }
  });

  /* ---------- 18. Times table (nested counting) ---------- */
  A.push({
    id: "fc18", type: "flowchart", section_id: "fc-loops", difficulty: 4,
    title: "Times table row",
    instructions: "The program prints the n-times table from 1 to 12. A counter i runs from 1 while it is at most 12, printing n times i each pass. Fill in the loop's upper-limit value and the continue-condition operator.",
    topics: ["iteration"], skills: ["read_flowchart"],
    exam_refs: ["OCR_J277_2.2.1"], primm_phase: "investigate", concept_level: "extend",
    hints: [{ type: "concept", text: "'At most 12' means i can equal 12, so the operator is <= and the limit is 12." }],
    feedback: { correct: "Right — runs i from 1 through 12 inclusive.", incorrect: "Loop while i <= 12." },
    payload: {
      flowchart: { shapes: [
        { id: "s", kind: "terminator", text: "Start", row: 0, col: 0 },
        { id: "z", kind: "process", text: "i = 1", row: 1, col: 0 },
        { id: "d", kind: "decision", text: "i {{cmp}} {{lim}}", row: 2, col: 0 },
        { id: "p", kind: "io", text: "print n * i", row: 3, col: 0 },
        { id: "u", kind: "process", text: "i = i + 1", row: 4, col: 0 },
        { id: "e", kind: "terminator", text: "End", row: 5, col: 0 }
      ], edges: [
        { from: "s", to: "z" }, { from: "z", to: "d" },
        { from: "d", to: "p", label: "Yes" },
        { from: "d", to: "e", label: "No", from_side: "left", to_side: "left" },
        { from: "p", to: "u" },
        { from: "u", to: "d", from_side: "right", to_side: "right" }
      ] },
      blanks: [ ft("cmp", "<="), ft("lim", "12") ]
    }
  });

  /* ---------- 19. Two-condition guard (AND-style via nesting) ---------- */
  A.push({
    id: "fc19", type: "flowchart", section_id: "fc-nested", difficulty: 5,
    title: "In range?",
    instructions: "A program shows 'valid' only when a number is at least 1 AND at most 10; otherwise it shows 'invalid'. This is drawn as two nested diamonds. Fill in the two boundary values.",
    topics: ["selection", "nested", "boolean"], skills: ["read_flowchart"],
    exam_refs: ["OCR_J277_2.2.1"], primm_phase: "investigate", concept_level: "extend",
    hints: [{ type: "concept", text: "Both conditions must hold. The first diamond checks n >= 1; only if that's true does the second check n <= 10." }],
    feedback: { correct: "Right — both diamonds must say Yes for 'valid'.", incorrect: "First diamond: n >= 1. Second: n <= 10. Either No leads to 'invalid'." },
    payload: {
      flowchart: { shapes: [
        { id: "s", kind: "terminator", text: "Start", row: 0, col: 1 },
        { id: "d1", kind: "decision", text: "n >= {{lo}}", row: 1, col: 1 },
        { id: "d2", kind: "decision", text: "n <= {{hi}}", row: 2, col: 1 },
        { id: "v", kind: "io", text: "display \"valid\"", row: 3, col: 0 },
        { id: "x", kind: "io", text: "display \"invalid\"", row: 3, col: 2 },
        { id: "e", kind: "terminator", text: "End", row: 4, col: 1 }
      ], edges: [
        { from: "s", to: "d1" },
        { from: "d1", to: "d2", label: "Yes" },
        { from: "d1", to: "x", label: "No" },
        { from: "d2", to: "v", label: "Yes" },
        { from: "d2", to: "x", label: "No", from_side: "right", to_side: "right" },
        { from: "v", to: "e" },
        { from: "x", to: "e", from_side: "right", to_side: "right" }
      ] },
      blanks: [ ft("lo", "1"), ft("hi", "10") ]
    }
  });

  /* ---------- 20. Countdown loop ---------- */
  A.push({
    id: "fc20", type: "flowchart", section_id: "fc-loops", difficulty: 3,
    title: "Countdown",
    instructions: "A loop counts down, printing 5, 4, 3, 2, 1 then 'lift off'. The counter starts at 5 and the loop continues while it is greater than 0, subtracting 1 each pass. Fill in the start value and the amount subtracted each pass.",
    topics: ["iteration"], skills: ["read_flowchart"],
    exam_refs: ["OCR_J277_2.2.1"], primm_phase: "investigate", concept_level: "consolidate",
    hints: [{ type: "nudge", text: "Counting down means subtracting 1 each pass, starting from 5." }],
    feedback: { correct: "Right — start at 5, subtract 1, stop at 0.", incorrect: "Start = 5; each pass subtracts 1." },
    payload: {
      flowchart: { shapes: [
        { id: "s", kind: "terminator", text: "Start", row: 0, col: 0 },
        { id: "z", kind: "process", text: "n = {{start}}", row: 1, col: 0 },
        { id: "d", kind: "decision", text: "n > 0", row: 2, col: 0 },
        { id: "p", kind: "io", text: "print n", row: 3, col: 0 },
        { id: "u", kind: "process", text: "n = n - {{step}}", row: 4, col: 0 },
        { id: "lo", kind: "io", text: "print \"lift off\"", row: 5, col: 0 },
        { id: "e", kind: "terminator", text: "End", row: 6, col: 0 }
      ], edges: [
        { from: "s", to: "z" }, { from: "z", to: "d" },
        { from: "d", to: "p", label: "Yes" },
        { from: "d", to: "lo", label: "No", from_side: "left", to_side: "left" },
        { from: "p", to: "u" },
        { from: "u", to: "d", from_side: "right", to_side: "right" },
        { from: "lo", to: "e" }
      ] },
      blanks: [ ft("start", "5"), ft("step", "1") ]
    }
  });

  /* ---------- 21. Sum of even numbers (loop + decision + accumulator) ---------- */
  A.push({
    id: "fc21", type: "flowchart", section_id: "fc-nested", difficulty: 5,
    title: "Sum the evens",
    instructions: "The program adds up the even numbers from 1 to N. A counter i runs while it is at most N; each pass, if i is even it is added to the running total. Fill in the loop-continue operator, the even-test remainder operator, and the starting total.",
    topics: ["iteration", "selection", "accumulator"], skills: ["read_flowchart"],
    exam_refs: ["OCR_J277_2.2.1"], primm_phase: "investigate", concept_level: "extend",
    hints: [
      { type: "concept", text: "Total starts at 0. Loop while i <= N. Even means i % 2 == 0." }
    ],
    feedback: { correct: "Right — accumulate only the evens.", incorrect: "total starts 0; loop i <= N; even test i % 2 == 0." },
    payload: {
      flowchart: { shapes: [
        { id: "s", kind: "terminator", text: "Start", row: 0, col: 1 },
        { id: "t", kind: "process", text: "total = {{init}}", row: 1, col: 1 },
        { id: "z", kind: "process", text: "i = 1", row: 2, col: 1 },
        { id: "d", kind: "decision", text: "i {{le}} N", row: 3, col: 1 },
        { id: "de", kind: "decision", text: "i {{op}} 2 == 0", row: 4, col: 1 },
        { id: "ad", kind: "process", text: "total = total + i", row: 5, col: 0 },
        { id: "u", kind: "process", text: "i = i + 1", row: 6, col: 1 },
        { id: "o", kind: "io", text: "display total", row: 7, col: 2 },
        { id: "e", kind: "terminator", text: "End", row: 8, col: 2 }
      ], edges: [
        { from: "s", to: "t" }, { from: "t", to: "z" }, { from: "z", to: "d" },
        { from: "d", to: "de", label: "Yes" },
        { from: "d", to: "o", label: "No", from_side: "right", to_side: "right" },
        { from: "de", to: "ad", label: "Yes" },
        { from: "de", to: "u", label: "No", from_side: "right", to_side: "right" },
        { from: "ad", to: "u" },
        { from: "u", to: "d", from_side: "left", to_side: "left" },
        { from: "o", to: "e" }
      ] },
      blanks: [ ft("le", "<="), ft("op", "%"), ft("init", "0") ]
    }
  });

  /* ---------- 22. Retry with attempt limit (loop + two exits) ---------- */
  A.push({
    id: "fc22", type: "flowchart", section_id: "fc-nested", difficulty: 5,
    title: "Login attempts",
    instructions: "A login lets the user try while the password is wrong AND they have used fewer than 3 attempts. Drawn with two diamonds. Fill in the maximum attempt count and the not-equal operator for the password check.",
    topics: ["iteration", "selection", "boolean"], skills: ["read_flowchart"],
    exam_refs: ["OCR_J277_2.2.1"], primm_phase: "investigate", concept_level: "extend",
    hints: [
      { type: "concept", text: "'Fewer than 3 attempts' is attempts < 3. 'Password wrong' is entry != password." }
    ],
    feedback: { correct: "Right — two guards: attempts left AND password still wrong.", incorrect: "attempts < 3 and entry != password." },
    payload: {
      flowchart: { shapes: [
        { id: "s", kind: "terminator", text: "Start", row: 0, col: 1 },
        { id: "a", kind: "process", text: "attempts = 0", row: 1, col: 1 },
        { id: "rd", kind: "io", text: "input entry", row: 2, col: 1 },
        { id: "d1", kind: "decision", text: "entry {{ne}} password", row: 3, col: 1 },
        { id: "d2", kind: "decision", text: "attempts < {{max}}", row: 4, col: 1 },
        { id: "u", kind: "process", text: "attempts = attempts + 1", row: 5, col: 0 },
        { id: "ok", kind: "io", text: "display \"welcome\"", row: 4, col: 2 },
        { id: "no", kind: "io", text: "display \"locked\"", row: 6, col: 1 },
        { id: "e", kind: "terminator", text: "End", row: 7, col: 1 }
      ], edges: [
        { from: "s", to: "a" }, { from: "a", to: "rd" }, { from: "rd", to: "d1" },
        { from: "d1", to: "d2", label: "Yes" },
        { from: "d1", to: "ok", label: "No" },
        { from: "d2", to: "u", label: "Yes" },
        { from: "d2", to: "no", label: "No", from_side: "bottom", to_side: "top" },
        { from: "u", to: "rd", from_side: "left", to_side: "left" },
        { from: "ok", to: "e", from_side: "bottom", to_side: "right" },
        { from: "no", to: "e" }
      ] },
      blanks: [ ft("ne", "!="), ft("max", "3") ]
    }
  });

  /* ---------- 23. Nested loops (rows x cols) ---------- */
  A.push({
    id: "fc23", type: "flowchart", section_id: "fc-nested", difficulty: 5,
    title: "Grid of stars",
    instructions: "The program prints a grid: for each row r (while r is less than the number of rows), it prints one row of stars by looping a column counter c while c is less than the number of columns. Fill in the two loop-continue operators (both strictly-less-than).",
    topics: ["iteration", "nested"], skills: ["read_flowchart"],
    exam_refs: ["OCR_J277_2.2.1"], primm_phase: "investigate", concept_level: "extend",
    hints: [{ type: "concept", text: "Both loops use strictly-less-than: r < rows for the outer loop, c < cols for the inner loop." }],
    feedback: { correct: "Right — an inner loop nested inside the outer one.", incorrect: "Both diamonds use < (strictly less than)." },
    payload: {
      flowchart: { shapes: [
        { id: "s", kind: "terminator", text: "Start", row: 0, col: 1 },
        { id: "r0", kind: "process", text: "r = 0", row: 1, col: 1 },
        { id: "od", kind: "decision", text: "r {{o1}} rows", row: 2, col: 1 },
        { id: "c0", kind: "process", text: "c = 0", row: 3, col: 1 },
        { id: "idd", kind: "decision", text: "c {{o2}} cols", row: 4, col: 1 },
        { id: "pr", kind: "io", text: "print \"*\"", row: 5, col: 0 },
        { id: "cu", kind: "process", text: "c = c + 1", row: 6, col: 0 },
        { id: "nl", kind: "io", text: "print newline", row: 5, col: 2 },
        { id: "ru", kind: "process", text: "r = r + 1", row: 6, col: 2 },
        { id: "e", kind: "terminator", text: "End", row: 7, col: 1 }
      ], edges: [
        { from: "s", to: "r0" }, { from: "r0", to: "od" },
        { from: "od", to: "c0", label: "Yes" },
        { from: "od", to: "e", label: "No", from_side: "left", to_side: "left" },
        { from: "c0", to: "idd" },
        { from: "idd", to: "pr", label: "Yes" },
        { from: "idd", to: "nl", label: "No" },
        { from: "pr", to: "cu" },
        { from: "cu", to: "idd", from_side: "left", to_side: "left" },
        { from: "nl", to: "ru" },
        { from: "ru", to: "od", from_side: "right", to_side: "right" }
      ] },
      blanks: [ ft("o1", "<"), ft("o2", "<") ]
    }
  });

  /* ---------- 24. Euclid-lite (while with subtraction) ---------- */
  A.push({
    id: "fc24", type: "flowchart", section_id: "fc-nested", difficulty: 5,
    title: "Repeated subtraction",
    instructions: "To find the remainder of a divided by b, the program subtracts b from a while a is greater than or equal to b. When the loop ends, a holds the remainder. Fill in the loop-continue operator and the value subtracted each pass (it is the variable b).",
    topics: ["iteration", "while"], skills: ["read_flowchart"],
    exam_refs: ["OCR_J277_2.2.1"], primm_phase: "investigate", concept_level: "extend",
    hints: [{ type: "concept", text: "Keep subtracting while a is still at least b — that's a >= b. Each pass subtracts b." }],
    feedback: { correct: "Right — repeated subtraction leaves the remainder in a.", incorrect: "Loop while a >= b; subtract b each pass." },
    payload: {
      flowchart: { shapes: [
        { id: "s", kind: "terminator", text: "Start", row: 0, col: 0 },
        { id: "i", kind: "io", text: "input a, b", row: 1, col: 0 },
        { id: "d", kind: "decision", text: "a {{cmp}} b", row: 2, col: 0 },
        { id: "sub", kind: "process", text: "a = a - {{sub}}", row: 3, col: 0 },
        { id: "o", kind: "io", text: "display a", row: 4, col: 0 },
        { id: "e", kind: "terminator", text: "End", row: 5, col: 0 }
      ], edges: [
        { from: "s", to: "i" }, { from: "i", to: "d" },
        { from: "d", to: "sub", label: "Yes" },
        { from: "d", to: "o", label: "No", from_side: "left", to_side: "left" },
        { from: "sub", to: "d", from_side: "right", to_side: "right" },
        { from: "o", to: "e" }
      ] },
      blanks: [ ft("cmp", ">="), ft("sub", "b") ]
    }
  });

  return {
    pack_format_version: "0.1",
    schema_version: "0.1",
    id: "builtin-flowchart-stress",
    title: "Flowchart Workout (24)",
    description: "Twenty-four flowchart-completion activities of rising difficulty: linear, decisions, nested decisions, counting and conditional loops, validation, and nested loops.",
    language: "python",
    audience: "ks4",
    author: "PyQuiz built-in",
    created_at: "2026-05-28T00:00:00Z",
    updated_at: "2026-05-28T00:00:00Z",
    spec_refs: ["OCR_J277_2.2.1"],
    tags: ["builtin", "flowchart", "stress-test"],
    settings: {
      shuffle: false, show_hints: true, show_solutions_after: "submission",
      pass_threshold: 0.7, show_runner_after: "never",
      ask_confidence: false, attempts_per_activity: 2, sequential: false
    },
    sections: [
      { id: "fc-basic",    number: 1, title: "Straight-line programs" },
      { id: "fc-decision", number: 2, title: "Single decisions" },
      { id: "fc-loops",    number: 3, title: "Loops" },
      { id: "fc-wide",     number: 4, title: "Wide branching" },
      { id: "fc-nested",   number: 5, title: "Nested logic" }
    ],
    activities: A
  };
  }

  /* =====================================================================
   * Public registry
   * ===================================================================== */
  function packFlowchartStressHand() { return {"pack_format_version": "0.1", "schema_version": "0.1", "id": "builtin-flowchart-stress-hand", "title": "Flowchart Workout (24) \u2014 hand-routed", "description": "Twenty-four flowchart-completion activities of rising difficulty: linear, decisions, nested decisions, counting and conditional loops, validation, and nested loops. This copy keeps the teacher's hand-tuned edge routing (explicit sides and bends).", "language": "python", "audience": "ks4", "created_at": "2026-05-28T00:00:00Z", "updated_at": "2026-05-29T09:36:45.225Z", "tags": ["builtin", "flowchart", "stress-test"], "settings": {"shuffle": false, "show_hints": true, "show_solutions_after": "submission", "pass_threshold": 0.7, "show_runner_after": "never", "ask_confidence": false, "attempts_per_activity": 2, "sequential": false}, "sections": [{"id": "fc-basic", "number": 1, "title": "Straight-line programs"}, {"id": "fc-decision", "number": 2, "title": "Single decisions"}, {"id": "fc-loops", "number": 3, "title": "Loops"}, {"id": "fc-wide", "number": 4, "title": "Wide branching"}, {"id": "fc-nested", "number": 5, "title": "Nested logic"}], "activities": [{"id": "fc01", "type": "flowchart", "section_id": "fc-basic", "difficulty": 1, "title": "Linear sequence", "instructions": "A program sets a score to zero, adds ten to it, then displays the score. Fill in the two missing numbers.", "topics": ["sequence", "flowchart"], "skills": ["read_flowchart"], "exam_refs": ["OCR_J277_2.2.1"], "primm_phase": "investigate", "concept_level": "introduce", "hints": [{"type": "nudge", "text": "Two numbers appear in the description: the starting value and the amount added."}], "feedback": {"correct": "Good \u2014 a straight run of steps, top to bottom.", "incorrect": "Re-read: the score starts at one number and has another added to it."}, "payload": {"flowchart": {"shapes": [{"id": "s", "kind": "terminator", "text": "Start", "row": 0, "col": 0}, {"id": "a", "kind": "process", "text": "score = {{init}}", "row": 1, "col": 0}, {"id": "b", "kind": "process", "text": "score = score + {{add}}", "row": 2, "col": 0}, {"id": "o", "kind": "io", "text": "display score", "row": 3, "col": 0}, {"id": "e", "kind": "terminator", "text": "End", "row": 4, "col": 0}], "edges": [{"from": "s", "to": "a"}, {"from": "a", "to": "b"}, {"from": "b", "to": "o"}, {"from": "o", "to": "e"}], "auto_layout": false}, "blanks": [{"id": "init", "mode": "free_text", "answer": "0", "accepted": ["0"], "case_sensitive": true, "width_hint": 2}, {"id": "add", "mode": "free_text", "answer": "10", "accepted": ["10"], "case_sensitive": true, "width_hint": 2}]}}, {"id": "fc02", "type": "flowchart", "section_id": "fc-basic", "difficulty": 1, "title": "Read, double, show", "instructions": "A program reads a number from the user, doubles it, and shows the result. Fill in the operation that doubles the number.", "topics": ["sequence", "io"], "skills": ["read_flowchart"], "exam_refs": ["OCR_J277_2.2.1"], "primm_phase": "investigate", "concept_level": "introduce", "hints": [{"type": "concept", "text": "Doubling a number is the same as multiplying it by 2."}], "feedback": {"correct": "Right \u2014 n times 2 doubles it.", "incorrect": "To double n you multiply it by 2."}, "payload": {"flowchart": {"shapes": [{"id": "s", "kind": "terminator", "text": "Start", "row": 0, "col": 0}, {"id": "i", "kind": "io", "text": "input n", "row": 1, "col": 0}, {"id": "d", "kind": "process", "text": "n = n {{op}} 2", "row": 2, "col": 0}, {"id": "o", "kind": "io", "text": "display n", "row": 3, "col": 0}, {"id": "e", "kind": "terminator", "text": "End", "row": 4, "col": 0}], "edges": [{"from": "s", "to": "i"}, {"from": "i", "to": "d"}, {"from": "d", "to": "o"}, {"from": "o", "to": "e"}], "auto_layout": false}, "blanks": [{"id": "op", "mode": "free_text", "answer": "*", "accepted": ["*"], "case_sensitive": true, "width_hint": 2}]}}, {"id": "fc03", "type": "flowchart", "section_id": "fc-decision", "difficulty": 2, "title": "Pass or fail", "instructions": "A program reads a score. If the score is 50 or more it shows 'pass', otherwise it shows 'fail'. Fill in the condition and the two messages.", "topics": ["selection"], "skills": ["read_flowchart"], "exam_refs": ["OCR_J277_2.2.1"], "primm_phase": "investigate", "concept_level": "practise", "hints": [{"type": "concept", "text": "'50 or more' means greater-than-or-equal. The Yes branch is taken when the condition is true."}], "feedback": {"correct": "Right \u2014 the diamond decides which message is shown.", "incorrect": "The condition decides the branch. Yes leads to 'pass', No leads to 'fail'."}, "payload": {"flowchart": {"shapes": [{"id": "s", "kind": "terminator", "text": "Start", "row": 0, "col": 1}, {"id": "i", "kind": "io", "text": "input score", "row": 1, "col": 1}, {"id": "d", "kind": "decision", "text": "score {{cmp}} 50", "row": 2, "col": 1}, {"id": "p", "kind": "io", "text": "display \"{{yes}}\"", "row": 3, "col": 0}, {"id": "f", "kind": "io", "text": "display \"{{no}}\"", "row": 3, "col": 2}, {"id": "e", "kind": "terminator", "text": "End", "row": 4, "col": 1}], "edges": [{"from": "s", "to": "i"}, {"from": "i", "to": "d"}, {"from": "d", "to": "p", "label": "Yes", "to_side": "top", "from_side": "left"}, {"from": "d", "to": "f", "label": "No", "from_side": "right", "to_side": "top"}, {"from": "p", "to": "e"}, {"from": "f", "to": "e"}], "auto_layout": false}, "blanks": [{"id": "cmp", "mode": "free_text", "answer": ">=", "accepted": [">="], "case_sensitive": true, "width_hint": 2}, {"id": "yes", "mode": "free_text", "answer": "pass", "accepted": ["pass"], "case_sensitive": false, "width_hint": 6}, {"id": "no", "mode": "free_text", "answer": "fail", "accepted": ["fail"], "case_sensitive": false, "width_hint": 6}]}}, {"id": "fc04", "type": "flowchart", "section_id": "fc-decision", "difficulty": 2, "title": "Warn if too hot", "instructions": "A program reads a temperature. If it is above 30 it shows a warning. Either way the program then ends. Fill in the condition.", "topics": ["selection"], "skills": ["read_flowchart"], "exam_refs": ["OCR_J277_2.2.1"], "primm_phase": "investigate", "concept_level": "practise", "hints": [{"type": "nudge", "text": "'Above 30' is a strict greater-than \u2014 30 itself does not trigger the warning."}], "feedback": {"correct": "Right \u2014 the No branch skips straight to the end.", "incorrect": "'Above 30' means strictly greater than 30."}, "payload": {"flowchart": {"shapes": [{"id": "s", "kind": "terminator", "text": "Start", "row": 0, "col": 0}, {"id": "i", "kind": "io", "text": "input temp", "row": 1, "col": 0}, {"id": "d", "kind": "decision", "text": "temp {{cmp}} 30", "row": 2, "col": 0}, {"id": "w", "kind": "io", "text": "display \"too hot\"", "row": 3, "col": 0}, {"id": "e", "kind": "terminator", "text": "End", "row": 4, "col": 0}], "edges": [{"from": "s", "to": "i"}, {"from": "i", "to": "d"}, {"from": "d", "to": "w", "label": "Yes"}, {"from": "d", "to": "e", "label": "No", "from_side": "right", "to_side": "right", "bend": {"x": 290, "y": 560}}, {"from": "w", "to": "e"}], "auto_layout": false}, "blanks": [{"id": "cmp", "mode": "free_text", "answer": ">", "accepted": [">"], "case_sensitive": true, "width_hint": 2}]}}, {"id": "fc05", "type": "flowchart", "section_id": "fc-loops", "difficulty": 2, "title": "Count to five", "instructions": "A loop prints the numbers 0, 1, 2, 3 and 4 \u2014 each on its own line \u2014 then stops. Fill in the number that controls when the loop ends.", "topics": ["iteration"], "skills": ["read_flowchart"], "exam_refs": ["OCR_J277_2.2.1"], "primm_phase": "investigate", "concept_level": "practise", "hints": [{"type": "concept", "text": "The loop continues while the counter is strictly less than the limit. The last value printed is 4."}], "feedback": {"correct": "Right \u2014 i < 5 keeps going for 0,1,2,3,4 then stops.", "incorrect": "The last value printed is 4, and the test is strictly less-than, so the limit is one more than 4."}, "payload": {"flowchart": {"shapes": [{"id": "s", "kind": "terminator", "text": "Start", "row": 0, "col": 0}, {"id": "a", "kind": "process", "text": "i = 0", "row": 1, "col": 0}, {"id": "d", "kind": "decision", "text": "i < {{lim}}", "row": 2, "col": 0}, {"id": "p", "kind": "io", "text": "print i", "row": 3, "col": 0}, {"id": "u", "kind": "process", "text": "i = i + 1", "row": 4, "col": 0}, {"id": "e", "kind": "terminator", "text": "End", "row": 5, "col": 0}], "edges": [{"from": "s", "to": "a"}, {"from": "a", "to": "d"}, {"from": "d", "to": "p", "label": "Yes"}, {"from": "d", "to": "e", "label": "No", "from_side": "left", "to_side": "left", "bend": {"x": 0, "y": 680}}, {"from": "p", "to": "u"}, {"from": "u", "to": "d", "from_side": "right", "to_side": "right", "bend": {"x": 280, "y": 320}}], "auto_layout": false}, "blanks": [{"id": "lim", "mode": "free_text", "answer": "5", "accepted": ["5"], "case_sensitive": true, "width_hint": 2}]}}, {"id": "fc06", "type": "flowchart", "section_id": "fc-loops", "difficulty": 3, "title": "Halve until small", "instructions": "Starting from a value n, the program repeatedly halves it while it is greater than 1. Fill in the loop condition.", "topics": ["iteration", "while"], "skills": ["read_flowchart"], "exam_refs": ["OCR_J277_2.2.1"], "primm_phase": "investigate", "concept_level": "consolidate", "hints": [{"type": "concept", "text": "A while loop checks its condition BEFORE each pass. 'While greater than 1' continues as long as n > 1."}], "feedback": {"correct": "Right \u2014 the loop runs while n is still greater than 1.", "incorrect": "The loop continues while n is greater than 1."}, "payload": {"flowchart": {"shapes": [{"id": "s", "kind": "terminator", "text": "Start", "row": 0, "col": 0}, {"id": "i", "kind": "io", "text": "input n", "row": 1, "col": 0}, {"id": "d", "kind": "decision", "text": "n {{cmp}} 1", "row": 2, "col": 0}, {"id": "h", "kind": "process", "text": "n = n / 2", "row": 3, "col": 0}, {"id": "o", "kind": "io", "text": "display n", "row": 4, "col": 0}, {"id": "e", "kind": "terminator", "text": "End", "row": 5, "col": 0}], "edges": [{"from": "s", "to": "i"}, {"from": "i", "to": "d"}, {"from": "d", "to": "h", "label": "Yes"}, {"from": "d", "to": "o", "label": "No", "from_side": "left", "to_side": "left", "bend": {"x": 10, "y": 560}}, {"from": "h", "to": "d", "from_side": "right", "to_side": "right", "bend": {"x": 260, "y": 320}}, {"from": "o", "to": "e"}], "auto_layout": false}, "blanks": [{"id": "cmp", "mode": "free_text", "answer": ">", "accepted": [">"], "case_sensitive": true, "width_hint": 2}]}}, {"id": "fc07", "type": "flowchart", "section_id": "fc-loops", "difficulty": 3, "title": "Sum 1 to N", "instructions": "The program adds up the numbers from 1 to N. A running total starts at zero and each pass adds the current counter. Fill in the starting value of the total and the loop's continue-condition (the loop runs while the counter is less than or equal to N).", "topics": ["iteration", "accumulator"], "skills": ["read_flowchart"], "exam_refs": ["OCR_J277_2.2.1"], "primm_phase": "investigate", "concept_level": "consolidate", "hints": [{"type": "concept", "text": "An accumulator must start at 0 so the first addition is correct."}, {"type": "nudge", "text": "'Less than or equal to N' includes N itself, so the operator is <=."}], "feedback": {"correct": "Right \u2014 total starts at 0 and the loop includes N.", "incorrect": "The total starts at 0. The loop must include N, so the test is i <= N."}, "payload": {"flowchart": {"shapes": [{"id": "s", "kind": "terminator", "text": "Start", "row": 0, "col": 0}, {"id": "t", "kind": "process", "text": "total = {{init}}", "row": 1, "col": 0}, {"id": "c", "kind": "process", "text": "i = 1", "row": 2, "col": 0}, {"id": "d", "kind": "decision", "text": "i {{cmp}} N", "row": 3, "col": 0}, {"id": "a", "kind": "process", "text": "total = total + i", "row": 4, "col": 0}, {"id": "u", "kind": "process", "text": "i = i + 1", "row": 5, "col": 0}, {"id": "o", "kind": "io", "text": "display total", "row": 6, "col": 0}, {"id": "e", "kind": "terminator", "text": "End", "row": 7, "col": 0}], "edges": [{"from": "s", "to": "t"}, {"from": "t", "to": "c"}, {"from": "c", "to": "d"}, {"from": "d", "to": "a", "label": "Yes"}, {"from": "d", "to": "o", "label": "No", "from_side": "left", "to_side": "left", "bend": {"x": 10, "y": 800}}, {"from": "a", "to": "u"}, {"from": "u", "to": "d", "from_side": "right", "to_side": "right", "bend": {"x": 260, "y": 440}}, {"from": "o", "to": "e"}], "auto_layout": false}, "blanks": [{"id": "init", "mode": "free_text", "answer": "0", "accepted": ["0"], "case_sensitive": true, "width_hint": 2}, {"id": "cmp", "mode": "free_text", "answer": "<=", "accepted": ["<="], "case_sensitive": true, "width_hint": 2}]}}, {"id": "fc08", "type": "flowchart", "section_id": "fc-nested", "difficulty": 3, "title": "Three-way grade", "instructions": "A program grades a score: 70 or more is 'A', otherwise 40 or more is 'C', otherwise 'F'. Fill in the two conditions and the three grades.", "topics": ["selection", "nested"], "skills": ["read_flowchart"], "exam_refs": ["OCR_J277_2.2.1"], "primm_phase": "investigate", "concept_level": "consolidate", "hints": [{"type": "concept", "text": "The first diamond checks the highest band. If it fails, the second diamond checks the middle band. The final else catches everything left."}], "feedback": {"correct": "Right \u2014 each diamond narrows the range further.", "incorrect": "Top diamond: score >= 70 \u2192 A. Second diamond: score >= 40 \u2192 C. Else \u2192 F."}, "payload": {"flowchart": {"shapes": [{"id": "s", "kind": "terminator", "text": "Start", "row": 0, "col": 1}, {"id": "d1", "kind": "decision", "text": "score >= {{hi}}", "row": 1, "col": 1}, {"id": "a", "kind": "io", "text": "display \"{{ga}}\"", "row": 2, "col": 0}, {"id": "d2", "kind": "decision", "text": "score >= {{mid}}", "row": 2, "col": 2}, {"id": "c", "kind": "io", "text": "display \"{{gc}}\"", "row": 3, "col": 1}, {"id": "f", "kind": "io", "text": "display \"{{gf}}\"", "row": 3, "col": 2}, {"id": "e", "kind": "terminator", "text": "End", "row": 4, "col": 1}], "edges": [{"from": "s", "to": "d1"}, {"from": "d1", "to": "a", "label": "Yes", "to_side": "top", "from_side": "left"}, {"from": "d1", "to": "d2", "label": "No", "from_side": "right", "to_side": "top"}, {"from": "d2", "to": "c", "label": "Yes", "from_side": "left", "to_side": "top"}, {"from": "d2", "to": "f", "label": "No"}, {"from": "a", "to": "e"}, {"from": "c", "to": "e"}, {"from": "f", "to": "e", "from_side": "bottom", "to_side": "right"}], "auto_layout": false}, "blanks": [{"id": "hi", "mode": "free_text", "answer": "70", "accepted": ["70"], "case_sensitive": true, "width_hint": 2}, {"id": "mid", "mode": "free_text", "answer": "40", "accepted": ["40"], "case_sensitive": true, "width_hint": 2}, {"id": "ga", "mode": "free_text", "answer": "A", "accepted": ["A"], "case_sensitive": false, "width_hint": 3}, {"id": "gc", "mode": "free_text", "answer": "C", "accepted": ["C"], "case_sensitive": false, "width_hint": 3}, {"id": "gf", "mode": "free_text", "answer": "F", "accepted": ["F"], "case_sensitive": false, "width_hint": 3}]}}, {"id": "fc09", "type": "flowchart", "section_id": "fc-decision", "difficulty": 2, "title": "Even or odd", "instructions": "A program decides if a number is even or odd by checking the remainder when divided by 2. If the remainder is 0 it is even, otherwise odd. Fill in the remainder operator and the value compared against.", "topics": ["selection", "modulo"], "skills": ["read_flowchart"], "exam_refs": ["OCR_J277_2.2.1"], "primm_phase": "investigate", "concept_level": "consolidate", "hints": [{"type": "concept", "text": "The remainder (modulo) operator in Python is %. A number is even when n % 2 equals 0."}], "feedback": {"correct": "Right \u2014 n % 2 == 0 means even.", "incorrect": "Use the remainder operator % and compare the remainder against 0."}, "payload": {"flowchart": {"shapes": [{"id": "s", "kind": "terminator", "text": "Start", "row": 0, "col": 1}, {"id": "i", "kind": "io", "text": "input n", "row": 1, "col": 1}, {"id": "d", "kind": "decision", "text": "n {{op}} 2 == {{val}}", "row": 2, "col": 1}, {"id": "ev", "kind": "io", "text": "display \"even\"", "row": 3, "col": 0}, {"id": "od", "kind": "io", "text": "display \"odd\"", "row": 3, "col": 2}, {"id": "e", "kind": "terminator", "text": "End", "row": 4, "col": 1}], "edges": [{"from": "s", "to": "i"}, {"from": "i", "to": "d"}, {"from": "d", "to": "ev", "label": "Yes", "to_side": "top", "from_side": "left"}, {"from": "d", "to": "od", "label": "No", "from_side": "right", "to_side": "top"}, {"from": "ev", "to": "e"}, {"from": "od", "to": "e"}], "auto_layout": false}, "blanks": [{"id": "op", "mode": "free_text", "answer": "%", "accepted": ["%"], "case_sensitive": true, "width_hint": 2}, {"id": "val", "mode": "free_text", "answer": "0", "accepted": ["0"], "case_sensitive": true, "width_hint": 2}]}}, {"id": "fc10", "type": "flowchart", "section_id": "fc-decision", "difficulty": 2, "title": "Bigger of two", "instructions": "A program reads two numbers a and b and displays the larger one. Fill in the comparison so that the Yes branch shows a.", "topics": ["selection", "comparison"], "skills": ["read_flowchart"], "exam_refs": ["OCR_J277_2.2.1"], "primm_phase": "investigate", "concept_level": "consolidate", "hints": [{"type": "nudge", "text": "If a is to be shown on the Yes branch, the condition must be true when a is the bigger one."}], "feedback": {"correct": "Right \u2014 a > b sends control to 'display a'.", "incorrect": "For the Yes branch to display a, the test should be a > b."}, "payload": {"flowchart": {"shapes": [{"id": "s", "kind": "terminator", "text": "Start", "row": 0, "col": 1}, {"id": "i", "kind": "io", "text": "input a, b", "row": 1, "col": 1}, {"id": "d", "kind": "decision", "text": "a {{cmp}} b", "row": 2, "col": 1}, {"id": "sa", "kind": "io", "text": "display a", "row": 3, "col": 0}, {"id": "sb", "kind": "io", "text": "display b", "row": 3, "col": 2}, {"id": "e", "kind": "terminator", "text": "End", "row": 4, "col": 1}], "edges": [{"from": "s", "to": "i"}, {"from": "i", "to": "d"}, {"from": "d", "to": "sa", "label": "Yes", "to_side": "top", "from_side": "left"}, {"from": "d", "to": "sb", "label": "No", "from_side": "right", "to_side": "top"}, {"from": "sa", "to": "e"}, {"from": "sb", "to": "e"}], "auto_layout": false}, "blanks": [{"id": "cmp", "mode": "free_text", "answer": ">", "accepted": [">"], "case_sensitive": true, "width_hint": 2}]}}, {"id": "fc11", "type": "flowchart", "section_id": "fc-nested", "difficulty": 4, "title": "Count evens to N", "instructions": "The program loops the counter i from 0 up to (but not including) N. Each pass, if i is even it adds one to a count. At the end it displays the count. Fill in the loop limit comparison, the even-test operator, and the value the remainder is compared with.", "topics": ["iteration", "selection", "nested"], "skills": ["read_flowchart"], "exam_refs": ["OCR_J277_2.2.1"], "primm_phase": "investigate", "concept_level": "extend", "hints": [{"type": "concept", "text": "The loop continues while i is strictly less than N. Inside it, i % 2 == 0 tests for even."}, {"type": "nudge", "text": "Three blanks: the loop test (<), the remainder operator (%), and the value (0)."}], "feedback": {"correct": "Right \u2014 a decision nested inside the loop body.", "incorrect": "Loop while i < N. Inside, test i % 2 == 0 for even."}, "payload": {"flowchart": {"shapes": [{"id": "s", "kind": "terminator", "text": "Start", "row": 0, "col": 1}, {"id": "z1", "kind": "process", "text": "count = 0", "row": 1, "col": 1}, {"id": "z2", "kind": "process", "text": "i = 0", "row": 2, "col": 1}, {"id": "d", "kind": "decision", "text": "i {{lt}} N", "row": 3, "col": 1}, {"id": "de", "kind": "decision", "text": "i {{op}} 2 == {{val}}", "row": 4, "col": 1}, {"id": "inc", "kind": "process", "text": "count = count + 1", "row": 5, "col": 0}, {"id": "u", "kind": "process", "text": "i = i + 1", "row": 6, "col": 1}, {"id": "o", "kind": "io", "text": "display count", "row": 7, "col": 1}, {"id": "e", "kind": "terminator", "text": "End", "row": 8, "col": 1}], "edges": [{"from": "s", "to": "z1"}, {"from": "z1", "to": "z2"}, {"from": "z2", "to": "d"}, {"from": "d", "to": "de", "label": "Yes"}, {"from": "d", "to": "o", "label": "No", "from_side": "right", "to_side": "right", "bend": {"x": 540, "y": 920}}, {"from": "de", "to": "inc", "label": "Yes"}, {"from": "de", "to": "u", "label": "No", "from_side": "right", "to_side": "right", "bend": {"x": 480, "y": 800}}, {"from": "inc", "to": "u"}, {"from": "u", "to": "d", "from_side": "bottom", "to_side": "left", "bend": {"x": 30, "y": 870}}, {"from": "o", "to": "e"}], "auto_layout": false}, "blanks": [{"id": "lt", "mode": "free_text", "answer": "<", "accepted": ["<"], "case_sensitive": true, "width_hint": 2}, {"id": "op", "mode": "free_text", "answer": "%", "accepted": ["%"], "case_sensitive": true, "width_hint": 2}, {"id": "val", "mode": "free_text", "answer": "0", "accepted": ["0"], "case_sensitive": true, "width_hint": 2}]}}, {"id": "fc12", "type": "flowchart", "section_id": "fc-nested", "difficulty": 4, "title": "Keep guessing", "instructions": "A game keeps asking the player for a guess while the guess is not equal to the secret. When the guess matches, it shows 'correct' and stops. Fill in the loop condition operator (not-equal).", "topics": ["iteration", "while", "selection"], "skills": ["read_flowchart"], "exam_refs": ["OCR_J277_2.2.1"], "primm_phase": "investigate", "concept_level": "extend", "hints": [{"type": "concept", "text": "'Not equal to' in Python is written !=. The loop keeps going while guess != secret."}], "feedback": {"correct": "Right \u2014 loop while the guess is wrong, stop when it matches.", "incorrect": "'Not equal' is !=. The loop continues while guess != secret."}, "payload": {"flowchart": {"shapes": [{"id": "s", "kind": "terminator", "text": "Start", "row": 0, "col": 0}, {"id": "g", "kind": "io", "text": "input guess", "row": 1, "col": 0}, {"id": "d", "kind": "decision", "text": "guess {{cmp}} secret", "row": 2, "col": 0}, {"id": "g2", "kind": "io", "text": "input guess", "row": 3, "col": 0}, {"id": "ok", "kind": "io", "text": "display \"correct\"", "row": 4, "col": 0}, {"id": "e", "kind": "terminator", "text": "End", "row": 5, "col": 0}], "edges": [{"from": "s", "to": "g"}, {"from": "g", "to": "d"}, {"from": "d", "to": "g2", "label": "Yes"}, {"from": "d", "to": "ok", "label": "No", "from_side": "left", "to_side": "left", "bend": {"x": 10, "y": 560}}, {"from": "g2", "to": "d", "from_side": "right", "to_side": "right", "bend": {"x": 270, "y": 320}}, {"from": "ok", "to": "e"}], "auto_layout": false}, "blanks": [{"id": "cmp", "mode": "free_text", "answer": "!=", "accepted": ["!="], "case_sensitive": true, "width_hint": 2}]}}, {"id": "fc13", "type": "flowchart", "section_id": "fc-nested", "difficulty": 5, "title": "Fizz on threes", "instructions": "For each number i from 1 to N inclusive, the program shows 'Fizz' if i is divisible by 3, otherwise it shows the number itself. Fill in the loop's continue-condition operator (includes N) and the divisibility-test operator.", "topics": ["iteration", "selection", "modulo"], "skills": ["read_flowchart"], "exam_refs": ["OCR_J277_2.2.1"], "primm_phase": "investigate", "concept_level": "extend", "hints": [{"type": "concept", "text": "Divisible by 3 means the remainder i % 3 is 0."}, {"type": "nudge", "text": "'1 to N inclusive' needs <= so N is included."}], "feedback": {"correct": "Right \u2014 modulo test inside a counting loop.", "incorrect": "Loop while i <= N. Divisible by 3 is i % 3 == 0."}, "payload": {"flowchart": {"shapes": [{"id": "s", "kind": "terminator", "text": "Start", "row": 0, "col": 1}, {"id": "z", "kind": "process", "text": "i = 1", "row": 1, "col": 1}, {"id": "d", "kind": "decision", "text": "i {{le}} N", "row": 2, "col": 1}, {"id": "dd", "kind": "decision", "text": "i {{op}} 3 == 0", "row": 3, "col": 1}, {"id": "fz", "kind": "io", "text": "display \"Fizz\"", "row": 4, "col": 0}, {"id": "nm", "kind": "io", "text": "display i", "row": 4, "col": 2}, {"id": "u", "kind": "process", "text": "i = i + 1", "row": 5, "col": 1}, {"id": "e", "kind": "terminator", "text": "End", "row": 6, "col": 1}], "edges": [{"from": "s", "to": "z"}, {"from": "z", "to": "d"}, {"from": "d", "to": "dd", "label": "Yes"}, {"from": "d", "to": "e", "label": "No", "from_side": "right", "to_side": "right", "bend": {"x": 680, "y": 800}}, {"from": "dd", "to": "fz", "label": "Yes", "from_side": "left", "to_side": "top"}, {"from": "dd", "to": "nm", "label": "No", "from_side": "right", "to_side": "top"}, {"from": "fz", "to": "u"}, {"from": "nm", "to": "u"}, {"from": "u", "to": "d", "from_side": "bottom", "to_side": "left", "bend": {"x": 30, "y": 740}}], "auto_layout": false}, "blanks": [{"id": "le", "mode": "free_text", "answer": "<=", "accepted": ["<="], "case_sensitive": true, "width_hint": 2}, {"id": "op", "mode": "free_text", "answer": "%", "accepted": ["%"], "case_sensitive": true, "width_hint": 2}]}}, {"id": "fc14", "type": "flowchart", "section_id": "fc-loops", "difficulty": 4, "title": "Validate the age", "instructions": "A program repeatedly asks for an age until a value of at least 0 is entered (it rejects negatives). Fill in the condition that keeps the loop going while the age is invalid (less than 0).", "topics": ["iteration", "validation"], "skills": ["read_flowchart"], "exam_refs": ["OCR_J277_2.2.1"], "primm_phase": "investigate", "concept_level": "extend", "hints": [{"type": "concept", "text": "The loop should repeat while the input is INVALID. An age below 0 is invalid, so the loop continues while age < 0."}], "feedback": {"correct": "Right \u2014 re-prompt while the age is negative.", "incorrect": "Invalid means below zero. Loop while age < 0."}, "payload": {"flowchart": {"shapes": [{"id": "s", "kind": "terminator", "text": "Start", "row": 0, "col": 0}, {"id": "i", "kind": "io", "text": "input age", "row": 1, "col": 0}, {"id": "d", "kind": "decision", "text": "age {{cmp}} 0", "row": 2, "col": 0}, {"id": "r", "kind": "io", "text": "input age", "row": 3, "col": 0}, {"id": "o", "kind": "io", "text": "display age", "row": 4, "col": 0}, {"id": "e", "kind": "terminator", "text": "End", "row": 5, "col": 0}], "edges": [{"from": "s", "to": "i"}, {"from": "i", "to": "d"}, {"from": "d", "to": "r", "label": "Yes"}, {"from": "d", "to": "o", "label": "No", "from_side": "left", "to_side": "left", "bend": {"x": 0, "y": 560}}, {"from": "r", "to": "d", "from_side": "right", "to_side": "right", "bend": {"x": 260, "y": 320}}, {"from": "o", "to": "e"}], "auto_layout": false}, "blanks": [{"id": "cmp", "mode": "free_text", "answer": "<", "accepted": ["<"], "case_sensitive": true, "width_hint": 2}]}}, {"id": "fc15", "type": "flowchart", "section_id": "fc-wide", "difficulty": 4, "title": "Three-option menu", "instructions": "A menu reads a choice. If it equals 1 it runs 'New', else if it equals 2 it runs 'Load', otherwise it runs 'Quit'. Fill in the two values compared against.", "topics": ["selection", "nested"], "skills": ["read_flowchart"], "exam_refs": ["OCR_J277_2.2.1"], "primm_phase": "investigate", "concept_level": "extend", "hints": [{"type": "nudge", "text": "The first diamond checks choice == 1, the second checks choice == 2."}], "feedback": {"correct": "Right \u2014 a chain of equality checks.", "incorrect": "First diamond compares with 1, second with 2."}, "payload": {"flowchart": {"shapes": [{"id": "s", "kind": "terminator", "text": "Start", "row": 0, "col": 1}, {"id": "i", "kind": "io", "text": "input choice", "row": 1, "col": 1}, {"id": "d1", "kind": "decision", "text": "choice == {{v1}}", "row": 2, "col": 1}, {"id": "n", "kind": "io", "text": "run New", "row": 3, "col": 0}, {"id": "d2", "kind": "decision", "text": "choice == {{v2}}", "row": 3, "col": 2}, {"id": "l", "kind": "io", "text": "run Load", "row": 4, "col": 1}, {"id": "q", "kind": "io", "text": "run Quit", "row": 4, "col": 2}, {"id": "e", "kind": "terminator", "text": "End", "row": 5, "col": 1}], "edges": [{"from": "s", "to": "i"}, {"from": "i", "to": "d1"}, {"from": "d1", "to": "n", "label": "Yes", "to_side": "top", "from_side": "left"}, {"from": "d1", "to": "d2", "label": "No", "from_side": "right", "to_side": "top"}, {"from": "d2", "to": "l", "label": "Yes", "to_side": "top", "from_side": "left"}, {"from": "d2", "to": "q", "label": "No", "from_side": "bottom", "to_side": "top"}, {"from": "n", "to": "e"}, {"from": "l", "to": "e"}, {"from": "q", "to": "e", "from_side": "bottom", "to_side": "right"}], "auto_layout": false}, "blanks": [{"id": "v1", "mode": "free_text", "answer": "1", "accepted": ["1"], "case_sensitive": true, "width_hint": 2}, {"id": "v2", "mode": "free_text", "answer": "2", "accepted": ["2"], "case_sensitive": true, "width_hint": 2}]}}, {"id": "fc16", "type": "flowchart", "section_id": "fc-wide", "difficulty": 4, "title": "Ticket price", "instructions": "A cinema sets a ticket price. If age is under 16 the price is 5, otherwise if age is 65 or over the price is 6, otherwise it is 9. Fill in the two age thresholds and the three prices.", "topics": ["selection", "nested"], "skills": ["read_flowchart"], "exam_refs": ["OCR_J277_2.2.1"], "primm_phase": "investigate", "concept_level": "extend", "hints": [{"type": "concept", "text": "'Under 16' is age < 16. '65 or over' is age >= 65."}], "feedback": {"correct": "Right \u2014 child, senior, then standard.", "incorrect": "First diamond: age < 16 \u2192 5. Second: age >= 65 \u2192 6. Else \u2192 9."}, "payload": {"flowchart": {"shapes": [{"id": "s", "kind": "terminator", "text": "Start", "row": 0, "col": 1}, {"id": "d1", "kind": "decision", "text": "age < {{t1}}", "row": 1, "col": 1}, {"id": "c", "kind": "process", "text": "price = {{p1}}", "row": 2, "col": 0}, {"id": "d2", "kind": "decision", "text": "age >= {{t2}}", "row": 2, "col": 2}, {"id": "se", "kind": "process", "text": "price = {{p2}}", "row": 3, "col": 1}, {"id": "st", "kind": "process", "text": "price = {{p3}}", "row": 3, "col": 2}, {"id": "o", "kind": "io", "text": "display price", "row": 4, "col": 1}, {"id": "e", "kind": "terminator", "text": "End", "row": 5, "col": 1}], "edges": [{"from": "s", "to": "d1"}, {"from": "d1", "to": "c", "label": "Yes", "to_side": "top", "from_side": "left"}, {"from": "d1", "to": "d2", "label": "No", "from_side": "right", "to_side": "top"}, {"from": "d2", "to": "se", "label": "Yes", "from_side": "left", "to_side": "top", "bend": {"x": 350, "y": 320}}, {"from": "d2", "to": "st", "label": "No"}, {"from": "c", "to": "o"}, {"from": "se", "to": "o"}, {"from": "st", "to": "o", "from_side": "bottom", "to_side": "right"}, {"from": "o", "to": "e", "from_side": "bottom"}], "auto_layout": false}, "blanks": [{"id": "t1", "mode": "free_text", "answer": "16", "accepted": ["16"], "case_sensitive": true, "width_hint": 2}, {"id": "t2", "mode": "free_text", "answer": "65", "accepted": ["65"], "case_sensitive": true, "width_hint": 2}, {"id": "p1", "mode": "free_text", "answer": "5", "accepted": ["5"], "case_sensitive": true, "width_hint": 2}, {"id": "p2", "mode": "free_text", "answer": "6", "accepted": ["6"], "case_sensitive": true, "width_hint": 2}, {"id": "p3", "mode": "free_text", "answer": "9", "accepted": ["9"], "case_sensitive": true, "width_hint": 2}]}}, {"id": "fc17", "type": "flowchart", "section_id": "fc-nested", "difficulty": 5, "title": "Find the largest", "instructions": "The program reads N numbers and keeps track of the largest seen so far. For each new value, if it is greater than the current best, the best is updated. Fill in the comparison that decides whether to update the best.", "topics": ["iteration", "selection", "accumulator"], "skills": ["read_flowchart"], "exam_refs": ["OCR_J277_2.2.1"], "primm_phase": "investigate", "concept_level": "extend", "hints": [{"type": "nudge", "text": "You update the best only when the new value is bigger than it: value > best."}], "feedback": {"correct": "Right \u2014 update best when a bigger value appears.", "incorrect": "Update only when value > best."}, "payload": {"flowchart": {"shapes": [{"id": "s", "kind": "terminator", "text": "Start", "row": 0, "col": 1}, {"id": "b", "kind": "process", "text": "best = first value", "row": 1, "col": 1}, {"id": "d", "kind": "decision", "text": "more values?", "row": 2, "col": 1}, {"id": "rd", "kind": "io", "text": "read value", "row": 3, "col": 1}, {"id": "dd", "kind": "decision", "text": "value {{cmp}} best", "row": 4, "col": 1}, {"id": "up", "kind": "process", "text": "best = value", "row": 5, "col": 0}, {"id": "o", "kind": "io", "text": "display best", "row": 6, "col": 1}, {"id": "e", "kind": "terminator", "text": "End", "row": 7, "col": 1}], "edges": [{"from": "s", "to": "b"}, {"from": "b", "to": "d"}, {"from": "d", "to": "rd", "label": "Yes"}, {"from": "d", "to": "o", "label": "No", "from_side": "right", "to_side": "right", "bend": {"x": 530, "y": 800}}, {"from": "rd", "to": "dd"}, {"from": "dd", "to": "up", "label": "Yes"}, {"from": "dd", "to": "d", "label": "No", "from_side": "left", "to_side": "left", "bend": {"x": 250, "y": 340}}, {"from": "up", "to": "d", "from_side": "top", "to_side": "left"}, {"from": "o", "to": "e"}], "auto_layout": false}, "blanks": [{"id": "cmp", "mode": "free_text", "answer": ">", "accepted": [">"], "case_sensitive": true, "width_hint": 2}]}}, {"id": "fc18", "type": "flowchart", "section_id": "fc-loops", "difficulty": 4, "title": "Times table row", "instructions": "The program prints the n-times table from 1 to 12. A counter i runs from 1 while it is at most 12, printing n times i each pass. Fill in the loop's upper-limit value and the continue-condition operator.", "topics": ["iteration"], "skills": ["read_flowchart"], "exam_refs": ["OCR_J277_2.2.1"], "primm_phase": "investigate", "concept_level": "extend", "hints": [{"type": "concept", "text": "'At most 12' means i can equal 12, so the operator is <= and the limit is 12."}], "feedback": {"correct": "Right \u2014 runs i from 1 through 12 inclusive.", "incorrect": "Loop while i <= 12."}, "payload": {"flowchart": {"shapes": [{"id": "s", "kind": "terminator", "text": "Start", "row": 0, "col": 0}, {"id": "z", "kind": "process", "text": "i = 1", "row": 1, "col": 0}, {"id": "d", "kind": "decision", "text": "i {{cmp}} {{lim}}", "row": 2, "col": 0}, {"id": "p", "kind": "io", "text": "print n * i", "row": 3, "col": 0}, {"id": "u", "kind": "process", "text": "i = i + 1", "row": 4, "col": 0}, {"id": "e", "kind": "terminator", "text": "End", "row": 5, "col": 0}], "edges": [{"from": "s", "to": "z"}, {"from": "z", "to": "d"}, {"from": "d", "to": "p", "label": "Yes"}, {"from": "d", "to": "e", "label": "No", "from_side": "left", "to_side": "left", "bend": {"x": 10, "y": 680}}, {"from": "p", "to": "u"}, {"from": "u", "to": "d", "from_side": "right", "to_side": "right", "bend": {"x": 260, "y": 320}}], "auto_layout": false}, "blanks": [{"id": "cmp", "mode": "free_text", "answer": "<=", "accepted": ["<="], "case_sensitive": true, "width_hint": 2}, {"id": "lim", "mode": "free_text", "answer": "12", "accepted": ["12"], "case_sensitive": true, "width_hint": 2}]}}, {"id": "fc19", "type": "flowchart", "section_id": "fc-nested", "difficulty": 5, "title": "In range?", "instructions": "A program shows 'valid' only when a number is at least 1 AND at most 10; otherwise it shows 'invalid'. This is drawn as two nested diamonds. Fill in the two boundary values.", "topics": ["selection", "nested", "boolean"], "skills": ["read_flowchart"], "exam_refs": ["OCR_J277_2.2.1"], "primm_phase": "investigate", "concept_level": "extend", "hints": [{"type": "concept", "text": "Both conditions must hold. The first diamond checks n >= 1; only if that's true does the second check n <= 10."}], "feedback": {"correct": "Right \u2014 both diamonds must say Yes for 'valid'.", "incorrect": "First diamond: n >= 1. Second: n <= 10. Either No leads to 'invalid'."}, "payload": {"flowchart": {"shapes": [{"id": "s", "kind": "terminator", "text": "Start", "row": 0, "col": 1}, {"id": "d1", "kind": "decision", "text": "n >= {{lo}}", "row": 1, "col": 1}, {"id": "d2", "kind": "decision", "text": "n <= {{hi}}", "row": 2, "col": 1}, {"id": "v", "kind": "io", "text": "display \"valid\"", "row": 3, "col": 0}, {"id": "x", "kind": "io", "text": "display \"invalid\"", "row": 3, "col": 1}, {"id": "e", "kind": "terminator", "text": "End", "row": 4, "col": 1}], "edges": [{"from": "s", "to": "d1"}, {"from": "d1", "to": "d2", "label": "Yes"}, {"from": "d1", "to": "x", "label": "No", "from_side": "right", "to_side": "right", "bend": {"x": 510, "y": 440}}, {"from": "d2", "to": "v", "label": "Yes", "from_side": "left", "to_side": "top"}, {"from": "d2", "to": "x", "label": "No", "from_side": "bottom", "to_side": "top"}, {"from": "v", "to": "e"}, {"from": "x", "to": "e", "from_side": "bottom", "to_side": "top"}], "auto_layout": false}, "blanks": [{"id": "lo", "mode": "free_text", "answer": "1", "accepted": ["1"], "case_sensitive": true, "width_hint": 2}, {"id": "hi", "mode": "free_text", "answer": "10", "accepted": ["10"], "case_sensitive": true, "width_hint": 2}]}}, {"id": "fc20", "type": "flowchart", "section_id": "fc-loops", "difficulty": 3, "title": "Countdown", "instructions": "A loop counts down, printing 5, 4, 3, 2, 1 then 'lift off'. The counter starts at 5 and the loop continues while it is greater than 0, subtracting 1 each pass. Fill in the start value and the amount subtracted each pass.", "topics": ["iteration"], "skills": ["read_flowchart"], "exam_refs": ["OCR_J277_2.2.1"], "primm_phase": "investigate", "concept_level": "consolidate", "hints": [{"type": "nudge", "text": "Counting down means subtracting 1 each pass, starting from 5."}], "feedback": {"correct": "Right \u2014 start at 5, subtract 1, stop at 0.", "incorrect": "Start = 5; each pass subtracts 1."}, "payload": {"flowchart": {"shapes": [{"id": "s", "kind": "terminator", "text": "Start", "row": 0, "col": 0}, {"id": "z", "kind": "process", "text": "n = {{start}}", "row": 1, "col": 0}, {"id": "d", "kind": "decision", "text": "n > 0", "row": 2, "col": 0}, {"id": "p", "kind": "io", "text": "print n", "row": 3, "col": 0}, {"id": "u", "kind": "process", "text": "n = n - {{step}}", "row": 4, "col": 0}, {"id": "lo", "kind": "io", "text": "print \"lift off\"", "row": 5, "col": 0}, {"id": "e", "kind": "terminator", "text": "End", "row": 6, "col": 0}], "edges": [{"from": "s", "to": "z"}, {"from": "z", "to": "d"}, {"from": "d", "to": "p", "label": "Yes"}, {"from": "d", "to": "lo", "label": "No", "from_side": "left", "to_side": "left", "bend": {"x": 0, "y": 680}}, {"from": "p", "to": "u"}, {"from": "u", "to": "d", "from_side": "right", "to_side": "right", "bend": {"x": 270, "y": 320}}, {"from": "lo", "to": "e"}], "auto_layout": false}, "blanks": [{"id": "start", "mode": "free_text", "answer": "5", "accepted": ["5"], "case_sensitive": true, "width_hint": 2}, {"id": "step", "mode": "free_text", "answer": "1", "accepted": ["1"], "case_sensitive": true, "width_hint": 2}]}}, {"id": "fc21", "type": "flowchart", "section_id": "fc-nested", "difficulty": 5, "title": "Sum the evens", "instructions": "The program adds up the even numbers from 1 to N. A counter i runs while it is at most N; each pass, if i is even it is added to the running total. Fill in the loop-continue operator, the even-test remainder operator, and the starting total.", "topics": ["iteration", "selection", "accumulator"], "skills": ["read_flowchart"], "exam_refs": ["OCR_J277_2.2.1"], "primm_phase": "investigate", "concept_level": "extend", "hints": [{"type": "concept", "text": "Total starts at 0. Loop while i <= N. Even means i % 2 == 0."}], "feedback": {"correct": "Right \u2014 accumulate only the evens.", "incorrect": "total starts 0; loop i <= N; even test i % 2 == 0."}, "payload": {"flowchart": {"shapes": [{"id": "s", "kind": "terminator", "text": "Start", "row": 0, "col": 1}, {"id": "t", "kind": "process", "text": "total = {{init}}", "row": 1, "col": 1}, {"id": "z", "kind": "process", "text": "i = 1", "row": 2, "col": 1}, {"id": "d", "kind": "decision", "text": "i {{le}} N", "row": 3, "col": 1}, {"id": "de", "kind": "decision", "text": "i {{op}} 2 == 0", "row": 4, "col": 1}, {"id": "ad", "kind": "process", "text": "total = total + i", "row": 5, "col": 0}, {"id": "u", "kind": "process", "text": "i = i + 1", "row": 6, "col": 1}, {"id": "o", "kind": "io", "text": "display total", "row": 7, "col": 1}, {"id": "e", "kind": "terminator", "text": "End", "row": 8, "col": 1}], "edges": [{"from": "s", "to": "t"}, {"from": "t", "to": "z"}, {"from": "z", "to": "d"}, {"from": "d", "to": "de", "label": "Yes"}, {"from": "d", "to": "o", "label": "No", "from_side": "right", "to_side": "right", "bend": {"x": 510, "y": 920}}, {"from": "de", "to": "ad", "label": "Yes", "from_side": "left", "to_side": "top"}, {"from": "de", "to": "u", "label": "No", "from_side": "bottom", "to_side": "top"}, {"from": "ad", "to": "u"}, {"from": "u", "to": "d", "from_side": "bottom", "to_side": "left", "bend": {"x": 30, "y": 850}}, {"from": "o", "to": "e"}], "auto_layout": false}, "blanks": [{"id": "le", "mode": "free_text", "answer": "<=", "accepted": ["<="], "case_sensitive": true, "width_hint": 2}, {"id": "op", "mode": "free_text", "answer": "%", "accepted": ["%"], "case_sensitive": true, "width_hint": 2}, {"id": "init", "mode": "free_text", "answer": "0", "accepted": ["0"], "case_sensitive": true, "width_hint": 2}]}}, {"id": "fc22", "type": "flowchart", "section_id": "fc-nested", "difficulty": 5, "title": "Login attempts", "instructions": "A login lets the user try while the password is wrong AND they have used fewer than 3 attempts. Drawn with two diamonds. Fill in the maximum attempt count and the not-equal operator for the password check.", "topics": ["iteration", "selection", "boolean"], "skills": ["read_flowchart"], "exam_refs": ["OCR_J277_2.2.1"], "primm_phase": "investigate", "concept_level": "extend", "hints": [{"type": "concept", "text": "'Fewer than 3 attempts' is attempts < 3. 'Password wrong' is entry != password."}], "feedback": {"correct": "Right \u2014 two guards: attempts left AND password still wrong.", "incorrect": "attempts < 3 and entry != password."}, "payload": {"flowchart": {"shapes": [{"id": "s", "kind": "terminator", "text": "Start", "row": 0, "col": 1}, {"id": "a", "kind": "process", "text": "attempts = 0", "row": 1, "col": 1}, {"id": "rd", "kind": "io", "text": "input entry", "row": 2, "col": 1}, {"id": "d1", "kind": "decision", "text": "entry {{ne}} password", "row": 3, "col": 1}, {"id": "d2", "kind": "decision", "text": "attempts < {{max}}", "row": 4, "col": 1}, {"id": "u", "kind": "process", "text": "attempts = attempts + 1", "row": 3, "col": 0}, {"id": "ok", "kind": "io", "text": "display \"welcome\"", "row": 4, "col": 2}, {"id": "no", "kind": "io", "text": "display \"locked\"", "row": 5, "col": 1}, {"id": "e", "kind": "terminator", "text": "End", "row": 6, "col": 1}], "edges": [{"from": "s", "to": "a"}, {"from": "a", "to": "rd"}, {"from": "rd", "to": "d1"}, {"from": "d1", "to": "d2", "label": "Yes"}, {"from": "d1", "to": "ok", "label": "No", "from_side": "right", "to_side": "top"}, {"from": "d2", "to": "u", "label": "Yes", "from_side": "left", "to_side": "bottom"}, {"from": "d2", "to": "no", "label": "No", "from_side": "bottom", "to_side": "top"}, {"from": "u", "to": "rd", "from_side": "top", "to_side": "left"}, {"from": "ok", "to": "e", "from_side": "bottom", "to_side": "right"}, {"from": "no", "to": "e"}], "auto_layout": false}, "blanks": [{"id": "ne", "mode": "free_text", "answer": "!=", "accepted": ["!="], "case_sensitive": true, "width_hint": 2}, {"id": "max", "mode": "free_text", "answer": "3", "accepted": ["3"], "case_sensitive": true, "width_hint": 2}]}}, {"id": "fc23", "type": "flowchart", "section_id": "fc-nested", "difficulty": 5, "title": "Grid of stars", "instructions": "The program prints a grid: for each row r (while r is less than the number of rows), it prints one row of stars by looping a column counter c while c is less than the number of columns. Fill in the two loop-continue operators (both strictly-less-than).", "topics": ["iteration", "nested"], "skills": ["read_flowchart"], "exam_refs": ["OCR_J277_2.2.1"], "primm_phase": "investigate", "concept_level": "extend", "hints": [{"type": "concept", "text": "Both loops use strictly-less-than: r < rows for the outer loop, c < cols for the inner loop."}], "feedback": {"correct": "Right \u2014 an inner loop nested inside the outer one.", "incorrect": "Both diamonds use < (strictly less than)."}, "payload": {"flowchart": {"shapes": [{"id": "s", "kind": "terminator", "text": "Start", "row": 0, "col": 1}, {"id": "r0", "kind": "process", "text": "r = 0", "row": 1, "col": 1}, {"id": "od", "kind": "decision", "text": "r {{o1}} rows", "row": 2, "col": 1}, {"id": "c0", "kind": "process", "text": "c = 0", "row": 3, "col": 1}, {"id": "idd", "kind": "decision", "text": "c {{o2}} cols", "row": 4, "col": 1}, {"id": "pr", "kind": "io", "text": "print \"*\"", "row": 5, "col": 1}, {"id": "cu", "kind": "process", "text": "c = c + 1", "row": 6, "col": 1}, {"id": "nl", "kind": "io", "text": "print newline", "row": 5, "col": 2}, {"id": "ru", "kind": "process", "text": "r = r + 1", "row": 6, "col": 2}, {"id": "e", "kind": "terminator", "text": "End", "row": 7, "col": 1}], "edges": [{"from": "s", "to": "r0"}, {"from": "r0", "to": "od"}, {"from": "od", "to": "c0", "label": "Yes"}, {"from": "od", "to": "e", "label": "No", "from_side": "left", "to_side": "left", "bend": {"x": 160, "y": 920}}, {"from": "c0", "to": "idd"}, {"from": "idd", "to": "pr", "label": "Yes"}, {"from": "idd", "to": "nl", "label": "No", "to_side": "top", "from_side": "right"}, {"from": "pr", "to": "cu"}, {"from": "cu", "to": "idd", "from_side": "left", "to_side": "left", "bend": {"x": 200, "y": 560}}, {"from": "nl", "to": "ru"}, {"from": "ru", "to": "od", "from_side": "right", "to_side": "right", "bend": {"x": 680, "y": 320}}], "auto_layout": false}, "blanks": [{"id": "o1", "mode": "free_text", "answer": "<", "accepted": ["<"], "case_sensitive": true, "width_hint": 2}, {"id": "o2", "mode": "free_text", "answer": "<", "accepted": ["<"], "case_sensitive": true, "width_hint": 2}]}}, {"id": "fc24", "type": "flowchart", "section_id": "fc-nested", "difficulty": 5, "title": "Repeated subtraction", "instructions": "To find the remainder of a divided by b, the program subtracts b from a while a is greater than or equal to b. When the loop ends, a holds the remainder. Fill in the loop-continue operator and the value subtracted each pass (it is the variable b).", "topics": ["iteration", "while"], "skills": ["read_flowchart"], "exam_refs": ["OCR_J277_2.2.1"], "primm_phase": "investigate", "concept_level": "extend", "hints": [{"type": "concept", "text": "Keep subtracting while a is still at least b \u2014 that's a >= b. Each pass subtracts b."}], "feedback": {"correct": "Right \u2014 repeated subtraction leaves the remainder in a.", "incorrect": "Loop while a >= b; subtract b each pass."}, "payload": {"flowchart": {"shapes": [{"id": "s", "kind": "terminator", "text": "Start", "row": 0, "col": 0}, {"id": "i", "kind": "io", "text": "input a, b", "row": 1, "col": 0}, {"id": "d", "kind": "decision", "text": "a {{cmp}} b", "row": 2, "col": 0}, {"id": "sub", "kind": "process", "text": "a = a - {{sub}}", "row": 3, "col": 0}, {"id": "o", "kind": "io", "text": "display a", "row": 4, "col": 0}, {"id": "e", "kind": "terminator", "text": "End", "row": 5, "col": 0}], "edges": [{"from": "s", "to": "i"}, {"from": "i", "to": "d"}, {"from": "d", "to": "sub", "label": "Yes"}, {"from": "d", "to": "o", "label": "No", "from_side": "left", "to_side": "left", "bend": {"x": 0, "y": 560}}, {"from": "sub", "to": "d", "from_side": "right", "to_side": "right", "bend": {"x": 260, "y": 320}}, {"from": "o", "to": "e"}], "auto_layout": false}, "blanks": [{"id": "cmp", "mode": "free_text", "answer": ">=", "accepted": [">="], "case_sensitive": true, "width_hint": 2}, {"id": "sub", "mode": "free_text", "answer": "b", "accepted": ["b"], "case_sensitive": true, "width_hint": 2}]}}]}; }
  function packLoopsJourney() { return {"pack_format_version":"0.1","schema_version":"0.1","id":"builtin-loops-journey","title":"Loops: a complete journey","description":"A structured journey through for loops, accumulators, while loops and nested loops. Every section uses every activity type, with several permutations to drill each idea.","audience":"ks4","author":"PyQuiz","tags":["builtin","loops","for","while","nested","iteration"],"settings":{"show_hints":true,"show_solutions":"submission","pass_threshold":0.7,"attempts_per_activity":2,"ask_confidence":false,"sequential":false},"sections":[{"id":"for-range","title":"1 — for loops & range","number":1},{"id":"accumulators","title":"2 — Accumulators","number":2},{"id":"while-loops","title":"3 — while loops","number":3},{"id":"nested-loops","title":"4 — Nested loops","number":4}],"activities":[{"id":"loops-01","type":"predict_output","section_id":"for-range","title":"Counting up","instructions":"Predict exactly what this code prints.","difficulty":1,"topics":["loops","for-range"],"skills":["predict_output"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"predict","concept_level":"introduce","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"direction":"code_to_output","mode":"free_text","code":"for i in range(4):\n    print(i)","answer":"0\n1\n2\n3","accepted_answers":["0\n1\n2\n3"]}},{"id":"loops-02","type":"predict_output","section_id":"for-range","title":"Step of two","instructions":"Predict exactly what this code prints.","difficulty":2,"topics":["loops","for-range"],"skills":["predict_output"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"predict","concept_level":"introduce","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"direction":"code_to_output","mode":"free_text","code":"for i in range(0, 6, 2):\n    print(i)","answer":"0\n2\n4","accepted_answers":["0\n2\n4"]}},{"id":"loops-03","type":"predict_output","section_id":"for-range","title":"How many lines?","instructions":"Choose what this code prints.","difficulty":1,"topics":["loops","for-range"],"skills":["predict_output"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"predict","concept_level":"introduce","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"direction":"code_to_output","mode":"multiple_choice","code":"for i in range(3):\n    print(\"hi\")","options":[{"id":"a","content":"hi\nhi\nhi"},{"id":"b","content":"hi\nhi"},{"id":"c","content":"hi\nhi\nhi\nhi"}],"answer":"a"}},{"id":"loops-04","type":"predict_output","section_id":"for-range","title":"Match the output","instructions":"Which code produces this output?","difficulty":2,"topics":["loops","for-range"],"skills":["predict_output"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"predict","concept_level":"introduce","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"direction":"output_to_code","mode":"multiple_choice","code":"1\n2\n3","options":[{"id":"a","content":"for i in range(1, 4):\n    print(i)"},{"id":"b","content":"for i in range(3):\n    print(i)"},{"id":"c","content":"for i in range(1, 3):\n    print(i)"}],"answer":"a"}},{"id":"loops-05","type":"cloze","section_id":"for-range","title":"Complete the range","instructions":"Fill in the missing code.","difficulty":1,"topics":["loops","for-range"],"skills":["complete_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_template":"for i in {{b1}}(5):\n    print(i)","authoring_template":"for i in {{range}}(5):\n    print(i)","blanks":[{"id":"b1","answer":"range","mode":"free_text","accepted":["range"],"case_sensitive":true,"width_hint":6}]}},{"id":"loops-06","type":"cloze","section_id":"for-range","title":"Choose the keyword","instructions":"Pick the right option for each gap.","difficulty":1,"topics":["loops","for-range"],"skills":["complete_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_template":"{{b1}} i in range(3):\n    print(i)","authoring_template":"{{for}} i in range(3):\n    print(i)","blanks":[{"id":"b1","answer":"for","mode":"select","options":["for","while","if"],"case_sensitive":true,"width_hint":5}]}},{"id":"loops-07","type":"cloze","section_id":"for-range","title":"Build the loop header","instructions":"Drag words from the bank into the gaps.","difficulty":2,"topics":["loops","for-range"],"skills":["complete_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_template":"for {{b1}} in {{b2}}(3):\n    print({{b3}})","authoring_template":"for {{i}} in {{range}}(3):\n    print({{i}})","blanks":[{"id":"b1","answer":"i","mode":"bank","case_sensitive":true},{"id":"b2","answer":"range","mode":"bank","case_sensitive":true},{"id":"b3","answer":"i","mode":"bank","case_sensitive":true}],"shared_pool":{"items":["i","i","range","for","while"],"has_distractors":true,"single_use":true}}},{"id":"loops-08","type":"parsons","section_id":"for-range","title":"Order a simple loop","instructions":"Drag the lines into the correct order.","difficulty":1,"topics":["loops","for-range"],"skills":["sequence_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"canonical_code":"for i in range(3):\n    print(i)","distractors":"","swap_groups":[],"extra_accepted_orderings":[],"indent_size_spaces":4}},{"id":"loops-09","type":"parsons","section_id":"for-range","title":"Loop with a distractor","instructions":"Order the correct lines; drag the wrong ones to the bin.","difficulty":2,"topics":["loops","for-range"],"skills":["sequence_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"canonical_code":"for i in range(5):\n    print(i)","distractors":"print(range(5))\nfor i in 5:","swap_groups":[],"extra_accepted_orderings":[],"indent_size_spaces":4}},{"id":"loops-10","type":"parsons","section_id":"for-range","title":"Two prints in the body","instructions":"Order the lines (some are interchangeable).","difficulty":2,"topics":["loops","for-range"],"skills":["sequence_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"canonical_code":"for i in range(2):\n    print(\"a\")\n    print(\"b\")","distractors":"","swap_groups":[[2,3]],"extra_accepted_orderings":[],"indent_size_spaces":4}},{"id":"loops-11","type":"trace_table","section_id":"for-range","title":"Trace the counter","instructions":"Fill in the trace table. A blank cell means 'no change'.","difficulty":2,"topics":["loops","for-range"],"skills":["trace_execution"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"consolidate","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code":"for i in range(3):\n    print(i)","undefined_token":"—","columns":[{"id":"i","label":"i","kind":"variable"},{"id":"out","label":"Output","kind":"output"}],"rows":[{"line":1,"values":{"i":"0","out":""}},{"line":2,"values":{"i":"","out":"0"}},{"line":1,"values":{"i":"1","out":""}},{"line":2,"values":{"i":"","out":"1"}},{"line":1,"values":{"i":"2","out":""}},{"line":2,"values":{"i":"","out":"2"}}]}},{"id":"loops-12","type":"flowchart","section_id":"for-range","title":"Loop flowchart","instructions":"This flowchart should OUTPUT 0, 1, 2, 3, 4 (one per line) and then stop. Fill in the starting value and the limit so it does.","difficulty":2,"topics":["loops","for-range"],"skills":["read_flowchart"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"consolidate","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"flowchart":{"shapes":[{"id":"s","kind":"terminator","text":"Start","row":0,"col":1},{"id":"a","kind":"process","text":"i = {{init}}","row":1,"col":1},{"id":"d","kind":"decision","text":"i < {{lim}}?","row":2,"col":1},{"id":"p","kind":"io","text":"OUTPUT i","row":3,"col":0},{"id":"u","kind":"process","text":"i = i + 1","row":4,"col":0},{"id":"e","kind":"terminator","text":"End","row":3,"col":2}],"edges":[{"from":"s","to":"a"},{"from":"a","to":"d"},{"from":"d","to":"p","label":"Yes"},{"from":"d","to":"e","label":"No"},{"from":"p","to":"u"},{"from":"u","to":"d"}]},"blanks":[{"id":"init","mode":"free_text","answer":"0","accepted":["0"],"case_sensitive":true,"width_hint":2},{"id":"lim","mode":"free_text","answer":"5","accepted":["5"],"case_sensitive":true,"width_hint":2}]}},{"id":"loops-13","type":"spot_the_bug","section_id":"for-range","title":"Why won't it run?","instructions":"Find the buggy line and fix it.","difficulty":1,"topics":["loops","for-range"],"skills":["debug_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"modify","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_lines":["for i in range(3)","    print(i)"],"expected_behaviour":"Prints 0 1 2.","actual_behaviour":"Crashes — syntax error on line 1.","mode":"select_and_fix","constraint":"in_place","bugs":[{"line":1,"category":"logic","fix":"for i in range(3):","accepted_fixes":["for i in range(3):"]}]}},{"id":"loops-14","type":"spot_the_bug","section_id":"for-range","title":"Print 1 to 4","instructions":"Click the line that contains the bug (no fix needed).","difficulty":2,"topics":["loops","for-range"],"skills":["debug_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"modify","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_lines":["for i in range(1, 4):","    print(i)"],"expected_behaviour":"Should print 1 2 3 4.","actual_behaviour":"Only prints 1 2 3 — the range stops too early.","mode":"select_line","constraint":"in_place","bugs":[{"line":1,"category":"logic","fix":""}]}},{"id":"loops-15","type":"spot_the_bug","section_id":"for-range","title":"Each number once","instructions":"Remove the line that shouldn't be there.","difficulty":2,"topics":["loops","for-range"],"skills":["debug_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"modify","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_lines":["for i in range(3):","    print(i)","    print(i)"],"expected_behaviour":"Each number once.","actual_behaviour":"Each number is printed twice.","mode":"select_line","constraint":"remove_line","solution_code":"for i in range(3):\n    print(i)"}},{"id":"loops-16","type":"modify","section_id":"for-range","title":"Count to ten","instructions":"Change one line so the program does what's asked.","difficulty":1,"topics":["loops","for-range"],"skills":["modify_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"modify","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_lines":["for i in range(5):","    print(i)"],"expected_behaviour":"Prints 0 up to 9.","actual_behaviour":"Prints 0 up to 4.","mode":"select_and_fix","constraint":"in_place","bugs":[{"line":1,"category":"logic","fix":"for i in range(10):","accepted_fixes":["for i in range(10):"]}]}},{"id":"loops-17","type":"modify","section_id":"for-range","title":"Also print double","instructions":"Add a line so the program does what's asked.","difficulty":2,"topics":["loops","for-range"],"skills":["modify_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"modify","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_lines":["for i in range(3):","    print(i)"],"expected_behaviour":"Prints i then i*2 each pass.","actual_behaviour":"Only prints i.","mode":"select_and_fix","constraint":"add_line","bugs":[{"line":2,"category":"logic","fix":"    print(i * 2)","accepted_fixes":["    print(i * 2)"]}]}},{"id":"loops-18","type":"modify","section_id":"for-range","title":"Start from one","instructions":"Find the line that needs changing, click it, and edit it so the code matches the Expected behaviour.","difficulty":2,"topics":["loops","for-range"],"skills":["modify_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"modify","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_lines":["for i in range(5):","    print(i)"],"expected_behaviour":"Prints 1 up to 5.","actual_behaviour":"Prints 0 up to 4.","mode":"rewrite","constraint":"in_place","bugs":[{"line":1,"category":"logic","fix":"for i in range(1, 6):","accepted_fixes":["for i in range(1, 6):"]}]}},{"id":"loops-19","type":"testing","section_id":"for-range","title":"Test a counter function","instructions":"Use the function above to work out the test data and types for the table below.","difficulty":3,"topics":["loops","for-range"],"skills":["design_test_data"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"extend","estimated_time_seconds":90,"hints":[{"type":"concept","text":"Where the value is given, work out the type of test. Where the type is given, give a value of that kind. Boundary sits at the edge of 0..100 (0 or -1); Invalid is in-type but out of range (rejected with NOT VALID); Erroneous is the wrong type, e.g. \"two\"."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code":"def count_up(n):\n    if n < 0 or n > 100:\n        print(\"NOT VALID\")\n        return\n    for i in range(n):\n        print(i)","output_type":"lines","input_columns":[{"id":"n","label":"n","type":"int","min":0,"max":100}],"rows":[{"values":{"n":"4","test_type":"","expected_output":"0\n1\n2\n3"}},{"values":{"n":"","test_type":"boundary","expected_output":"(no output)"}},{"values":{"n":"250","test_type":"","expected_output":"NOT VALID"}},{"values":{"n":"","test_type":"erroneous","expected_output":"TypeError"}}]}},{"id":"loops-20","type":"starter_challenge","section_id":"for-range","title":"Print a times table","instructions":"Write code that prints the 3 times table from 3 up to 30 (3, 6, 9, ...).","difficulty":2,"topics":["loops","for-range"],"skills":["compose_program"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"make","concept_level":"extend","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"starter_code":"# print the 3 times table\n","example_calls":[{"call":"(prints 3 to 30 step 3)","expected":"3\n6\n9\n12\n15\n18\n21\n24\n27\n30"}],"model_solution":"for i in range(3, 31, 3):\n    print(i)","self_check_guidance":"Check it starts at 3 and ends at 30."}},{"id":"loops-21","type":"predict_output","section_id":"accumulators","title":"Sum of a range","instructions":"Predict exactly what this code prints.","difficulty":2,"topics":["loops","accumulators"],"skills":["predict_output"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"predict","concept_level":"introduce","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"direction":"code_to_output","mode":"free_text","code":"total = 0\nfor i in range(1, 4):\n    total = total + i\nprint(total)","answer":"6","accepted_answers":["6"]}},{"id":"loops-22","type":"predict_output","section_id":"accumulators","title":"Build a string","instructions":"Predict exactly what this code prints.","difficulty":3,"topics":["loops","accumulators"],"skills":["predict_output"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"predict","concept_level":"introduce","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"direction":"code_to_output","mode":"free_text","code":"word = \"\"\nfor c in \"abc\":\n    word = c + word\nprint(word)","answer":"cba","accepted_answers":["cba"]}},{"id":"loops-23","type":"predict_output","section_id":"accumulators","title":"Final total","instructions":"Choose what this code prints.","difficulty":2,"topics":["loops","accumulators"],"skills":["predict_output"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"predict","concept_level":"introduce","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"direction":"code_to_output","mode":"multiple_choice","code":"total = 0\nfor i in range(5):\n    total += 2\nprint(total)","options":[{"id":"a","content":"10"},{"id":"b","content":"8"},{"id":"c","content":"5"}],"answer":"a"}},{"id":"loops-24","type":"predict_output","section_id":"accumulators","title":"Which builds 15?","instructions":"Which code produces this output?","difficulty":3,"topics":["loops","accumulators"],"skills":["predict_output"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"predict","concept_level":"introduce","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"direction":"output_to_code","mode":"multiple_choice","code":"15","options":[{"id":"a","content":"t = 0\nfor i in range(1, 6):\n    t += i\nprint(t)"},{"id":"b","content":"t = 0\nfor i in range(5):\n    t += i\nprint(t)"},{"id":"c","content":"print(15.0)"}],"answer":"a"}},{"id":"loops-25","type":"cloze","section_id":"accumulators","title":"Accumulate the total","instructions":"Fill in the missing code.","difficulty":2,"topics":["loops","accumulators"],"skills":["complete_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_template":"total = 0\nfor i in range(4):\n    total = total {{b1}} i\nprint(total)","authoring_template":"total = 0\nfor i in range(4):\n    total = total {{+}} i\nprint(total)","blanks":[{"id":"b1","answer":"+","mode":"free_text","accepted":["+"],"case_sensitive":true,"width_hint":2}]}},{"id":"loops-26","type":"cloze","section_id":"accumulators","title":"Pick the operator","instructions":"Pick the right option for each gap.","difficulty":2,"topics":["loops","accumulators"],"skills":["complete_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_template":"total = 0\nfor i in range(4):\n    total {{b1}} i\nprint(total)","authoring_template":"total = 0\nfor i in range(4):\n    total {{+=}} i\nprint(total)","blanks":[{"id":"b1","answer":"+=","mode":"select","options":["+=","-=","=="],"case_sensitive":true,"width_hint":3}]}},{"id":"loops-27","type":"cloze","section_id":"accumulators","title":"Build the accumulator","instructions":"Drag words from the bank into the gaps.","difficulty":2,"topics":["loops","accumulators"],"skills":["complete_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_template":"{{b1}} = 0\nfor i in range(3):\n    total = {{b2}} + i\nprint(total)","authoring_template":"{{total}} = 0\nfor i in range(3):\n    total = {{total}} + i\nprint(total)","blanks":[{"id":"b1","answer":"total","mode":"bank","case_sensitive":true},{"id":"b2","answer":"total","mode":"bank","case_sensitive":true}],"shared_pool":{"items":["total","total","i","sum","count"],"has_distractors":true,"single_use":true}}},{"id":"loops-28","type":"parsons","section_id":"accumulators","title":"Order the accumulator","instructions":"Drag the lines into the correct order.","difficulty":2,"topics":["loops","accumulators"],"skills":["sequence_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"canonical_code":"total = 0\nfor i in range(5):\n    total = total + i\nprint(total)","distractors":"","swap_groups":[],"extra_accepted_orderings":[],"indent_size_spaces":4}},{"id":"loops-29","type":"parsons","section_id":"accumulators","title":"Accumulator with distractors","instructions":"Order the correct lines; drag the wrong ones to the bin.","difficulty":3,"topics":["loops","accumulators"],"skills":["sequence_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"canonical_code":"total = 0\nfor i in range(5):\n    total = total + i\nprint(total)","distractors":"total = total + i\nprint(i)","swap_groups":[],"extra_accepted_orderings":[],"indent_size_spaces":4}},{"id":"loops-30","type":"parsons","section_id":"accumulators","title":"Two accumulators","instructions":"Order the lines (some are interchangeable).","difficulty":3,"topics":["loops","accumulators"],"skills":["sequence_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"canonical_code":"a = 0\nb = 0\nfor i in range(3):\n    a = a + i\n    b = b + 1\nprint(a)\nprint(b)","distractors":"","swap_groups":[[1,2],[4,5]],"extra_accepted_orderings":[],"indent_size_spaces":4}},{"id":"loops-31","type":"trace_table","section_id":"accumulators","title":"Trace the total","instructions":"Fill in the trace table. A blank cell means 'no change'.","difficulty":3,"topics":["loops","accumulators"],"skills":["trace_execution"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"consolidate","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code":"total = 0\nfor i in range(3):\n    total = total + i\nprint(total)","undefined_token":"—","columns":[{"id":"i","label":"i","kind":"variable"},{"id":"total","label":"total","kind":"variable"},{"id":"out","label":"Output","kind":"output"}],"rows":[{"line":1,"values":{"i":"—","total":"0","out":""}},{"line":3,"values":{"i":"0","total":"0","out":""}},{"line":3,"values":{"i":"1","total":"1","out":""}},{"line":3,"values":{"i":"2","total":"3","out":""}},{"line":4,"values":{"i":"","total":"","out":"3"}}]}},{"id":"loops-32","type":"flowchart","section_id":"accumulators","title":"Accumulator flowchart","instructions":"Looping i over 0, 1, 2, this should keep a running total and OUTPUT 3 at the end (0 + 1 + 2). Fill in the total's starting value and the amount added each pass.","difficulty":3,"topics":["loops","accumulators"],"skills":["read_flowchart"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"consolidate","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"flowchart":{"shapes":[{"id":"s","kind":"terminator","text":"Start","row":0,"col":1},{"id":"t","kind":"process","text":"total = {{init}}","row":1,"col":1},{"id":"d","kind":"decision","text":"more items?","row":2,"col":1},{"id":"u","kind":"process","text":"total = total + {{step}}","row":3,"col":0},{"id":"o","kind":"io","text":"OUTPUT total","row":3,"col":2},{"id":"e","kind":"terminator","text":"End","row":4,"col":2}],"edges":[{"from":"s","to":"t"},{"from":"t","to":"d"},{"from":"d","to":"u","label":"Yes"},{"from":"d","to":"o","label":"No"},{"from":"u","to":"d"},{"from":"o","to":"e"}]},"blanks":[{"id":"init","mode":"free_text","answer":"0","accepted":["0"],"case_sensitive":true,"width_hint":2},{"id":"step","mode":"free_text","answer":"i","accepted":["i"],"case_sensitive":true,"width_hint":2}]}},{"id":"loops-33","type":"spot_the_bug","section_id":"accumulators","title":"Fix the total","instructions":"Find the buggy line and fix it.","difficulty":2,"topics":["loops","accumulators"],"skills":["debug_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"modify","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_lines":["for i in range(3):","    total = total + i","print(total)"],"expected_behaviour":"Prints 3.","actual_behaviour":"Crashes — total is used before it exists.","mode":"select_and_fix","constraint":"in_place","bugs":[{"line":1,"category":"logic","fix":"total = 0","accepted_fixes":["total = 0"]}]}},{"id":"loops-34","type":"spot_the_bug","section_id":"accumulators","title":"The total looks wrong","instructions":"Click the line that contains the bug (no fix needed).","difficulty":2,"topics":["loops","accumulators"],"skills":["debug_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"modify","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_lines":["total = 0","for i in range(4):","    total = 0","    total = total + i","print(total)"],"expected_behaviour":"Should sum the numbers.","actual_behaviour":"Always prints the last number — total keeps being reset.","mode":"select_line","constraint":"in_place","bugs":[{"line":3,"category":"logic","fix":""}]}},{"id":"loops-35","type":"spot_the_bug","section_id":"accumulators","title":"Summed too much","instructions":"Remove the line that shouldn't be there.","difficulty":3,"topics":["loops","accumulators"],"skills":["debug_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"modify","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_lines":["total = 0","for i in range(4):","    total = total + i","    total = total + i","print(total)"],"expected_behaviour":"Sum once.","actual_behaviour":"Adds each number twice.","mode":"select_line","constraint":"remove_line","solution_code":"total = 0\nfor i in range(4):\n    total = total + i\nprint(total)"}},{"id":"loops-36","type":"modify","section_id":"accumulators","title":"Sum to 100","instructions":"Change one line so the program does what's asked.","difficulty":2,"topics":["loops","accumulators"],"skills":["modify_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"modify","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_lines":["total = 0","for i in range(1, 11):","    total = total + i","print(total)"],"expected_behaviour":"Sums 1..100.","actual_behaviour":"Sums 1..10.","mode":"select_and_fix","constraint":"in_place","bugs":[{"line":2,"category":"logic","fix":"for i in range(1, 101):","accepted_fixes":["for i in range(1, 101):"]}]}},{"id":"loops-37","type":"modify","section_id":"accumulators","title":"Count as well as sum","instructions":"Add a line so the program does what's asked.","difficulty":3,"topics":["loops","accumulators"],"skills":["modify_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"modify","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_lines":["total = 0","count = 0","for i in range(5):","    total = total + i","print(total)","print(count)"],"expected_behaviour":"Prints total then count.","actual_behaviour":"count stays 0.","mode":"select_and_fix","constraint":"add_line","bugs":[{"line":4,"category":"logic","fix":"    count = count + 1","accepted_fixes":["    count = count + 1"]}]}},{"id":"loops-38","type":"modify","section_id":"accumulators","title":"Multiply instead","instructions":"Find the line that needs changing, click it, and edit it so the code matches the Expected behaviour.","difficulty":3,"topics":["loops","accumulators"],"skills":["modify_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"modify","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"The seed is already 1. Find the line inside the loop that combines the running total with i, and change + to the right operator."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_lines":["product = 1","for i in range(1, 5):","    product = product + i","print(product)"],"expected_behaviour":"Multiplies the numbers 1 to 4 together and prints 24 (1 x 2 x 3 x 4).","actual_behaviour":"The loop body still uses +, so it prints 11 instead of multiplying.","mode":"rewrite","constraint":"in_place","bugs":[{"line":3,"category":"logic","fix":"    product = product * i","accepted_fixes":["    product = product * i","    product = product*i","    product *= i"]}]}},{"id":"loops-39","type":"testing","section_id":"accumulators","title":"Test a sum function","instructions":"Use the function above to work out the test data and types for the table below.","difficulty":3,"topics":["loops","accumulators"],"skills":["design_test_data"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"extend","estimated_time_seconds":90,"hints":[{"type":"concept","text":"Where the value is given, name its type of test. Where the type is given, supply a value of that kind. Boundary is the edge of 1..1000 (1 or 0); Invalid is in-type but out of range (returns -1); Erroneous is the wrong type, e.g. 3.5."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code":"def sum_to(n):\n    if n < 1 or n > 1000:\n        return -1\n    total = 0\n    for i in range(1, n + 1):\n        total = total + i\n    return total","output_type":"number","input_columns":[{"id":"n","label":"n","type":"int","min":1,"max":1000}],"rows":[{"values":{"n":"5","test_type":"","expected_output":"15"}},{"values":{"n":"","test_type":"boundary","expected_output":"1"}},{"values":{"n":"","test_type":"invalid","expected_output":"-1"}},{"values":{"n":"3.5","test_type":"","expected_output":"TypeError"}}]}},{"id":"loops-40","type":"starter_challenge","section_id":"accumulators","title":"Average of five numbers","instructions":"Ask for five numbers (or use a list), add them in a loop and print the average.","difficulty":3,"topics":["loops","accumulators"],"skills":["compose_program"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"make","concept_level":"extend","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"starter_code":"# sum five numbers and print the average\n","example_calls":[{"call":"nums = [2, 4, 6, 8, 10]","expected":"6.0"}],"model_solution":"nums = [2, 4, 6, 8, 10]\ntotal = 0\nfor x in nums:\n    total = total + x\nprint(total / len(nums))","self_check_guidance":"Check the total is divided by how many numbers there are."}},{"id":"loops-41","type":"predict_output","section_id":"while-loops","title":"Count down","instructions":"Predict exactly what this code prints.","difficulty":2,"topics":["loops","while-loops"],"skills":["predict_output"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"predict","concept_level":"introduce","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"direction":"code_to_output","mode":"free_text","code":"n = 3\nwhile n > 0:\n    print(n)\n    n = n - 1","answer":"3\n2\n1","accepted_answers":["3\n2\n1"]}},{"id":"loops-42","type":"predict_output","section_id":"while-loops","title":"Doubling","instructions":"Predict exactly what this code prints.","difficulty":3,"topics":["loops","while-loops"],"skills":["predict_output"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"predict","concept_level":"introduce","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"direction":"code_to_output","mode":"free_text","code":"x = 1\nwhile x < 10:\n    x = x * 2\nprint(x)","answer":"16","accepted_answers":["16"]}},{"id":"loops-43","type":"predict_output","section_id":"while-loops","title":"How many times?","instructions":"Choose what this code prints.","difficulty":2,"topics":["loops","while-loops"],"skills":["predict_output"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"predict","concept_level":"introduce","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"direction":"code_to_output","mode":"multiple_choice","code":"n = 5\nwhile n > 0:\n    print(\"*\")\n    n = n - 1","options":[{"id":"a","content":"* printed 5 times"},{"id":"b","content":"* printed 4 times"},{"id":"c","content":"forever"}],"answer":"a"}},{"id":"loops-44","type":"predict_output","section_id":"while-loops","title":"Which counts down from 3?","instructions":"Which code produces this output?","difficulty":2,"topics":["loops","while-loops"],"skills":["predict_output"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"predict","concept_level":"introduce","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"direction":"output_to_code","mode":"multiple_choice","code":"3\n2\n1","options":[{"id":"a","content":"n = 3\nwhile n > 0:\n    print(n)\n    n = n - 1"},{"id":"b","content":"for n in range(3):\n    print(n)"},{"id":"c","content":"n = 3\nwhile n > 0:\n    print(n)"}],"answer":"a"}},{"id":"loops-45","type":"cloze","section_id":"while-loops","title":"Complete the while","instructions":"Fill in the missing code.","difficulty":2,"topics":["loops","while-loops"],"skills":["complete_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_template":"n = 5\n{{b1}} n > 0:\n    print(n)\n    n = n - 1","authoring_template":"n = 5\n{{while}} n > 0:\n    print(n)\n    n = n - 1","blanks":[{"id":"b1","answer":"while","mode":"free_text","accepted":["while"],"case_sensitive":true,"width_hint":6}]}},{"id":"loops-46","type":"cloze","section_id":"while-loops","title":"Pick the condition","instructions":"Pick the right option for each gap.","difficulty":2,"topics":["loops","while-loops"],"skills":["complete_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_template":"n = 0\nwhile n {{b1}} 5:\n    print(n)\n    n = n + 1","authoring_template":"n = 0\nwhile n {{<}} 5:\n    print(n)\n    n = n + 1","blanks":[{"id":"b1","answer":"<","mode":"select","options":["<",">","=="],"case_sensitive":true,"width_hint":2}]}},{"id":"loops-47","type":"cloze","section_id":"while-loops","title":"Build the while loop","instructions":"Drag words from the bank into the gaps.","difficulty":3,"topics":["loops","while-loops"],"skills":["complete_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_template":"n = 3\n{{b1}} n {{b2}} 0:\n    print(n)\n    n = n - 1","authoring_template":"n = 3\n{{while}} n {{>}} 0:\n    print(n)\n    n = n - 1","blanks":[{"id":"b1","answer":"while","mode":"bank","case_sensitive":true},{"id":"b2","answer":">","mode":"bank","case_sensitive":true}],"shared_pool":{"items":["while",">","for","<"],"has_distractors":true,"single_use":true}}},{"id":"loops-48","type":"parsons","section_id":"while-loops","title":"Order the countdown","instructions":"Drag the lines into the correct order.","difficulty":2,"topics":["loops","while-loops"],"skills":["sequence_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"canonical_code":"n = 3\nwhile n > 0:\n    print(n)\n    n = n - 1","distractors":"","swap_groups":[],"extra_accepted_orderings":[],"indent_size_spaces":4}},{"id":"loops-49","type":"parsons","section_id":"while-loops","title":"While with distractors","instructions":"Order the correct lines; drag the wrong ones to the bin.","difficulty":3,"topics":["loops","while-loops"],"skills":["sequence_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"canonical_code":"n = 3\nwhile n > 0:\n    print(n)\n    n = n - 1","distractors":"n = n + 1\nfor n in range(3):","swap_groups":[],"extra_accepted_orderings":[],"indent_size_spaces":4}},{"id":"loops-50","type":"parsons","section_id":"while-loops","title":"Print and decrement","instructions":"Order the lines (some are interchangeable).","difficulty":3,"topics":["loops","while-loops"],"skills":["sequence_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"canonical_code":"n = 5\nwhile n > 0:\n    print(n)\n    n = n - 1\nprint(\"done\")","distractors":"","swap_groups":[[3,4]],"extra_accepted_orderings":[],"indent_size_spaces":4}},{"id":"loops-51","type":"trace_table","section_id":"while-loops","title":"Trace the countdown","instructions":"Fill in the trace table. A blank cell means 'no change'.","difficulty":3,"topics":["loops","while-loops"],"skills":["trace_execution"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"consolidate","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code":"n = 3\nwhile n > 0:\n    print(n)\n    n = n - 1","undefined_token":"—","columns":[{"id":"n","label":"n","kind":"variable"},{"id":"out","label":"Output","kind":"output"}],"rows":[{"line":1,"values":{"n":"3","out":""}},{"line":3,"values":{"n":"","out":"3"}},{"line":4,"values":{"n":"2","out":""}},{"line":3,"values":{"n":"","out":"2"}},{"line":4,"values":{"n":"1","out":""}},{"line":3,"values":{"n":"","out":"1"}},{"line":4,"values":{"n":"0","out":""}}]}},{"id":"loops-52","type":"flowchart","section_id":"while-loops","title":"While-loop flowchart","instructions":"Halving with integer division (// 2), this should OUTPUT 16, 8, 4, 2, 1 and then stop. Fill in the start value and the value the loop keeps going while n is greater than.","difficulty":3,"topics":["loops","while-loops"],"skills":["read_flowchart"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"consolidate","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"flowchart":{"shapes":[{"id":"s","kind":"terminator","text":"Start","row":0,"col":1},{"id":"a","kind":"process","text":"n = {{init}}","row":1,"col":1},{"id":"d","kind":"decision","text":"n > {{stop}}?","row":2,"col":1},{"id":"u","kind":"process","text":"n = n // 2","row":3,"col":0},{"id":"o","kind":"io","text":"OUTPUT n","row":3,"col":2},{"id":"e","kind":"terminator","text":"End","row":4,"col":2}],"edges":[{"from":"s","to":"a"},{"from":"a","to":"d"},{"from":"d","to":"u","label":"Yes"},{"from":"d","to":"o","label":"No"},{"from":"u","to":"d"},{"from":"o","to":"e"}]},"blanks":[{"id":"init","mode":"free_text","answer":"16","accepted":["16"],"case_sensitive":true,"width_hint":3},{"id":"stop","mode":"free_text","answer":"1","accepted":["1"],"case_sensitive":true,"width_hint":2}]}},{"id":"loops-53","type":"spot_the_bug","section_id":"while-loops","title":"Why won't it stop?","instructions":"Find the buggy line and fix it.","difficulty":3,"topics":["loops","while-loops"],"skills":["debug_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"modify","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_lines":["n = 3","while n > 0:","    print(n)"],"expected_behaviour":"Prints 3 2 1.","actual_behaviour":"Infinite loop — n never changes.","mode":"select_and_fix","constraint":"in_place","bugs":[{"line":3,"category":"logic","fix":"    n = n - 1","accepted_fixes":["    n = n - 1"]}]}},{"id":"loops-54","type":"spot_the_bug","section_id":"while-loops","title":"It never counts up","instructions":"Click the line that contains the bug (no fix needed).","difficulty":3,"topics":["loops","while-loops"],"skills":["debug_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"modify","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_lines":["n = 0","while n < 5:","    n = n - 1","    print(n)"],"expected_behaviour":"Should count up to 5.","actual_behaviour":"Infinite loop — n goes the wrong way.","mode":"select_line","constraint":"in_place","bugs":[{"line":3,"category":"logic","fix":""}]}},{"id":"loops-55","type":"spot_the_bug","section_id":"while-loops","title":"It skips numbers","instructions":"Remove the line that shouldn't be there.","difficulty":3,"topics":["loops","while-loops"],"skills":["debug_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"modify","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_lines":["n = 3","while n > 0:","    print(n)","    n = n - 1","    n = n - 1"],"expected_behaviour":"Print 3 2 1.","actual_behaviour":"Skips numbers — decrements twice per pass.","mode":"select_line","constraint":"remove_line","solution_code":"n = 3\nwhile n > 0:\n    print(n)\n    n = n - 1"}},{"id":"loops-56","type":"modify","section_id":"while-loops","title":"Stop at zero","instructions":"Change one line so the program does what's asked.","difficulty":2,"topics":["loops","while-loops"],"skills":["modify_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"modify","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_lines":["n = 5","while n > 2:","    print(n)","    n = n - 1"],"expected_behaviour":"Counts down to 1.","actual_behaviour":"Stops at 3.","mode":"select_and_fix","constraint":"in_place","bugs":[{"line":2,"category":"logic","fix":"while n > 0:","accepted_fixes":["while n > 0:"]}]}},{"id":"loops-57","type":"modify","section_id":"while-loops","title":"Add the update","instructions":"Add a line so the program does what's asked.","difficulty":2,"topics":["loops","while-loops"],"skills":["modify_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"modify","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_lines":["n = 4","while n > 0:","    print(n)"],"expected_behaviour":"Counts down 4 3 2 1.","actual_behaviour":"Infinite loop.","mode":"select_and_fix","constraint":"add_line","bugs":[{"line":3,"category":"logic","fix":"    n = n - 1","accepted_fixes":["    n = n - 1"]}]}},{"id":"loops-58","type":"modify","section_id":"while-loops","title":"Count up not down","instructions":"Find the line that needs changing, click it, and edit it so the code matches the Expected behaviour.","difficulty":2,"topics":["loops","while-loops"],"skills":["modify_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"modify","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_lines":["n = 0","while n < 5:","    print(n)","    n = n - 1"],"expected_behaviour":"Counts 0 to 4.","actual_behaviour":"Infinite loop downward.","mode":"rewrite","constraint":"in_place","bugs":[{"line":4,"category":"logic","fix":"    n = n + 1","accepted_fixes":["    n = n + 1"]}]}},{"id":"loops-59","type":"testing","section_id":"while-loops","title":"Test a countdown function","instructions":"Use the function above to work out the test data and types for the table below.","difficulty":3,"topics":["loops","while-loops"],"skills":["design_test_data"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"extend","estimated_time_seconds":90,"hints":[{"type":"concept","text":"Two rows give the value (name the type of test); two give the type (supply a value). Boundary is the edge of 0..100 (0 or -1); Invalid is in-type but out of range, e.g. 250 (rejected with NOT VALID)."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code":"def countdown(n):\n    if n < 0 or n > 100:\n        print(\"NOT VALID\")\n        return\n    while n > 0:\n        print(n)\n        n = n - 1","output_type":"lines","input_columns":[{"id":"n","label":"n","type":"int","min":0,"max":100}],"rows":[{"values":{"n":"3","test_type":"","expected_output":"3\n2\n1"}},{"values":{"n":"50","test_type":"","expected_output":"50\n49\n... (down to 1)"}},{"values":{"n":"","test_type":"boundary","expected_output":"(no output)"}},{"values":{"n":"","test_type":"invalid","expected_output":"NOT VALID"}}]}},{"id":"loops-60","type":"starter_challenge","section_id":"while-loops","title":"Keep halving","instructions":"Start from a number and keep halving it (integer division) until it reaches 0, printing each step.","difficulty":3,"topics":["loops","while-loops"],"skills":["compose_program"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"make","concept_level":"extend","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"starter_code":"n = 100\n# keep halving until 0\n","example_calls":[{"call":"n = 8","expected":"8\n4\n2\n1\n0"}],"model_solution":"n = 8\nwhile n > 0:\n    print(n)\n    n = n // 2\nprint(0)","self_check_guidance":"Make sure the loop ends — n must shrink each pass."}},{"id":"loops-61","type":"predict_output","section_id":"nested-loops","title":"Grid of pairs","instructions":"Predict exactly what this code prints.","difficulty":3,"topics":["loops","nested-loops"],"skills":["predict_output"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"predict","concept_level":"introduce","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"direction":"code_to_output","mode":"free_text","code":"for i in range(2):\n    for j in range(2):\n        print(i, j)","answer":"0 0\n0 1\n1 0\n1 1","accepted_answers":["0 0\n0 1\n1 0\n1 1"]}},{"id":"loops-62","type":"predict_output","section_id":"nested-loops","title":"Rows of stars","instructions":"Predict exactly what this code prints.","difficulty":4,"topics":["loops","nested-loops"],"skills":["predict_output"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"predict","concept_level":"introduce","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"direction":"code_to_output","mode":"free_text","code":"for i in range(3):\n    for j in range(i + 1):\n        print(\"*\", end=\"\")\n    print()","answer":"*\n**\n***","accepted_answers":["*\n**\n***"]}},{"id":"loops-63","type":"predict_output","section_id":"nested-loops","title":"How many prints?","instructions":"Choose what this code prints.","difficulty":3,"topics":["loops","nested-loops"],"skills":["predict_output"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"predict","concept_level":"introduce","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"direction":"code_to_output","mode":"multiple_choice","code":"for i in range(3):\n    for j in range(4):\n        print(\"x\")","options":[{"id":"a","content":"12 times"},{"id":"b","content":"7 times"},{"id":"c","content":"3 times"}],"answer":"a"}},{"id":"loops-64","type":"predict_output","section_id":"nested-loops","title":"Which prints the grid?","instructions":"Which code produces this output?","difficulty":3,"topics":["loops","nested-loops"],"skills":["predict_output"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"predict","concept_level":"introduce","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"direction":"output_to_code","mode":"multiple_choice","code":"0 0\n0 1\n1 0\n1 1","options":[{"id":"a","content":"for i in range(2):\n    for j in range(2):\n        print(i, j)"},{"id":"b","content":"for i in range(2):\n    print(i, i)"},{"id":"c","content":"for i in range(4):\n    print(i)"}],"answer":"a"}},{"id":"loops-65","type":"cloze","section_id":"nested-loops","title":"Complete the inner loop","instructions":"Fill in the missing code.","difficulty":3,"topics":["loops","nested-loops"],"skills":["complete_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_template":"for i in range(3):\n    for {{b1}} in range(2):\n        print(i, j)","authoring_template":"for i in range(3):\n    for {{j}} in range(2):\n        print(i, j)","blanks":[{"id":"b1","answer":"j","mode":"free_text","accepted":["j"],"case_sensitive":true,"width_hint":2}]}},{"id":"loops-66","type":"cloze","section_id":"nested-loops","title":"Which range for a square?","instructions":"Pick the right option for each gap.","difficulty":3,"topics":["loops","nested-loops"],"skills":["complete_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_template":"for i in range(n):\n    for j in range({{b1}}):\n        print(\"*\")","authoring_template":"for i in range(n):\n    for j in range({{n}}):\n        print(\"*\")","blanks":[{"id":"b1","answer":"n","mode":"select","options":["n","i","j"],"case_sensitive":true,"width_hint":2}]}},{"id":"loops-67","type":"cloze","section_id":"nested-loops","title":"Build the nested loop","instructions":"Drag words from the bank into the gaps.","difficulty":3,"topics":["loops","nested-loops"],"skills":["complete_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_template":"for {{b1}} in range(2):\n    for {{b2}} in range(2):\n        print(i, j)","authoring_template":"for {{i}} in range(2):\n    for {{j}} in range(2):\n        print(i, j)","blanks":[{"id":"b1","answer":"i","mode":"bank","case_sensitive":true},{"id":"b2","answer":"j","mode":"bank","case_sensitive":true}],"shared_pool":{"items":["i","j","k","range"],"has_distractors":true,"single_use":true}}},{"id":"loops-68","type":"parsons","section_id":"nested-loops","title":"Order the nested loop","instructions":"Drag the lines into the correct order.","difficulty":3,"topics":["loops","nested-loops"],"skills":["sequence_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"canonical_code":"for i in range(2):\n    for j in range(2):\n        print(i, j)","distractors":"","swap_groups":[],"extra_accepted_orderings":[],"indent_size_spaces":4}},{"id":"loops-69","type":"parsons","section_id":"nested-loops","title":"Nested with distractors","instructions":"Order the correct lines; drag the wrong ones to the bin.","difficulty":4,"topics":["loops","nested-loops"],"skills":["sequence_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"canonical_code":"for i in range(3):\n    for j in range(3):\n        print(i * j)","distractors":"print(i, j)\nfor j in range(i):","swap_groups":[],"extra_accepted_orderings":[],"indent_size_spaces":4}},{"id":"loops-70","type":"parsons","section_id":"nested-loops","title":"Two inner statements","instructions":"Order the lines (some are interchangeable).","difficulty":4,"topics":["loops","nested-loops"],"skills":["sequence_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"canonical_code":"for i in range(2):\n    for j in range(2):\n        print(\"a\")\n        print(\"b\")","distractors":"","swap_groups":[[3,4]],"extra_accepted_orderings":[],"indent_size_spaces":4}},{"id":"loops-71","type":"trace_table","section_id":"nested-loops","title":"Trace the nested counters","instructions":"Fill in the trace table. A blank cell means 'no change'.","difficulty":4,"topics":["loops","nested-loops"],"skills":["trace_execution"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"consolidate","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code":"for i in range(2):\n    for j in range(2):\n        print(i, j)","undefined_token":"—","columns":[{"id":"i","label":"i","kind":"variable"},{"id":"j","label":"j","kind":"variable"},{"id":"out","label":"Output","kind":"output"}],"rows":[{"line":1,"values":{"i":"0","j":"—","out":""}},{"line":3,"values":{"i":"0","j":"0","out":"0 0"}},{"line":3,"values":{"i":"0","j":"1","out":"0 1"}},{"line":3,"values":{"i":"1","j":"0","out":"1 0"}},{"line":3,"values":{"i":"1","j":"1","out":"1 1"}}]}},{"id":"loops-72","type":"flowchart","section_id":"nested-loops","title":"Nested-loop flowchart","instructions":"The outer counter i runs 0, 1, 2 and for each i the inner counter j runs 0, 1 — so it OUTPUTs the pairs 0 0, 0 1, 1 0, 1 1, 2 0, 2 1. Fill in the two loop limits.","difficulty":4,"topics":["loops","nested-loops"],"skills":["read_flowchart"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"consolidate","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"flowchart":{"shapes":[{"id":"s","kind":"terminator","text":"Start","row":0,"col":1},{"id":"oi","kind":"process","text":"i = 0","row":1,"col":1},{"id":"od","kind":"decision","text":"i < {{outer}}?","row":2,"col":1},{"id":"ij","kind":"process","text":"j = 0","row":3,"col":0},{"id":"idc","kind":"decision","text":"j < {{inner}}?","row":4,"col":0},{"id":"body","kind":"io","text":"OUTPUT i, j","row":5,"col":0},{"id":"e","kind":"terminator","text":"End","row":3,"col":2}],"edges":[{"from":"s","to":"oi"},{"from":"oi","to":"od"},{"from":"od","to":"ij","label":"Yes"},{"from":"od","to":"e","label":"No"},{"from":"ij","to":"idc"},{"from":"idc","to":"body","label":"Yes"},{"from":"idc","to":"od","label":"No"},{"from":"body","to":"idc"}]},"blanks":[{"id":"outer","mode":"free_text","answer":"3","accepted":["3"],"case_sensitive":true,"width_hint":2},{"id":"inner","mode":"free_text","answer":"2","accepted":["2"],"case_sensitive":true,"width_hint":2}]}},{"id":"loops-73","type":"spot_the_bug","section_id":"nested-loops","title":"Fix the grid","instructions":"Find the buggy line and fix it.","difficulty":4,"topics":["loops","nested-loops"],"skills":["debug_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"modify","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_lines":["for i in range(2):","    for j in range(2):","    print(i, j)"],"expected_behaviour":"Prints the full grid.","actual_behaviour":"Only prints once per outer pass — print isn't inside the inner loop.","mode":"select_and_fix","constraint":"in_place","bugs":[{"line":3,"category":"logic","fix":"        print(i, j)","accepted_fixes":["        print(i, j)"]}]}},{"id":"loops-74","type":"spot_the_bug","section_id":"nested-loops","title":"The grid is wrong","instructions":"Click the line that contains the bug (no fix needed).","difficulty":4,"topics":["loops","nested-loops"],"skills":["debug_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"modify","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_lines":["for i in range(2):","    for i in range(2):","        print(i)"],"expected_behaviour":"Should use two counters.","actual_behaviour":"The inner loop overwrites the outer counter.","mode":"select_line","constraint":"in_place","bugs":[{"line":2,"category":"logic","fix":""}]}},{"id":"loops-75","type":"spot_the_bug","section_id":"nested-loops","title":"One pair too many","instructions":"Remove the line that shouldn't be there.","difficulty":4,"topics":["loops","nested-loops"],"skills":["debug_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"modify","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_lines":["for i in range(2):","    for j in range(2):","        print(i, j)","    print(i, j)"],"expected_behaviour":"Grid only.","actual_behaviour":"Prints an extra pair after each inner loop.","mode":"select_line","constraint":"remove_line","solution_code":"for i in range(2):\n    for j in range(2):\n        print(i, j)"}},{"id":"loops-76","type":"modify","section_id":"nested-loops","title":"Make it 3 by 3","instructions":"Change one line so the program does what's asked.","difficulty":3,"topics":["loops","nested-loops"],"skills":["modify_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"modify","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_lines":["for i in range(3):","    for j in range(2):","        print(i, j)"],"expected_behaviour":"A 3x3 grid.","actual_behaviour":"A 3x2 grid.","mode":"select_and_fix","constraint":"in_place","bugs":[{"line":2,"category":"logic","fix":"    for j in range(3):","accepted_fixes":["    for j in range(3):"]}]}},{"id":"loops-77","type":"modify","section_id":"nested-loops","title":"Blank line between rows","instructions":"Add a line so the program does what's asked.","difficulty":4,"topics":["loops","nested-loops"],"skills":["modify_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"modify","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_lines":["for i in range(3):","    for j in range(3):","        print(\"*\", end=\"\")"],"expected_behaviour":"Each row on its own line.","actual_behaviour":"All stars on one line.","mode":"select_and_fix","constraint":"add_line","bugs":[{"line":3,"category":"logic","fix":"    print()","accepted_fixes":["    print()"]}]}},{"id":"loops-78","type":"modify","section_id":"nested-loops","title":"Triangle not square","instructions":"Find the line that needs changing, click it, and edit it so the code matches the Expected behaviour.","difficulty":4,"topics":["loops","nested-loops"],"skills":["modify_code"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"modify","concept_level":"practise","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code_lines":["for i in range(4):","    for j in range(4):","        print(\"*\", end=\"\")","    print()"],"expected_behaviour":"A right-angled triangle of stars.","actual_behaviour":"A 4x4 square.","mode":"rewrite","constraint":"in_place","bugs":[{"line":2,"category":"logic","fix":"    for j in range(i + 1):","accepted_fixes":["    for j in range(i + 1):"]}]}},{"id":"loops-79","type":"testing","section_id":"nested-loops","title":"Test a grid function","instructions":"Use the function above to work out the test data and types for the table below.","difficulty":4,"topics":["loops","nested-loops"],"skills":["design_test_data"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"investigate","concept_level":"extend","estimated_time_seconds":90,"hints":[{"type":"concept","text":"The first row gives the values — name the type of test. The others give the type — supply values of that kind (both inputs share the range 0..50). Invalid is in-type but out of range for at least one input; Erroneous is the wrong type, e.g. \"two\"."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"code":"def grid(rows, cols):\n    if rows < 0 or rows > 50 or cols < 0 or cols > 50:\n        print(\"NOT VALID\")\n        return\n    for i in range(rows):\n        for j in range(cols):\n            print(i, j)","output_type":"lines","input_columns":[{"id":"rows","label":"rows","type":"int","min":0,"max":50},{"id":"cols","label":"cols","type":"int","min":0,"max":50}],"rows":[{"values":{"rows":"2","cols":"2","test_type":"","expected_output":"0 0\n0 1\n1 0\n1 1"}},{"values":{"rows":"","cols":"","test_type":"invalid","expected_output":"NOT VALID"}},{"values":{"rows":"","cols":"","test_type":"erroneous","expected_output":"TypeError"}}]}},{"id":"loops-80","type":"starter_challenge","section_id":"nested-loops","title":"Print a multiplication square","instructions":"Use nested loops to print a 5x5 multiplication grid (each row has the products 1*r .. 5*r).","difficulty":4,"topics":["loops","nested-loops"],"skills":["compose_program"],"exam_refs":["OCR_J277_2.2.1"],"primm_phase":"make","concept_level":"extend","estimated_time_seconds":90,"hints":[{"type":"nudge","text":"Work through the loop one pass at a time."}],"feedback":{"correct":"Nice — that's how the loop behaves.","incorrect":"Trace it again, one iteration at a time."},"payload":{"starter_code":"# print a 5x5 times-table grid\n","example_calls":[{"call":"(top-left cell)","expected":"1"},{"call":"(bottom-right cell)","expected":"25"}],"model_solution":"for r in range(1, 6):\n    for c in range(1, 6):\n        print(r * c, end=\"\\t\")\n    print()","self_check_guidance":"Check the outer loop is rows and the inner loop is columns."}}]}; }
  function packFeatureTour() { return {"pack_format_version":"0.1","schema_version":"0.1","id":"builtin-feature-tour","title":"Feature tour: every activity type","description":"A guided demo of every PyQuiz activity type and each of its permutations. The titles and instructions explain how each one works; the code is real so you can try them.","audience":"other","author":"PyQuiz","tags":["builtin","demo","feature-tour","reference"],"settings":{"show_hints":true,"show_solutions":"submission","pass_threshold":0.5,"attempts_per_activity":3,"ask_confidence":false,"sequential":false},"sections":[{"id":"predict","title":"1 · Predict output","number":1,"description":"Read code, work out what it prints — free text, multiple choice, or output-to-code."},{"id":"cloze","title":"2 · Cloze","number":2,"description":"Fill gaps in code — typed, dropdown, or drag from a word bank."},{"id":"parsons","title":"3 · Parsons","number":3,"description":"Drag shuffled lines into order — plain, with distractors, or with interchangeable lines."},{"id":"trace","title":"4 · Trace table","number":4,"description":"Step through execution and record variables and output."},{"id":"bug","title":"5 · Spot the bug","number":5,"description":"Find the defect — click it, click and fix it, or remove a line."},{"id":"modify","title":"6 · Modify","number":6,"description":"Change the code to meet a brief — edit, add or rewrite a line."},{"id":"testing","title":"7 · Testing","number":7,"description":"Build an OCR test-data table — work out the type, supply a value, or both."},{"id":"flowchart","title":"8 · Flowchart","number":8,"description":"Complete a flowchart by filling the blank shapes."},{"id":"challenge","title":"9 · Starter challenge","number":9,"description":"An open coding task with self-check examples."}],"activities":[{"id":"tour-01","type":"predict_output","section_id":"predict","title":"Predict output · free text","instructions":"PREDICT OUTPUT (free text): you read the code and type exactly what it prints, line by line. The marker compares your text to the expected output. Try it on this snippet.","difficulty":1,"topics":["feature-tour","predict_output"],"skills":["explore_tool"],"primm_phase":"investigate","concept_level":"introduce","estimated_time_seconds":60,"hints":[{"type":"nudge","text":"This activity is here to show how the type works — try answering it."}],"feedback":{"correct":"That's the idea — that's how this activity type behaves.","incorrect":"Have another go — the instructions describe how this type works."},"payload":{"direction":"code_to_output","mode":"free_text","code":"for i in range(3):\n    print(i)","answer":"0\n1\n2","accepted_answers":["0\n1\n2"]}},{"id":"tour-02","type":"predict_output","section_id":"predict","title":"Predict output · multiple choice","instructions":"PREDICT OUTPUT (multiple choice): same idea, but you pick the correct output from a list instead of typing it. Choose the right one.","difficulty":1,"topics":["feature-tour","predict_output"],"skills":["explore_tool"],"primm_phase":"investigate","concept_level":"introduce","estimated_time_seconds":60,"hints":[{"type":"nudge","text":"This activity is here to show how the type works — try answering it."}],"feedback":{"correct":"That's the idea — that's how this activity type behaves.","incorrect":"Have another go — the instructions describe how this type works."},"payload":{"direction":"code_to_output","mode":"multiple_choice","code":"print(2 + 3 * 4)","options":[{"id":"a","content":"14"},{"id":"b","content":"20"},{"id":"c","content":"9"}],"answer":"a"}},{"id":"tour-03","type":"predict_output","section_id":"predict","title":"Predict output · output → code","instructions":"OUTPUT → CODE (multiple choice): this flips it round — you are shown the output and must choose the code that produces it.","difficulty":2,"topics":["feature-tour","predict_output"],"skills":["explore_tool"],"primm_phase":"investigate","concept_level":"introduce","estimated_time_seconds":60,"hints":[{"type":"nudge","text":"This activity is here to show how the type works — try answering it."}],"feedback":{"correct":"That's the idea — that's how this activity type behaves.","incorrect":"Have another go — the instructions describe how this type works."},"payload":{"direction":"output_to_code","mode":"multiple_choice","code":"1\n2\n3","options":[{"id":"a","content":"for i in range(1, 4):\n    print(i)"},{"id":"b","content":"for i in range(3):\n    print(i)"},{"id":"c","content":"for i in range(1, 3):\n    print(i)"}],"answer":"a"}},{"id":"tour-04","type":"cloze","section_id":"cloze","title":"Cloze · type the answer","instructions":"CLOZE (free text): the code has gaps and you TYPE the missing code into each box. Fill the gap so it prints Hello.","difficulty":1,"topics":["feature-tour","cloze"],"skills":["explore_tool"],"primm_phase":"investigate","concept_level":"introduce","estimated_time_seconds":60,"hints":[{"type":"nudge","text":"This activity is here to show how the type works — try answering it."}],"feedback":{"correct":"That's the idea — that's how this activity type behaves.","incorrect":"Have another go — the instructions describe how this type works."},"payload":{"code_template":"print({{b1}})","authoring_template":"print({{\"Hello\"}})","blanks":[{"id":"b1","answer":"\"Hello\"","mode":"free_text","accepted":["\"Hello\"","'Hello'"],"case_sensitive":true,"width_hint":9}]}},{"id":"tour-05","type":"cloze","section_id":"cloze","title":"Cloze · choose from a dropdown","instructions":"CLOZE (dropdown): each gap is a drop-down menu — you SELECT the right option rather than typing. Pick the keyword that starts the loop.","difficulty":1,"topics":["feature-tour","cloze"],"skills":["explore_tool"],"primm_phase":"investigate","concept_level":"introduce","estimated_time_seconds":60,"hints":[{"type":"nudge","text":"This activity is here to show how the type works — try answering it."}],"feedback":{"correct":"That's the idea — that's how this activity type behaves.","incorrect":"Have another go — the instructions describe how this type works."},"payload":{"code_template":"{{b1}} i in range(3):\n    print(i)","authoring_template":"{{for}} i in range(3):\n    print(i)","blanks":[{"id":"b1","answer":"for","mode":"select","options":["for","while","if"],"case_sensitive":true,"width_hint":5}]}},{"id":"tour-06","type":"cloze","section_id":"cloze","title":"Cloze · drag from a word bank","instructions":"CLOZE (word bank): drag words from a shared bank into the gaps. The bank can contain extra distractor words, and each word is used once.","difficulty":2,"topics":["feature-tour","cloze"],"skills":["explore_tool"],"primm_phase":"investigate","concept_level":"introduce","estimated_time_seconds":60,"hints":[{"type":"nudge","text":"This activity is here to show how the type works — try answering it."}],"feedback":{"correct":"That's the idea — that's how this activity type behaves.","incorrect":"Have another go — the instructions describe how this type works."},"payload":{"code_template":"{{b1}} = {{b2}}\nprint(name)","authoring_template":"{{name}} = {{\"Ada\"}}\nprint(name)","blanks":[{"id":"b1","answer":"name","mode":"bank","case_sensitive":true},{"id":"b2","answer":"\"Ada\"","mode":"bank","case_sensitive":true}],"shared_pool":{"items":["name","\"Ada\"","print","\"Bob\""],"has_distractors":true,"single_use":true}}},{"id":"tour-07","type":"parsons","section_id":"parsons","title":"Parsons · order the lines","instructions":"PARSONS (plain): the correct lines are shuffled and you drag them into the right order. Indentation matters.","difficulty":1,"topics":["feature-tour","parsons"],"skills":["explore_tool"],"primm_phase":"investigate","concept_level":"introduce","estimated_time_seconds":60,"hints":[{"type":"nudge","text":"This activity is here to show how the type works — try answering it."}],"feedback":{"correct":"That's the idea — that's how this activity type behaves.","incorrect":"Have another go — the instructions describe how this type works."},"payload":{"canonical_code":"total = 0\nfor i in range(3):\n    total = total + i\nprint(total)","distractors":"","swap_groups":[],"extra_accepted_orderings":[],"indent_size_spaces":4}},{"id":"tour-08","type":"parsons","section_id":"parsons","title":"Parsons · with distractors","instructions":"PARSONS (distractors): some lines are wrong and don't belong. Drag the correct lines into order and drop the wrong ones in the bin.","difficulty":2,"topics":["feature-tour","parsons"],"skills":["explore_tool"],"primm_phase":"investigate","concept_level":"introduce","estimated_time_seconds":60,"hints":[{"type":"nudge","text":"This activity is here to show how the type works — try answering it."}],"feedback":{"correct":"That's the idea — that's how this activity type behaves.","incorrect":"Have another go — the instructions describe how this type works."},"payload":{"canonical_code":"name = \"Ada\"\nprint(name)","distractors":"print(\"Ada\")\nname = Ada","swap_groups":[],"extra_accepted_orderings":[],"indent_size_spaces":4}},{"id":"tour-09","type":"parsons","section_id":"parsons","title":"Parsons · interchangeable lines","instructions":"PARSONS (interchangeable lines): sometimes two lines can go in either order. Here the two prints can be swapped — both orders are accepted.","difficulty":2,"topics":["feature-tour","parsons"],"skills":["explore_tool"],"primm_phase":"investigate","concept_level":"introduce","estimated_time_seconds":60,"hints":[{"type":"nudge","text":"This activity is here to show how the type works — try answering it."}],"feedback":{"correct":"That's the idea — that's how this activity type behaves.","incorrect":"Have another go — the instructions describe how this type works."},"payload":{"canonical_code":"x = 1\nprint(\"a\")\nprint(\"b\")","distractors":"","swap_groups":[[2,3]],"extra_accepted_orderings":[],"indent_size_spaces":4}},{"id":"tour-10","type":"trace_table","section_id":"trace","title":"Trace table · step through execution","instructions":"TRACE TABLE: step through the code and record the value of each variable (and any output) after each line runs. A blank cell means 'no change this step'.","difficulty":2,"topics":["feature-tour","trace_table"],"skills":["explore_tool"],"primm_phase":"investigate","concept_level":"introduce","estimated_time_seconds":60,"hints":[{"type":"nudge","text":"This activity is here to show how the type works — try answering it."}],"feedback":{"correct":"That's the idea — that's how this activity type behaves.","incorrect":"Have another go — the instructions describe how this type works."},"payload":{"code":"x = 2\nx = x + 3\nprint(x)","undefined_token":"—","columns":[{"id":"x","label":"x","kind":"variable"},{"id":"out","label":"Output","kind":"output"}],"rows":[{"line":1,"values":{"x":"2","out":""}},{"line":2,"values":{"x":"5","out":""}},{"line":3,"values":{"x":"","out":"5"}}]}},{"id":"tour-11","type":"spot_the_bug","section_id":"bug","title":"Spot the bug · click the line","instructions":"SPOT THE BUG (select line): you are shown the expected behaviour and the actual (buggy) behaviour. Click the single line that contains the bug — no fix needed.","difficulty":2,"topics":["feature-tour","spot_the_bug"],"skills":["explore_tool"],"primm_phase":"investigate","concept_level":"introduce","estimated_time_seconds":60,"hints":[{"type":"nudge","text":"This activity is here to show how the type works — try answering it."}],"feedback":{"correct":"That's the idea — that's how this activity type behaves.","incorrect":"Have another go — the instructions describe how this type works."},"payload":{"code_lines":["for i in range(1, 4):","    print(i)"],"expected_behaviour":"Should print 1 2 3 4.","actual_behaviour":"Only prints 1 2 3.","mode":"select_line","constraint":"in_place","bugs":[{"line":1,"category":"logic","fix":""}]}},{"id":"tour-12","type":"spot_the_bug","section_id":"bug","title":"Spot the bug · click and fix","instructions":"SPOT THE BUG (select and fix): find the buggy line, click it, then edit it so the code matches the expected behaviour.","difficulty":2,"topics":["feature-tour","spot_the_bug"],"skills":["explore_tool"],"primm_phase":"investigate","concept_level":"introduce","estimated_time_seconds":60,"hints":[{"type":"nudge","text":"This activity is here to show how the type works — try answering it."}],"feedback":{"correct":"That's the idea — that's how this activity type behaves.","incorrect":"Have another go — the instructions describe how this type works."},"payload":{"code_lines":["for i in range(3)","    print(i)"],"expected_behaviour":"Prints 0 1 2.","actual_behaviour":"Crashes with a syntax error.","mode":"select_and_fix","constraint":"in_place","bugs":[{"line":1,"category":"logic","fix":"for i in range(3):","accepted_fixes":["for i in range(3):"]}]}},{"id":"tour-13","type":"spot_the_bug","section_id":"bug","title":"Spot the bug · remove a line","instructions":"SPOT THE BUG (remove line): one line should not be there at all. Click the line that needs to be deleted.","difficulty":2,"topics":["feature-tour","spot_the_bug"],"skills":["explore_tool"],"primm_phase":"investigate","concept_level":"introduce","estimated_time_seconds":60,"hints":[{"type":"nudge","text":"This activity is here to show how the type works — try answering it."}],"feedback":{"correct":"That's the idea — that's how this activity type behaves.","incorrect":"Have another go — the instructions describe how this type works."},"payload":{"code_lines":["x = 5","x = 5","print(x)"],"expected_behaviour":"Prints 5 once.","actual_behaviour":"Has a pointless repeated line.","mode":"select_line","constraint":"remove_line","solution_code":"x = 5\nprint(x)"}},{"id":"tour-14","type":"modify","section_id":"modify","title":"Modify · change one line","instructions":"MODIFY (change a line): the code works but doesn't do what's asked. Click the line that needs changing and edit it in place.","difficulty":1,"topics":["feature-tour","modify"],"skills":["explore_tool"],"primm_phase":"investigate","concept_level":"introduce","estimated_time_seconds":60,"hints":[{"type":"nudge","text":"This activity is here to show how the type works — try answering it."}],"feedback":{"correct":"That's the idea — that's how this activity type behaves.","incorrect":"Have another go — the instructions describe how this type works."},"payload":{"code_lines":["for i in range(5):","    print(i)"],"expected_behaviour":"Prints 0 up to 9.","actual_behaviour":"Prints 0 up to 4.","mode":"select_and_fix","constraint":"in_place","bugs":[{"line":1,"category":"logic","fix":"for i in range(10):","accepted_fixes":["for i in range(10):"]}]}},{"id":"tour-15","type":"modify","section_id":"modify","title":"Modify · add a line","instructions":"MODIFY (add a line): the program is missing a step. Click where the new line should go and type it in.","difficulty":2,"topics":["feature-tour","modify"],"skills":["explore_tool"],"primm_phase":"investigate","concept_level":"introduce","estimated_time_seconds":60,"hints":[{"type":"nudge","text":"This activity is here to show how the type works — try answering it."}],"feedback":{"correct":"That's the idea — that's how this activity type behaves.","incorrect":"Have another go — the instructions describe how this type works."},"payload":{"code_lines":["for i in range(3):","    print(i)"],"expected_behaviour":"Prints i and then i doubled each pass.","actual_behaviour":"Only prints i.","mode":"select_and_fix","constraint":"add_line","bugs":[{"line":2,"category":"logic","fix":"    print(i * 2)","accepted_fixes":["    print(i * 2)"]}]}},{"id":"tour-16","type":"modify","section_id":"modify","title":"Modify · rewrite a line","instructions":"MODIFY (rewrite): a freer version of changing a line — click the line and rewrite it so the code matches the expected behaviour.","difficulty":2,"topics":["feature-tour","modify"],"skills":["explore_tool"],"primm_phase":"investigate","concept_level":"introduce","estimated_time_seconds":60,"hints":[{"type":"nudge","text":"This activity is here to show how the type works — try answering it."}],"feedback":{"correct":"That's the idea — that's how this activity type behaves.","incorrect":"Have another go — the instructions describe how this type works."},"payload":{"code_lines":["for i in range(5):","    print(i)"],"expected_behaviour":"Prints 1 up to 5.","actual_behaviour":"Prints 0 up to 4.","mode":"rewrite","constraint":"in_place","bugs":[{"line":1,"category":"logic","fix":"for i in range(1, 6):","accepted_fixes":["for i in range(1, 6):"]}]}},{"id":"tour-17","type":"testing","section_id":"testing","title":"Testing · work out the type","instructions":"TESTING (work out the type): the code validates its input. Each row gives you a value and you choose which kind of test it is: Normal, Boundary, Invalid or Erroneous.","difficulty":2,"topics":["feature-tour","testing"],"skills":["explore_tool"],"primm_phase":"investigate","concept_level":"introduce","estimated_time_seconds":60,"hints":[{"type":"nudge","text":"This activity is here to show how the type works — try answering it."}],"feedback":{"correct":"That's the idea — that's how this activity type behaves.","incorrect":"Have another go — the instructions describe how this type works."},"payload":{"code":"def is_valid(score):\n    if score < 0 or score > 100:\n        return False\n    return True","output_type":"boolean","input_columns":[{"id":"score","label":"score","type":"int","min":0,"max":100}],"rows":[{"values":{"score":"50","test_type":"","expected_output":"True"}},{"values":{"score":"0","test_type":"","expected_output":"True"}},{"values":{"score":"150","test_type":"","expected_output":"False"}},{"values":{"score":"\"x\"","test_type":"","expected_output":"TypeError"}}]}},{"id":"tour-18","type":"testing","section_id":"testing","title":"Testing · supply the value","instructions":"TESTING (supply the value): here each row gives you the Type of test and you must enter a value of that kind. The marker checks it against the input's range automatically — so for Invalid and Erroneous it just has to be the right sort of value.","difficulty":2,"topics":["feature-tour","testing"],"skills":["explore_tool"],"primm_phase":"investigate","concept_level":"introduce","estimated_time_seconds":60,"hints":[{"type":"nudge","text":"This activity is here to show how the type works — try answering it."}],"feedback":{"correct":"That's the idea — that's how this activity type behaves.","incorrect":"Have another go — the instructions describe how this type works."},"payload":{"code":"def is_valid(score):\n    if score < 0 or score > 100:\n        return False\n    return True","output_type":"boolean","input_columns":[{"id":"score","label":"score","type":"int","min":0,"max":100}],"rows":[{"values":{"score":"","test_type":"normal","expected_output":"True"}},{"values":{"score":"","test_type":"boundary","expected_output":"True"}},{"values":{"score":"","test_type":"invalid","expected_output":"False"}},{"values":{"score":"","test_type":"erroneous","expected_output":"TypeError"}}]}},{"id":"tour-19","type":"testing","section_id":"testing","title":"Testing · mixed table","instructions":"TESTING (mixed): a real table mixes the two — some rows give a value (work out the type), some give the type (supply a value). The Expected output column is always shown for context.","difficulty":3,"topics":["feature-tour","testing"],"skills":["explore_tool"],"primm_phase":"investigate","concept_level":"introduce","estimated_time_seconds":60,"hints":[{"type":"nudge","text":"This activity is here to show how the type works — try answering it."}],"feedback":{"correct":"That's the idea — that's how this activity type behaves.","incorrect":"Have another go — the instructions describe how this type works."},"payload":{"code":"def grade(mark):\n    if mark < 0 or mark > 100:\n        return \"NOT VALID\"\n    if mark >= 40:\n        return \"PASS\"\n    return \"FAIL\"","output_type":"string","input_columns":[{"id":"mark","label":"mark","type":"int","min":0,"max":100}],"rows":[{"values":{"mark":"75","test_type":"","expected_output":"PASS"}},{"values":{"mark":"","test_type":"boundary","expected_output":"PASS"}},{"values":{"mark":"","test_type":"invalid","expected_output":"NOT VALID"}},{"values":{"mark":"3.5","test_type":"","expected_output":"TypeError"}}]}},{"id":"tour-20","type":"flowchart","section_id":"flowchart","title":"Flowchart · fill the blanks","instructions":"FLOWCHART: a flowchart is drawn for you with one or two gaps in the shapes. Fill the blanks — some are free-text boxes, some are drop-downs. This chart should output 0 1 2 3 4.","difficulty":2,"topics":["feature-tour","flowchart"],"skills":["explore_tool"],"primm_phase":"investigate","concept_level":"introduce","estimated_time_seconds":60,"hints":[{"type":"nudge","text":"This activity is here to show how the type works — try answering it."}],"feedback":{"correct":"That's the idea — that's how this activity type behaves.","incorrect":"Have another go — the instructions describe how this type works."},"payload":{"flowchart":{"shapes":[{"id":"s","kind":"terminator","text":"Start","row":0,"col":1},{"id":"a","kind":"process","text":"i = {{init}}","row":1,"col":1},{"id":"d","kind":"decision","text":"i {{op}} 5?","row":2,"col":1},{"id":"p","kind":"io","text":"OUTPUT i","row":3,"col":0},{"id":"u","kind":"process","text":"i = i + 1","row":4,"col":0},{"id":"e","kind":"terminator","text":"End","row":3,"col":2}],"edges":[{"from":"s","to":"a"},{"from":"a","to":"d"},{"from":"d","to":"p","label":"Yes"},{"from":"d","to":"e","label":"No"},{"from":"p","to":"u"},{"from":"u","to":"d"}]},"blanks":[{"id":"init","mode":"free_text","answer":"0","accepted":["0"],"case_sensitive":true,"width_hint":2},{"id":"op","mode":"select","answer":"<","options":["<",">","=="],"case_sensitive":true,"width_hint":2}]}},{"id":"tour-21","type":"starter_challenge","section_id":"challenge","title":"Starter challenge · write code in your IDE","instructions":"STARTER CHALLENGE: an open task you complete in your own editor. You get starter code and example calls to check yourself against; when you're done you mark it as complete. (v0.1 doesn't run your code — the examples are for self-checking.)","difficulty":2,"topics":["feature-tour","starter_challenge"],"skills":["explore_tool"],"primm_phase":"investigate","concept_level":"introduce","estimated_time_seconds":60,"hints":[{"type":"nudge","text":"This activity is here to show how the type works — try answering it."}],"feedback":{"correct":"That's the idea — that's how this activity type behaves.","incorrect":"Have another go — the instructions describe how this type works."},"payload":{"starter_code":"# Write a function add(a, b) that returns a + b\n","example_calls":[{"call":"add(2, 3)","expected":"5"},{"call":"add(-1, 1)","expected":"0"}],"model_solution":"def add(a, b):\n    return a + b\n","self_check_guidance":"Run each example call in your IDE and check the result matches."}}]}; }

  PyQuiz.BuiltInPacks = {
    list: [
      {
        id: "builtin-variables-intro",
        title: "Variables & Assignment",
        description: "First steps with variables, =, and print. 12 activities across every type.",
        build: packVariables
      },
      {
        id: "builtin-selection-intro",
        title: "Selection (if / else)",
        description: "Branching, comparison operators and the elif chain. 12 activities.",
        build: packSelection
      },
      {
        id: "builtin-loops-intro",
        title: "Count-Controlled Loops",
        description: "for, range, accumulators and off-by-one. 12 activities.",
        build: packLoops
      },
      {
        id: "builtin-feature-tour",
        title: "Feature tour: every activity type",
        description: "A guided demo of every activity type and each permutation. Titles and instructions explain how each one works. 21 activities.",
        build: packFeatureTour
      },
      {
        id: "builtin-loops-journey",
        title: "Loops: a complete journey",
        description: "for, while and nested loops across four sections — every activity type, multiple permutations to drill each idea. 80 activities.",
        build: packLoopsJourney
      },
      {
        id: "builtin-flowchart-stress-hand",
        title: "Flowchart Workout (24)",
        description: "24 flowchart-completion activities of rising difficulty, with hand-tuned edge routing.",
        build: packFlowchartStressHand
      }
    ],
    get: function (id) {
      const entry = (this.list || []).find(p => p.id === id);
      if (!entry) return null;
      try { return entry.build(); } catch (e) { console.error("BuiltInPacks.build threw", e); return null; }
    }
  };
})();
