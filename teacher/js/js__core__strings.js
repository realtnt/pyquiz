/* === inlined from js/core/strings.js === */
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
       classes can highlight the keys.

       Some types branch on mode/constraint — see helpFor() below.
       The structured `help` map is the catalogue of clips; helpFor()
       picks which clips apply to a given activity. */
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
      /* spot_the_bug + modify clips, indexed by the constraint that
         applies to the activity. helpFor() merges the right subset. */
      spot_the_bug: {
        common_end: [
          "<kbd class=\"kbd-mod\">Ctrl</kbd><span class=\"kbd-plus\">+</span><kbd class=\"kbd-act\">Enter</kbd> to check; once correct press it again to move on."
        ],
        select_line: [
          "Click any line you think is buggy to mark it. Click again to unmark.",
          "Mark every line that needs to change before checking."
        ],
        in_place: [
          "Click any line you think is buggy to mark it.",
          "When the fix box appears the original line is pre-filled — edit just the parts that need changing. <kbd class=\"kbd-act\">Tab</kbd> indents; <kbd class=\"kbd-mod\">Shift</kbd><span class=\"kbd-plus\">+</span><kbd class=\"kbd-act\">Tab</kbd> outdents.",
          "Click the line again to unmark it."
        ],
        add_line: [
          "Hover any code block to reveal a circular <strong>+</strong> at its top and bottom edge.",
          "Click a <strong>+</strong> to insert a new line at that position. Type the new line of code. <kbd class=\"kbd-act\">Tab</kbd> indents; <kbd class=\"kbd-mod\">Shift</kbd><span class=\"kbd-plus\">+</span><kbd class=\"kbd-act\">Tab</kbd> outdents.",
          "Use the ✕ on the inserted line to undo, or click another <strong>+</strong> to move it elsewhere."
        ],
        remove_line: [
          "Click a line to select it then press the 🗑 icon to move it to the Removed line area below.",
          "Only one line at a time can be removed. To pick a different one, click ↩ on the removed line to bring it back, then select another."
        ]
      },
      modify: {
        common_start: [
          "The code already works. Compare the <strong>Current</strong> and <strong>Expected</strong> columns in the Output table to see what needs to change."
        ],
        common_end: [
          "<kbd class=\"kbd-mod\">Ctrl</kbd><span class=\"kbd-plus\">+</span><kbd class=\"kbd-act\">Enter</kbd> to check; once correct press it again to move on."
        ],
        in_place: [
          "Click the line that needs changing — the original line is pre-filled so you can edit just the parts you want different. <kbd class=\"kbd-act\">Tab</kbd> indents; <kbd class=\"kbd-mod\">Shift</kbd><span class=\"kbd-plus\">+</span><kbd class=\"kbd-act\">Tab</kbd> outdents.",
          "Click the line again to undo the selection."
        ],
        add_line: [
          "Hover any code block to reveal a circular <strong>+</strong> at its top and bottom edge.",
          "Click a <strong>+</strong> to insert a new line at that position, then type the code. Use the ✕ to undo."
        ],
        remove_line: [
          "Click a line to select it then press the 🗑 icon to move it to the Removed line area below.",
          "Only one line at a time can be removed. Click ↩ to bring a removed line back."
        ]
      },
      /* predict_output tips are split by mode — multiple_choice and
         free_text — so the student only sees the ones for their input
         widget. */
      predict_output: {
        multiple_choice: [
          "Click the option you think is correct. The selected option highlights so you can see your choice."
        ],
        free_text: [
          "Type the output exactly as the program would print it, including line breaks."
        ],
        common_end: [
          "<kbd class=\"kbd-mod\">Ctrl</kbd><span class=\"kbd-plus\">+</span><kbd class=\"kbd-act\">Enter</kbd> to check; once correct press it again to move on."
        ]
      },
      starter_challenge: [
        "These are independent coding challenges to do in your own IDE.",
        "Copy any starter code with the Copy button, write your solution then run it locally.",
        "Tick the box when you've finished and tested all the example calls.",
        "Hints are available in the side panel; use the 3-press reveal if you want the model solution."
      ],
      testing: [
        "Fill in any cells the teacher left blank. Click a cell and type the value.",
        "For the Test type column pick Normal, Boundary or Erroneous — the marker classifies your input value against the input's type and range.",
        "Boundary values sit at the edges of the valid range or within ±1 of a decision boundary. Erroneous values are the wrong type or outside the valid range.",
        "<kbd class=\"kbd-mod\">Ctrl</kbd><span class=\"kbd-plus\">+</span><kbd class=\"kbd-act\">Enter</kbd> to check; once correct press it again to move on."
      ],
      flowchart: [
        "Each shape in the flowchart has a job. Look at the symbols: ovals are Start/End, rectangles are actions, diamonds are decisions and parallelograms are input/output.",
        "Fill in the blank inputs inside the shapes. The marker checks each blank separately, so you'll see which ones are right.",
        "Follow the arrows from Start. At a decision, Yes and No take different paths.",
        "<kbd class=\"kbd-mod\">Ctrl</kbd><span class=\"kbd-plus\">+</span><kbd class=\"kbd-act\">Enter</kbd> to check; once correct press it again to move on."
      ]
    },

    /* helpFor(activity) — given an activity, return the array of help
       tips that actually apply. For static types this is just the
       per-type array; for activity-dependent types (spot_the_bug,
       modify, predict_output) we assemble tips from the structured
       sub-objects so a remove_line activity doesn't show "type the
       fix" instructions, etc. */
    helpFor: function (activity) {
      if (!activity) return [];
      const h = this.help || {};
      const block = h[activity.type];
      if (!block) return [];
      // Static array — return as-is.
      if (Array.isArray(block)) return block.slice();

      // Activity-dependent block (object with mode/constraint keys).
      const payload = activity.payload || {};
      const out = [];
      if (block.common_start) out.push.apply(out, block.common_start);

      if (activity.type === "spot_the_bug" || activity.type === "modify") {
        let c = payload.constraint || "in_place";
        if (c === "none" || c === "one_line" || c === "one_char") c = "in_place";
        if (c === "add_line") {
          out.push.apply(out, block.add_line || []);
        } else if (c === "remove_line") {
          out.push.apply(out, block.remove_line || []);
        } else if (payload.mode === "select_line") {
          out.push.apply(out, block.select_line || []);
        } else {
          // Default: in-place select-and-fix or rewrite.
          out.push.apply(out, block.in_place || []);
        }
      } else if (activity.type === "predict_output") {
        const m = payload.mode || "free_text";
        if (m === "multiple_choice") {
          out.push.apply(out, block.multiple_choice || []);
        } else {
          out.push.apply(out, block.free_text || []);
        }
      }

      if (block.common_end) out.push.apply(out, block.common_end);
      return out;
    }
  };
})();
