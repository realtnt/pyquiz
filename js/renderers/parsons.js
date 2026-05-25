/* =====================================================================
 * PyQuiz.Renderers — "parsons"
 *
 * In-place reordering: all non-fixed blocks (real lines AND distractors)
 * start interleaved in shuffled order in a single "program" area. The
 * student reorders them in place. A separate "bin" area is used for
 * distractors — students must move every distractor to the bin and
 * leave the real lines in the program area in the correct order.
 *
 * Drag-and-drop with full keyboard equivalents (spec §11.3).
 *
 * Response shape:
 *   { solution_order: ["id1","id2",...],   // ids in the program area, in order
 *     binned:         ["d1","d2",...] }     // ids in the bin (order doesn't matter)
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const DOM = PyQuiz.DOM;
  const S = PyQuiz.Strings;

  PyQuiz.Renderers.register("parsons", function (activity, host, cb) {
    const p = activity.payload || {};
    const lines = p.lines || [];
    const indentPx = (p.indent_size_spaces || 4) * 8;

    const fixedSolutionIds = lines.filter(l => l.fixed).map(l => l.id);
    const solutionOrder = (p.solution || []).slice();

    // The program area holds every non-fixed block (real + distractor)
    // initially, shuffled by the activity-id-derived seed so the order
    // is stable per activity but never matches the solution. The bin
    // starts empty.
    let program = lines.filter(l => !l.fixed).map(l => l.id);
    let bin = [];

    let seed = 0;
    for (const c of (activity.id || "")) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
    function rand() { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 0x100000000; }
    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
    }
    function reshuffleProgram() {
      // Reshuffle until the order doesn't accidentally match the canonical
      // solution. Only relevant for very small puzzles.
      const expected = fixedSolutionIds.concat(solutionOrder.filter(id => !fixedSolutionIds.includes(id)));
      for (let attempt = 0; attempt < 6; attempt++) {
        shuffle(program);
        const merged = fixedSolutionIds.concat(program.filter(id => !fixedSolutionIds.includes(id)));
        const matches = merged.length === expected.length && merged.every((id, i) => id === expected[i]);
        if (!matches) break;
      }
    }
    reshuffleProgram();
    // Auto-select the first non-fixed program block so the highlight is
    // visible from the start. The student can then immediately use the
    // keyboard or click the action icon without first having to click
    // anything to select.
    const firstNonFixed = program.find(id => !findLine(id).fixed);

    const root = DOM.el("div", { class: "parsons" });
    const status = DOM.el("div", { class: "live", "aria-live": "polite" });
    const areas = DOM.el("div", { class: "parsons-areas" });

    const progArea = makeArea("program", "Program", null);
    const binArea  = makeArea("bin", "Bin", null);
    binArea.area.classList.add("parsons-bin");

    let selectedId = firstNonFixed || null;

    function findLine(id) { return lines.find(l => l.id === id); }
    function where(id) {
      if (program.includes(id)) return "program";
      if (bin.includes(id)) return "bin";
      return null;
    }
    function arr(name) { return name === "program" ? program : bin; }

    function select(id) {
      if (selectedId === id) return;
      const prevId = selectedId;
      selectedId = id;
      // Update CSS classes and action-icon visibility on just the two
      // affected blocks instead of rebuilding the whole DOM. A full
      // redraw destroys the block element under the cursor, which kills
      // any in-progress drag — making the student click first and then
      // drag separately. Incremental updates preserve drag.
      if (prevId) {
        const prev = root.querySelector('.parsons-block[data-id="' + prevId + '"]');
        if (prev) {
          prev.classList.remove("selected");
          prev.setAttribute("aria-grabbed", "false");
          const oldAction = prev.querySelector(".parsons-action");
          if (oldAction) oldAction.remove();
        }
      }
      const cur = root.querySelector('.parsons-block[data-id="' + id + '"]');
      if (cur) {
        cur.classList.add("selected");
        cur.setAttribute("aria-grabbed", "true");
        const line = findLine(id);
        if (line && !line.fixed && !cur.querySelector(".parsons-action")) {
          cur.appendChild(makeActionIcon(id, where(id) === "bin"));
        }
      }
    }
    function makeActionIcon(id, inBin) {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "parsons-action";
      action.setAttribute("aria-label", inBin ? "Move back to program" : "Move to bin");
      action.setAttribute("title", inBin ? "Move back to program" : "Move to bin");
      action.textContent = inBin ? "↩" : "🗑";
      // Don't let the icon be drag-grabbed — it would interfere with
      // both the action click and any drag on the block itself.
      action.setAttribute("draggable", "false");
      action.addEventListener("click", function (ev) {
        ev.stopPropagation();
        const from = where(id);
        if (!from) return;
        move(id, from === "program" ? "bin" : "program");
      });
      action.addEventListener("mousedown", function (ev) {
        // Stop mousedown so the parent block's drag doesn't pick up
        // a click on the action icon.
        ev.stopPropagation();
      });
      return action;
    }
    function focusBlock(id) {
      const el = root.querySelector('.parsons-block[data-id="' + id + '"]');
      if (el) el.focus();
    }

    function move(id, toArea, toIdx) {
      const line = findLine(id);
      if (!line || line.fixed) return;
      const from = where(id);
      if (!from) return;
      const a = arr(from);
      a.splice(a.indexOf(id), 1);
      const b = arr(toArea);
      if (toIdx == null || toIdx > b.length) b.push(id);
      else b.splice(toIdx, 0, id);
      // Keep this block selected/focused after the move so the student
      // can continue working with the keyboard.
      selectedId = id;
      redraw();
      focusBlock(id);
      const lbl = line.code.length > 40 ? line.code.slice(0, 40) + "…" : line.code;
      status.textContent = "Moved " + lbl + " to " + (toArea === "bin" ? "the bin" : "the program");
      if (cb.onChange) cb.onChange(snapshot());
    }

    function snapshot() {
      // Response: fixed lines first (in canonical order), then non-fixed
      // program blocks in their current order. Plus the bin contents.
      const order = fixedSolutionIds.slice();
      for (const id of program) {
        if (!fixedSolutionIds.includes(id)) order.push(id);
      }
      return { solution_order: order, binned: bin.slice() };
    }

    function renderBlock(id) {
      const line = findLine(id);
      const inBin = bin.includes(id);
      const isSelected = selectedId === id;
      const block = DOM.el("li", {
        class: "parsons-block"
          + (line.fixed ? " fixed" : "")
          + (inBin ? " binned" : "")
          + (isSelected ? " selected" : ""),
        tabindex: "0",
        role: "button",
        "aria-grabbed": isSelected ? "true" : "false",
        "aria-label": (inBin ? "Binned: " : "") + line.code,
        "data-id": id,
        draggable: line.fixed ? "false" : "true"
      });
      block.style.paddingLeft = (8 + (line.indent || 0) * indentPx) + "px";
      block.appendChild(DOM.el("code", null, line.code));
      if (line.fixed) block.appendChild(DOM.el("span", { class: "fixed-badge" }, "fixed"));

      // Inline action icon — only shown on the selected, non-fixed block.
      // Bin icon when in program, restore icon when in bin. Clicking the
      // icon does the move; clicking elsewhere on the block just keeps it
      // selected, so the action is always explicit.
      if (isSelected && !line.fixed) {
        block.appendChild(makeActionIcon(id, inBin));
      }

      block.addEventListener("click", () => {
        if (line.fixed) return;
        // Single click SELECTS the block. The action icon then appears
        // and the student can click that (or use the keyboard) to bin or
        // restore. Re-clicking the same block keeps it selected.
        select(id);
      });
      block.addEventListener("focus", () => {
        // Keyboard focus also moves the selection so the visible
        // highlight always matches the focused element.
        if (line.fixed) return;
        if (selectedId !== id) select(id);
      });
      block.addEventListener("keydown", function (ev) {
        if (line.fixed) return;
        // Ctrl/Cmd + key (Ctrl+Enter for Check) must bypass our handlers
        // so the global shortcut fires cleanly. Otherwise pressing
        // Ctrl+Enter while a binned block is focused would toggle the
        // block AND check.
        if (ev.ctrlKey || ev.metaKey) return;

        if (ev.key === "ArrowUp" || ev.key === "ArrowDown") {
          ev.preventDefault();
          const from = where(id);
          if (!from) return;
          if (ev.shiftKey) {
            // Shift+arrow: reorder within the current area
            const a = arr(from);
            const i = a.indexOf(id);
            const j = ev.key === "ArrowUp" ? i - 1 : i + 1;
            if (j >= 0 && j < a.length) {
              a.splice(i, 1);
              a.splice(j, 0, id);
              redraw();
              focusBlock(id);
              if (cb.onChange) cb.onChange(snapshot());
            }
          } else {
            // Plain arrow: move selection to the previous/next non-fixed
            // block in the same area. If we hit the end, do nothing.
            const a = arr(from);
            const i = a.indexOf(id);
            const j = ev.key === "ArrowUp" ? i - 1 : i + 1;
            if (j >= 0 && j < a.length) {
              select(a[j]);
              focusBlock(a[j]);
            }
          }
        } else if (ev.key === "ArrowRight") {
          // Send to bin AND leave the focus in the program area so the
          // student can immediately continue working on the program.
          // The recent move-target stays selected in the bin, but focus
          // returns to the program — typically the line that took the
          // moved block's old position.
          ev.preventDefault();
          if (where(id) === "program") {
            const oldIdx = program.indexOf(id);
            move(id, "bin");
            // After move(), `id` is now in the bin. Find the next non-fixed
            // block in the program to land focus on. Prefer the line that
            // shifted up into the moved block's old slot; fall back to the
            // previous program block or the last one.
            const nextId = program[oldIdx] || program[oldIdx - 1] || program[program.length - 1];
            if (nextId) {
              select(nextId);
              focusBlock(nextId);
            }
          }
        } else if (ev.key === "ArrowLeft") {
          // Restore from bin. Focus stays on the block (which now lives
          // in the program area) so the student can keep reordering it.
          ev.preventDefault();
          if (where(id) === "bin") {
            move(id, "program");
            focusBlock(id);
          }
        } else if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          const from = where(id);
          if (!from) return;
          move(id, from === "program" ? "bin" : "program");
        } else if (ev.key === "Escape") {
          selectedId = null;
          redraw();
        }
      });

      block.addEventListener("dragstart", function (ev) {
        if (line.fixed) { ev.preventDefault(); return; }
        ev.dataTransfer.setData("text/plain", id);
        ev.dataTransfer.effectAllowed = "move";
        block.classList.add("dragging");
      });
      block.addEventListener("dragend", () => {
        block.classList.remove("dragging");
        clearDropIndicators();
      });
      return block;
    }

    function clearDropIndicators() {
      root.querySelectorAll(".drop-above, .drop-below").forEach(el => {
        el.classList.remove("drop-above", "drop-below");
      });
    }

    function mkDropHandlers(area, name) {
      area.addEventListener("dragover", function (ev) {
        ev.preventDefault();
        clearDropIndicators();
        const list = area.querySelector("ul");
        const children = Array.from(list.children).filter(c => !c.classList.contains("parsons-bin-hint"));
        if (!children.length) {
          area.classList.add("drag-over");
          return;
        }
        area.classList.remove("drag-over");
        let target = null;
        let above = true;
        for (const c of children) {
          const r = c.getBoundingClientRect();
          if (ev.clientY < r.top + r.height / 2) { target = c; above = true; break; }
          if (ev.clientY < r.bottom) { target = c; above = false; break; }
        }
        if (!target) { children[children.length - 1].classList.add("drop-below"); }
        else { target.classList.add(above ? "drop-above" : "drop-below"); }
      });
      area.addEventListener("dragleave", function (ev) {
        if (!area.contains(ev.relatedTarget)) {
          area.classList.remove("drag-over");
          clearDropIndicators();
        }
      });
      area.addEventListener("drop", function (ev) {
        ev.preventDefault();
        area.classList.remove("drag-over");
        clearDropIndicators();
        const id = ev.dataTransfer.getData("text/plain");
        if (!id) return;
        const list = area.querySelector("ul");
        const children = Array.from(list.children).filter(c => !c.classList.contains("parsons-bin-hint"));
        let toIdx = children.length;
        for (let i = 0; i < children.length; i++) {
          const r = children[i].getBoundingClientRect();
          if (ev.clientY < r.top + r.height / 2) { toIdx = i; break; }
        }
        move(id, name, toIdx);
      });
    }
    mkDropHandlers(progArea.area, "program");
    mkDropHandlers(binArea.area,  "bin");

    function redraw() {
      progArea.list.innerHTML = "";
      binArea.list.innerHTML = "";
      // Fixed lines render first in the program area (always at the top
      // in canonical order). Then the non-fixed blocks in their current
      // shuffle/student order.
      const fixedIds = fixedSolutionIds.slice();
      fixedIds.forEach(id => progArea.list.appendChild(renderBlock(id)));
      program.forEach(id => {
        if (!fixedIds.includes(id)) progArea.list.appendChild(renderBlock(id));
      });
      if (bin.length === 0) {
        const hint = DOM.el("li", { class: "parsons-bin-hint" },
          "Drag distractor lines here.");
        binArea.list.appendChild(hint);
      } else {
        bin.forEach(id => binArea.list.appendChild(renderBlock(id)));
      }
    }

    function makeArea(name, label, desc) {
      const area = DOM.el("section", { class: "parsons-area", "data-area": name, "aria-label": label });
      area.appendChild(DOM.el("h3", null, label));
      if (desc) area.appendChild(DOM.el("p", { class: "area-desc" }, desc));
      const list = DOM.el("ul", { class: "parsons-list", role: "list" });
      area.appendChild(list);
      return { area: area, list: list };
    }

    areas.appendChild(progArea.area);
    areas.appendChild(binArea.area);
    root.appendChild(areas);
    root.appendChild(status);
    host.appendChild(root);
    redraw();

    return {
      getResponse: snapshot,
      setResponse: function (r) {
        if (!r) return;
        program = lines.filter(l => !l.fixed).map(l => l.id);
        bin = [];
        const order = (r.solution_order || []).filter(id => !fixedSolutionIds.includes(id));
        const binned = r.binned || [];
        const placed = new Set();
        binned.forEach(id => { if (program.includes(id)) { bin.push(id); placed.add(id); } });
        const newProgram = [];
        order.forEach(id => {
          if (program.includes(id) && !placed.has(id)) {
            newProgram.push(id);
            placed.add(id);
          }
        });
        program.forEach(id => { if (!placed.has(id)) newProgram.push(id); });
        program = newProgram;
        redraw();
      },
      reset: function () {
        program = lines.filter(l => !l.fixed).map(l => l.id);
        bin = [];
        seed = 0;
        for (const c of (activity.id || "")) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
        reshuffleProgram();
        redraw();
      },
      highlight: function (per_part) {
        const ok = per_part && per_part.orderOk && per_part.binOk;
        progArea.area.classList.remove("ok", "bad");
        binArea.area.classList.remove("ok", "bad");
        void progArea.area.offsetWidth;
        progArea.area.classList.add(ok ? "ok" : "bad");
        if (per_part) binArea.area.classList.add(per_part.binOk ? "ok" : "bad");
      },
      focus: function () {
        const first = progArea.list.querySelector(".parsons-block:not(.fixed)");
        if (first) first.focus();
      }
    };
  });
})();
