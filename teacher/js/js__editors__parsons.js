/* === inlined from js/editors/parsons.js === */
/* =====================================================================
 * PyQuiz.Editors — "parsons" form editor (new schema)
 *
 * The new schema stores Parsons as plain text:
 *   canonical_code           : Python source, one block per line
 *   distractors              : one distractor per line (may be empty)
 *   swap_groups              : groups of 1-indexed line numbers
 *   extra_accepted_orderings : optional manually-typed orderings
 *
 * The editor surfaces each of these as a focused widget:
 *   - Code textarea (canonical source of truth)
 *   - Distractors textarea
 *   - Swap groups: clickable line-number pills + manual line-number input
 *   - Accepted-orderings preview (read-only)
 *   - Advanced: manual extra orderings textarea (collapsed)
 *
 * Authoring effort for the common case "two assignments are
 * interchangeable" → click 2 line numbers, press Create. Authoring
 * effort for "two 3-line groups" → click 3 lines, Create, click 3
 * more, Create. The marker enumerates the full cross-product (12
 * orderings in that case) automatically.
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const DOM = PyQuiz.DOM;

  PyQuiz.Editors.register("parsons", function (host, act, ctx) {
    const p = act.payload;
    const onChange = ctx.onChange || function () {};

    /* Normalise the payload so unset fields don't break the form. */
    if (typeof p.canonical_code !== "string") p.canonical_code = "";
    if (typeof p.distractors !== "string")    p.distractors = "";
    if (!Array.isArray(p.swap_groups))        p.swap_groups = [];
    if (!Array.isArray(p.extra_accepted_orderings)) p.extra_accepted_orderings = [];
    p.indent_size_spaces = p.indent_size_spaces || 4;

    /* --- 1. Code textarea (canonical) --- */
    DOM.field(host, "Code", "textarea", p.canonical_code, v => {
      p.canonical_code = v;
      onChange();
      refreshSwapPills();
      refreshPreview();
    }, {
      rows: 6,
      hint: "Each line is one Parsons block. Leading spaces set the indent (4 spaces = 1 level by default). Line numbers shown below — use them when defining swap groups."
    });

    /* --- 2. Distractors textarea --- */
    DOM.field(host, "Distractors (optional)", "textarea", p.distractors, v => {
      p.distractors = v;
      onChange();
    }, {
      rows: 3,
      hint: "One distractor block per line. Leave empty if you don't want any. Distractors must be moved to the bin to mark the activity correct."
    });

    /* --- 3. Swap groups --- */
    const groupSec = DOM.el("div", { class: "parsons-swap-section" });
    groupSec.appendChild(DOM.el("h4", { class: "parsons-subhead" }, "Swap groups"));
    groupSec.appendChild(DOM.el("p", { class: "kbd-help" },
      "Lines that can appear in any order. Click line numbers below to build a group, then 'Create group from selection'. The marker accepts every combination of these permutations."));

    /* List of existing groups (each as a removable pill row). */
    const groupList = DOM.el("div", { class: "parsons-group-list" });
    groupSec.appendChild(groupList);

    /* Line-number selector: a row of clickable pills, one per
       canonical line. Click toggles membership in the pending group.
       Re-rendered whenever the code textarea changes. */
    const pillStrip = DOM.el("div", { class: "parsons-line-pills" });
    groupSec.appendChild(pillStrip);

    const pendingGroup = new Set();   // line numbers selected for the new group

    const createBar = DOM.el("div", { class: "parsons-create-bar" });
    const createBtn = DOM.button("+ Create group from selection", () => {
      const arr = Array.from(pendingGroup).sort((a, b) => a - b);
      if (arr.length < 2) return;
      p.swap_groups.push(arr);
      pendingGroup.clear();
      onChange();
      refreshSwapPills();
      refreshGroupList();
      refreshPreview();
    }, "primary");
    createBtn.disabled = true;
    createBar.appendChild(createBtn);

    /* Manual line-number input — keyboard-only authors can type
       comma-separated numbers instead of clicking. */
    const manualInput = DOM.el("input", {
      type: "text",
      class: "parsons-manual-group",
      placeholder: "or type comma-separated: 1, 2, 3",
      autocomplete: "off"
    });
    const manualBtn = DOM.button("+ Add", () => {
      const nums = manualInput.value.split(/[,\s]+/).map(s => parseInt(s, 10)).filter(n => Number.isInteger(n) && n > 0);
      if (nums.length < 2) return;
      p.swap_groups.push(nums.sort((a, b) => a - b));
      manualInput.value = "";
      onChange();
      refreshSwapPills();
      refreshGroupList();
      refreshPreview();
    });
    createBar.appendChild(manualInput);
    createBar.appendChild(manualBtn);
    groupSec.appendChild(createBar);

    host.appendChild(groupSec);

    /* --- 4. Accepted-orderings preview (read-only) --- */
    const previewWrap = DOM.el("div", { class: "parsons-preview" });
    previewWrap.appendChild(DOM.el("h4", { class: "parsons-subhead" }, "Accepted orderings"));
    const previewList = DOM.el("ul", { class: "parsons-orderings-list" });
    previewWrap.appendChild(previewList);
    host.appendChild(previewWrap);

    /* --- 5. Advanced: extra orderings textarea (collapsed) --- */
    const advWrap = DOM.el("details", { class: "parsons-advanced" });
    advWrap.appendChild(DOM.el("summary", null, "Advanced — manual extra orderings"));
    const advBody = DOM.el("div", { class: "parsons-advanced-body" });
    advBody.appendChild(DOM.el("p", { class: "kbd-help" },
      "One ordering per line, comma-separated, referencing canonical line numbers. Use only when a swap group can't express what you need."));
    const extraText = DOM.el("textarea", {
      class: "code-edit",
      rows: 4,
      placeholder: "e.g.\n2, 1, 3, 4\n1, 2, 4, 3"
    });
    extraText.value = (p.extra_accepted_orderings || [])
      .map(arr => arr.join(", "))
      .join("\n");
    extraText.addEventListener("input", () => {
      const lines = extraText.value.split("\n");
      const parsed = [];
      for (const ln of lines) {
        if (!ln.trim()) continue;
        const nums = ln.split(/[,\s]+/).map(s => parseInt(s, 10)).filter(n => Number.isInteger(n) && n > 0);
        if (nums.length) parsed.push(nums);
      }
      p.extra_accepted_orderings = parsed;
      onChange();
      refreshPreview();
    });
    advBody.appendChild(extraText);
    advWrap.appendChild(advBody);
    host.appendChild(advWrap);

    /* ---- helpers ---- */

    function canonicalLineCount() {
      return (p.canonical_code || "").split("\n").filter(l => l.trim() !== "").length;
    }

    function refreshSwapPills() {
      pillStrip.innerHTML = "";
      const n = canonicalLineCount();
      if (n === 0) {
        pillStrip.appendChild(DOM.el("p", { class: "kbd-help" }, "(no lines yet — type some code above)"));
        createBtn.disabled = true;
        return;
      }
      /* Determine which lines are already used by an existing group —
         those can't be re-selected since groups can't overlap. */
      const usedLines = new Set();
      (p.swap_groups || []).forEach(g => g.forEach(n => usedLines.add(n)));

      for (let i = 1; i <= n; i++) {
        const pill = DOM.el("button", {
          type: "button",
          class: "parsons-line-pill",
          "data-line": String(i),
          "aria-pressed": pendingGroup.has(i) ? "true" : "false"
        }, String(i));
        if (pendingGroup.has(i)) pill.classList.add("selected");
        if (usedLines.has(i))   { pill.classList.add("used"); pill.disabled = true; pill.title = "Already in another swap group"; }
        pill.addEventListener("click", () => {
          if (pendingGroup.has(i)) pendingGroup.delete(i); else pendingGroup.add(i);
          refreshSwapPills();
        });
        pillStrip.appendChild(pill);
      }
      createBtn.disabled = pendingGroup.size < 2;
    }

    function refreshGroupList() {
      groupList.innerHTML = "";
      if (!p.swap_groups || !p.swap_groups.length) {
        groupList.appendChild(DOM.el("p", { class: "kbd-help" }, "No swap groups yet."));
        return;
      }
      p.swap_groups.forEach((g, i) => {
        const row = DOM.el("div", { class: "parsons-group-row" });
        row.appendChild(DOM.el("span", { class: "parsons-group-label" },
          "Group " + (i + 1) + ": lines " + g.join(", ")));
        const del = DOM.button("✕ Remove", () => {
          p.swap_groups.splice(i, 1);
          onChange();
          refreshSwapPills();
          refreshGroupList();
          refreshPreview();
        }, "icon");
        del.classList.add("parsons-group-remove");
        row.appendChild(del);
        groupList.appendChild(row);
      });
    }

    function refreshPreview() {
      previewList.innerHTML = "";
      const n = canonicalLineCount();
      if (n === 0) {
        previewList.appendChild(DOM.el("li", { class: "kbd-help" }, "(add code above to see orderings)"));
        return;
      }
      const canonical = Array.from({ length: n }, (_, i) => i + 1);
      let orderings = [canonical.slice()];
      if (PyQuiz.Parsons && PyQuiz.Parsons.expandAcceptedOrderings) {
        orderings = PyQuiz.Parsons.expandAcceptedOrderings(canonical, p.swap_groups || []);
      }
      const orderingSet = new Set(orderings.map(o => JSON.stringify(o)));
      (p.extra_accepted_orderings || []).forEach(ord => {
        if (!Array.isArray(ord) || ord.length !== n) return;
        const k = JSON.stringify(ord);
        if (!orderingSet.has(k)) { orderingSet.add(k); orderings.push(ord); }
      });

      const cap = 24;
      const shown = orderings.slice(0, cap);
      shown.forEach((ord, i) => {
        const li = DOM.el("li", { class: "parsons-ordering" });
        li.appendChild(DOM.el("code", null, "[" + ord.join(", ") + "]"));
        if (i === 0) li.appendChild(DOM.el("span", { class: "parsons-ordering-tag" }, "canonical"));
        previewList.appendChild(li);
      });
      if (orderings.length > cap) {
        previewList.appendChild(DOM.el("li", { class: "kbd-help" },
          "… and " + (orderings.length - cap) + " more. Total accepted: " + orderings.length + "."));
      }
    }

    refreshSwapPills();
    refreshGroupList();
    refreshPreview();
  });
})();
