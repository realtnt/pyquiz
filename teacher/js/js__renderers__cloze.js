/* === inlined from js/renderers/cloze.js === */
/* =====================================================================
 * PyQuiz.Renderers — "cloze"
 *
 * Inline code template with blank inputs of three flavours:
 *   free_text — typed answer
 *   select    — per-blank drop-down
 *   bank      — J277-style word bank:
 *               · click a chip → fills the first empty blank, IN
 *                 TEMPLATE ORDER, consuming exactly one chip
 *               · click a placed word → returns it to the bank
 *               · drag a chip onto a slot → fills/swaps; drop on bank
 *                 → returns to bank
 *               · `shared_pool.has_distractors` may be true or false
 *               · each chip is INDEPENDENT — if two chips have the
 *                 same text they're tracked separately by index so a
 *                 student must place each one explicitly
 *
 * Response shape:
 *   { blanks: { "<blank_id>": "value", ... } }
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const DOM = PyQuiz.DOM;

  PyQuiz.Renderers.register("cloze", function (activity, host, cb) {
    const p = activity.payload || {};
    const tpl = p.code_template || "";
    const blanks = p.blanks || [];
    const responses = {};      // for free_text / select
    const blankMap = {};
    blanks.forEach(b => blankMap[b.id] = b);

    const root = DOM.el("div", { class: "cloze" });

    // Bank state: keep chips as objects with a stable index so duplicate
    // chip text is tracked independently (two "i" chips are NOT folded
    // into one — the student must place each one separately).
    const usesBank = blanks.some(b => b.mode === "bank");
    const bankBlankOrder = blanks.filter(b => b.mode === "bank").map(b => b.id);
    const initialPool = (p.shared_pool && p.shared_pool.items) ? p.shared_pool.items.slice() : [];
    // chips: array of { idx, text, placedIn: blankId|null }
    let chips = initialPool.map((text, idx) => ({ idx: idx, text: text, placedIn: null }));
    const singleUse = p.shared_pool && p.shared_pool.single_use !== false;

    /* Shuffle the bank chips once per activity, using a seed derived
       from the activity ID so the order is stable per task but never
       matches the canonical answer ordering (which would give the
       solution away on activities that pre-fill the bank in answer
       order, e.g. Three variables → name, species, age, name, …). */
    if (chips.length > 1) {
      let seed = 0;
      for (const c of (activity.id || "")) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
      function rand() { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 0x100000000; }
      for (let i = chips.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        const t = chips[i]; chips[i] = chips[j]; chips[j] = t;
      }
    }

    function chipAtBlank(blankId) {
      return chips.find(c => c.placedIn === blankId) || null;
    }
    function chipById(chipIdx) {
      return chips.find(c => c.idx === chipIdx) || null;
    }

    function snapshot() {
      const out = {};
      for (const b of blanks) {
        if (b.mode === "bank") {
          const c = chipAtBlank(b.id);
          out[b.id] = c ? c.text : "";
        } else {
          out[b.id] = responses[b.id] || "";
        }
      }
      return { blanks: out };
    }

    /* ---------- Code template with inline blanks ---------- */
    const codeEl = DOM.el("pre", { class: "cloze-code", "aria-label": "Code with blanks to fill" });
    const tplLines = tpl.split("\n");
    tplLines.forEach((line, i) => {
      const row = DOM.el("span", { class: "code-row" });
      row.appendChild(DOM.el("span", { class: "code-ln" }, String(i + 1)));
      const src = DOM.el("span", { class: "code-src" });
      const parts = line.split(/(\{\{[^}]+\}\})/g);
      parts.forEach(part => {
        const m = part.match(/^\{\{([^}]+)\}\}$/);
        if (!m) { src.appendChild(document.createTextNode(part)); return; }
        const bid = m[1];
        const b = blankMap[bid];
        if (!b) { src.appendChild(document.createTextNode(part)); return; }
        src.appendChild(makeBlank(b));
      });
      row.appendChild(src);
      codeEl.appendChild(row);
    });

    function makeBlank(b) {
      if (b.mode === "free_text") {
        const inp = DOM.el("input", {
          type: "text",
          class: "blank blank-text",
          "aria-label": "Blank " + b.id,
          "data-blank": b.id,
          size: String(b.width_hint || 6),
          autocomplete: "off",
          spellcheck: "false"
        });
        inp.addEventListener("input", () => {
          responses[b.id] = inp.value;
          if (cb.onChange) cb.onChange(snapshot());
        });
        return inp;
      }
      if (b.mode === "select") {
        const sel = DOM.el("select", { class: "blank blank-select", "aria-label": "Blank " + b.id, "data-blank": b.id });
        sel.appendChild(DOM.el("option", { value: "" }, "—"));
        (b.options || []).forEach(opt => sel.appendChild(DOM.el("option", { value: opt }, opt)));
        sel.addEventListener("change", () => {
          responses[b.id] = sel.value;
          if (cb.onChange) cb.onChange(snapshot());
        });
        return sel;
      }
      // bank
      const slot = DOM.el("button", {
        type: "button",
        class: "blank blank-bank",
        "aria-label": "Blank " + b.id + " — click a word in the bank to fill",
        "data-blank": b.id
      }, "·");
      slot.addEventListener("click", () => {
        const c = chipAtBlank(b.id);
        if (c) {
          unplaceChip(c);
          if (cb.onChange) cb.onChange(snapshot());
          redrawBank();
        }
      });
      slot.addEventListener("dragover", function (ev) {
        ev.preventDefault();
        slot.classList.add("drag-over");
      });
      slot.addEventListener("dragleave", () => slot.classList.remove("drag-over"));
      slot.addEventListener("drop", function (ev) {
        ev.preventDefault();
        slot.classList.remove("drag-over");
        const payload = ev.dataTransfer.getData("text/plain");
        if (!payload) return;
        handleSlotDrop(b.id, payload);
      });
      slot.addEventListener("dragstart", function (ev) {
        const c = chipAtBlank(b.id);
        if (!c) { ev.preventDefault(); return; }
        ev.dataTransfer.setData("text/plain", "slot:" + b.id);
        ev.dataTransfer.effectAllowed = "move";
      });
      slot.setAttribute("draggable", "true");
      return slot;
    }

    /* ---------- Place / unplace helpers ---------- */
    function setSlotDisplay(blankId, text, filled) {
      root.querySelectorAll('[data-blank="' + blankId + '"]').forEach(slot => {
        slot.textContent = text;
        if (filled) slot.classList.add("filled");
        else slot.classList.remove("filled");
      });
    }
    function placeChip(chip, blankId) {
      chip.placedIn = blankId;
      setSlotDisplay(blankId, chip.text, true);
    }
    function unplaceChip(chip) {
      const blankId = chip.placedIn;
      chip.placedIn = null;
      if (blankId) setSlotDisplay(blankId, "·", false);
    }

    /* ---------- Click chip → fill next empty bank blank in template order ---------- */
    function fillNextBank(chip) {
      const targetId = bankBlankOrder.find(id => !chipAtBlank(id));
      if (!targetId) return false;
      placeChip(chip, targetId);
      if (cb.onChange) cb.onChange(snapshot());
      redrawBank();
      return true;
    }
    function handleSlotDrop(targetBlankId, payload) {
      // payload formats:
      //   "chip:<idx>"      — dragged from the bank chip list
      //   "slot:<blankId>"  — dragged from another filled slot
      if (payload.startsWith("chip:")) {
        const idx = parseInt(payload.slice(5), 10);
        const chip = chipById(idx);
        if (!chip || chip.placedIn) return;
        // Was the target already filled? Return that chip to the bank.
        const existing = chipAtBlank(targetBlankId);
        if (existing) unplaceChip(existing);
        placeChip(chip, targetBlankId);
        if (cb.onChange) cb.onChange(snapshot());
        redrawBank();
      } else if (payload.startsWith("slot:")) {
        const sourceBlankId = payload.slice(5);
        if (sourceBlankId === targetBlankId) return;
        const sourceChip = chipAtBlank(sourceBlankId);
        if (!sourceChip) return;
        const targetChip = chipAtBlank(targetBlankId);
        // Move sourceChip to target; if target was occupied, swap them.
        sourceChip.placedIn = targetBlankId;
        if (targetChip) targetChip.placedIn = sourceBlankId;
        setSlotDisplay(sourceBlankId, targetChip ? targetChip.text : "·", !!targetChip);
        setSlotDisplay(targetBlankId, sourceChip.text, true);
        if (cb.onChange) cb.onChange(snapshot());
      }
    }

    root.appendChild(codeEl);

    /* ---------- Shared bank panel ---------- */
    let bankEl = null;
    if (usesBank) {
      bankEl = DOM.el("div", { class: "cloze-pool", "aria-label": "Word bank" });
      bankEl.appendChild(DOM.el("h3", null, "Word bank"));
      const list = DOM.el("ul", { class: "pool-list", role: "list" });
      bankEl.appendChild(list);
      root.appendChild(bankEl);

      bankEl.addEventListener("dragover", function (ev) {
        ev.preventDefault();
        bankEl.classList.add("drag-over");
      });
      bankEl.addEventListener("dragleave", () => bankEl.classList.remove("drag-over"));
      bankEl.addEventListener("drop", function (ev) {
        ev.preventDefault();
        bankEl.classList.remove("drag-over");
        const payload = ev.dataTransfer.getData("text/plain");
        if (!payload) return;
        if (payload.startsWith("slot:")) {
          const blankId = payload.slice(5);
          const c = chipAtBlank(blankId);
          if (c) {
            unplaceChip(c);
            if (cb.onChange) cb.onChange(snapshot());
            redrawBank();
          }
        }
      });
    }

    function redrawBank() {
      if (!bankEl) return;
      const list = bankEl.querySelector("ul");
      list.innerHTML = "";
      const remaining = chips.filter(c => c.placedIn === null);
      if (!remaining.length) {
        list.appendChild(DOM.el("li", { class: "pool-empty" }, "All used"));
        return;
      }
      remaining.forEach(chip => {
        const el = DOM.el("li", { class: "pool-chip", "data-chip-idx": String(chip.idx) }, chip.text);
        el.setAttribute("tabindex", "0");
        el.setAttribute("role", "button");
        el.setAttribute("draggable", "true");
        el.style.cursor = "pointer";
        el.addEventListener("click", () => fillNextBank(chip));
        el.addEventListener("keydown", ev => {
          if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); fillNextBank(chip); }
        });
        el.addEventListener("dragstart", ev => {
          ev.dataTransfer.setData("text/plain", "chip:" + chip.idx);
          ev.dataTransfer.effectAllowed = "move";
          el.classList.add("dragging");
        });
        el.addEventListener("dragend", () => el.classList.remove("dragging"));
        list.appendChild(el);
      });
    }
    if (usesBank) redrawBank();

    host.appendChild(root);

    return {
      getResponse: snapshot,
      setResponse: function (r) {
        if (!r || !r.blanks) return;
        for (const k of Object.keys(responses)) delete responses[k];
        // Reset chips
        chips.forEach(c => c.placedIn = null);
        root.querySelectorAll(".blank-bank").forEach(b => { b.textContent = "·"; b.classList.remove("filled"); });
        for (const b of blanks) {
          const v = r.blanks[b.id];
          if (!v) continue;
          if (b.mode === "bank") {
            // Find a free chip with matching text; first match wins.
            const c = chips.find(ch => ch.placedIn === null && ch.text === v);
            if (c) placeChip(c, b.id);
          } else if (b.mode === "select") {
            responses[b.id] = v;
            const sel = root.querySelector('select[data-blank="' + b.id + '"]');
            if (sel) sel.value = v;
          } else {
            responses[b.id] = v;
            const inp = root.querySelector('input[data-blank="' + b.id + '"]');
            if (inp) inp.value = v;
          }
        }
        redrawBank();
      },
      reset: function () {
        for (const k of Object.keys(responses)) delete responses[k];
        chips.forEach(c => c.placedIn = null);
        root.querySelectorAll("input.blank-text").forEach(i => i.value = "");
        root.querySelectorAll("select.blank-select").forEach(s => s.value = "");
        root.querySelectorAll(".blank-bank").forEach(b => { b.textContent = "·"; b.classList.remove("filled"); });
        redrawBank();
      },
      highlight: function (per_part) {
        /* per_part === null clears all blank marks — used when the
           student modifies a previously-checked response. */
        if (per_part === null) {
          root.querySelectorAll("[data-blank]").forEach(n => n.classList.remove("mark-ok", "mark-bad"));
          return;
        }
        if (!per_part || !per_part.blanks) return;
        for (const bid of Object.keys(per_part.blanks)) {
          const ok = per_part.blanks[bid];
          const node = root.querySelector('[data-blank="' + bid + '"]');
          if (node) { node.classList.remove("mark-ok", "mark-bad"); node.classList.add(ok ? "mark-ok" : "mark-bad"); }
        }
      },
      focus: function () {
        // Land on the first empty blank, walking the template in order.
        for (const b of blanks) {
          if (b.mode === "free_text") {
            const inp = root.querySelector('input[data-blank="' + b.id + '"]');
            if (inp && !inp.value) { inp.focus(); return; }
          } else if (b.mode === "select") {
            const sel = root.querySelector('select[data-blank="' + b.id + '"]');
            if (sel && !sel.value) { sel.focus(); return; }
          } else if (b.mode === "bank") {
            if (!chipAtBlank(b.id)) {
              // Land on the first bank chip so the student can click/space it
              const chip = root.querySelector(".pool-chip");
              if (chip) { chip.focus(); return; }
            }
          }
        }
        // Everything filled — focus the first blank for editing
        const any = root.querySelector("input.blank-text, select.blank-select, .pool-chip, .blank-bank");
        if (any) any.focus();
      }
    };
  });
})();
