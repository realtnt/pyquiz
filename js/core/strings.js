/* =====================================================================
 * PyQuiz.Strings — single source for all UI strings
 *
 * All UI strings live here for future localisation. British English.
 * No comma before "and" or "or" in lists.
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});

  PyQuiz.Strings = {
    appNameStudent: "PyQuiz — Student",
    appNameTeacher: "PyQuiz — Teacher",

    // Common actions
    check: "Check",
    next: "Next",
    reset: "Reset",
    showHint: "Show hint",
    revealSolution: "Reveal solution",
    copyCode: "Copy code",
    copied: "Copied to clipboard",
    loadPack: "Load pack",
    exportProgress: "Export progress",
    importProgress: "Import progress",
    settings: "Settings",
    cancel: "Cancel",
    save: "Save",
    close: "Close",
    apply: "Apply",
    remove: "Remove",

    // Feedback defaults
    correctDefault: "Correct.",
    incorrectDefault: "Not quite — have another go.",

    // Statuses
    notStarted: "Not started",
    inProgress: "In progress",
    correct: "Correct",
    incorrect: "Incorrect",
    revealed: "Revealed",

    // Sections
    hint: "Hint",
    context: "Context",
    instructions: "Instructions",
    feedback: "Feedback",

    // Parsons areas
    sourceArea: "Source",
    solutionArea: "Solution",
    discardArea: "Discard",

    // Banners
    storageBanner: "Progress will be lost when you close this tab. Use Export Progress to save it.",
    storageBannerTeacher: "Local storage is unavailable. Use Export to save your work.",
    encodedPackWarning: "Encoded packs hide answers from casual inspection but are not secure. For assessed work use the future online mode.",

    // Teacher
    newPack: "New pack",
    openDraft: "Open draft",
    exportTeacher: "Export teacher JSON",
    exportStudent: "Export student pack",
    validate: "Validate",
    preview: "Preview as student",
    addActivity: "Add activity",
    packTitle: "Pack title",
    description: "Description",
    audience: "Audience",
    saved: "Saved",
    saving: "Saving…",
    unsaved: "Unsaved changes",
    storageUnavailable: "Local storage unavailable — export to save",
    noActivities: "No activities yet. Add one to get started.",
    selectActivityType: "Choose activity type",
    errorsBlockExport: "Fix errors before exporting.",

    /* ------ Per-type help (shown by default in the side panel) ------
       Generic tips that apply to every activity of this type — not
       specific to the current problem. Short bullets. Inline HTML is
       allowed in these strings because they come from this trusted
       source (not from the pack or the user); the renderer uses
       innerHTML so <kbd> pills with the .kbd-mod / .kbd-act / .kbd-dir
       classes can highlight the keys. */
    help: {
      parsons: [
        "Click a line to select it. Use the bin icon (or press <kbd class=\"kbd-dir\">→</kbd>) to move it to the bin.",
        "In the bin, click a line then use the ↩ icon (or press <kbd class=\"kbd-dir\">←</kbd>) to send it back to the program.",
        "<kbd class=\"kbd-dir\">↑</kbd><span class=\"kbd-plus\">/</span><kbd class=\"kbd-dir\">↓</kbd> moves the selection; <kbd class=\"kbd-mod\">Shift</kbd><span class=\"kbd-plus\">+</span><kbd class=\"kbd-dir\">↑</kbd><span class=\"kbd-plus\">/</span><kbd class=\"kbd-dir\">↓</kbd> reorders the lines within the area.",
        "<kbd class=\"kbd-mod\">Ctrl</kbd><span class=\"kbd-plus\">+</span><kbd class=\"kbd-act\">Enter</kbd> to check; once correct press it again to move to the next task."
      ],
      cloze: [
        "Click a word in the bank to drop it into the next empty blank in template order.",
        "Click a placed word in a blank to send it back to the bank.",
        "Free-text blanks accept typed answers; drop-down blanks have a fixed list of options.",
        "<kbd class=\"kbd-mod\">Ctrl</kbd><span class=\"kbd-plus\">+</span><kbd class=\"kbd-act\">Enter</kbd> to check; once correct press it again to move on."
      ],
      trace_table: [
        "Click a cell and type the value. Empty cells mean 'unchanged from the previous row'.",
        "Use the + button to add a new row. Each row represents a step where a variable changes.",
        "<kbd class=\"kbd-act\">Tab</kbd> moves to the next cell; <kbd class=\"kbd-act\">Enter</kbd> advances to the next row.",
        "<kbd class=\"kbd-mod\">Ctrl</kbd><span class=\"kbd-plus\">+</span><kbd class=\"kbd-act\">Enter</kbd> to check; redundant 'no change' rows are accepted by the marker."
      ],
      spot_the_bug: [
        "Click any line you think is buggy to mark it.",
        "When a fix box appears type the corrected code. <kbd class=\"kbd-act\">Tab</kbd> indents; <kbd class=\"kbd-mod\">Shift</kbd><span class=\"kbd-plus\">+</span><kbd class=\"kbd-act\">Tab</kbd> outdents.",
        "Click the line again to unmark it.",
        "<kbd class=\"kbd-mod\">Ctrl</kbd><span class=\"kbd-plus\">+</span><kbd class=\"kbd-act\">Enter</kbd> to check; once correct press it again to move on."
      ],
      modify: [
        "The code already works. Read the 'Currently' / 'Required' note and find the line you need to change.",
        "Click the line that needs changing then type the new version. <kbd class=\"kbd-act\">Tab</kbd> indents; <kbd class=\"kbd-mod\">Shift</kbd><span class=\"kbd-plus\">+</span><kbd class=\"kbd-act\">Tab</kbd> outdents.",
        "Click the line again to undo the selection.",
        "<kbd class=\"kbd-mod\">Ctrl</kbd><span class=\"kbd-plus\">+</span><kbd class=\"kbd-act\">Enter</kbd> to check; once correct press it again to move on."
      ],
      predict_output: [
        "Multiple choice: click the option you think is correct (highlight shows your choice).",
        "Free text: type the output exactly as the program would print it including line breaks.",
        "<kbd class=\"kbd-mod\">Ctrl</kbd><span class=\"kbd-plus\">+</span><kbd class=\"kbd-act\">Enter</kbd> to check; once correct press it again to move on."
      ],
      starter_challenge: [
        "These are independent coding challenges to do in your own IDE.",
        "Copy any starter code with the Copy button, write your solution then run it locally.",
        "Tick the box when you've finished and tested all the example calls.",
        "Hints are available in the side panel; use the 3-press reveal if you want the model solution."
      ]
    }
  };
})();
