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
      "starter_challenge"
    ],
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
      starter_challenge: "#0F6E84"
    },
    /* Short user-facing label for each type — used in the task-list pill
       tooltip and the activity header badge. */
    TYPE_LABELS: {
      parsons:           "Parsons",
      cloze:             "Cloze",
      trace_table:       "Trace",
      spot_the_bug:      "Bug",
      modify:            "Modify",
      predict_output:    "Predict",
      starter_challenge: "Challenge"
    }
  };
})();
