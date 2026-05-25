/* =====================================================================
 * PyQuiz.Renderers — "spot_the_bug"
 *
 * Numbered code lines, each with a toggle button to mark as buggy.
 * In select_and_fix / rewrite modes a per-line fix input appears.
 *
 * Response shape:
 *   { selected_lines: [4, ...], fixes: { "4": "fixed line" } }
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const DOM = PyQuiz.DOM;

  const constraintLabels = {
    one_line: "Change exactly one line.",
    one_char: "Change exactly one character.",
    add_line: "Add one line only.",
    remove_line: "Remove one line only."
  };

  /* Shared renderer for spot_the_bug AND modify. The two activity types
     have identical payload shape and response shape — only the framing
     differs. For modify: labels read "Required" / "Currently" instead
     of "Expected" / "Actual", and the activity is framed as a behaviour
     change rather than a bug hunt. */
  function renderBugOrModify(activity, host, cb) {
    const isModify = activity.type === "modify";
    const p = activity.payload || {};
    const codeLines = p.code_lines || [];
    const mode = p.mode || "select_and_fix";
    const constraint = p.constraint || "none";

    const root = DOM.el("div", { class: "stb" + (isModify ? " stb-modify" : "") });

    if (p.expected_behaviour || p.actual_behaviour) {
      const info = DOM.el("div", { class: "stb-behaviour" });
      if (isModify) {
        // Modify: the "expected" field describes what the code should
        // do AFTER the change; the "actual" field describes what it
        // does now. Swap labels and order so the desired state reads
        // first, in keeping with the activity's PRIMM framing.
        if (p.expected_behaviour) info.appendChild(DOM.el("p", null, DOM.el("strong", null, "Required: "), p.expected_behaviour));
        if (p.actual_behaviour)   info.appendChild(DOM.el("p", null, DOM.el("strong", null, "Currently: "), p.actual_behaviour));
      } else {
        if (p.expected_behaviour) info.appendChild(DOM.el("p", null, DOM.el("strong", null, "Expected: "), p.expected_behaviour));
        if (p.actual_behaviour) info.appendChild(DOM.el("p", null, DOM.el("strong", null, "Actual: "), p.actual_behaviour));
      }
      root.appendChild(info);
    }
    if (constraint && constraint !== "none" && constraintLabels[constraint]) {
      root.appendChild(DOM.el("p", { class: "stb-constraint" }, constraintLabels[constraint]));
    }
    // Generic interaction instructions duplicated the Help section's tips,
    // so they're omitted here. The Help section pinned to the bottom of
    // the side panel covers the same ground without competing with the
    // activity's own context (Expected/Actual).

    const selected = new Set();
    const fixes = {};
    const list = DOM.el("ol", { class: "stb-code", "aria-label": "Code with line selection" });

    codeLines.forEach((src, i) => {
      const lineNum = i + 1;
      const li = DOM.el("li", {
        class: "stb-line",
        "data-line": String(lineNum),
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        "aria-label": "Line " + lineNum + ": click to mark as buggy"
      });
      const ln = DOM.el("span", { class: "code-ln" }, String(lineNum));
      const code = DOM.el("code", { class: "code-src" }, src);
      li.appendChild(ln);
      li.appendChild(code);
      // Clicking anywhere on the line toggles selection. We attach the
      // handler on the <li> rather than a child button so the whole row
      // is the target. Keyboard: Enter or Space toggles.
      li.addEventListener("click", function (ev) {
        // Clicks inside the fix box (input, drag grip, indent spacer)
        // should never toggle the line — only the code/line-number area.
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
        // Track current indent level as a number of indent-unit steps
        // (default unit = 4 spaces). The model stored in `fixes` is the
        // full line text (indent + content).
        const INDENT_UNIT = 4;
        let indentLevel = Math.floor((p.code_lines[lineNum - 1] || "").match(/^( *)/)[1].length / INDENT_UNIT);
        const indentSpan = DOM.el("span", { class: "stb-fix-indent", "aria-hidden": "true" });
        const fixInput = DOM.el("input", {
          type: "text",
          class: "stb-fix-input",
          "aria-label": "Replacement for line " + lineNum + " (Tab to indent, Shift+Tab to outdent, or drag the box)",
          placeholder: "Fixed code…",
          autocomplete: "off",
          spellcheck: "false"
        });
        function refreshIndent() {
          indentSpan.textContent = " ".repeat(indentLevel * INDENT_UNIT);
          fixes[lineNum] = " ".repeat(indentLevel * INDENT_UNIT) + (fixInput.value || "");
          if (cb.onChange) cb.onChange(snapshot());
        }
        function nudge(delta) {
          indentLevel = Math.max(0, indentLevel + delta);
          refreshIndent();
        }
        fixInput.addEventListener("input", refreshIndent);
        fixInput.addEventListener("keydown", function (ev) {
          if (ev.key === "Tab") {
            ev.preventDefault();
            nudge(ev.shiftKey ? -1 : 1);
          }
        });
        // Mouse drag to indent: drag horizontally. Threshold = one indent
        // width (~32px depending on font), so it doesn't trigger on tiny moves.
        const grip = DOM.el("span", { class: "stb-fix-grip", "aria-hidden": "true", title: "Drag to adjust indent" }, "⋮⋮");
        let dragStartX = null;
        let dragStartLevel = 0;
        let dragMoved = false;
        function onDown(ev) {
          dragStartX = ev.clientX != null ? ev.clientX : (ev.touches && ev.touches[0].clientX);
          dragStartLevel = indentLevel;
          dragMoved = false;
          document.addEventListener("mousemove", onMove);
          document.addEventListener("mouseup", onUp);
          document.addEventListener("touchmove", onMove, { passive: false });
          document.addEventListener("touchend", onUp);
          fixWrap.classList.add("dragging");
          ev.preventDefault();
        }
        function onMove(ev) {
          if (dragStartX == null) return;
          const x = ev.clientX != null ? ev.clientX : (ev.touches && ev.touches[0].clientX);
          if (x == null) return;
          if (ev.preventDefault) ev.preventDefault();
          const STEP_PX = 24;
          const delta = Math.round((x - dragStartX) / STEP_PX);
          if (delta !== 0) dragMoved = true;
          const newLevel = Math.max(0, dragStartLevel + delta);
          if (newLevel !== indentLevel) {
            indentLevel = newLevel;
            refreshIndent();
          }
        }
        function onUp() {
          dragStartX = null;
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          document.removeEventListener("touchmove", onMove);
          document.removeEventListener("touchend", onUp);
          fixWrap.classList.remove("dragging");
        }
        grip.addEventListener("mousedown", onDown);
        grip.addEventListener("touchstart", onDown);

        indentSpan.textContent = " ".repeat(indentLevel * INDENT_UNIT);
        fixWrap.appendChild(indentSpan);
        fixWrap.appendChild(fixInput);
        fixWrap.appendChild(grip);
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
        const fw = li.querySelector(".stb-fix");
        if (fw) fw.setAttribute("hidden", "");
        delete fixes[n];
      } else {
        selected.add(n);
        li.classList.add("marked");
        li.setAttribute("aria-pressed", "true");
        const fw = li.querySelector(".stb-fix");
        if (fw) { fw.removeAttribute("hidden"); fw.querySelector("input").focus(); }
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
          li.classList.add("marked");
          li.setAttribute("aria-pressed", "true");
          const fw = li.querySelector(".stb-fix");
          if (fw) fw.removeAttribute("hidden");
        });
        for (const k of Object.keys(r.fixes || {})) {
          fixes[k] = r.fixes[k];
          const li = list.querySelector('li[data-line="' + k + '"]');
          if (li) {
            const fi = li.querySelector("input");
            const idSp = li.querySelector(".stb-fix-indent");
            const m = String(r.fixes[k] || "").match(/^( *)(.*)$/);
            const indent = (m && m[1]) || "";
            const rest = (m && m[2]) || "";
            if (fi) fi.value = rest;
            if (idSp) idSp.textContent = indent;
          }
        }
      },
      reset: function () {
        selected.clear();
        for (const k of Object.keys(fixes)) delete fixes[k];
        list.querySelectorAll(".stb-line").forEach(li => {
          li.classList.remove("marked");
          li.setAttribute("aria-pressed", "false");
          const fw = li.querySelector(".stb-fix");
          if (fw) fw.setAttribute("hidden", "");
          const inp = li.querySelector(".stb-fix-input");
          if (inp) inp.value = "";
          const idSp = li.querySelector(".stb-fix-indent");
          if (idSp) {
            const lineNum = parseInt(li.getAttribute("data-line"), 10);
            const orig = (codeLines[lineNum - 1] || "").match(/^( *)/);
            idSp.textContent = (orig && orig[1]) || "";
          }
        });
      },
      highlight: function (per_part) {
        if (per_part && per_part.fixes) {
          for (const ln of Object.keys(per_part.fixes)) {
            const li = list.querySelector('li[data-line="' + ln + '"]');
            if (li) { li.classList.remove("mark-ok", "mark-bad"); li.classList.add(per_part.fixes[ln] ? "mark-ok" : "mark-bad"); }
          }
        }
      },
      focus: function () {
        const first = list.querySelector(".stb-line");
        if (first) first.focus();
      }
    };
  }
  PyQuiz.Renderers.register("spot_the_bug", renderBugOrModify);
  PyQuiz.Renderers.register("modify",       renderBugOrModify);
})();
