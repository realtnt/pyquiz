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
