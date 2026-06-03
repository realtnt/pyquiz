/* === inlined from js/renderers/spot_the_bug.js === */
/* =====================================================================
 * PyQuiz.Renderers — "spot_the_bug" and "modify"
 *
 * Renders a numbered list of code lines plus per-line controls that
 * depend on the activity's `constraint`:
 *
 *   • in_place    — "select + edit-in-place" UI. Click a line to mark
 *     it, edit the replacement inline. The student may modify any
 *     number of lines (each one declared as a separate bug). How much
 *     the student should change is communicated via the activity's
 *     instructions, not via a schema flag.
 *   • add_line    — each code block shows a circular floating "+" at
 *     its top and bottom edges on hover. Clicking either inserts a
 *     single editable line at that position. Only one insertion is
 *     allowed at a time.
 *   • remove_line — Parsons-like paradigm. Click a block to select it;
 *     a 🗑 icon appears on the right; clicking it moves the line into
 *     a "Removed line" bin area below the program. Clicking a binned
 *     line reveals ↩ to bring it back.
 *
 * Legacy values none/one_line/one_char are silently aliased to
 * in_place since they always shared the same runtime branch.
 *
 * Response shapes:
 *
 *   in_place    → { selected_lines: [4, 7], fixes: { "4": "...", "7": "..." } }
 *   add_line    → { inserted: { after: 2, content: "    x = 1" } }
 *   remove_line → { removed: 3 }
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const DOM = PyQuiz.DOM;

  function renderBugOrModify(activity, host, cb) {
    const isModify = activity.type === "modify";
    const p = activity.payload || {};
    const codeLines = p.code_lines || [];
    const mode = p.mode || "select_and_fix";
    let constraint = p.constraint || "in_place";
    if (constraint === "none" || constraint === "one_line" || constraint === "one_char") {
      constraint = "in_place";
    }

    const root = DOM.el("div", { class: "stb" + (isModify ? " stb-modify" : "") });

    /* The Required/Currently prose block and the constraint banner used
       to live here. Both have been removed: the standardised I/O panel
       above the activity body now shows current vs expected output,
       and the constraint's UI (in-place edit, + buttons, or ✕ buttons)
       makes the rule visually obvious. Keeping all three created
       redundant noise that the user explicitly flagged. */

    /* Branch on constraint. Each branch returns a controller; we wrap
       the result so the outer module signature stays uniform. */
    if (constraint === "add_line")    return renderAddLine(activity, root, host, cb, codeLines);
    if (constraint === "remove_line") return renderRemoveLine(activity, root, host, cb, codeLines);
    return renderInPlace(activity, root, host, cb, codeLines, mode);
  }

  /* ------------------------------------------------------------------
     Original in-place edit UI. Lifted directly from the pre-existing
     renderer so existing packs that use none/one_line/one_char still
     work. The behaviour summary block at the top is now rendered by
     the parent so this function only deals with the code list itself.
     ------------------------------------------------------------------ */
  function renderInPlace(activity, root, host, cb, codeLines, mode) {
    const selected = new Set();
    const fixes = {};
    const list = DOM.el("ol", { class: "stb-code", "aria-label": "Code with line selection" });

    codeLines.forEach((src, i) => {
      const lineNum = i + 1;
      const li = DOM.el("li", {
        class: "stb-line",
        "data-line": String(lineNum),
        role: "button", tabindex: "0", "aria-pressed": "false",
        "aria-label": "Line " + lineNum + ": click to mark as buggy"
      });
      li.appendChild(DOM.el("span", { class: "code-ln" }, String(lineNum)));
      li.appendChild(DOM.el("code", { class: "code-src" }, src));
      li.addEventListener("click", function (ev) {
        if (ev.target.closest(".stb-fix")) return;
        toggleLine(lineNum);
      });
      li.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          if (ev.target.closest(".stb-fix")) return;
          ev.preventDefault();
          toggleLine(lineNum);
        }
      });
      if (mode === "select_and_fix" || mode === "rewrite") {
        const fixWrap = DOM.el("div", { class: "stb-fix", hidden: "" });
        const INDENT_UNIT = 4;
        let indentLevel = Math.floor((codeLines[lineNum - 1] || "").match(/^( *)/)[1].length / INDENT_UNIT);
        const indentSpan = DOM.el("span", { class: "stb-fix-indent", "aria-hidden": "true" });
        const fixInput = DOM.el("input", {
          type: "text", class: "stb-fix-input",
          "aria-label": "Replacement for line " + lineNum,
          placeholder: "Fixed code…", autocomplete: "off", spellcheck: "false"
        });
        function refreshIndent() {
          indentSpan.textContent = " ".repeat(indentLevel * INDENT_UNIT);
          fixes[lineNum] = " ".repeat(indentLevel * INDENT_UNIT) + (fixInput.value || "");
          if (cb.onChange) cb.onChange(snapshot());
        }
        function nudge(d) { indentLevel = Math.max(0, indentLevel + d); refreshIndent(); }
        fixInput.addEventListener("input", refreshIndent);
        fixInput.addEventListener("keydown", function (ev) {
          if (ev.key === "Tab") { ev.preventDefault(); nudge(ev.shiftKey ? -1 : 1); }
        });
        const grip = DOM.el("span", { class: "stb-fix-grip", "aria-hidden": "true", title: "Drag to adjust indent" }, "⋮⋮");
        let dx = null, dl = 0;
        function down(ev) { dx = ev.clientX != null ? ev.clientX : (ev.touches && ev.touches[0].clientX); dl = indentLevel;
          document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
          document.addEventListener("touchmove", move, { passive: false }); document.addEventListener("touchend", up);
          fixWrap.classList.add("dragging"); ev.preventDefault(); }
        function move(ev) { if (dx == null) return;
          const x = ev.clientX != null ? ev.clientX : (ev.touches && ev.touches[0].clientX); if (x == null) return;
          if (ev.preventDefault) ev.preventDefault();
          const STEP = 24; const delta = Math.round((x - dx) / STEP);
          const nl = Math.max(0, dl + delta);
          if (nl !== indentLevel) { indentLevel = nl; refreshIndent(); } }
        function up() { dx = null;
          document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up);
          document.removeEventListener("touchmove", move); document.removeEventListener("touchend", up);
          fixWrap.classList.remove("dragging"); }
        grip.addEventListener("mousedown", down); grip.addEventListener("touchstart", down);
        indentSpan.textContent = " ".repeat(indentLevel * INDENT_UNIT);
        fixWrap.appendChild(indentSpan); fixWrap.appendChild(fixInput); fixWrap.appendChild(grip);
        li.appendChild(fixWrap);
      }
      list.appendChild(li);
    });
    root.appendChild(list);

    function toggleLine(n) {
      const li = list.querySelector('li[data-line="' + n + '"]');
      if (selected.has(n)) {
        selected.delete(n);
        li.classList.remove("marked");
        li.setAttribute("aria-pressed", "false");
        const fw = li.querySelector(".stb-fix"); if (fw) fw.setAttribute("hidden", "");
        delete fixes[n];
      } else {
        selected.add(n);
        li.classList.add("marked");
        li.setAttribute("aria-pressed", "true");
        const fw = li.querySelector(".stb-fix");
        if (fw) {
          fw.removeAttribute("hidden");
          const inp = fw.querySelector("input");
          /* Pre-fill the fix box with the original line content when
             the student first opens it. Modify/bug tasks usually need
             only small edits (e.g. "Ada" → "Grace"), so starting from
             a blank box forces them to retype the whole line. We only
             prefill on FIRST open — never overwrite content that's
             already there (either a previous typed fix or a restored
             response from local storage). The split between indent
             span and input mirrors the existing layout: leading spaces
             go in the indent span so the grip drag works, the rest in
             the input. */
          if (inp && !inp.value && fixes[n] == null) {
            const orig = codeLines[n - 1] || "";
            const m = orig.match(/^( *)(.*)$/);
            const rest = (m && m[2]) || "";
            inp.value = rest;
            /* Drive the existing input handler so fixes[n] and the
               snapshot stay in sync — same code path as user typing. */
            inp.dispatchEvent(new Event("input", { bubbles: true }));
          }
          if (inp) inp.focus();
        }
      }
      if (cb.onChange) cb.onChange(snapshot());
    }
    function snapshot() {
      return { selected_lines: Array.from(selected).sort((a, b) => a - b), fixes: Object.assign({}, fixes) };
    }

    host.appendChild(root);

    return {
      getResponse: snapshot,
      setResponse: function (r) {
        if (!r) return;
        selected.clear();
        for (const k of Object.keys(fixes)) delete fixes[k];
        (r.selected_lines || []).forEach(n => {
          selected.add(n);
          const li = list.querySelector('li[data-line="' + n + '"]');
          if (!li) return;
          li.classList.add("marked"); li.setAttribute("aria-pressed", "true");
          const fw = li.querySelector(".stb-fix"); if (fw) fw.removeAttribute("hidden");
        });
        for (const k of Object.keys(r.fixes || {})) {
          fixes[k] = r.fixes[k];
          const li = list.querySelector('li[data-line="' + k + '"]');
          if (li) {
            const fi = li.querySelector("input"); const idSp = li.querySelector(".stb-fix-indent");
            const m = String(r.fixes[k] || "").match(/^( *)(.*)$/);
            const indent = (m && m[1]) || ""; const rest = (m && m[2]) || "";
            if (fi) fi.value = rest; if (idSp) idSp.textContent = indent;
          }
        }
      },
      reset: function () {
        selected.clear();
        for (const k of Object.keys(fixes)) delete fixes[k];
        list.querySelectorAll(".stb-line").forEach(li => {
          li.classList.remove("marked"); li.setAttribute("aria-pressed", "false");
          const fw = li.querySelector(".stb-fix"); if (fw) fw.setAttribute("hidden", "");
          const inp = li.querySelector(".stb-fix-input"); if (inp) inp.value = "";
          const idSp = li.querySelector(".stb-fix-indent");
          if (idSp) {
            const lineNum = parseInt(li.getAttribute("data-line"), 10);
            const orig = (codeLines[lineNum - 1] || "").match(/^( *)/);
            idSp.textContent = (orig && orig[1]) || "";
          }
        });
      },
      highlight: function (per_part) {
        /* per_part === null means "clear all highlight state" — used
           when the student changes a previously-checked response. */
        if (per_part === null) {
          list.querySelectorAll(".stb-line").forEach(li => li.classList.remove("mark-ok", "mark-bad"));
          return;
        }
        if (per_part && per_part.fixes) {
          for (const ln of Object.keys(per_part.fixes)) {
            const li = list.querySelector('li[data-line="' + ln + '"]');
            if (li) { li.classList.remove("mark-ok", "mark-bad"); li.classList.add(per_part.fixes[ln] ? "mark-ok" : "mark-bad"); }
          }
        }
      },
      focus: function () { const first = list.querySelector(".stb-line"); if (first) first.focus(); }
    };
  }

  /* ------------------------------------------------------------------
     ADD-LINE constraint: read-only existing code with "+" buttons in
     the gaps between (and around) lines. Clicking a "+" inserts a
     single editable line at that position. Inserting a second "+"
     replaces the first — the constraint allows exactly one new line.
     Response: { inserted: { after: <0..N>, content: "    x = 1" } }
     where `after` is the 1-indexed line number AFTER which the new
     line sits. `after: 0` means inserted at the very top.
     ------------------------------------------------------------------ */
  function renderAddLine(activity, root, host, cb, codeLines) {
    /* `inserted` tracks the current insertion state. null = none yet. */
    let inserted = null;   // { after: number, content: string }
    let activeRow = null;  // <li> of the inserted line, if visible

    const list = DOM.el("ol", { class: "stb-code stb-add", "aria-label": "Code with insertion points" });

    /* Build a code-line block with two floating "+" circles attached
       — one at the top edge (inserts BEFORE this line), one at the
       bottom (inserts AFTER). Both fade in when the block is hovered
       or focused. The circles overlap with adjacent blocks' circles
       (e.g. block 1's "+below" and block 2's "+above" both insert at
       position 1) which is fine — only the hovered block's pair is
       visible at any moment, so the student perceives them as the
       block's own insertion points. */
    function makeCodeRow(src, i) {
      const lineNum = i + 1;
      const li = DOM.el("li", {
        class: "stb-line stb-line-readonly stb-add-block",
        "data-line": String(lineNum)
      });
      li.appendChild(DOM.el("span", { class: "code-ln" }, String(lineNum)));
      li.appendChild(DOM.el("code", { class: "code-src" }, src));

      /* Top "+" — inserts before this block, i.e. at position (i). */
      const plusTop = DOM.el("button", {
        type: "button",
        class: "stb-add-plus stb-add-plus-top",
        "aria-label": "Insert a new line above line " + lineNum,
        title: "Insert a new line above"
      }, "+");
      plusTop.addEventListener("click", function (ev) { ev.stopPropagation(); insertAt(i); });
      /* Bottom "+" — inserts after this block, position (i + 1). */
      const plusBot = DOM.el("button", {
        type: "button",
        class: "stb-add-plus stb-add-plus-bottom",
        "aria-label": "Insert a new line below line " + lineNum,
        title: "Insert a new line below"
      }, "+");
      plusBot.addEventListener("click", function (ev) { ev.stopPropagation(); insertAt(i + 1); });
      li.appendChild(plusTop);
      li.appendChild(plusBot);
      return li;
    }

    /* Render the full list — code rows only, no gap rows. The "+"
       circles live on the blocks themselves. */
    function fullRender() {
      list.innerHTML = "";
      codeLines.forEach((src, i) => list.appendChild(makeCodeRow(src, i)));
      if (inserted) showInsertedAt(inserted.after, inserted.content);
    }

    /* Insert an editable new-line row at position `after` (0-indexed
       in terms of "lines BEFORE this one"). Place it as a sibling in
       the <ol> at the right index. The new row has its own visible
       presence in the listing rather than being a hover-only thing. */
    function showInsertedAt(after, content) {
      const newRow = DOM.el("li", {
        class: "stb-line stb-line-inserted",
        "data-inserted-after": String(after)
      });
      newRow.appendChild(DOM.el("span", { class: "code-ln stb-ln-new", title: "New line" }, "+"));
      const INDENT_UNIT = 4;
      const m = String(content || "").match(/^( *)(.*)$/);
      let indentLevel = Math.floor(((m && m[1]) || "").length / INDENT_UNIT);
      const indentSpan = DOM.el("span", { class: "stb-fix-indent", "aria-hidden": "true" });
      const inp = DOM.el("input", {
        type: "text", class: "stb-fix-input stb-add-input",
        "aria-label": "New line to insert after line " + after,
        placeholder: "Type the new line of code…",
        autocomplete: "off", spellcheck: "false"
      });
      inp.value = (m && m[2]) || "";
      function refresh() {
        indentSpan.textContent = " ".repeat(indentLevel * INDENT_UNIT);
        inserted = { after: after, content: " ".repeat(indentLevel * INDENT_UNIT) + (inp.value || "") };
        if (cb.onChange) cb.onChange(snapshot());
      }
      inp.addEventListener("input", refresh);
      inp.addEventListener("keydown", function (ev) {
        if (ev.key === "Tab") {
          ev.preventDefault();
          indentLevel = Math.max(0, indentLevel + (ev.shiftKey ? -1 : 1));
          refresh();
        }
      });
      const remove = DOM.el("button", {
        type: "button", class: "stb-add-remove",
        title: "Remove this inserted line", "aria-label": "Remove inserted line"
      }, "✕");
      remove.addEventListener("click", function () { clearInsertion(); });
      indentSpan.textContent = " ".repeat(indentLevel * INDENT_UNIT);
      newRow.appendChild(indentSpan);
      newRow.appendChild(inp);
      newRow.appendChild(remove);

      /* Splice into the <ol> at index `after` (after `after` existing
         code rows). `after === 0` means top; `after === N` means end. */
      const existingRows = list.querySelectorAll(".stb-add-block");
      if (after >= existingRows.length) {
        list.appendChild(newRow);
      } else {
        list.insertBefore(newRow, existingRows[after]);
      }
      activeRow = newRow;
      inp.focus();
      refresh();
    }

    function insertAt(after) {
      /* Constraint: exactly one insertion. If one already exists, move
         it to the new position rather than confusing the student with
         a hard "no, only one" error. Preserve the content the student
         had already typed. */
      const existing = inserted ? inserted.content : "";
      inserted = null;
      fullRender();
      showInsertedAt(after, existing);
    }
    function clearInsertion() {
      inserted = null;
      activeRow = null;
      fullRender();
      if (cb.onChange) cb.onChange(snapshot());
    }
    function snapshot() {
      return inserted ? { inserted: { after: inserted.after, content: inserted.content } } : { inserted: null };
    }

    fullRender();
    root.appendChild(list);
    host.appendChild(root);

    return {
      getResponse: snapshot,
      setResponse: function (r) {
        if (r && r.inserted) { inserted = { after: r.inserted.after, content: r.inserted.content || "" }; }
        else { inserted = null; }
        fullRender();
      },
      reset: clearInsertion,
      highlight: function (per_part) {
        if (per_part === null) {
          if (activeRow) activeRow.classList.remove("mark-ok", "mark-bad");
          return;
        }
        if (!activeRow) return;
        activeRow.classList.remove("mark-ok", "mark-bad");
        if (per_part && per_part.inserted_ok != null) {
          activeRow.classList.add(per_part.inserted_ok ? "mark-ok" : "mark-bad");
        }
      },
      focus: function () {
        const inp = list.querySelector(".stb-add-input"); if (inp) { inp.focus(); return; }
        const block = list.querySelector(".stb-add-block"); if (block) block.focus();
      }
    };
  }

  /* ------------------------------------------------------------------
     REMOVE-LINE constraint: each code line has a small "✕" on the
     right. Clicking marks the line for removal (visually struck
     through). Clicking again on the removed line restores it. Only
     ONE removal is allowed; clicking ✕ on a different line moves the
     selection.
     Response: { removed: <lineNumber> | null }
     ------------------------------------------------------------------ */
  function renderRemoveLine(activity, root, host, cb, codeLines) {
    /* Parsons-style remove-line UI. Each code line is a clickable
       block. Clicking it selects the block (orange border) and reveals
       a small 🗑 action button on the right; clicking 🗑 moves the
       line into a "Removed line" bin area at the bottom. Clicking a
       binned line reveals an ↩ icon to bring it back. Only ONE line
       can sit in the bin at a time — moving a second line replaces
       the first.

       This mirrors the Parsons distractor bin paradigm so students
       have a single mental model for "I think this block doesn't
       belong here" across activity types. */
    let removed = null;   // line number currently in the bin (or null)
    let selected = null;  // line number currently selected (showing action icon)

    /* Build the structure: program area (active lines) + bin area
       (removed line). */
    const programArea = DOM.el("ol", {
      class: "stb-code stb-remove",
      "aria-label": "Code — click a line to select, then use the bin icon to remove it"
    });
    const binSection = DOM.el("div", { class: "stb-remove-bin-section" });
    binSection.appendChild(DOM.el("div", { class: "stb-remove-bin-label" }, "Bin"));
    const binArea = DOM.el("ol", {
      class: "stb-code stb-remove-bin",
      "aria-label": "Removed line — click to bring it back"
    });
    /* Empty-state placeholder so the bin reads as a meaningful drop
       target even when nothing is in it. */
    const binPlaceholder = DOM.el("li", { class: "stb-bin-empty" }, "Click a 🗑 above to remove a line.");
    binArea.appendChild(binPlaceholder);
    binSection.appendChild(binArea);

    function makeLineBlock(lineNum) {
      const src = codeLines[lineNum - 1] || "";
      const li = DOM.el("li", {
        class: "stb-line stb-line-block",
        "data-line": String(lineNum),
        role: "button",
        tabindex: "0",
        "aria-label": "Line " + lineNum + ": " + src
      });
      li.appendChild(DOM.el("span", { class: "code-ln" }, String(lineNum)));
      li.appendChild(DOM.el("code", { class: "code-src" }, src));
      /* The action icon is only inserted on selection — keeps the
         visual quiet until the student commits to a line. Two distinct
         icons depending on which area the line is currently in. */
      li.addEventListener("click", function (ev) {
        if (ev.target.closest(".stb-line-action")) return;
        selectLine(lineNum);
      });
      li.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          if (ev.target.closest(".stb-line-action")) return;
          ev.preventDefault();
          selectLine(lineNum);
        }
      });
      return li;
    }

    /* Mark a line as selected: clear any previous selection, show the
       appropriate action icon (🗑 in program, ↩ in bin). */
    function selectLine(n) {
      if (selected === n) {
        /* Clicking an already-selected block deselects it. */
        clearSelection();
        return;
      }
      clearSelection();
      selected = n;
      const li = findBlock(n);
      if (!li) return;
      li.classList.add("selected");
      const inBin = (removed === n);
      const action = makeActionIcon(n, inBin);
      li.appendChild(action);
    }
    function clearSelection() {
      if (selected == null) return;
      const li = findBlock(selected);
      if (li) {
        li.classList.remove("selected");
        const act = li.querySelector(".stb-line-action");
        if (act) act.remove();
      }
      selected = null;
    }
    function findBlock(n) {
      return root.querySelector('.stb-line-block[data-line="' + n + '"]');
    }
    function makeActionIcon(lineNum, inBin) {
      const btn = DOM.el("button", {
        type: "button",
        class: "stb-line-action",
        "aria-label": inBin ? "Bring this line back" : "Remove this line",
        title:        inBin ? "Bring this line back" : "Remove this line",
        draggable: "false"
      });
      btn.textContent = inBin ? "↩" : "🗑";
      btn.addEventListener("mousedown", function (ev) { ev.stopPropagation(); });
      btn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        if (inBin) restoreLine(lineNum);
        else        moveToBin(lineNum);
      });
      return btn;
    }

    function moveToBin(n) {
      /* If something is already in the bin, restore it first — only one
         line at a time. Resetting selected here too because we move
         the DOM node into the bin which loses any "selected" tracking
         done by the previous selection. */
      if (removed != null && removed !== n) restoreLine(removed);
      removed = n;
      selected = null;
      rebuild();
      if (cb.onChange) cb.onChange(snapshot());
      /* Move focus to the binned block so keyboard users can immediately
         restore it if they made a mistake. */
      const li = findBlock(n);
      if (li) li.focus();
    }
    function restoreLine(n) {
      if (removed !== n) return;
      removed = null;
      selected = null;
      rebuild();
      if (cb.onChange) cb.onChange(snapshot());
      const li = findBlock(n);
      if (li) li.focus();
    }

    /* Rebuild both lists from scratch — simpler than splicing DOM
       nodes around since selection state is tracked separately. */
    function rebuild() {
      programArea.innerHTML = "";
      binArea.innerHTML = "";
      codeLines.forEach(function (_, i) {
        const ln = i + 1;
        if (ln === removed) return;   /* this one is in the bin */
        programArea.appendChild(makeLineBlock(ln));
      });
      if (removed != null) {
        binArea.appendChild(makeLineBlock(removed));
      } else {
        binArea.appendChild(binPlaceholder);
      }
    }

    function snapshot() { return { removed: removed }; }

    rebuild();
    root.appendChild(programArea);
    root.appendChild(binSection);
    host.appendChild(root);

    return {
      getResponse: snapshot,
      setResponse: function (r) {
        removed = (r && r.removed) || null;
        selected = null;
        rebuild();
      },
      reset: function () {
        removed = null;
        selected = null;
        rebuild();
        if (cb.onChange) cb.onChange(snapshot());
      },
      highlight: function (per_part) {
        /* Clear any previous tick marks first. */
        root.querySelectorAll(".stb-line-block").forEach(function (li) {
          li.classList.remove("mark-ok", "mark-bad");
        });
        if (per_part === null) return;
        if (per_part && per_part.removed_ok != null && removed != null) {
          const li = findBlock(removed);
          if (li) li.classList.add(per_part.removed_ok ? "mark-ok" : "mark-bad");
        }
      },
      focus: function () {
        const first = programArea.querySelector(".stb-line-block");
        if (first) first.focus();
      }
    };
  }

  PyQuiz.Renderers.register("spot_the_bug", renderBugOrModify);
  PyQuiz.Renderers.register("modify",       renderBugOrModify);
})();
