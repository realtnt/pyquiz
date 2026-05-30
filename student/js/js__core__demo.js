/* === inlined from js/core/demo.js === */
/* =====================================================================
 * PyQuiz.Demo — built-in demo pack
 *
 * Used by the student tool's "Try the demo pack" button and as a golden
 * fixture by the test suite. Covers every v0.1 activity type and every
 * variant of each type (cloze: free_text / select / pool / bank;
 * predict_output: free text / multiple choice / output→code;
 * spot_the_bug: single bug / multiple bugs / minimal fix).
 *
 * Several activities use input() to exercise the Pyodide runner's
 * input-feeding behaviour (runner_inputs).
 *
 * Public API:
 *   PyQuiz.Demo.pack    → demo pack object
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});

  PyQuiz.Demo = {
    pack: {
      pack_format_version: "0.1",
      schema_version: "0.1",
      id: "demo-pack-tour",
      title: "PyQuiz — Feature Tour",
      description: "A demonstration pack covering every activity type and variant.",
      language: "python",
      audience: "ks3",
      author: "demo@school",
      created_at: "2026-05-23T10:00:00Z",
      updated_at: "2026-05-23T10:00:00Z",
      spec_refs: ["OCR_J277_2.2"],
      tags: ["demo", "tour"],
      settings: { shuffle: false, show_hints: true, show_solutions_after: "submission", pass_threshold: 0.7, show_runner_after: "correct" },
      sections: [
        { id: "sec-parsons", number: 1, title: "Reorder code (Parsons)" },
        { id: "sec-cloze",   number: 2, title: "Fill in the blanks (cloze)" },
        { id: "sec-trace",   number: 3, title: "Trace tables" },
        { id: "sec-bug",     number: 4, title: "Spot the bug" },
        { id: "sec-predict", number: 5, title: "Predict the output" },
        { id: "sec-starter", number: 6, title: "Challenges" }
      ],
      activities: [

        /* ---------------- PARSONS ---------------- */
        {
          id: "act-parsons-1",
          type: "parsons",
          section_id: "sec-parsons",
          title: "Parsons: Print numbers 1 to 5",
          instructions: "Arrange the lines so the program prints 1 2 3 4 and 5 each on a new line. Some of the blocks are extras — leave them in Source.",
          difficulty: 1,
          topics: ["loops", "range", "print"],
          hints: ["A for loop is involved.", "range() is exclusive of the upper bound."],
          solution_explanation: "range(1, 6) gives 1 to 5 inclusive.",
          feedback: { correct: "Well done.", incorrect: "Not quite — try reading the loop carefully." },
          teacher_notes: "Common misconception: students write range(5) and miss the 5.",
          payload: {
            canonical_code: "for i in range(1, 6):\n    print(i)",
            distractors: "    print(I)\nfor i in range(5):",
            swap_groups: [],
            extra_accepted_orderings: [],
            indent_size_spaces: 4,
            discard_required: true
          }
        },
        {
          id: "act-parsons-2",
          type: "parsons",
          section_id: "sec-parsons",
          title: "Parsons: Function to count vowels",
          instructions: "Assemble a function that counts vowels in a string. Notice the nested if — indentation matters.",
          difficulty: 3,
          topics: ["functions", "strings", "loops"],
          hints: ["Iterate over each character.", "Compare to a string of vowels.", "Don't forget to return at the end."],
          feedback: { correct: "Nicely structured.", incorrect: "Check the indentation and the order of the increment." },
          payload: {
            canonical_code: "def count_vowels(text):\n    vowels = \"aeiou\"\n    count = 0\n    for ch in text:\n        if ch.lower() in vowels:\n            count = count + 1\n    return count",
            distractors: "            count = count - 1\n        if ch in vowels:",
            swap_groups: [],
            extra_accepted_orderings: [],
            indent_size_spaces: 4,
            discard_required: true
          }
        },

        /* ---------------- CLOZE: free text only ---------------- */
        {
          id: "act-cloze-text-1",
          type: "cloze",
          section_id: "sec-cloze",
          title: "Cloze (free text): area of a circle",
          instructions: "Fill in the blanks. All answers are typed.",
          difficulty: 2,
          topics: ["functions", "math"],
          hints: ["You'll need pi from the math module.", "Area = pi × radius²."],
          feedback: { correct: "Spot on.", incorrect: "Have another look at the formula." },
          payload: {
            code_template: "import {{1}}\n\ndef area(radius):\n    return {{2}}.pi * radius {{3}} 2\n\nprint(round(area(5), 2))",
            blanks: [
              { id: "1", mode: "free_text", answer: "math", accepted: ["math"], width_hint: 6 },
              { id: "2", mode: "free_text", answer: "math", accepted: ["math"], width_hint: 6 },
              { id: "3", mode: "free_text", answer: "**", accepted: ["**"], width_hint: 3 }
            ],
            shared_pool: null
          }
        },

        /* ---------------- CLOZE: dropdowns only ---------------- */
        {
          id: "act-cloze-dropdown-1",
          type: "cloze",
          section_id: "sec-cloze",
          title: "Cloze (drop-downs): pick the right operators",
          instructions: "Choose the right item from each drop-down so this program correctly checks if a number is even.",
          difficulty: 2,
          topics: ["conditionals", "operators"],
          hints: ["% gives the remainder of a division.", "An even number has remainder 0 when divided by 2."],
          feedback: { correct: "Good operator choices.", incorrect: "Think about what makes a number even." },
          payload: {
            code_template: "n = 10\nif n {{1}} 2 {{2}} 0:\n    print(\"even\")\n{{3}}:\n    print(\"odd\")",
            blanks: [
              { id: "1", mode: "select", answer: "%",    options: ["%", "/", "//", "**"] },
              { id: "2", mode: "select", answer: "==",   options: ["=", "==", "!=", ">"] },
              { id: "3", mode: "select", answer: "else", options: ["else", "elif", "or", "and"] }
            ],
            shared_pool: null
          }
        },

        /* ---------------- CLOZE: bank WITH distractors ---------------- */
        {
          id: "act-cloze-bank-distractors",
          type: "cloze",
          section_id: "sec-cloze",
          title: "Cloze (word bank, with extras): build a loop",
          instructions: "Click words in the bank to fill the blanks in order. There are extras you won't need. Each placed word fills ONE blank only — even the same word can appear more than once in the bank.",
          difficulty: 2,
          topics: ["loops", "range"],
          hints: ["The first blank is the loop variable.", "range() needs an upper bound.", "Both loop and print refer to the same variable, but you'll place a separate 'i' chip for each."],
          feedback: { correct: "Well done.", incorrect: "Read the bank carefully — there are extras." },
          payload: {
            code_template: "for {{1}} in {{2}}({{3}}):\n    {{4}}({{5}})",
            blanks: [
              { id: "1", mode: "bank", answer: "i" },
              { id: "2", mode: "bank", answer: "range" },
              { id: "3", mode: "bank", answer: "5" },
              { id: "4", mode: "bank", answer: "print" },
              { id: "5", mode: "bank", answer: "i" }
            ],
            shared_pool: { items: ["i", "i", "range", "5", "print", "n", "10", "input", "while"], has_distractors: true, single_use: true }
          }
        },

        /* ---------------- CLOZE: bank WITHOUT distractors ---------------- */
        {
          id: "act-cloze-bank-exact",
          type: "cloze",
          section_id: "sec-cloze",
          title: "Cloze (word bank, no extras): conditional with input",
          instructions: "Click each word in the bank into a blank. Every word fits somewhere — no extras.",
          difficulty: 2,
          topics: ["conditionals", "input"],
          hints: ["The user's age comes in as a string from input().", "Convert it before comparing."],
          feedback: { correct: "Right on.", incorrect: "What type does input() return?" },
          runner_inputs: ["20"],
          payload: {
            code_template: "age = {{1}}({{2}}(\"How old are you? \"))\nif age {{3}} 18:\n    print(\"Adult\")\nelse:\n    print(\"Not yet\")",
            blanks: [
              { id: "1", mode: "bank", answer: "int" },
              { id: "2", mode: "bank", answer: "input" },
              { id: "3", mode: "bank", answer: ">=" }
            ],
            shared_pool: { items: ["int", "input", ">="], has_distractors: false, single_use: true }
          }
        },

        /* ---------------- CLOZE: mixed (text + dropdown + bank) ---------------- */
        {
          id: "act-cloze-mixed-1",
          type: "cloze",
          section_id: "sec-cloze",
          title: "Cloze (mixed): sum a list",
          instructions: "This activity uses three styles: a drop-down for the variable name, a typed number, and a word from the bank for the operator.",
          difficulty: 3,
          topics: ["loops", "accumulator"],
          hints: ["Start the total at zero.", "Each iteration adds n to the total."],
          feedback: { correct: "Excellent.", incorrect: "Trace through the loop on paper." },
          payload: {
            code_template: "numbers = [1, 2, 3, 4, 5]\ntotal = {{1}}\nfor n in {{2}}:\n    total = total {{3}} n\nprint(total)",
            blanks: [
              { id: "1", mode: "free_text", answer: "0", accepted: ["0"], case_sensitive: true, width_hint: 3 },
              { id: "2", mode: "select",    answer: "numbers", options: ["numbers", "total", "n"] },
              { id: "3", mode: "bank",      answer: "+" }
            ],
            shared_pool: { items: ["+", "-", "*"], has_distractors: true, single_use: true }
          }
        },

        /* ---------------- TRACE TABLE: simple loop ---------------- */
        {
          id: "act-trace-1",
          type: "trace_table",
          section_id: "sec-trace",
          title: "Trace: the accumulator",
          instructions: "Add a row for each line that affects the variables. You can leave a cell blank if the value hasn't changed, or fill it in — either style is accepted. The 'extra' rows where nothing changed are stripped before marking.",
          difficulty: 3,
          topics: ["loops", "trace"],
          hints: ["The loop runs three times.", "Each iteration's assignment may or may not change x — track only the changes."],
          feedback: { correct: "Spot on.", incorrect: "Step through the code line by line; only record changes." },
          payload: {
            code: "x = 0\nfor i in range(3):\n    x = x + i\nprint(x)",
            columns: [
              { id: "i", label: "i", kind: "variable" },
              { id: "x", label: "x", kind: "variable" },
              { id: "out", label: "Output", kind: "output" }
            ],
            rows: [
              { line: 1, values: { i: "",  x: "0", out: "" } },
              { line: 2, values: { i: "0", x: "",  out: "" } },
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

        /* ---------------- TRACE TABLE: function call ---------------- */
        {
          id: "act-trace-2",
          type: "trace_table",
          section_id: "sec-trace",
          title: "Trace: function with conditional",
          instructions: "Trace through this function call. Add a row whenever a variable's value changes or output is produced — extra unchanged rows are accepted.",
          difficulty: 4,
          topics: ["functions", "conditionals", "trace"],
          hints: ["Only record changes.", "4 is even, so only the if-branch runs."],
          feedback: { correct: "Excellent trace.", incorrect: "Only record rows where something changes." },
          payload: {
            code: "def classify(n):\n    if n % 2 == 0:\n        result = \"even\"\n    else:\n        result = \"odd\"\n    return result\n\nprint(classify(4))",
            columns: [
              { id: "n", label: "n", kind: "variable" },
              { id: "result", label: "result", kind: "variable" },
              { id: "out", label: "Output", kind: "output" }
            ],
            rows: [
              { line: 8, values: { n: "4", result: "",     out: "" } },
              { line: 3, values: { n: "",  result: "even", out: "" } },
              { line: 8, values: { n: "",  result: "",     out: "even" } }
            ],
            marking: "exact_cells",
            undefined_token: ""
          }
        },

        /* ---------------- SPOT THE BUG: single bug, select-and-fix ---------------- */
        {
          id: "act-stb-1",
          type: "spot_the_bug",
          section_id: "sec-bug",
          title: "Bug: average of a list",
          instructions: "Find and fix the bug so this function returns the mean of a list.",
          difficulty: 3,
          topics: ["functions", "bugs"],
          hints: ["The total isn't being updated.", "You probably want +=."],
          feedback: { correct: "Good fix.", incorrect: "Look at how total is being modified." },
          payload: {
            code_lines: [
              "def average(nums):",
              "    total = 0",
              "    for n in nums:",
              "        total + n",
              "    return total / len(nums)"
            ],
            expected_behaviour: "Return the mean of the list.",
            actual_behaviour: "Returns 0 / len(nums).",
            mode: "select_and_fix",
            constraint: "in_place",
            bugs: [
              { line: 4, category: "logic", fix: "        total = total + n", accepted_fixes: ["        total += n", "        total = total + n"] }
            ],
            runner_call: "print(average([1, 2, 3, 4, 5]))"
          }
        },

        /* ---------------- SPOT THE BUG: multiple bugs ---------------- */
        {
          id: "act-stb-2",
          type: "spot_the_bug",
          section_id: "sec-bug",
          title: "Bug: maximum of a list (two bugs)",
          instructions: "This function should return the largest value in a list. There are TWO bugs. Mark and fix each.",
          difficulty: 4,
          topics: ["loops", "lists", "bugs"],
          hints: ["What's the right starting value for biggest?", "The comparison sign matters."],
          feedback: { correct: "Both bugs fixed.", incorrect: "Two lines are wrong." },
          payload: {
            code_lines: [
              "def find_max(nums):",
              "    biggest = 0",
              "    for n in nums:",
              "        if n < biggest:",
              "            biggest = n",
              "    return biggest"
            ],
            expected_behaviour: "Return the largest value in nums.",
            actual_behaviour: "Always returns 0 when all values are negative; with positive values, returns the minimum.",
            mode: "select_and_fix",
            constraint: "in_place",
            bugs: [
              { line: 2, category: "logic", fix: "    biggest = nums[0]", accepted_fixes: ["    biggest = nums[0]"] },
              { line: 4, category: "operator", fix: "        if n > biggest:", accepted_fixes: ["        if n > biggest:"] }
            ],
            runner_call: "print(find_max([3, 7, 2, 9, 4]))"
          }
        },

        /* ---------------- SPOT THE BUG: select line only ---------------- */
        {
          id: "act-stb-3",
          type: "spot_the_bug",
          section_id: "sec-bug",
          title: "Bug: which line is wrong?",
          instructions: "Just identify the buggy line — you don't need to fix it.",
          difficulty: 2,
          topics: ["bugs", "indexing"],
          hints: ["Python uses 0-based indexing.", "len(words) is one MORE than the last valid index."],
          feedback: { correct: "Yes — off-by-one.", incorrect: "Look at how the loop's range is built." },
          payload: {
            code_lines: [
              "words = [\"red\", \"green\", \"blue\"]",
              "for i in range(len(words) + 1):",
              "    print(words[i])"
            ],
            expected_behaviour: "Print each colour on its own line.",
            actual_behaviour: "Crashes with IndexError.",
            mode: "select_line",
            constraint: "in_place",
            bugs: [
              { line: 2, category: "off_by_one" }
            ]
          }
        },

        /* ---------------- PREDICT OUTPUT: free text ---------------- */
        {
          id: "act-po-1",
          type: "predict_output",
          section_id: "sec-predict",
          title: "Predict: simple loop",
          instructions: "What will this code print?",
          difficulty: 2,
          topics: ["loops"],
          hints: ["range(3) gives 0 1 and 2."],
          feedback: { correct: "Yes.", incorrect: "Walk through what i is on each pass." },
          payload: {
            code: "for i in range(3):\n    print(i * 2)",
            direction: "code_to_output",
            mode: "free_text",
            answer: "0\n2\n4",
            accepted_answers: ["0\n2\n4"]
          }
        },

        /* ---------------- PREDICT OUTPUT: with input() ---------------- */
        {
          id: "act-po-input-1",
          type: "predict_output",
          section_id: "sec-predict",
          title: "Predict: with input",
          instructions: "Pretend the user types 7. What will be printed?",
          difficulty: 3,
          topics: ["input", "conditionals"],
          hints: ["input() returns a string.", "int() converts it before the comparison."],
          feedback: { correct: "Good prediction.", incorrect: "Trace through the if/else carefully." },
          runner_inputs: ["7"],
          payload: {
            code: "n = int(input(\"Enter a number: \"))\nif n > 5:\n    print(\"big\")\nelse:\n    print(\"small\")\nprint(\"done\")",
            direction: "code_to_output",
            mode: "free_text",
            answer: "Enter a number: 7\nbig\ndone",
            accepted_answers: ["Enter a number: 7\nbig\ndone", "Enter a number: \nbig\ndone", "big\ndone"]
          }
        },

        /* ---------------- PREDICT OUTPUT: multiple choice ---------------- */
        {
          id: "act-po-mc-1",
          type: "predict_output",
          section_id: "sec-predict",
          title: "Predict (multiple choice): string slicing",
          instructions: "Pick the option that matches what this code prints.",
          difficulty: 2,
          topics: ["strings", "slicing"],
          hints: ["s[1:4] starts at index 1 and stops before index 4."],
          feedback: { correct: "Yes.", incorrect: "Slicing is 'start inclusive, stop exclusive'." },
          payload: {
            code: "s = \"PyQuiz\"\nprint(s[1:4])",
            direction: "code_to_output",
            mode: "multiple_choice",
            answer: "b",
            options: [
              { id: "a", content: "PyQ" },
              { id: "b", content: "yQu" },
              { id: "c", content: "yQui" },
              { id: "d", content: "Qui" }
            ]
          }
        },

        /* ---------------- PREDICT OUTPUT: output → code ---------------- */
        {
          id: "act-po-rev-1",
          type: "predict_output",
          section_id: "sec-predict",
          title: "Match: which code produced this?",
          instructions: "Which of these snippets produced the output shown?",
          difficulty: 3,
          topics: ["loops", "conditionals"],
          hints: ["The output skips one number — which value?"],
          feedback: { correct: "Yes.", incorrect: "Trace each snippet against the output." },
          payload: {
            code: "0\n1\n2\n4",
            direction: "output_to_code",
            mode: "multiple_choice",
            answer: "b",
            options: [
              { id: "a", content: "for i in range(5):\n    print(i)" },
              { id: "b", content: "for i in range(5):\n    if i != 3:\n        print(i)" },
              { id: "c", content: "for i in range(4):\n    print(i)" },
              { id: "d", content: "for i in range(5):\n    if i == 3:\n        print(i)" }
            ]
          }
        },

        /* ---------------- STARTER CHALLENGE ---------------- */
        {
          id: "act-starter-1",
          type: "starter_challenge",
          section_id: "sec-starter",
          title: "Double a number",
          instructions: "Write a function double(n) that returns n doubled.",
          difficulty: 1,
          topics: ["functions"],
          hints: [
            "A function uses the 'def' keyword.",
            "Multiply n by 2 and return the result."
          ],
          feedback: { correct: "Great.", incorrect: "Try again." },
          payload: {
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
        {
          id: "act-starter-2",
          type: "starter_challenge",
          section_id: "sec-starter",
          title: "Guess the number",
          instructions: "Write a guessing game that picks a secret between 1 and 10 and lets the user guess until they get it right.",
          difficulty: 4,
          topics: ["loops", "input", "random"],
          hints: [
            "Use random.randint(1, 10) to pick the number.",
            "A while True loop with a break is the simplest structure.",
            "Convert input() to an int before comparing."
          ],
          feedback: { correct: "Good game logic.", incorrect: "Have another go." },
          runner_inputs: ["5", "8", "7"],
          payload: {
            instructions: "Use random.randint to pick a number between 1 and 10. Read guesses with input() and print 'too low' 'too high' or 'correct'. Stop when the user guesses correctly.",
            starter_code: "import random\n\nsecret = random.randint(1, 10)\n# your code here\n",
            function_name: "",
            example_calls: [],
            model_solution: "import random\n\nsecret = random.randint(1, 10)\nwhile True:\n    guess = int(input(\"Guess: \"))\n    if guess < secret:\n        print(\"too low\")\n    elif guess > secret:\n        print(\"too high\")\n    else:\n        print(\"correct\")\n        break\n",
            self_check_guidance: "Test in your IDE. Try entering a few different guesses to see the messages."
          }
        },
        {
          id: "act-starter-3",
          type: "starter_challenge",
          section_id: "sec-starter",
          title: "Caesar cipher",
          instructions: "Description-only challenge — no starter code given. Solve from scratch in your IDE.",
          difficulty: 5,
          topics: ["strings", "loops", "functions"],
          hints: [
            "ord() turns a character into its ASCII number; chr() turns it back.",
            "Subtract ord('A') first so 'A' is 0, 'B' is 1 etc — that makes the shift easier.",
            "Use the modulo operator (%) so shifts wrap around the alphabet."
          ],
          feedback: { correct: "Nicely done.", incorrect: "Have another go." },
          payload: {
            instructions: "Write encrypt(text, shift) that returns a Caesar-shifted version of text. Letters wrap around the alphabet, case is preserved, and non-letters (spaces, punctuation) are left unchanged.\n\nSample input/output:\n  encrypt(\"Hello, World!\", 3)  →  \"Khoor, Zruog!\"\n  encrypt(\"abc XYZ\", 1)        →  \"bcd YZA\"\n  encrypt(\"Python\", 0)         →  \"Python\"",
            starter_code: "",
            function_name: "encrypt",
            example_calls: [
              { call: "encrypt(\"Hello, World!\", 3)", expected: "Khoor, Zruog!" },
              { call: "encrypt(\"abc XYZ\", 1)",       expected: "bcd YZA" },
              { call: "encrypt(\"Python\", 0)",        expected: "Python" }
            ],
            model_solution: "def encrypt(text, shift):\n    out = []\n    for ch in text:\n        if 'A' <= ch <= 'Z':\n            out.append(chr((ord(ch) - ord('A') + shift) % 26 + ord('A')))\n        elif 'a' <= ch <= 'z':\n            out.append(chr((ord(ch) - ord('a') + shift) % 26 + ord('a')))\n        else:\n            out.append(ch)\n    return ''.join(out)\n",
            self_check_guidance: "Try each example call in your IDE. Try shift=26 — what do you expect?"
          }
        }
      ]
    }
  };
})();
