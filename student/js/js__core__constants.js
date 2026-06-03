/* === inlined from js/core/constants.js === */
/* =====================================================================
 * PyQuiz.Constants — version tags, type registry constants
 *
 * Public API:
 *   PyQuiz.Constants.SCHEMA_VERSION        — semver-ish string, bumped when
 *                                            activity field shapes change
 *   PyQuiz.Constants.PACK_FORMAT_VERSION   — bumped when encoding pipeline /
 *                                            storage layout changes
 *   PyQuiz.Constants.SCHEMA_HASH           — short fingerprint embedded in
 *                                            built files for drift detection
 *   PyQuiz.Constants.ACTIVITY_TYPES        — array of valid type names
 *
 * Bump SCHEMA_VERSION and PACK_FORMAT_VERSION independently.
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});

  PyQuiz.Constants = {
    SCHEMA_VERSION: "0.1",
    PACK_FORMAT_VERSION: "0.1",
    SCHEMA_HASH: "v0.1-2026-05",
    ACTIVITY_TYPES: [
      "parsons",
      "cloze",
      "trace_table",
      "spot_the_bug",
      "modify",
      "predict_output",
      "starter_challenge",
      "testing",
      "flowchart"
    ],
    /* The renderer version each activity type is CURRENTLY authored against.
       Bump a type's number by one whenever its renderer changes in a way that
       could affect how older packs render, and register the new renderer with
       that version. New/imported activities are stamped with these numbers;
       the registry falls back to the nearest older renderer for old packs. */
    CURRENT_RENDERER_VERSION: {
      parsons: 1, cloze: 1, trace_table: 1, spot_the_bug: 1, modify: 1,
      predict_output: 1, starter_challenge: 1, testing: 1, flowchart: 1
    },
    /* Default colour-coding for each activity type. Teachers can override
       per-activity via the optional `colour` field. All chosen to meet
       WCAG AA against the off-white pane background as a small pill or
       3px bar accent. */
    TYPE_COLOURS: {
      parsons:           "#2D5BA6",
      cloze:             "#1E6E3C",
      trace_table:       "#8A5A00",
      spot_the_bug:      "#B12A38",
      modify:            "#D97706",   /* warm orange — distinct from bug red */
      predict_output:    "#7B2D6B",
      starter_challenge: "#0F6E84",
      testing:           "#5C7A2D",  /* sage green — distinct from cloze and trace */
      flowchart:         "#5E3A9A"   /* deep purple — distinct from all other types */
    },
    /* Short user-facing label for each type — used in the activity
       header badge, settings dialog, etc. Long form so it's clear in
       isolation. */
    TYPE_LABELS: {
      parsons:           "Parsons",
      cloze:             "Cloze",
      trace_table:       "Trace",
      spot_the_bug:      "Bug",
      modify:            "Modify",
      predict_output:    "Predict",
      starter_challenge: "Challenge",
      testing:           "Testing",
      flowchart:         "Flowchart"
    },
    /* How each activity TYPE works (the mechanics). Shown in the help
       modal opened from the activity-type tag. The Brief pane carries the
       exercise-specific task; this carries the "how to play" mechanics. */
    TYPE_HELP: {
      predict_output:    { icon: "📋", text: "Read the code and work out what it prints. Either type the output exactly — one line of output per line — or pick the matching option. Press Check when you're done." },
      cloze:             { icon: "✏️", text: "The code has gaps. Fill each one — by typing, choosing from a drop-down, or dragging a word from the bank. Tap a filled gap to clear it. Indentation and spelling matter." },
      parsons:           { icon: "🧩", text: "The lines are shuffled. Drag them by the handle into the correct order in the code window — indentation matters. Any lines that don't belong go in the Bin." },
      trace_table:       { icon: "📊", text: "Step through the code line by line and record the value of each variable (and any output) after each line runs. Leave a cell blank if it doesn't change on that step." },
      spot_the_bug:      { icon: "🐞", text: "The code doesn't behave as it should. Find the line at fault — then, depending on the task, click it, fix it in place, or move it to the Bin to remove it." },
      modify:            { icon: "🔧", text: "Change the working code so it meets the new requirement in the Brief — edit a line in place, add a new line, or remove one. The Brief says what the new behaviour should be." },
      testing:           { icon: "🧪", text: "Build a test-data table. Every row needs an Expected output, plus ONE of: a Test value (then choose its Type of test) or a Type of test (then enter a value of that kind). Complete the highlighted cells — the marker checks your value against the input's type and range." },
      flowchart:         { icon: "🔀", text: "Complete the flowchart by filling the blank shapes — some are text boxes, some are drop-downs. Use the expected output or trace in the Brief to work out the missing values." },
      starter_challenge: { icon: "🚀", text: "An open task you complete in your own editor. Copy the starter code, write your solution, and check it against the example calls. Tick to mark it done when you're happy." }
    },
    /* 3-letter abbreviations for compact pills in the task list of both
       apps. The task-list pane is narrow and a row with a long type
       label crowds out the activity title. The full label is still
       used as the pill's tooltip (title attr) for accessibility. */
    TYPE_ABBREV: {
      parsons:           "par",
      cloze:             "clo",
      trace_table:       "tra",
      spot_the_bug:      "bug",
      modify:            "mod",
      predict_output:    "pre",
      starter_challenge: "cha",
      testing:           "tst",
      flowchart:         "flw"
    }
  };
})();
