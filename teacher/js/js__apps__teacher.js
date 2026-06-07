/* === inlined from js/apps/teacher.js === */
/* =====================================================================
 * PyQuiz.TeacherApp — teacher shell entry point
 *
 * Wires the shared modules together for the teacher tool. All
 * mutations on the pack go through PyQuiz.Pack.* so the same code
 * path serves: user typing, JSON tab apply, file imports AND the
 * future AI-generation flow.
 *
 * Public entry: PyQuiz.TeacherApp.init()
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const { Codec, Storage, Pack, Validator, Marker, Renderers, Editors, Strings: S } = PyQuiz;
  const { DOM, A11y, Settings, Modal } = PyQuiz;

  let pack = null;
  let currentEditId = "__meta__";
  let saveTimer = null;
  let saveState = "saved";

  /* ---- Draft save ---- */
  function saveDraft(immediate) {
    if (!pack) return;
    saveState = "unsaved";
    updateSaveStatus();
    if (saveTimer) clearTimeout(saveTimer);
    if (immediate) { writeDraft(); return; }
    saveTimer = setTimeout(writeDraft, 800);
  }
  function writeDraft() {
    Pack.touch(pack);
    const drafts = Storage.get("pyquiz.v1.teacher.drafts") || {};
    drafts[pack.id] = pack;
    saveState = "saving";
    updateSaveStatus();
    const ok = Storage.set("pyquiz.v1.teacher.drafts", drafts) && Storage.set("pyquiz.v1.teacher.lastOpen", pack.id);
    saveState = ok ? "saved" : "unavailable";
    updateSaveStatus();
  }
  function updateSaveStatus() {
    const el = document.getElementById("save-status");
    if (!el) return;
    el.classList.remove("saving", "unsaved");
    if (saveState === "saved") el.textContent = S.saved;
    else if (saveState === "saving") { el.textContent = S.saving; el.classList.add("saving"); }
    else if (saveState === "unsaved") { el.textContent = S.unsaved; el.classList.add("unsaved"); }
    else el.textContent = S.storageUnavailable;
  }

  /* ---- Refresh ---- */
  function refresh() {
    const t = document.getElementById("pane-pack-title");
    if (t) t.textContent = pack.title || "Untitled pack";
    renderTaskList();
    renderEditor();
    renderSidePanel();
    updateSaveStatus();
  }

  /* ---- Task list ----
   *
   * The pane is laid out the same way as the student tool:
   *   • A fixed "Pack details" entry at the top
   *   • Activities grouped by section (using the pack.sections array)
   *   • An "Unsectioned" bucket for activities with no section_id —
   *     this is where newly-added activities land by default
   *   • A sticky "+ Add activity" footer pinned to the bottom of the
   *     pane (rendered separately into #task-list-footer)
   *
   * Section colour-coding uses the same hash-of-id picker the student
   * tool uses, so a given section gets the same colour in both apps. */
  const sectionCollapsed = {};
  function sectionIsCollapsed(id) {
    // Default state: collapsed in the teacher so the pane is scannable
    // even with packs that have 90+ activities. Click a header to expand.
    return sectionCollapsed[id] === undefined ? true : !!sectionCollapsed[id];
  }
  const SECTION_COLOURS = [
    "#2D5BA6", "#1E6E3C", "#8A5A00", "#7B2D6B",
    "#0F6E84", "#A0461E", "#5B4ABF", "#7A6C09"
  ];
  function sectionColour(sec) {
    if (sec && sec.colour && /^#[0-9a-fA-F]{6}$/.test(sec.colour)) return sec.colour;
    const id = (sec && sec.id) || "";
    let h = 5381;
    for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) >>> 0;
    return SECTION_COLOURS[h % SECTION_COLOURS.length];
  }

  function renderTaskList() {
    const ol = document.getElementById("task-ol");
    ol.innerHTML = "";

    // Pack meta entry — always at the top.
    const metaLi = DOM.el("li", { class: "task-meta-row" });
    if (currentEditId === "__meta__") metaLi.classList.add("current");
    const metaBtn = DOM.el("button", { type: "button", onclick: () => { currentEditId = "__meta__"; refresh(); } });
    metaBtn.appendChild(DOM.el("span", { class: "status not_started" }, "≡"));
    metaBtn.appendChild(DOM.el("span", { class: "task-title", style: "font-weight:600" }, "Pack settings"));
    metaLi.appendChild(metaBtn);
    ol.appendChild(metaLi);

    // Keep section numbering clean, and keep the flat activity array in
    // canonical bucket order so displayed numbers match positions.
    if (!Array.isArray(pack.sections)) pack.sections = [];
    Pack.sortAndRenumberSections(pack);
    Pack.normaliseActivityOrder(pack);

    const sections = pack.sections.slice();

    // Buckets keyed by section id, plus the unsectioned catch-all.
    const byId = {};
    sections.forEach(s => byId[s.id] = []);
    const orphan = [];
    pack.activities.forEach((act, i) => {
      const item = { act: act, i: i };
      const sid = act.section_id;
      if (sid && byId[sid]) byId[sid].push(item);
      else orphan.push(item);
    });

    let currentSectionId = null;
    const currentAct = pack.activities.find(a => a.id === currentEditId);
    if (currentAct) currentSectionId = currentAct.section_id || "__unsectioned";

    function toggleSection(id, willCollapse) {
      if (!willCollapse) {
        const known = new Set(["__unsectioned"]);
        sections.forEach(s => known.add(s.id));
        known.forEach(k => { sectionCollapsed[k] = (k !== id); });
      } else {
        sectionCollapsed[id] = true;
      }
      renderTaskList();
    }

    // Unsectioned bucket first — the landing zone for new/loose activities.
    ol.appendChild(makeGroup(
      { id: "__unsectioned", kicker: "Unsectioned", title: null },
      orphan,
      { collapsed: sectionIsCollapsed("__unsectioned"),
        onToggle: v => toggleSection("__unsectioned", v),
        colour: "#888",
        titleOnly: true,
        isCurrent: currentSectionId === "__unsectioned" }
    ));

    sections.forEach(sec => {
      const items = byId[sec.id];
      const num = typeof sec.number === "number" ? sec.number : null;
      ol.appendChild(makeGroup(
        { id: sec.id, kicker: num != null ? ("Section " + num) : "Section", title: sec.title, section: sec },
        items,
        { collapsed: sectionIsCollapsed(sec.id),
          onToggle: v => toggleSection(sec.id, v),
          colour: sectionColour(sec),
          isCurrent: currentSectionId === sec.id }
      ));
    });
  }

  /* ---- drag-and-drop state + helpers ---- */
  let _drag = null;  // { kind: "activity"|"section", id }
  function clearDropMarks() {
    document.querySelectorAll(".tl-drop-before, .tl-drop-after, .tl-drop-into")
      .forEach(el => el.classList.remove("tl-drop-before", "tl-drop-after", "tl-drop-into"));
  }
  function bucketIndexOf(sectionId, beforeActId) {
    // Position of beforeActId within its bucket; null → end of bucket.
    const list = Pack.activitiesInBucket
      ? Pack.activitiesInBucket(pack, sectionId === "__unsectioned" ? null : sectionId)
      : pack.activities.filter(a => (sectionId === "__unsectioned" ? !a.section_id : a.section_id === sectionId));
    if (!beforeActId) return list.length;
    const idx = list.findIndex(a => a.id === beforeActId);
    return idx < 0 ? list.length : idx;
  }
  function dropActivity(actId, sectionId, beforeActId) {
    const sid = (sectionId === "__unsectioned") ? null : sectionId;
    const idx = bucketIndexOf(sectionId, beforeActId);
    if (Pack.placeActivity(pack, actId, sid, idx)) { saveDraft(); refresh(); }
  }
  function dropSection(sectionId, targetIndex) {
    if (Pack.reorderSection(pack, sectionId, targetIndex)) { saveDraft(); refresh(); }
  }

  /* Build a collapsible section group with a drag handle, inline rename and
     delete (so the pack-details Sections block isn't needed). */
  function makeGroup(sec, items, opts) {
    opts = opts || {};
    const isUnsectioned = sec.id === "__unsectioned";
    const groupLi = DOM.el("li", {
      class: "task-group"
        + (opts.collapsed ? " collapsed" : "")
        + (opts.titleOnly ? " title-only" : "")
        + (opts.isCurrent ? " is-current" : "")
    });
    groupLi.dataset.sectionId = sec.id;
    if (opts.colour) groupLi.style.setProperty("--task-section-colour", opts.colour);

    const head = DOM.el("div", { class: "task-group-head-row" });

    // Drag handle (named sections only — the unsectioned bucket is fixed).
    if (!isUnsectioned) {
      const handle = DOM.el("span", { class: "tl-handle", title: "Drag to reorder section", draggable: "true" }, "⠿");
      handle.addEventListener("dragstart", ev => {
        _drag = { kind: "section", id: sec.id };
        ev.dataTransfer.effectAllowed = "move";
        try { ev.dataTransfer.setData("text/plain", sec.id); } catch (e) {}
        groupLi.classList.add("tl-dragging");
      });
      handle.addEventListener("dragend", () => { _drag = null; clearDropMarks(); groupLi.classList.remove("tl-dragging"); });
      head.appendChild(handle);
    } else {
      head.appendChild(DOM.el("span", { class: "tl-handle tl-handle-fixed", "aria-hidden": "true" }, ""));
    }

    const headBtn = DOM.el("button", {
      class: "task-group-header",
      type: "button",
      "aria-expanded": opts.collapsed ? "false" : "true"
    });
    headBtn.appendChild(DOM.el("span", { class: "chev", "aria-hidden": "true" }, "▾"));
    const textBlock = DOM.el("span", { class: "group-text" });
    const kickerText = opts.titleOnly
      ? (sec.kicker || "Section") + " (" + items.length + ")"
      : (sec.kicker || "Section");
    textBlock.appendChild(DOM.el("span", { class: "group-kicker" }, kickerText));
    if (sec.title) textBlock.appendChild(DOM.el("span", { class: "group-title" }, sec.title));
    headBtn.appendChild(textBlock);
    headBtn.addEventListener("click", () => opts.onToggle(!opts.collapsed));
    head.appendChild(headBtn);

    // Rename + delete for named sections.
    if (!isUnsectioned && sec.section) {
      const rename = DOM.button("✎", () => {
        const next = prompt("Section title:", sec.section.title || "");
        if (next != null) { sec.section.title = next.trim() || sec.section.title; saveDraft(); refresh(); }
      }, "icon");
      rename.classList.add("tl-sec-btn"); rename.title = "Rename section";
      const del = DOM.button("🗑", () => {
        if (!confirm("Remove this section? Its activities become unsectioned.")) return;
        Pack.removeSection(pack, sec.id); saveDraft(); refresh();
      }, "icon");
      del.classList.add("tl-sec-btn"); del.title = "Delete section";
      head.appendChild(rename);
      head.appendChild(del);
    }

    groupLi.appendChild(head);

    // Section-level drop handling: dropping a SECTION reorders; dropping an
    // ACTIVITY drops it into this bucket (at end, unless over a row).
    function sectionIndex() { return pack.sections.findIndex(s => s.id === sec.id); }
    head.addEventListener("dragover", ev => {
      if (!_drag) return;
      ev.preventDefault();
      clearDropMarks();
      if (_drag.kind === "section" && !isUnsectioned) {
        const r = head.getBoundingClientRect();
        const after = ev.clientY > r.top + r.height / 2;
        head.classList.add(after ? "tl-drop-after" : "tl-drop-before");
      } else if (_drag.kind === "activity") {
        head.classList.add("tl-drop-into");
      }
    });
    head.addEventListener("drop", ev => {
      if (!_drag) return;
      ev.preventDefault();
      const d = _drag; _drag = null; clearDropMarks();
      if (d.kind === "section" && !isUnsectioned) {
        const r = head.getBoundingClientRect();
        const after = ev.clientY > r.top + r.height / 2;
        let target = sectionIndex() + (after ? 1 : 0);
        // Adjust for removal of the dragged section before reinsertion.
        const fromIdx = pack.sections.findIndex(s => s.id === d.id);
        if (fromIdx >= 0 && fromIdx < target) target -= 1;
        dropSection(d.id, target);
      } else if (d.kind === "activity") {
        dropActivity(d.id, sec.id, null);  // append to this bucket
      }
    });

    const groupBody = DOM.el("ol", { class: "task-group-body" });
    if (!items.length) {
      const empty = DOM.el("li", { class: "task-empty-row" }, "Drop activities here");
      // Allow dropping an activity onto an empty bucket.
      empty.addEventListener("dragover", ev => { if (_drag && _drag.kind === "activity") { ev.preventDefault(); clearDropMarks(); empty.classList.add("tl-drop-into"); } });
      empty.addEventListener("drop", ev => {
        if (_drag && _drag.kind === "activity") { ev.preventDefault(); const id = _drag.id; _drag = null; clearDropMarks(); dropActivity(id, sec.id, null); }
      });
      groupBody.appendChild(empty);
    }
    items.forEach(it => groupBody.appendChild(teacherTaskItem(it.act, it.i, opts.colour, sec.id)));
    groupLi.appendChild(groupBody);
    return groupLi;
  }

  /* A single draggable activity row. */
  function teacherTaskItem(act, i, secColour, sectionId) {
    const C = PyQuiz.Constants;
    const typeColour = (C.TYPE_COLOURS && C.TYPE_COLOURS[act.type]) || "var(--accent)";
    const typeLabel  = (C.TYPE_LABELS  && C.TYPE_LABELS[act.type])  || act.type;
    const typeAbbrev = (C.TYPE_ABBREV  && C.TYPE_ABBREV[act.type])  || typeLabel.slice(0, 3).toLowerCase();
    const li = DOM.el("li", { class: "task-row" });
    li.dataset.actId = act.id;
    if (act.id === currentEditId) li.classList.add("current");
    li.style.setProperty("--activity-colour", secColour || typeColour);

    const handle = DOM.el("span", { class: "tl-handle", title: "Drag to move", draggable: "true" }, "⠿");
    handle.addEventListener("dragstart", ev => {
      _drag = { kind: "activity", id: act.id };
      ev.dataTransfer.effectAllowed = "move";
      try { ev.dataTransfer.setData("text/plain", act.id); } catch (e) {}
      li.classList.add("tl-dragging");
    });
    handle.addEventListener("dragend", () => { _drag = null; clearDropMarks(); li.classList.remove("tl-dragging"); });
    li.appendChild(handle);

    const btn = DOM.el("button", {
      type: "button",
      onclick: () => { currentEditId = act.id; refresh(); }
    });
    btn.appendChild(DOM.el("span", { class: "status not_started" }, String(i + 1)));
    btn.appendChild(DOM.el("span", { class: "task-title" }, act.title || "(untitled)"));
    const pill = DOM.el("span", { class: "type-pill type-pill-abbrev", title: typeLabel }, typeAbbrev);
    pill.style.backgroundColor = typeColour;
    btn.appendChild(pill);
    li.appendChild(btn);

    // Drop target: drop an activity before/after this row (same or other
    // bucket). Sections aren't dropped onto rows.
    li.addEventListener("dragover", ev => {
      if (!_drag || _drag.kind !== "activity") return;
      ev.preventDefault();
      clearDropMarks();
      const r = li.getBoundingClientRect();
      const after = ev.clientY > r.top + r.height / 2;
      li.classList.add(after ? "tl-drop-after" : "tl-drop-before");
    });
    li.addEventListener("drop", ev => {
      if (!_drag || _drag.kind !== "activity") return;
      ev.preventDefault();
      const d = _drag; _drag = null; clearDropMarks();
      if (d.id === act.id) return;
      const r = li.getBoundingClientRect();
      const after = ev.clientY > r.top + r.height / 2;
      const beforeId = after ? nextRowId(sectionId, act.id) : act.id;
      dropActivity(d.id, sectionId, beforeId);
    });
    return li;
  }

  // The id of the row after `actId` within its bucket (for "drop after").
  function nextRowId(sectionId, actId) {
    const sid = (sectionId === "__unsectioned") ? null : sectionId;
    const list = pack.activities.filter(a => (sid ? a.section_id === sid : !a.section_id));
    const idx = list.findIndex(a => a.id === actId);
    return (idx >= 0 && idx + 1 < list.length) ? list[idx + 1].id : null;
  }

  /* Render the sticky "+ Add activity" footer once, at startup. */
  function renderTaskListFooter() {
    const host = document.getElementById("task-list-footer");
    if (!host) return;
    host.innerHTML = "";
    const addBtn = DOM.button("+ " + S.addActivity, openAddActivityDialog, "primary");
    host.appendChild(addBtn);
    const addSec = DOM.button("+ Section", () => {
      const nextNum = ((pack.sections || []).length) + 1;
      Pack.addSection(pack, "Section " + nextNum);
      saveDraft(); refresh();
    }, "ghost");
    addSec.classList.add("tl-add-section");
    host.appendChild(addSec);
  }

  function openAddActivityDialog() {
    const Constants = PyQuiz.Constants;
    const body = DOM.el("div");
    body.appendChild(DOM.el("p", { class: "type-picker-intro" },
      "Pick the kind of activity to add. Each type targets a different cognitive skill."));
    const grid = DOM.el("div", { class: "type-picker-grid" });
    // Order matches the PRIMM flow (Predict → Modify) plus the closing
    // Challenge step. Description is short — one line tops.
    const types = [
      ["predict_output",    "Predict",   "Read code, predict what it prints. Free text or multiple choice."],
      ["parsons",           "Parsons",   "Reorder shuffled code lines into a working program."],
      ["modify",            "Modify",    "The code works. Change one line so it does something different."],
      ["spot_the_bug",      "Spot the bug", "The code is broken. Find the line and write a fix."],
      ["cloze",             "Cloze",     "Fill blanks in a code template — text, dropdown or bank."],
      ["trace_table",       "Trace",     "Step through code line by line, recording variable changes."],
      ["testing",           "Testing",   "Build a table of test cases — Normal, Boundary, Invalid and Erroneous — for a function."],
      ["starter_challenge", "Challenge", "Open-ended coding task with starter, example calls and a model solution."]
    ];
    const dlg = Modal.open({ title: S.selectActivityType, body: body, maxWidth: "780px" });
    types.forEach(([t, label, desc]) => {
      const colour = (Constants && Constants.TYPE_COLOURS && Constants.TYPE_COLOURS[t]) || "#666";
      const card = DOM.el("button", {
        type: "button",
        class: "type-picker-card",
        onclick: () => {
          const a = Pack.blankActivity(t);
          const res = Pack.addActivity(pack, a, { validate: false });
          currentEditId = res.activity.id;
          dlg.close();
          saveDraft(true);
          refresh();
        }
      });
      card.style.setProperty("--type-colour", colour);
      const badge = DOM.el("span", { class: "type-picker-badge" }, label);
      card.appendChild(badge);
      card.appendChild(DOM.el("span", { class: "type-picker-desc" }, desc));
      grid.appendChild(card);
    });
    body.appendChild(grid);
  }

  /* ---- Main editor pane ---- */
  /* The editor is split across two panes:
       - centre (#main-region): a LIVE PREVIEW of the selected activity,
         rendered with the same renderer the student tool uses;
       - right  (#side-panel):  the PROPERTIES inspector — all the form
         sections plus a collapsed Validation section at the bottom.
     Editing a property updates the live preview in place. */
  function renderEditor() {
    const main = document.getElementById("main-region");
    const props = document.getElementById("side-panel-body") || document.getElementById("side-panel");
    main.innerHTML = "";
    // Clear only the body — the rail, head and resize handle live outside it.
    const handle = props ? props.querySelector(".pane-resize") : null;
    if (props) { props.innerHTML = ""; if (handle) props.appendChild(handle); }

    if (currentEditId === "__meta__") {
      renderPackMetaEditor(main);
      if (props) renderMetaProperties(props);
      return;
    }
    const act = Pack.findActivity(pack, currentEditId);
    if (!act) {
      main.appendChild(DOM.el("div", { class: "empty-state" },
        DOM.el("h2", null, S.noActivities),
        DOM.el("p", { html: "Click <em>Add activity</em> on the left to begin." })));
      if (props) renderMetaProperties(props);
      return;
    }
    renderActivityProperties(props, act);   // builds the right pane
    renderLivePreview(act);                 // builds the centre preview
  }

  /* ---- Centre pane: live PREVIEW (student view) ⇄ live EDIT (teacher
     types straight into the student-facing widgets) ----
     A segmented toggle in the header switches between the two. Preview
     renders the activity exactly as the student tool would; Edit swaps in
     an editable surface where the teacher writes the code, output, rows,
     etc. directly, and the changes flow back into the activity data and
     update the Properties pane + validation. Types without a dedicated
     live editor fall back to Preview with a short note. */
  let _previewCtrl = null;
  let _centreMode = "preview";   // "preview" | "edit"; remembered across renders
  let _lastCentreActId = null;   // detect when the selected activity changes
  const _openSections = {};      // section title → open?, persisted across re-renders

  function renderLivePreview(act) {
    const main = document.getElementById("main-region");
    if (!main) return;
    main.innerHTML = "";
    _previewCtrl = null;
    const hasLiveEditor = !!LiveEditors[act.type];
    // When the SELECTED activity changes, default the centre to EDIT (the
    // primary task for every type). Switching modes within an activity is
    // remembered for the session.
    if (act.id !== _lastCentreActId) {
      _lastCentreActId = act.id;
      _centreMode = "edit";
    }
    // If we remembered "edit" but this type has no live editor, fall back.
    const mode = (_centreMode === "edit" && hasLiveEditor) ? "edit" : "preview";

    const wrap = DOM.el("div", { class: "live-preview" });
    const head = DOM.el("div", { class: "live-preview-head" });
    head.appendChild(DOM.el("h2", { class: "lp-title" }, act.title || "Untitled activity"));

    // Segmented Preview/Edit toggle — only shown when this type has a live
    // editor (otherwise a lone "Preview" button looks broken).
    if (hasLiveEditor) {
      const seg = DOM.el("div", { class: "lp-mode-toggle", role: "tablist", "aria-label": "Centre pane mode" });
      function modeBtn(id, label) {
        const b = DOM.el("button", { type: "button", role: "tab",
          "aria-selected": mode === id ? "true" : "false",
          class: "lp-mode-btn" + (mode === id ? " active" : "") }, label);
        b.addEventListener("click", () => { _centreMode = id; renderLivePreview(act); });
        return b;
      }
      seg.appendChild(modeBtn("edit", "Edit"));
      seg.appendChild(modeBtn("preview", "Preview"));
      head.appendChild(seg);
    } else {
      // No live editor for this type: label the pane as a plain preview.
      head.appendChild(DOM.el("span", { class: "lp-badge" }, "Live preview"));
    }
    wrap.appendChild(head);

    const scroll = DOM.el("div", { class: "live-preview-scroll" });
    const stage = DOM.el("div", { class: "live-preview-stage" });
    scroll.appendChild(stage);
    wrap.appendChild(scroll);
    main.appendChild(wrap);

    if (mode === "edit") { renderLiveEdit(act, stage); return; }
    renderStudentPreview(act, stage);
  }

  /* When hosted (served over http/https), preview marking routes through the
     server so it uses the exact Python marker a student hits — the single
     source of truth (D1). Opened offline as a single file (file://), or if the
     request fails, it falls back to the in-page JS marker, which the parity
     harness proves byte-identical. So the teacher always sees what the student
     would, whichever way the tool is run. */
  const Server = {
    enabled: (location.protocol === "http:" || location.protocol === "https:"),
    async previewMark(act, resp) {
      const r = await fetch("/api/v1/preview/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity: act, response: resp }),
        cache: "no-cache"
      });
      if (!r.ok) throw new Error("Preview marking failed (" + r.status + ")");
      return r.json();
    }
  };
  PyQuiz.Server = Server;

  function previewMarkActivity(act, resp) {
    if (Server.enabled) return Server.previewMark(act, resp).catch(() => Marker.mark(act, resp));
    return Marker.mark(act, resp);
  }

  /* Render the preview inside the same .sk/.sk-work context as the student
     player so the shared activity skin (code-box windows, restyled widgets)
     applies identically. Returns the .activity-body to render into; call
     decoratePreview() afterwards to add the window chrome. */
  function skinPreviewHost(parent) {
    const sk = DOM.el("div", { class: "sk" });
    const work = DOM.el("div", { class: "sk-work" });
    const wrap = DOM.el("div", { class: "activity-wrap" });
    const ab = DOM.el("div", { class: "activity-body" });
    wrap.appendChild(ab); work.appendChild(wrap); sk.appendChild(work);
    parent.appendChild(sk);
    return ab;
  }
  function decoratePreview(ab, act, ctrl) {
    try {
      if (!PyQuiz.Skin) return;
      PyQuiz.Skin.decorate(ab, { getCode: function () {
        try { if (ctrl && ctrl.getResponse && PyQuiz.Code && PyQuiz.Code.assemble) return PyQuiz.Code.assemble(act, ctrl.getResponse()); } catch (e) {}
        try { return (PyQuiz.Code && PyQuiz.Code.codeForCopy) ? PyQuiz.Code.codeForCopy(act) : ""; } catch (e) {}
        return "";
      } });
    } catch (e) {}
  }

  /* Student-view preview (read-only-ish: interactions work but aren't saved). */
  function renderStudentPreview(act, stage) {
    const issues = (PyQuiz.Validator && PyQuiz.Validator.activity)
      ? PyQuiz.Validator.activity(act, "activity") : [];
    const errs = issues.filter(i => i.level === "error");

    if (act.context) stage.appendChild(DOM.el("div", { class: "activity-context" }, act.context));
    if (act.instructions) stage.appendChild(DOM.el("p", { class: "activity-instructions" }, act.instructions));
    if (Renderers.ioPanel) {
      try { const io = Renderers.ioPanel.build(act); if (io) stage.appendChild(io); } catch (e) {}
    }
    const ab = skinPreviewHost(stage);
    try {
      if (Renderers.has(act.type)) _previewCtrl = Renderers.render(act, ab, {});
      else ab.appendChild(DOM.el("p", { class: "kbd-help" }, "No preview renderer for this type."));
    } catch (e) {
      ab.appendChild(DOM.el("div", { class: "render-error" },
        DOM.el("h3", null, "Preview unavailable"),
        DOM.el("p", null, "This activity can't be previewed yet — check the Validation section for details."),
        DOM.el("pre", { class: "render-error-detail" }, String(e && e.message || e))));
    }
    if (_previewCtrl) {
      decoratePreview(ab, act, _previewCtrl);
      const ctrls = DOM.el("div", { class: "live-preview-controls" });
      const fb = DOM.el("span");
      const check = DOM.button(S.check, () => {
        const apply = (r) => {
          fb.textContent = r.feedback || "";
          fb.style.color = r.status === "correct" ? "var(--ok)" : "var(--bad)";
          if (_previewCtrl.highlight) _previewCtrl.highlight(r.per_part);
        };
        const fail = (e) => { fb.textContent = "Could not check: " + (e.message || e); fb.style.color = "var(--bad)"; };
        try {
          const marked = previewMarkActivity(act, _previewCtrl.getResponse());
          if (marked && typeof marked.then === "function") marked.then(apply).catch(fail);
          else apply(marked);
        } catch (e) { fail(e); }
      }, "primary");
      const reset = DOM.button(S.reset, () => { if (_previewCtrl.reset) _previewCtrl.reset(); fb.textContent = ""; });
      ctrls.appendChild(check); ctrls.appendChild(reset); ctrls.appendChild(fb);
      if (errs.length) ctrls.appendChild(DOM.el("span", { style: "color:var(--warn);font-size:0.85em;margin-left:auto" },
        errs.length + " error(s) — see Validation"));
      stage.appendChild(ctrls);
    }
  }

  /* Live EDIT surface. Edits write into `act` and propagate: save the
     draft, refresh the Properties form (so its mirror fields update), the
     validation badge, and the task list title. The Properties pane is NOT
     fully re-rendered on every keystroke (that would steal focus); instead
     we re-render it once, debounced, after edits settle. */
  let _editPropTimer = null;
  function liveEditChanged(act) {
    saveDraft();
    refreshValidation();
    renderTaskList();
    const t = document.querySelector(".lp-title");
    if (t) t.textContent = act.title || "Untitled activity";
    // Refresh the Properties pane (mirror fields) after a short settle so
    // typing in the centre doesn't fight a re-render.
    if (_editPropTimer) clearTimeout(_editPropTimer);
    _editPropTimer = setTimeout(() => {
      _editPropTimer = null;
      const props = document.getElementById("side-panel-body") || document.getElementById("side-panel");
      if (!props) return;
      const handle = props.querySelector(".pane-resize");
      props.innerHTML = ""; if (handle) props.appendChild(handle);
      renderActivityProperties(props, act);
    }, 600);
  }

  function renderLiveEdit(act, stage) {
    // Per-type setting controls (mode/style/etc.) sit at the very top of the
    // Edit surface, before the instructions, as toggle-button groups.
    if (LiveEditorHeaders[act.type]) {
      const hdr = DOM.el("div", { class: "le-head-controls" });
      try { LiveEditorHeaders[act.type](act, hdr, () => { liveEditChanged(act); rerenderLiveEdit(act); }); }
      catch (e) {}
      stage.appendChild(hdr);
    }

    // Context + instructions are editable inline so the teacher can author the
    // whole student-facing surface in one place.
    const ctxWrap = DOM.el("div", { class: "le-inline-field" });
    const instr = DOM.el("textarea", { class: "le-instr", rows: "2",
      placeholder: "Instructions shown to the student…" });
    instr.value = act.instructions || "";
    instr.addEventListener("input", () => { act.instructions = instr.value; liveEditChanged(act); });
    ctxWrap.appendChild(DOM.el("label", { class: "le-label" }, "Instructions"));
    ctxWrap.appendChild(instr);
    stage.appendChild(ctxWrap);

    const ab = DOM.el("div", { class: "activity-body le-body" });
    stage.appendChild(ab);
    try {
      LiveEditors[act.type](act, ab, () => liveEditChanged(act));
    } catch (e) {
      ab.appendChild(DOM.el("div", { class: "render-error" },
        DOM.el("h3", null, "Live edit unavailable"),
        DOM.el("pre", { class: "render-error-detail" }, String(e && e.message || e))));
    }
  }

  /* Re-render the Edit surface in place (used when a header control changes a
     setting that the body editor depends on). */
  function rerenderLiveEdit(act) {
    const stage = document.querySelector("#main-region .live-preview-stage");
    if (!stage) return;
    stage.innerHTML = "";
    renderLiveEdit(act, stage);
  }

  /* Header-control builders: function(act, host, onChange). A small helper
     `btnGroup` renders a labelled toggle-button group (no radios). */
  const LiveEditorHeaders = {};
  function leBtnGroup(host, label, value, opts, onPick, disabledVals) {
    const wrap = DOM.el("div", { class: "le-ctrl" });
    wrap.appendChild(DOM.el("span", { class: "le-ctrl-label" }, label));
    const grp = DOM.el("div", { class: "form-btn-group" });
    opts.forEach(([v, l]) => {
      const b = DOM.el("button", { type: "button", class: "form-btn-toggle" + (String(v) === String(value) ? " active" : ""),
        "data-val": String(v) }, l);
      if (disabledVals && disabledVals.indexOf(v) !== -1) { b.disabled = true; b.classList.add("is-disabled"); }
      b.addEventListener("click", () => { if (b.disabled) return; onPick(v); });
      grp.appendChild(b);
    });
    wrap.appendChild(grp);
    host.appendChild(wrap);
  }

  // predict_output: Direction + Mode as button groups at the top of Edit.
  LiveEditorHeaders.predict_output = function (act, host, onChange) {
    const p = act.payload || (act.payload = {});
    leBtnGroup(host, "Direction", p.direction || "code_to_output",
      [["code_to_output", "Code \u2192 output"], ["output_to_code", "Output \u2192 code"]], v => {
        p.direction = v;
        if (v === "output_to_code") p.mode = "multiple_choice";  // free text makes no sense backwards
        onChange();
      });
    // Output→code only supports multiple choice, so disable free text there.
    const disabled = (p.direction === "output_to_code") ? ["free_text"] : [];
    leBtnGroup(host, "Mode", p.mode || "free_text",
      [["free_text", "Free text"], ["multiple_choice", "Multiple choice"]], v => { p.mode = v; onChange(); }, disabled);
  };

  // modify / spot_the_bug: Mode + Style (constraint) as button groups, with
  // combinations that don't make sense disabled.
  function bugModeHeader(act, host, onChange) {
    const p = act.payload || (act.payload = {});
    const isModify = act.type === "modify";
    let constraint = p.constraint || "in_place";
    if (constraint === "none" || constraint === "one_line" || constraint === "one_char") constraint = "in_place";
    // Style decides which Modes make sense:
    //  - add_line: the student adds a line, so they're always fixing → only
    //    "select & fix" / "rewrite" (here "fix") make sense; "select only" off.
    //  - remove_line: the student only bins a line → no Mode applies at all.
    leBtnGroup(host, "Style", constraint,
      [["in_place", "Edit in place"], ["add_line", "Add line"], ["remove_line", "Remove line"]], v => {
        p.constraint = v;
        if (v === "remove_line") { /* mode irrelevant */ }
        else if (v === "add_line" && p.mode === "select_line") p.mode = "select_and_fix";
        onChange();
      });
    if (constraint === "remove_line") {
      host.appendChild(DOM.el("p", { class: "le-note", style: "margin:2px 0 0" },
        "Remove line: students just bin a line, so there's no Mode to choose."));
      return;
    }
    const disabledModes = (constraint === "add_line") ? ["select_line"] : [];
    leBtnGroup(host, "Mode", p.mode || "select_and_fix",
      [["select_line", "Select only"], ["select_and_fix", "Select & fix"], ["rewrite", "Rewrite"]],
      v => { p.mode = v; onChange(); }, disabledModes);
  }
  LiveEditorHeaders.modify = bugModeHeader;
  LiveEditorHeaders.spot_the_bug = bugModeHeader;

  /* ---- Live editors registry (teacher types into the student widgets) ----
     Each entry: function(act, host, onChange) → builds editable widgets in
     `host` that write into act.payload and call onChange() after edits. */
  const LiveEditors = {};

  /* predict_output: teacher writes the code in the code box and the expected
     output in the output box. Direction/mode mirror the student widget;
     alternative acceptable outputs stay in the Properties pane. */
  LiveEditors.predict_output = function (act, host, onChange) {
    const p = act.payload || (act.payload = {});
    const direction = p.direction || "code_to_output";
    const mode = p.mode || "free_text";
    const codeIsPrimary = direction === "code_to_output";

    // The "shown" box (code for code→output, or the target output for
    // output→code). Editable code editor.
    host.appendChild(DOM.el("h3", null, codeIsPrimary ? "Code" : "Output"));
    DOM.codeField(host, p.code || "", v => { p.code = v; onChange(); },
      { lineNumbers: codeIsPrimary, language: codeIsPrimary ? "python" : "text" });

    if (mode === "multiple_choice") {
      // Options are added/edited right here. IDs are internal (UUID) and never
      // shown; a radio per option marks the correct one.
      p.options = Array.isArray(p.options) ? p.options : [];
      // Backfill ids for any option missing one.
      p.options.forEach(o => { if (!o.id) o.id = PyQuiz.Pack.uid("opt"); });

      const sec = DOM.el("div", { class: "le-answer" });
      sec.appendChild(DOM.el("label", { class: "le-label" },
        codeIsPrimary ? "Answer options (tick the correct one)" : "Code options (tick the correct one)"));
      const list = DOM.el("div", { class: "le-opt-list" });
      sec.appendChild(list);

      function redraw(focusIdx) {
        list.innerHTML = "";
        if (!p.options.length) {
          list.appendChild(DOM.el("p", { class: "le-empty-hint" }, "No options yet — use + to add at least two."));
        }
        p.options.forEach((o, i) => {
          const rowEl = DOM.el("div", { class: "le-opt-row" });
          const radio = DOM.el("input", { type: "radio", name: "le-po-ans-" + act.id, "aria-label": "Correct option" });
          radio.checked = p.answer === o.id;
          radio.addEventListener("change", () => { p.answer = o.id; onChange(); });
          rowEl.appendChild(radio);
          const ta = DOM.el("textarea", { class: "le-opt-input", rows: "1", spellcheck: "false", autocomplete: "off",
            placeholder: "Option text…" });
          ta.value = o.content || "";
          ta.addEventListener("input", () => { o.content = ta.value; onChange(); });
          rowEl.appendChild(ta);
          const del = DOM.button("🗑", () => {
            const wasAnswer = p.answer === o.id;
            p.options.splice(i, 1);
            if (wasAnswer) p.answer = p.options.length ? p.options[0].id : null;
            onChange(); redraw(Math.max(0, i - 1));
          }, "icon");
          del.classList.add("le-line-del");
          del.title = "Remove option";
          rowEl.appendChild(del);
          list.appendChild(rowEl);
        });
        if (focusIdx != null) {
          const inputs = list.querySelectorAll(".le-opt-input");
          if (inputs[focusIdx]) inputs[focusIdx].focus();
        }
      }
      redraw(null);
      const addBtn = DOM.button("+ Add option", () => {
        const o = { id: PyQuiz.Pack.uid("opt"), content: "" };
        p.options.push(o);
        if (!p.answer) p.answer = o.id;   // first option defaults to correct
        onChange(); redraw(p.options.length - 1);
      }, "ghost");
      addBtn.classList.add("le-add-btn");
      sec.appendChild(addBtn);
      host.appendChild(sec);
      return;
    }

    // free text: the expected output box maps to payload.answer, with an
    // inline "also accepted" list for alternative correct outputs.
    const ow = DOM.el("div", { class: "po-free le-answer" });
    ow.appendChild(DOM.el("label", { class: "le-label" },
      codeIsPrimary ? "Expected output (the correct answer)" : "Code that produces this output"));
    const ta = DOM.el("textarea", { class: "po-input", rows: "4", spellcheck: "false", autocomplete: "off" });
    ta.value = p.answer || "";
    ta.addEventListener("input", () => { p.answer = ta.value; onChange(); });
    ow.appendChild(ta);
    host.appendChild(ow);

    // Also-accepted alternatives — one editable line each, with + / delete.
    const altWrap = DOM.el("div", { class: "le-answer" });
    altWrap.appendChild(DOM.el("label", { class: "le-label" }, "Also accepted (optional)"));
    p.accepted_answers = Array.isArray(p.accepted_answers) ? p.accepted_answers : [];
    const altList = DOM.el("div", { class: "le-line-list" });
    altWrap.appendChild(altList);
    function redrawAlts(focusIdx) {
      altList.innerHTML = "";
      if (!p.accepted_answers.length) {
        altList.appendChild(DOM.el("p", { class: "le-empty-hint" },
          "No alternatives. Add one if more than one output is correct."));
      }
      p.accepted_answers.forEach((v, i) => {
        const rowEl = DOM.el("div", { class: "le-line-row" });
        const inp = DOM.el("input", { type: "text", class: "le-line-input", spellcheck: "false", autocomplete: "off" });
        inp.value = v;
        inp.addEventListener("input", () => { p.accepted_answers[i] = inp.value; onChange(); });
        rowEl.appendChild(inp);
        const del = DOM.button("🗑", () => { p.accepted_answers.splice(i, 1); onChange(); redrawAlts(Math.max(0, i - 1)); }, "icon");
        del.classList.add("le-line-del"); del.title = "Remove alternative";
        rowEl.appendChild(del);
        altList.appendChild(rowEl);
      });
      if (focusIdx != null) { const ins = altList.querySelectorAll(".le-line-input"); if (ins[focusIdx]) ins[focusIdx].focus(); }
    }
    redrawAlts(null);
    const addAlt = DOM.button("+ Add alternative", () => {
      p.accepted_answers.push(""); onChange(); redrawAlts(p.accepted_answers.length - 1);
    }, "ghost");
    addAlt.classList.add("le-add-btn");
    altWrap.appendChild(addAlt);
    host.appendChild(altWrap);
  };

  /* parsons: two editable lists — Program (canonical_code lines) and Bin
     (distractor lines). Each has a + to add a line; each row is an editable
     monospace input with a delete button. Edits rewrite the multi-line
     canonical_code / distractors strings, keeping the Properties code and
     distractor boxes in sync. Swap groups + advanced orderings stay in the
     Properties pane. */
  LiveEditors.parsons = function (act, host, onChange) {
    const p = act.payload || (act.payload = {});
    if (typeof p.canonical_code !== "string") p.canonical_code = "";
    if (typeof p.distractors !== "string") p.distractors = "";

    // Build an editable list bound to a payload string field. An in-memory
    // `lines` array is the source of truth for rendering; it's serialised to
    // the payload string on every change. (Serialising via a string can't tell
    // a single blank line from "no lines", so we keep the array authoritative.)
    function buildList(opts) {
      const areaWrap = DOM.el("div", { class: "parsons-area le-parsons-area" + (opts.bin ? " parsons-bin" : ""),
        "data-area": opts.bin ? "bin" : "program" });
      const headRow = DOM.el("div", { class: "le-parsons-head" });
      headRow.appendChild(DOM.el("h3", null, opts.title));
      // Seed from the stored string (empty string → no rows).
      const seed = (p[opts.field] || "");
      const lines = seed === "" ? [] : seed.split("\n");
      function commit() { p[opts.field] = lines.length ? lines.join("\n") : ""; onChange(); }

      const addBtn = DOM.button("+ " + opts.addLabel, () => {
        lines.push("");
        commit();
        rebuild(lines.length - 1);
      }, "ghost");
      addBtn.classList.add("le-add-btn");
      headRow.appendChild(addBtn);
      areaWrap.appendChild(headRow);
      if (opts.desc) areaWrap.appendChild(DOM.el("p", { class: "area-desc" }, opts.desc));
      const list = DOM.el("div", { class: "le-line-list" });
      areaWrap.appendChild(list);

      function rebuild(focusIdx) {
        list.innerHTML = "";
        if (!lines.length) {
          list.appendChild(DOM.el("p", { class: "le-empty-hint" },
            opts.bin ? "No distractors. Use + to add a wrong line students must bin."
                     : "No lines yet. Use + to add the first program line."));
        }
        lines.forEach((ln, i) => {
          const row = DOM.el("div", { class: "le-line-row" });
          const inp = DOM.el("input", { type: "text", class: "le-line-input", spellcheck: "false", autocomplete: "off" });
          inp.value = ln;
          // Live string update without rebuilding (keeps focus/caret).
          inp.addEventListener("input", () => { lines[i] = inp.value; commit(); });
          inp.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter") {
              ev.preventDefault();
              lines.splice(i + 1, 0, "");
              commit();
              rebuild(i + 1);
            } else if (ev.key === "Backspace" && inp.value === "" && lines.length > 1) {
              ev.preventDefault();
              lines.splice(i, 1);
              commit();
              rebuild(Math.max(0, i - 1));
            }
          });
          row.appendChild(inp);
          const del = DOM.button("🗑", () => {
            lines.splice(i, 1);
            commit();
            rebuild(Math.max(0, i - 1));
          }, "icon");
          del.classList.add("le-line-del");
          del.title = "Remove line";
          row.appendChild(del);
          list.appendChild(row);
        });
        if (focusIdx != null) {
          const inputs = list.querySelectorAll(".le-line-input");
          if (inputs[focusIdx]) inputs[focusIdx].focus();
        }
      }
      rebuild(null);
      return areaWrap;
    }

    const areas = DOM.el("div", { class: "parsons-areas le-parsons-areas" });
    areas.appendChild(buildList({
      title: "Program", addLabel: "Add line", field: "canonical_code",
      desc: "The correct lines, in order. Leading spaces set the indent."
    }));
    areas.appendChild(buildList({
      title: "Bin", addLabel: "Add distractor", field: "distractors", bin: true,
      desc: "Wrong lines students must drag to the bin."
    }));
    host.appendChild(areas);
    host.appendChild(DOM.el("p", { class: "le-note" },
      "Swap groups (interchangeable lines) and accepted orderings are managed in the Properties pane."));
  };

  /* flowchart: mount the full WYSIWYG flowchart editor (canvas + toolbar +
     connect mode + Auto-arrange) in the centre Edit pane, where it has room
     to work. The student flowchart view is shown by Preview. The flowchart
     editor handles shapes, edges AND blanks itself, so there is no separate
     Activity-body form in the Properties pane for this type. */
  LiveEditors.flowchart = function (act, host, onChange) {
    if (!(PyQuiz.Editors && PyQuiz.Editors.has && PyQuiz.Editors.has("flowchart"))) {
      host.appendChild(DOM.el("p", { class: "le-note" }, "Flowchart editor unavailable."));
      return;
    }
    const wrap = DOM.el("div", { class: "le-flowchart-host" });
    host.appendChild(wrap);
    PyQuiz.Editors.edit(act, wrap, { onChange: onChange, refresh: () => renderLivePreview(act) });
  };

  /* trace_table: the teacher edits the code, the columns (add / name / delete)
     and the solution rows (add rows, set the line number and each expected
     cell value) directly in a table that mirrors the student view. Column IDs
     are internal (UUID) and never shown. An empty cell means "unchanged from
     the previous row", matching the marker. */
  LiveEditors.trace_table = function (act, host, onChange) {
    const p = act.payload || (act.payload = {});
    p.columns = Array.isArray(p.columns) ? p.columns : [];
    p.rows = Array.isArray(p.rows) ? p.rows : [];
    // Backfill ids + a sensible kind for any column missing them.
    p.columns.forEach(c => { if (!c.id) c.id = PyQuiz.Pack.uid("col"); if (!c.kind) c.kind = "variable"; });

    // Code to trace.
    host.appendChild(DOM.el("h3", null, "Code to trace"));
    DOM.codeField(host, p.code || "", v => { p.code = v; onChange(); },
      { lineNumbers: true, language: "python" });

    // The solution table — editable column headers + editable solution rows.
    host.appendChild(DOM.el("label", { class: "le-label", style: "margin-top:14px" }, "Solution trace (what a correct student would write)"));
    const tableWrap = DOM.el("div", { class: "trace-table-wrap le-trace-wrap" });
    const table = DOM.el("table", { class: "trace-table le-trace-table" });
    const thead = DOM.el("thead");
    const tbody = DOM.el("tbody");
    table.appendChild(thead); table.appendChild(tbody);
    tableWrap.appendChild(table);
    host.appendChild(tableWrap);

    function rebuildHead() {
      thead.innerHTML = "";
      const tr = DOM.el("tr");
      tr.appendChild(DOM.el("th", { class: "le-trace-linehead" }, "Line"));
      p.columns.forEach((c, ci) => {
        const th = DOM.el("th");
        const nameIn = DOM.el("input", { type: "text", class: "le-col-name", value: c.label || "",
          placeholder: "name", "aria-label": "Column name" });
        nameIn.addEventListener("input", () => { c.label = nameIn.value; onChange(); });
        th.appendChild(nameIn);
        const del = DOM.button("\u00d7", () => {
          const id = c.id;
          p.columns.splice(ci, 1);
          p.rows.forEach(r => { if (r.values) delete r.values[id]; });
          onChange(); rebuildHead(); rebuildBody();
        }, "icon");
        del.classList.add("le-col-del"); del.title = "Remove column";
        th.appendChild(del);
        tr.appendChild(th);
      });
      // "+ column" header cell.
      const addTh = DOM.el("th", { class: "le-trace-addcol" });
      const addCol = DOM.button("+", () => {
        const c = { id: PyQuiz.Pack.uid("col"), label: "", kind: "variable" };
        p.columns.push(c);
        p.rows.forEach(r => { r.values = r.values || {}; r.values[c.id] = ""; });
        onChange(); rebuildHead(); rebuildBody();
        const names = thead.querySelectorAll(".le-col-name");
        if (names.length) names[names.length - 1].focus();
      }, "icon");
      addCol.title = "Add column";
      addTh.appendChild(addCol);
      tr.appendChild(addTh);
      thead.appendChild(tr);
    }

    function rebuildBody() {
      tbody.innerHTML = "";
      if (!p.columns.length) {
        const tr = DOM.el("tr");
        tr.appendChild(DOM.el("td", { class: "le-trace-empty", colspan: "2" },
          "Add a column with + to start the trace."));
        tbody.appendChild(tr);
        return;
      }
      p.rows.forEach((r, ri) => {
        const tr = DOM.el("tr");
        const lineTd = DOM.el("td");
        const lineIn = DOM.el("input", { type: "number", min: "1", class: "le-trace-line",
          value: r.line == null ? "" : String(r.line), "aria-label": "Line number" });
        lineIn.addEventListener("input", () => { r.line = lineIn.value === "" ? "" : (parseInt(lineIn.value, 10) || ""); onChange(); });
        lineTd.appendChild(lineIn);
        tr.appendChild(lineTd);
        p.columns.forEach(c => {
          const td = DOM.el("td");
          const inp = DOM.el("input", { type: "text", class: "le-trace-cell",
            placeholder: "(unchanged)", spellcheck: "false", autocomplete: "off" });
          inp.value = (r.values && r.values[c.id] != null) ? r.values[c.id] : "";
          inp.addEventListener("input", () => { r.values = r.values || {}; r.values[c.id] = inp.value; onChange(); });
          td.appendChild(inp);
          tr.appendChild(td);
        });
        const delTd = DOM.el("td");
        const del = DOM.button("\ud83d\uddd1", () => { p.rows.splice(ri, 1); onChange(); rebuildBody(); }, "icon");
        del.classList.add("le-line-del"); del.title = "Remove row";
        delTd.appendChild(del);
        tr.appendChild(delTd);
        tbody.appendChild(tr);
      });
    }

    rebuildHead(); rebuildBody();

    const addRow = DOM.button("+ Add row", () => {
      const vals = {};
      p.columns.forEach(c => vals[c.id] = "");
      // Default the new row's line to the previous row's line + 1 where sensible.
      const prev = p.rows[p.rows.length - 1];
      const nextLine = prev && typeof prev.line === "number" ? prev.line : "";
      p.rows.push({ line: nextLine, values: vals });
      onChange(); rebuildBody();
      const lines = tbody.querySelectorAll(".le-trace-line");
      if (lines.length) lines[lines.length - 1].focus();
    }, "ghost");
    addRow.classList.add("le-add-btn");
    host.appendChild(addRow);
    host.appendChild(DOM.el("p", { class: "le-note" },
      "Leave a cell blank to mean \u201cunchanged from the row above\u201d. Students fill in the line numbers themselves and add as many rows as they need."));
  };

  /* modify / spot_the_bug: the teacher edits the starter code as a list of
     lines (student-style), adds/removes lines, and flags the line(s) that need
     changing with an edit icon next to the bin. Flagging a line opens an inline
     correction field beneath it. An in-memory `lines` model is the source of
     truth and is serialised to payload on every edit:
       - code_lines = every line's source
       - in_place / add_line → bugs[] = { line, fix } for each flagged line
       - remove_line          → solution_code = code with flagged lines removed
     Line numbers are derived from position, so adding/removing lines never
     leaves a stale bug reference. */
  function bugOrModifyLiveEditor(act, host, onChange) {
    const p = act.payload || (act.payload = {});
    const isModify = act.type === "modify";
    const mode = p.mode || "select_and_fix";
    let constraint = p.constraint || "in_place";
    if (constraint === "none" || constraint === "one_line" || constraint === "one_char") constraint = "in_place";
    const wantsFix = constraint !== "remove_line" && (mode === "select_and_fix" || mode === "rewrite" || constraint === "add_line");

    // Seed the in-memory model from payload. Map any existing bug fixes back
    // onto their lines so re-opening the editor preserves them.
    const srcLines = Array.isArray(p.code_lines) ? p.code_lines.slice() : [];
    const fixByLine = {};
    const flaggedLine = {};
    if (constraint === "remove_line") {
      // Flagged = lines NOT present in solution_code (best-effort): if a
      // solution exists, mark the first line that differs. Otherwise nothing
      // is pre-flagged.
      if (typeof p.solution_code === "string" && p.solution_code.length) {
        const solSet = p.solution_code.split("\n");
        // Simple heuristic: the removed line is the one missing from the
        // solution. Find the first index where they diverge.
        let si = 0;
        for (let i = 0; i < srcLines.length; i++) {
          if (srcLines[i] === solSet[si]) { si++; }
          else { flaggedLine[i] = true; }
        }
      }
    } else {
      (p.bugs || []).forEach(b => {
        if (typeof b.line === "number") {
          flaggedLine[b.line - 1] = true;
          fixByLine[b.line - 1] = b.fix || "";
        }
      });
    }
    const lines = srcLines.map((src, i) => ({ src: src, flagged: !!flaggedLine[i], fix: fixByLine[i] || "" }));

    function commit() {
      p.code_lines = lines.map(l => l.src);
      if (constraint === "remove_line") {
        p.solution_code = lines.filter(l => !l.flagged).map(l => l.src).join("\n");
        delete p.bugs;
      } else {
        p.bugs = lines.map((l, i) => l.flagged ? { line: i + 1, fix: wantsFix ? l.fix : "", accepted_fixes: [] } : null)
          .filter(Boolean);
        delete p.solution_code;
      }
      onChange();
    }

    const flagTitle = constraint === "remove_line" ? "Mark this line to be removed"
      : constraint === "add_line" ? "Mark: a line is inserted after this one"
      : (isModify ? "Mark this line as one to change" : "Mark this line as buggy");

    // Current (actual) then Expected behaviour — shown to the student. Both
    // full-width, rounded and colour-coded (current = amber, expected = blue).
    const behWrap = DOM.el("div", { class: "le-answer le-behaviour" });
    behWrap.appendChild(DOM.el("label", { class: "le-label" }, "Current behaviour"));
    const actl = DOM.el("textarea", { class: "le-beh-input le-beh-current", rows: "2", spellcheck: "true",
      placeholder: isModify ? "What it does now, before the change\u2026" : "What the buggy code does now\u2026" });
    actl.value = p.actual_behaviour || "";
    actl.addEventListener("input", () => { p.actual_behaviour = actl.value; onChange(); });
    behWrap.appendChild(actl);
    behWrap.appendChild(DOM.el("label", { class: "le-label", style: "margin-top:10px" }, "Expected behaviour"));
    const exp = DOM.el("textarea", { class: "le-beh-input le-beh-expected", rows: "2", spellcheck: "true",
      placeholder: isModify ? "What the code should do after the change\u2026" : "What the code should do\u2026" });
    exp.value = p.expected_behaviour || "";
    exp.addEventListener("input", () => { p.expected_behaviour = exp.value; onChange(); });
    behWrap.appendChild(exp);
    host.appendChild(behWrap);

    host.appendChild(DOM.el("h3", null, "Code"));
    host.appendChild(DOM.el("p", { class: "le-note", style: "margin:0 0 8px" },
      constraint === "remove_line"
        ? "Flag the line(s) that should be removed. Students may remove any line that yields the same code."
        : constraint === "add_line"
          ? "Flag the line after which a new line should be inserted, then type the line students should add."
          : (isModify ? "Flag each line that needs changing and type the corrected line."
                       : "Flag each buggy line" + (wantsFix ? " and type the corrected line." : "."))));

    const list = DOM.el("div", { class: "le-bug-list" });
    host.appendChild(list);

    function rebuild(focusIdx, focusFix) {
      list.innerHTML = "";
      if (!lines.length) {
        list.appendChild(DOM.el("p", { class: "le-empty-hint" }, "No code yet. Use + to add the first line."));
      }
      lines.forEach((ln, i) => {
        const rowEl = DOM.el("div", { class: "le-bug-row" + (ln.flagged ? " flagged" : "") });
        const main = DOM.el("div", { class: "le-bug-main" });
        main.appendChild(DOM.el("span", { class: "le-bug-num" }, String(i + 1)));
        const codeIn = DOM.el("input", { type: "text", class: "le-bug-code", spellcheck: "false", autocomplete: "off",
          placeholder: "code\u2026" });
        codeIn.value = ln.src;
        codeIn.addEventListener("input", () => { ln.src = codeIn.value; commit(); });
        codeIn.addEventListener("keydown", ev => {
          if (ev.key === "Enter") { ev.preventDefault(); lines.splice(i + 1, 0, { src: "", flagged: false, fix: "" }); commit(); rebuild(i + 1); }
          else if (ev.key === "Backspace" && codeIn.value === "" && lines.length > 1) { ev.preventDefault(); lines.splice(i, 1); commit(); rebuild(Math.max(0, i - 1)); }
        });
        main.appendChild(codeIn);
        // Flag (mark) toggle.
        const flag = DOM.button(ln.flagged ? "\u2691" : "\u2690", () => {
          ln.flagged = !ln.flagged;
          if (!ln.flagged) ln.fix = "";
          commit(); rebuild(i, ln.flagged && wantsFix);
        }, "icon");
        flag.classList.add("le-bug-flag");
        flag.title = ln.flagged ? "Unflag this line" : flagTitle;
        main.appendChild(flag);
        // Delete line.
        const del = DOM.button("\ud83d\uddd1", () => { lines.splice(i, 1); commit(); rebuild(Math.max(0, i - 1)); }, "icon");
        del.classList.add("le-line-del"); del.title = "Remove line";
        main.appendChild(del);
        rowEl.appendChild(main);
        // Inline correction field for flagged lines (fix modes / add_line).
        if (ln.flagged && wantsFix) {
          const fixWrap = DOM.el("div", { class: "le-bug-fix" });
          fixWrap.appendChild(DOM.el("span", { class: "le-bug-fix-label" },
            constraint === "add_line" ? "Insert" : (isModify ? "New line" : "Correction")));
          const fixIn = DOM.el("input", { type: "text", class: "le-bug-fix-input", spellcheck: "false", autocomplete: "off",
            placeholder: constraint === "add_line" ? "line to insert\u2026" : "corrected line\u2026" });
          fixIn.value = ln.fix || "";
          fixIn.addEventListener("input", () => { ln.fix = fixIn.value; commit(); });
          fixWrap.appendChild(fixIn);
          rowEl.appendChild(fixWrap);
        }
        list.appendChild(rowEl);
      });
      if (focusIdx != null) {
        const sel = focusFix ? ".le-bug-fix-input" : ".le-bug-code";
        const rows = list.querySelectorAll(".le-bug-row");
        if (rows[focusIdx]) { const t = rows[focusIdx].querySelector(sel); if (t) t.focus(); }
      }
    }
    rebuild(null);

    const addLine = DOM.button("+ Add line", () => {
      lines.push({ src: "", flagged: false, fix: "" });
      commit(); rebuild(lines.length - 1);
    }, "ghost");
    addLine.classList.add("le-add-btn");
    host.appendChild(addLine);
  }
  LiveEditors.modify = bugOrModifyLiveEditor;
  LiveEditors.spot_the_bug = bugOrModifyLiveEditor;

  /* ---- cloze ----------------------------------------------------------
     The teacher writes the code with the correct answers inline as
     {{answer}} markers, e.g.  if a {{>}} b:  — the text inside the braces
     IS the answer. We keep that author-facing form in payload.authoring_template
     and derive the renderer's payload.code_template ({{id}} markers) + blanks[]
     from it on every edit. Per-blank mode/options/case survive re-derivation by
     positional carry-over. A word-bank toggle (header) switches all blanks to
     bank mode and reveals a chips word-bank; otherwise each blank gets its own
     mode buttons (free text / drop-down), and drop-downs get a chips option
     list. */

  // Comma-splitter that respects {{...}} grouping so a literal comma can be
  // entered as {{a,b}} and treated as one value. Returns trimmed, non-empty.
  function splitBankValues(str) {
    const out = [];
    let buf = "", i = 0;
    while (i < str.length) {
      if (str[i] === "{" && str[i + 1] === "{") {
        const end = str.indexOf("}}", i + 2);
        if (end !== -1) { buf += str.slice(i + 2, end); i = end + 2; continue; }
      }
      if (str[i] === ",") { if (buf.trim()) out.push(buf.trim()); buf = ""; i++; continue; }
      buf += str[i]; i++;
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
  }

  // Parse the author template into { template (id form), blanks[] }, carrying
  // mode/options/case from prevBlanks by position.
  function deriveCloze(authoring, prevBlanks, useBank) {
    prevBlanks = prevBlanks || [];
    let n = 0;
    const blanks = [];
    const template = authoring.replace(/\{\{([^}]*)\}\}/g, function (_, ans) {
      const i = n++;
      const id = "b" + (i + 1);
      const prev = prevBlanks[i] || {};
      const prevSameAnswer = prev.answer === ans;
      const blank = {
        id: id,
        answer: ans,
        mode: useBank ? "bank" : (prev.mode === "select" ? "select" : "free_text"),
        accepted: (prevSameAnswer && prev.accepted && prev.accepted.length) ? prev.accepted.slice() : (ans ? [ans] : []),
        case_sensitive: prev.case_sensitive !== false,
        width_hint: prev.width_hint || Math.max(2, (ans || "").length)
      };
      // Always accept the canonical answer in free text.
      if (blank.mode === "free_text" && ans && blank.accepted.indexOf(ans) === -1) blank.accepted.push(ans);
      if (blank.mode === "select") blank.options = (prev.options && prev.options.length) ? prev.options.slice() : [];
      blanks.push(blank);
      return "{{" + id + "}}";
    });
    return { template: template, blanks: blanks };
  }

  // Reconstruct the author-facing template ({{answer}}) from a stored
  // {{id}} template + blanks (for packs authored before this editor).
  function authoringFromStored(p) {
    const tpl = p.code_template || "";
    const byId = {};
    (p.blanks || []).forEach(b => byId[b.id] = b);
    return tpl.replace(/\{\{([^}]+)\}\}/g, function (m, id) {
      const b = byId[id];
      return b ? "{{" + (b.answer != null ? b.answer : "") + "}}" : m;
    });
  }

  LiveEditorHeaders.cloze = function (act, host, onChange) {
    const p = act.payload || (act.payload = {});
    const useBank = !!p.shared_pool;
    leBtnGroup(host, "Word bank", useBank ? "yes" : "no",
      [["no", "No word bank"], ["yes", "Use word bank"]], v => {
        if (v === "yes" && !p.shared_pool) p.shared_pool = { items: [], has_distractors: true, single_use: true };
        if (v === "no") p.shared_pool = null;
        // Re-derive blanks into/out of bank mode.
        const authoring = p.authoring_template != null ? p.authoring_template : authoringFromStored(p);
        const d = deriveCloze(authoring, p.blanks, v === "yes");
        p.code_template = d.template; p.blanks = d.blanks; p.authoring_template = authoring;
        onChange();
      });
  };

  LiveEditors.cloze = function (act, host, onChange) {
    const p = act.payload || (act.payload = {});
    const useBank = !!p.shared_pool;
    // Author-facing template (answers inline). Seed from stored on first open.
    if (p.authoring_template == null) p.authoring_template = authoringFromStored(p);

    host.appendChild(DOM.el("h3", null, "Code"));
    host.appendChild(DOM.el("p", { class: "le-note", style: "margin:0 0 6px" },
      "Type the code and put each correct answer inside double braces, e.g. if a {{>}} b: — the text in the braces is the answer."));

    // The section below the code box (blanks blocks or word bank) is rebuilt
    // when the set of blanks changes, on a short debounce so typing in the code
    // box keeps focus.
    const belowHost = DOM.el("div");

    function resync(rebuildBelow) {
      const d = deriveCloze(p.authoring_template || "", p.blanks, useBank);
      d.blanks.forEach(b => {
        if (b.mode === "select") {
          b.options = b.options || [];
          if (b.answer && b.options.indexOf(b.answer) === -1) b.options.push(b.answer);
        }
      });
      p.code_template = d.template;
      p.blanks = d.blanks;
      onChange();
      if (rebuildBelow) renderBelow();
    }

    DOM.codeField(host, p.authoring_template || "", v => {
      p.authoring_template = v;
      const before = (p.blanks || []).length;
      resync(false);
      // If the number of blanks changed, rebuild the section below (debounced).
      if ((p.blanks || []).length !== before) {
        if (belowHost._t) clearTimeout(belowHost._t);
        belowHost._t = setTimeout(() => { belowHost._t = null; renderBelow(); }, 350);
      }
    }, { lineNumbers: true, language: "python" });

    // Initial sync so blanks reflect the current template.
    resync(false);
    host.appendChild(belowHost);

    function renderBelow() {
      belowHost.innerHTML = "";
      if (useBank) {
        const bw = DOM.el("div", { class: "le-answer" });
        p.shared_pool = p.shared_pool || { items: [], has_distractors: true, single_use: true };
        DOM.chipsField(bw, "Word bank", p.shared_pool.items || [],
          v => { p.shared_pool.items = v; onChange(); },
          { placeholder: "Add a bank word\u2026", caseSensitive: true, splitter: splitBankValues, allowDuplicates: true,
            hint: "Enter or comma to add. For a word containing a comma, wrap it like {{a,b}}. Duplicates are allowed (e.g. two \u201ci\u201ds). Add extra words as distractors." });
        belowHost.appendChild(bw);
        belowHost.appendChild(DOM.el("p", { class: "le-note" },
          (p.blanks.length || 0) + " blank(s) detected. Make sure every answer above also appears in the bank."));
        return;
      }
      const sec = DOM.el("div", { class: "le-answer" });
      sec.appendChild(DOM.el("label", { class: "le-label" }, "Blanks"));
      if (!p.blanks.length) {
        sec.appendChild(DOM.el("p", { class: "le-empty-hint" }, "No blanks yet — add a {{answer}} in the code above."));
      }
      p.blanks.forEach((b) => {
        const card = DOM.el("div", { class: "le-blank-card" });
        const head = DOM.el("div", { class: "le-blank-head" });
        head.appendChild(DOM.el("span", { class: "le-blank-ans" }, "Answer: " + (b.answer || "\u2014")));
        const grp = DOM.el("div", { class: "form-btn-group" });
        [["free_text", "Free text"], ["select", "Drop-down"]].forEach(([v, l]) => {
          const btn = DOM.el("button", { type: "button", class: "form-btn-toggle" + (b.mode === v ? " active" : ""), "data-val": v }, l);
          btn.addEventListener("click", () => {
            b.mode = v;
            if (v === "select") { b.options = b.options || []; if (b.answer && b.options.indexOf(b.answer) === -1) b.options.push(b.answer); }
            onChange(); renderBelow();
          });
          grp.appendChild(btn);
        });
        head.appendChild(grp);
        card.appendChild(head);
        if (b.mode === "select") {
          DOM.chipsField(card, "Drop-down options", b.options || [],
            v => { b.options = v; if (b.answer && v.indexOf(b.answer) === -1) b.options.push(b.answer); onChange(); },
            { placeholder: "Add an option\u2026", caseSensitive: true,
              hint: "Enter or comma to add. The correct answer (" + (b.answer || "") + ") is included automatically." });
        }
        sec.appendChild(card);
      });
      belowHost.appendChild(sec);
    }
    renderBelow();
  };

  /* starter_challenge: everything authored in the centre. The challenge brief
     is the activity's Core instructions (no separate instructions field). */
  LiveEditors.starter_challenge = function (act, host, onChange) {
    const p = act.payload || (act.payload = {});
    // The brief lives in Core instructions now — migrate any legacy field once.
    if (p.instructions) { if (!act.instructions) act.instructions = p.instructions; delete p.instructions; onChange(); }

    host.appendChild(DOM.el("h3", null, "Starter code"));
    host.appendChild(DOM.el("p", { class: "le-note", style: "margin:0 0 6px" },
      "Optional — pre-filled in the student's editor."));
    DOM.codeField(host, p.starter_code || "", v => { p.starter_code = v; onChange(); },
      { lineNumbers: true, language: "python" });

    // Example calls — call + expected, add/delete.
    const exWrap = DOM.el("div", { class: "le-answer" });
    exWrap.appendChild(DOM.el("label", { class: "le-label" }, "Example calls"));
    p.example_calls = Array.isArray(p.example_calls) ? p.example_calls : [];
    const exList = DOM.el("div", { class: "le-line-list" });
    exWrap.appendChild(exList);
    function redrawEx(focusIdx) {
      exList.innerHTML = "";
      if (!p.example_calls.length) {
        exList.appendChild(DOM.el("p", { class: "le-empty-hint" }, "No example calls yet."));
      }
      p.example_calls.forEach((c, i) => {
        const row = DOM.el("div", { class: "le-ex-row" });
        const call = DOM.el("input", { type: "text", class: "le-line-input", spellcheck: "false", autocomplete: "off", placeholder: "call, e.g. double(2)" });
        call.value = c.call || "";
        call.addEventListener("input", () => { c.call = call.value; onChange(); });
        const exp = DOM.el("input", { type: "text", class: "le-line-input", spellcheck: "false", autocomplete: "off", placeholder: "expected, e.g. 4" });
        exp.value = c.expected || "";
        exp.addEventListener("input", () => { c.expected = exp.value; onChange(); });
        const del = DOM.button("\ud83d\uddd1", () => { p.example_calls.splice(i, 1); onChange(); redrawEx(Math.max(0, i - 1)); }, "icon");
        del.classList.add("le-line-del"); del.title = "Remove example";
        row.appendChild(call); row.appendChild(exp); row.appendChild(del);
        exList.appendChild(row);
      });
      if (focusIdx != null) { const ins = exList.querySelectorAll(".le-line-input"); if (ins[focusIdx * 2]) ins[focusIdx * 2].focus(); }
    }
    redrawEx(null);
    const addEx = DOM.button("+ Add example call", () => {
      p.example_calls.push({ call: "", expected: "" }); onChange(); redrawEx(p.example_calls.length - 1);
    }, "ghost");
    addEx.classList.add("le-add-btn");
    exWrap.appendChild(addEx);
    host.appendChild(exWrap);

    // Model solution.
    host.appendChild(DOM.el("h3", null, "Model solution"));
    DOM.codeField(host, p.model_solution || "", v => { p.model_solution = v; onChange(); },
      { lineNumbers: true, language: "python" });

    // Self-check guidance.
    const scWrap = DOM.el("div", { class: "le-answer" });
    scWrap.appendChild(DOM.el("label", { class: "le-label" }, "Self-check guidance (optional)"));
    const sc = DOM.el("textarea", { class: "le-instr", rows: "2", placeholder: "How students can check their own work\u2026" });
    sc.value = p.self_check_guidance || "";
    sc.addEventListener("input", () => { p.self_check_guidance = sc.value; onChange(); });
    scWrap.appendChild(sc);
    host.appendChild(scWrap);
  };

  /* testing: the teacher writes the function in a code box, marking each test
     INPUT with {{name}} (e.g. def greet({{name}}):). Each marker becomes an
     input column. A column-config table sets each variable's type and min/max
     (used by the marker to classify Normal / Boundary / Erroneous), plus which
     columns the student must fill. The test table is where the teacher writes
     the expected values; cells in "student fills" columns are blanked for the
     student. The author-facing code lives in payload.authoring_code; the
     student-facing payload.code has the {{}} stripped. */
  LiveEditors.testing = function (act, host, onChange) {
    const p = act.payload || (act.payload = {});
    if (p.authoring_code == null) {
      // Seed authoring code from existing code + columns (wrap each declared
      // input id in {{}} so the marker picks it up as a column).
      let ac = p.code || "";
      (p.input_columns || []).forEach(c => {
        const re = new RegExp("(?<![\\w{])" + c.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![\\w}])");
        if (re.test(ac) && ac.indexOf("{{" + c.id + "}}") < 0) ac = ac.replace(re, "{{" + c.id + "}}");
      });
      p.authoring_code = ac;
    }
    p.input_columns = Array.isArray(p.input_columns) ? p.input_columns : [];
    p.rows = Array.isArray(p.rows) ? p.rows : [];
    p.output_type = p.output_type || "lines";
    // Drop legacy authoring state — the new model has no "student fills"
    // toggles; blank cells are implicitly the student's to complete.
    delete p._student_fills;

    /* ---- local classifier (mirrors the marker) for inference + the red
       2-of-3 validation. normal | boundary | invalid | erroneous. ---- */
    function parseLit(raw) {
      if (raw == null) return { ok: false, t: "unknown" };
      const s = String(raw).trim();
      if (s === "") return { ok: false, t: "unknown" };
      if (s === "True" || s === "False") return { ok: true, v: s === "True", t: "bool" };
      if (s === "None") return { ok: true, v: null, t: "none" };
      if ((s[0] === '"' && s[s.length-1] === '"') || (s[0] === "'" && s[s.length-1] === "'"))
        return { ok: true, v: s.slice(1,-1), t: "str" };
      if (/^-?\d+$/.test(s)) return { ok: true, v: parseInt(s,10), t: "int" };
      if (/^-?\d+\.\d*$/.test(s) || /^-?\.\d+$/.test(s)) return { ok: true, v: parseFloat(s), t: "float" };
      return { ok: true, v: s, t: "bareword" };
    }
    function classify(col, raw) {
      const d = col.type || "str";
      const pr = parseLit(raw);
      if (!pr.ok) return "erroneous";
      if (d === "int" || d === "float") {
        const numOk = d === "int" ? pr.t === "int" : (pr.t === "int" || pr.t === "float");
        if (!numOk) return "erroneous";
        const v = pr.v, hasMin = col.min != null, hasMax = col.max != null;
        if (hasMin && (v === col.min || v === col.min - 1)) return "boundary";
        if (hasMax && (v === col.max || v === col.max + 1)) return "boundary";
        const bs = Array.isArray(col.decision_boundaries) ? col.decision_boundaries : [];
        for (const b of bs) if (Math.abs(v - b) <= 1) return "boundary";
        if (hasMin && v < col.min - 1) return "invalid";
        if (hasMax && v > col.max + 1) return "invalid";
        return "normal";
      }
      if (d === "str") {
        if (pr.t !== "str") return "erroneous";
        const len = pr.v.length, hasMin = col.min_length != null, hasMax = col.max_length != null;
        if (hasMin && (len === col.min_length || len === col.min_length - 1)) return "boundary";
        if (hasMax && (len === col.max_length || len === col.max_length + 1)) return "boundary";
        if (hasMin && len < col.min_length - 1) return "invalid";
        if (hasMax && len > col.max_length + 1) return "invalid";
        return "normal";
      }
      if (d === "bool") return pr.t === "bool" ? "normal" : "erroneous";
      return "normal";
    }
    function rollup(cs) {
      if (cs.indexOf("erroneous") >= 0) return "erroneous";
      if (cs.indexOf("invalid") >= 0) return "invalid";
      if (cs.indexOf("boundary") >= 0) return "boundary";
      return "normal";
    }
    // Infer the test type for a row from its input values (all must be set).
    function inferType(r) {
      if (!p.input_columns.length) return null;
      const allSet = p.input_columns.every(c => (r.values[c.id] != null && String(r.values[c.id]) !== ""));
      if (!allSet) return null;
      return rollup(p.input_columns.map(c => classify(c, r.values[c.id])));
    }
    // Does a row satisfy the rules? Output is required; exactly one of
    // {input, type} must be given (the other is the student's blank).
    function rowParts(r) {
      const v = r.values || {};
      const dataSet = p.input_columns.length > 0 &&
        p.input_columns.every(c => v[c.id] != null && String(v[c.id]) !== "");
      const typeSet = (v.test_type || "") !== "";
      const outSet  = (teacherOut(v) !== "");
      const other = (dataSet ? 1 : 0) + (typeSet ? 1 : 0);
      let bad = false, msg = "";
      if (!outSet) { bad = true; msg = "Expected output is required."; }
      else if (other === 0) { bad = true; msg = "Fill in the Input or the Type of test — leave the other blank for the student."; }
      else if (other === 2) { bad = true; msg = "Leave the Input or the Type of test blank for the student to work out."; }
      return { dataSet, typeSet, outSet, bad, msg };
    }
    function teacherOut(v) {
      if (v && v.expected_output != null && v.expected_output !== "") return v.expected_output;
      if (v && v.output != null && v.output !== "") return v.output;
      return "";
    }

    // Derive input columns from {{markers}}, carrying type/min/max by id.
    function deriveColumns() {
      const prevById = {};
      p.input_columns.forEach(c => prevById[c.id] = c);
      const ids = [], seen = {};
      (p.authoring_code || "").replace(/\{\{([^}]+)\}\}/g, function (_, name) {
        name = name.trim();
        if (name && !seen[name]) { seen[name] = 1; ids.push(name); }
        return _;
      });
      p.input_columns = ids.map(id => {
        const prev = prevById[id] || {};
        const col = { id: id, label: id, type: prev.type || "str" };
        if (prev.min != null) col.min = prev.min;
        if (prev.max != null) col.max = prev.max;
        if (prev.min_length != null) col.min_length = prev.min_length;
        if (prev.max_length != null) col.max_length = prev.max_length;
        return col;
      });
      p.code = (p.authoring_code || "").replace(/\{\{([^}]+)\}\}/g, function (_, name) { return name.trim(); });
    }
    // Prune stale value keys; normalise the output key to expected_output.
    function tidyRows() {
      const inputIds = p.input_columns.map(c => c.id);
      const keep = inputIds.concat(["test_type", "expected_output"]);
      p.rows.forEach(r => {
        r.values = r.values || {};
        if (r.values.output != null && (r.values.expected_output == null || r.values.expected_output === "")) {
          r.values.expected_output = r.values.output;
        }
        delete r.values.output;
        delete r.prefilled;  // implicit-blank model — no prefilled list
        Object.keys(r.values).forEach(k => { if (keep.indexOf(k) < 0) delete r.values[k]; });
        inputIds.forEach(id => { if (r.values[id] == null) r.values[id] = ""; });
        if (r.values.test_type == null) r.values.test_type = "";
        if (r.values.expected_output == null) r.values.expected_output = "";
      });
    }

    deriveColumns();
    tidyRows();

    // ---- Code box ----
    host.appendChild(DOM.el("h3", null, "Code under test"));
    host.appendChild(DOM.el("p", { class: "le-note", style: "margin:0 0 6px" },
      "Write the function and wrap each test input in double braces, e.g. def greet({{name}}): — each {{name}} becomes a Test data column."));
    const belowHost = DOM.el("div");
    DOM.codeField(host, p.authoring_code || "", v => {
      p.authoring_code = v;
      const before = p.input_columns.map(c => c.id).join(",");
      deriveColumns();
      if (p.input_columns.map(c => c.id).join(",") !== before) {
        tidyRows();
        if (belowHost._t) clearTimeout(belowHost._t);
        belowHost._t = setTimeout(() => { belowHost._t = null; renderBelow(); }, 350);
      }
      onChange();
    }, { lineNumbers: true, language: "python" });
    host.appendChild(belowHost);

    function renderBelow() {
      belowHost.innerHTML = "";
      if (!p.input_columns.length) {
        belowHost.appendChild(DOM.el("p", { class: "le-empty-hint" },
          "No inputs yet — add a {{variable}} in the code above."));
        return;
      }

      // ---- Inputs: Name | Type | Min | Max  (no "student fills") ----
      const cfg = DOM.el("div", { class: "le-answer" });
      cfg.appendChild(DOM.el("label", { class: "le-label" },
        "Inputs (the type and range tell the marker what counts as Normal / Boundary / Invalid / Erroneous)"));
      const cfgTable = DOM.el("table", { class: "trace-table le-test-cfg" });
      const chead = DOM.el("thead"); const chr = DOM.el("tr");
      ["Name", "Type", "Min", "Max"].forEach(h => chr.appendChild(DOM.el("th", null, h)));
      chead.appendChild(chr); cfgTable.appendChild(chead);
      const cbody = DOM.el("tbody"); cfgTable.appendChild(cbody);
      p.input_columns.forEach(c => {
        const tr = DOM.el("tr");
        tr.appendChild(DOM.el("td", null, DOM.el("code", null, c.id)));
        const tsel = DOM.el("select", { class: "le-test-type" });
        [["str","str"],["int","int"],["float","float"],["bool","bool"]].forEach(([v,l]) => {
          const o = DOM.el("option", { value: v }, l); if ((c.type || "str") === v) o.selected = true; tsel.appendChild(o);
        });
        tsel.addEventListener("change", () => { c.type = tsel.value; onChange(); renderBelow(); });
        tr.appendChild(DOM.el("td", null, tsel));
        function rangeInput(getter, setter) {
          const inp = DOM.el("input", { type: "text", class: "le-trace-cell", autocomplete: "off",
            placeholder: c.type === "str" ? "len" : "—" });
          const cur = getter(); inp.value = cur == null ? "" : String(cur);
          inp.addEventListener("input", () => {
            const raw = inp.value.trim();
            setter(raw === "" ? null : (c.type === "bool" ? null : Number(raw)));
            onChange(); scheduleRedraw();
          });
          return inp;
        }
        if (c.type === "str") {
          tr.appendChild(DOM.el("td", null, rangeInput(() => c.min_length, v => { if (v == null) delete c.min_length; else c.min_length = v; })));
          tr.appendChild(DOM.el("td", null, rangeInput(() => c.max_length, v => { if (v == null) delete c.max_length; else c.max_length = v; })));
        } else if (c.type === "bool") {
          tr.appendChild(DOM.el("td", { class: "le-test-na" }, "—"));
          tr.appendChild(DOM.el("td", { class: "le-test-na" }, "—"));
        } else {
          tr.appendChild(DOM.el("td", null, rangeInput(() => c.min, v => { if (v == null) delete c.min; else c.min = v; })));
          tr.appendChild(DOM.el("td", null, rangeInput(() => c.max, v => { if (v == null) delete c.max; else c.max = v; })));
        }
        cbody.appendChild(tr);
      });
      cfg.appendChild(cfgTable);

      // ---- Output type selector ----
      const otRow = DOM.el("div", { class: "le-test-extra" });
      const otLab = DOM.el("label", { class: "le-test-fill", style: "gap:8px" });
      otLab.appendChild(document.createTextNode("Expected output is a "));
      const otSel = DOM.el("select", { class: "le-test-type" });
      [["lines","list of printed lines"],["number","number"],["string","string"],["boolean","boolean (True/False)"],["list","list / array"]].forEach(([v,l]) => {
        const o = DOM.el("option", { value: v }, l); if ((p.output_type || "lines") === v) o.selected = true; otSel.appendChild(o);
      });
      otSel.addEventListener("change", () => { p.output_type = otSel.value; onChange(); scheduleRedraw(); });
      otLab.appendChild(otSel);
      otRow.appendChild(otLab);
      cfg.appendChild(otRow);
      belowHost.appendChild(cfg);

      // ---- Test cases: Test data... | Type of test | Expected output ----
      const tt = DOM.el("div", { class: "le-answer" });
      tt.appendChild(DOM.el("label", { class: "le-label" }, "Test cases"));
      const cols = p.input_columns.map(c => ({ id: c.id, label: "Input (" + c.id + ")", kind: "input" }))
        .concat([{ id: "test_type", label: "Type of test", kind: "type" },
                 { id: "expected_output", label: "Expected output", kind: "out" }]);
      const wrap = DOM.el("div", { class: "trace-table-wrap" });
      const table = DOM.el("table", { class: "trace-table le-test-table" });
      const thead = DOM.el("thead"); const thr = DOM.el("tr");
      cols.forEach(c => thr.appendChild(DOM.el("th", null, c.label)));
      thr.appendChild(DOM.el("th", null, ""));
      thead.appendChild(thr); table.appendChild(thead);
      const tbody = DOM.el("tbody"); table.appendChild(tbody);

      function redrawRows() {
        tbody.innerHTML = "";
        if (!p.rows.length) tbody.appendChild(DOM.el("tr", null,
          DOM.el("td", { class: "le-trace-empty", colspan: String(cols.length + 1) }, "No test cases yet — use + to add one.")));
        p.rows.forEach((r, ri) => {
          r.values = r.values || {};
          const parts = rowParts(r);
          const inferred = inferType(r);
          const tr = DOM.el("tr");
          if (parts.bad) tr.classList.add("le-test-rowbad");
          cols.forEach(c => {
            const td = DOM.el("td");
            if (c.id === "test_type") {
              const sel = DOM.el("select", { class: "le-test-type" });
              const opts = [["", inferred ? ("(auto: " + cap(inferred) + ")") : "(blank — student fills)"],
                ["normal","Normal"],["boundary","Boundary"],["invalid","Invalid"],["erroneous","Erroneous"]];
              opts.forEach(([v,l]) => { const o = DOM.el("option", { value: v }, l); if ((r.values.test_type || "") === v) o.selected = true; sel.appendChild(o); });
              sel.addEventListener("change", () => { r.values.test_type = sel.value; onChange(); scheduleRedraw(); });
              td.appendChild(sel);
            } else {
              const inp = DOM.el("input", { type: "text", class: "le-trace-cell", autocomplete: "off", spellcheck: "false",
                placeholder: c.id === "expected_output" ? "expected output" : "value (blank = student fills)" });
              inp.value = r.values[c.id] == null ? "" : r.values[c.id];
              inp.addEventListener("input", () => { r.values[c.id] = inp.value; onChange(); });
              inp.addEventListener("change", () => { scheduleRedraw(); });
              td.appendChild(inp);
            }
            tr.appendChild(td);
          });
          const delTd = DOM.el("td");
          const del = DOM.button("\ud83d\uddd1", () => { p.rows.splice(ri, 1); onChange(); redrawRows(); }, "icon");
          del.classList.add("le-line-del"); del.title = "Remove test case";
          delTd.appendChild(del); tr.appendChild(delTd);
          tbody.appendChild(tr);
          if (parts.bad) {
            const warnTr = DOM.el("tr", { class: "le-test-rowwarn" });
            warnTr.appendChild(DOM.el("td", { colspan: String(cols.length + 1) }, parts.msg));
            tbody.appendChild(warnTr);
          }
        });
      }
      function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
      redrawRows();
      wrap.appendChild(table); tt.appendChild(wrap);
      const addRow = DOM.button("+ Add test case", () => {
        const v = {}; p.input_columns.forEach(c => v[c.id] = "");
        v.test_type = ""; v.expected_output = "";
        p.rows.push({ values: v }); onChange(); redrawRows();
      }, "ghost");
      addRow.classList.add("le-add-btn");
      tt.appendChild(addRow);
      const noteWrap = DOM.el("div", { class: "le-note" });
      const ul = DOM.el("ul", { class: "le-test-instr" });
      [ "Fill in the Expected output (required).",
        "Fill in one of the other two — the Input or the Type of test.",
        "The one you leave blank is what the student works out." ].forEach(t => ul.appendChild(DOM.el("li", null, t)));
      noteWrap.appendChild(ul);
      noteWrap.appendChild(DOM.el("p", { style: "margin:6px 0 0" },
        "For an Invalid case to make sense, the code under test must validate its input — e.g. reject out-of-range values by returning -1, False or \"NOT VALID\". The student's value is then checked automatically against the input's type and range."));
      tt.appendChild(noteWrap);
      belowHost.appendChild(tt);

      function scheduleRedraw() {
        if (tbody._t) clearTimeout(tbody._t);
        tbody._t = setTimeout(() => { tbody._t = null; redrawRows(); }, 250);
      }
    }
    renderBelow();
  };

  function renderPackMetaEditor(host) {
    const wrap = DOM.el("div", { class: "edit-wrap pack-meta-edit" });
    wrap.appendChild(DOM.el("h1", { class: "activity-title" }, "Pack details"));
    wrap.appendChild(DOM.el("p", { class: "activity-instructions" }, "These details appear at the top of the student tool and identify the pack on export."));

    const sec = DOM.el("div", { class: "form-section" });
    DOM.field(sec, "Title", "text", pack.title, v => { pack.title = v; saveDraft(); document.getElementById("pack-title").textContent = v || "Untitled pack"; });
    // Description is prose, not code — render in a normal (non-monospace) font.
    DOM.field(sec, "Description", "textarea", pack.description, v => { pack.description = v; saveDraft(); }, { prose: true, rows: 3 });
    DOM.field(sec, "Audience", "select", pack.audience, v => { pack.audience = v; saveDraft(); }, [
      ["ages-11-14", "Ages 11–14"], ["ages-14-16", "Ages 14–16"], ["ages-16-19", "Ages 16–19"], ["other", "Other"]
    ]);
    DOM.field(sec, "Author", "text", pack.author, v => { pack.author = v; saveDraft(); });
    DOM.chipsField(sec, "Tags", pack.tags || [], v => { pack.tags = v; saveDraft(); },
      { placeholder: "Add a tag\u2026", hint: "Press Enter or comma to add each tag." });
    DOM.chipsField(sec, "Spec refs", pack.spec_refs || [], v => { pack.spec_refs = v; saveDraft(); },
      { placeholder: "Add a reference\u2026", hint: "Exam-board reference codes." });
    wrap.appendChild(sec);

    const setSec = DOM.el("div", { class: "form-section" });
    setSec.appendChild(DOM.h3("Pack settings"));
    DOM.field(setSec, "Show hints", "checkbox", pack.settings.show_hints, v => { pack.settings.show_hints = v; saveDraft(); });
    DOM.field(setSec, "Show solutions after", "select", pack.settings.show_solutions_after, v => { pack.settings.show_solutions_after = v; saveDraft(); }, [
      ["submission", "Submission"], ["correct_only", "Only when correct"], ["never", "Never"]
    ]);
    DOM.field(setSec, "Show Python runner", "select", pack.settings.show_runner_after || "correct", v => { pack.settings.show_runner_after = v; saveDraft(); }, [
      ["correct", "After a correct answer (default)"],
      ["always", "After every check (right or wrong)"],
      ["never", "Never"]
    ]);
    DOM.field(setSec, "Pass threshold (0–1)", "number", pack.settings.pass_threshold, v => { pack.settings.pass_threshold = Math.max(0, Math.min(1, parseFloat(v) || 0)); saveDraft(); });
    DOM.field(setSec, "Shuffle activities", "checkbox", pack.settings.shuffle, v => { pack.settings.shuffle = v; saveDraft(); });
    wrap.appendChild(setSec);

    host.appendChild(wrap);
  }

  /* Build the PROPERTIES pane (right) for an activity: a compact header
     with reorder/duplicate/delete, the collapsible form sections, and a
     Validation section pinned (collapsed) at the bottom. */
  function renderActivityProperties(props, act) {
    if (!props) return;
    const pane = DOM.el("div", { class: "properties-pane" });

    // Header: "Properties" label + activity actions.
    const head = DOM.el("div", { class: "properties-head" });
    head.appendChild(DOM.el("h2", null, "Properties"));
    const actions = DOM.el("div", { class: "props-actions" });
    const idx = pack.activities.indexOf(act);
    const upBtn = DOM.button("↑", () => { if (Pack.moveActivity(pack, act.id, -1)) { saveDraft(); refresh(); } }, "icon");
    upBtn.title = "Move up"; upBtn.disabled = idx === 0;
    const dnBtn = DOM.button("↓", () => { if (Pack.moveActivity(pack, act.id, 1)) { saveDraft(); refresh(); } }, "icon");
    dnBtn.title = "Move down"; dnBtn.disabled = idx === pack.activities.length - 1;
    const dupBtn = DOM.button("⧉", () => {
      const copy = Pack.duplicateActivity(pack, act.id);
      if (copy) { currentEditId = copy.id; saveDraft(); refresh(); }
    }, "icon");
    dupBtn.title = "Duplicate";
    const delBtn = DOM.button("✕", () => {
      if (!confirm("Delete this activity? This cannot be undone within this session.")) return;
      Pack.removeActivity(pack, act.id);
      currentEditId = "__meta__";
      saveDraft();
      refresh();
    }, "icon");
    delBtn.title = "Delete"; delBtn.classList.add("danger-icon");
    [upBtn, dnBtn, dupBtn, delBtn].forEach(b => actions.appendChild(b));
    head.appendChild(actions);
    pane.appendChild(head);

    const body = DOM.el("div", { class: "properties-body" });
    pane.appendChild(body);
    props.appendChild(pane);

    // Form sections (Core … Advanced) scroll inside the body; the
    // Validation section is appended to the PANE (not the body) so it
    // stays pinned at the bottom edge — mirroring the student tool's
    // Help section.
    renderForm(body, act);
    renderValidationSection(pane, act);
  }

  /* Compact preset palette for the colour swatch picker.
     Includes the seven default activity-type colours plus a few neutrals
     so teachers can pick a colour that visually distinguishes specific
     activities without typing hex. */
  const COLOUR_PRESETS = [
    "#2D5BA6", "#1E6E3C", "#8A5A00", "#B12A38",
    "#D97706", "#7B2D6B", "#0F6E84",
    "#5B6B7D", "#0B0B0F"
  ];

  /* ---- Form (properties sections) ---- */
  function renderForm(host, act) {
    /* A property change saves the draft, updates the live preview and the
       validation badge, keeps the section ticks current, and refreshes the
       task list. The live preview is debounced so typing stays smooth and
       doesn't steal focus mid-keystroke. */
    let previewTimer = null;
    function schedulePreview() {
      if (previewTimer) clearTimeout(previewTimer);
      previewTimer = setTimeout(() => { previewTimer = null; renderLivePreview(act); }, 250);
    }
    const onChange = () => {
      saveDraft();
      refreshSectionTicks();
      refreshValidation();
      schedulePreview();
    };

    /* Build a collapsible <details> form section. Returns
       { wrap, body, refresh } so callers can:
         - append fields to `body`
         - register `complete()` predicate so the header tick updates
       Only "Core" is open by default; the others are collapsed so the
       form fits in one screen and the teacher can focus on one
       section at a time. The Advanced section (timing + teacher
       notes) uses the same wrapping so it visually matches. */
    const sectionRefs = [];
    function makeSection(title, opts) {
      opts = opts || {};
      const wrap = DOM.el("details", { class: "form-section" });
      // Restore the remembered open/closed state so a re-render (e.g. after
      // changing a mode or editing a field) doesn't collapse the section the
      // teacher had open. Falls back to opts.open the first time.
      const remembered = _openSections[title];
      const open = (remembered == null) ? !!opts.open : remembered;
      if (open) wrap.setAttribute("open", "");
      wrap.addEventListener("toggle", () => { _openSections[title] = wrap.open; });
      const sum = DOM.el("summary", { class: "form-section-summary" });
      sum.appendChild(DOM.el("span", { class: "form-section-title" }, title));
      const tick = DOM.el("span", { class: "form-section-tick", "aria-hidden": "true" }, "");
      sum.appendChild(tick);
      wrap.appendChild(sum);
      const body = DOM.el("div", { class: "form-section-body" });
      wrap.appendChild(body);
      const ref = { wrap: wrap, body: body, tick: tick, complete: opts.complete || null };
      sectionRefs.push(ref);
      return ref;
    }
    function refreshSectionTicks() {
      sectionRefs.forEach(r => {
        if (!r.complete) return;
        let done = false;
        try { done = !!r.complete(); } catch (e) { done = false; }
        if (done) { r.tick.textContent = "✓"; r.wrap.classList.add("is-complete"); }
        else      { r.tick.textContent = "";  r.wrap.classList.remove("is-complete"); }
      });
    }

    // 1. Core — title + instructions + the "Edit as JSON" escape hatch.
    const core = makeSection("Core", {
      open: true,
      /* Required for Core: title and instructions both non-empty. */
      complete: () => (act.title && act.title.trim().length > 0)
                    && (act.instructions && act.instructions.trim().length > 0)
    });
    DOM.field(core.body, "Title", "text", act.title, v => {
      act.title = v;
      saveDraft();
      const t = document.querySelector(".lp-title");
      if (t) t.textContent = v || "Untitled activity";
      renderTaskList();
      refreshSectionTicks();
      refreshValidation();
    });
    DOM.field(core.body, "Instructions", "textarea", act.instructions, v => { act.instructions = v; onChange(); }, { rows: 2, prose: true });
    DOM.field(core.body, "Context (optional)", "textarea", act.context || "", v => { act.context = v || null; onChange(); }, { rows: 2, hint: "Optional background shown above the instructions in a tinted box." });
    // Conspicuous "Edit as JSON" button — a power-user escape hatch most
    // teachers won't need, so it lives here rather than as a primary tab.
    const jsonBtn = DOM.el("button", { type: "button", class: "edit-json-btn" }, "⟨ ⟩  Edit as JSON");
    jsonBtn.addEventListener("click", () => openJsonEditor(act));
    core.body.appendChild(jsonBtn);
    host.appendChild(core.wrap);

    // 2. Classification — difficulty, topics, spec refs, section, time.
    const meta = makeSection("Classification", {
      /* Classification has no strict requireds — difficulty has a
         default of 1, the others are optional. Mark complete when the
         teacher has set difficulty to something they touched (i.e.
         the field exists). */
      complete: () => act.difficulty != null && act.difficulty >= 1
    });
    DOM.field(meta.body, "Difficulty", "slider", act.difficulty || 1, v => {
      act.difficulty = parseInt(v, 10) || 1;
      onChange();
    }, { min: 1, max: 5, step: 1, labels: { "1": "★", "2": "★★", "3": "★★★", "4": "★★★★", "5": "★★★★★" } });
    DOM.field(meta.body, "Topics", "text", (act.topics || []).join(", "), v => { act.topics = v.split(",").map(s => s.trim()).filter(Boolean); onChange(); }, { hint: "Comma-separated, e.g. loops, range" });
    DOM.field(meta.body, "Spec refs", "text", (act.spec_refs || []).join(", "), v => { act.spec_refs = v.split(",").map(s => s.trim()).filter(Boolean); onChange(); }, { hint: "Comma-separated course or specification reference codes" });
    DOM.field(meta.body, "Est. time (s)", "number", act.estimated_time_seconds || 0, v => { act.estimated_time_seconds = parseInt(v, 10) || 0; onChange(); });
    DOM.field(meta.body, "Points", "number", act.points || 0, v => { act.points = parseInt(v, 10) || 0; onChange(); });
    // Section assignment (only if the pack has any sections)
    const sectionOpts = Array.isArray(pack.sections) ? pack.sections : [];
    if (sectionOpts.length) {
      const opts = [["", "(unsectioned)"]].concat(sectionOpts.map(s => [s.id, s.title]));
      DOM.field(meta.body, "Section", "select", act.section_id || "", v => {
        if (v) act.section_id = v; else delete act.section_id;
        onChange();
        renderTaskList();
      }, opts);
    }
    // Colour override as a swatch picker — much more discoverable than
    // typing a hex code.
    DOM.field(meta.body, "Colour override", "colour", act.colour || "", v => {
      if (!v) { delete act.colour; }
      else { act.colour = v; }
      onChange();
      renderTaskList();
    }, COLOUR_PRESETS);
    host.appendChild(meta.wrap);

    // 3. Hints — list editor
    const hsec = makeSection("Hints", {
      /* Hints are optional but a pack with hints scaffolds students
         better. Tick when at least one hint has text. */
      complete: () => Array.isArray(act.hints) && act.hints.some(h => h && (typeof h === "string" ? h.trim() : (h.text || "").trim()))
    });
    act.hints = act.hints || [];
    // Normalise any legacy string hints to the {type,text} object shape.
    act.hints = act.hints.map(h => (typeof h === "string") ? { type: "nudge", text: h } : h);
    const HINT_TYPES = [["concept", "Concept"], ["nudge", "Nudge"], ["partial_solution", "Partial solution"]];
    const hList = DOM.el("div");
    function redrawHints() {
      hList.innerHTML = "";
      if (!act.hints.length) {
        hList.appendChild(DOM.el("p", { style: "color:var(--muted);font-size:0.88em;margin:4px 0" }, "No hints yet."));
      } else {
        act.hints.forEach((item, i) => {
          if (typeof item === "string") { item = { type: "nudge", text: item }; act.hints[i] = item; }
          const card = DOM.el("div", { class: "le-hint-card" });
          const top = DOM.el("div", { class: "le-hint-top" });
          // Type as toggle buttons (no radios), then a delete button.
          const grp = DOM.el("div", { class: "form-btn-group" });
          HINT_TYPES.forEach(([v, l]) => {
            const b = DOM.el("button", { type: "button", class: "form-btn-toggle" + ((item.type || "nudge") === v ? " active" : ""), "data-val": v }, l);
            b.addEventListener("click", () => { item.type = v; saveDraft(); refreshSectionTicks(); redrawHints(); });
            grp.appendChild(b);
          });
          top.appendChild(grp);
          const del = DOM.button("✕", () => { act.hints.splice(i, 1); onChange(); redrawHints(); }, "icon");
          del.title = "Remove hint";
          del.classList.add("le-hint-del");
          top.appendChild(del);
          card.appendChild(top);
          const ta = DOM.el("textarea", { class: "le-hint-text", rows: "2", placeholder: "Hint text shown to the student\u2026" });
          ta.value = item.text || "";
          ta.addEventListener("input", () => { item.text = ta.value; saveDraft(); refreshSectionTicks(); });
          card.appendChild(ta);
          hList.appendChild(card);
        });
      }
    }
    redrawHints();
    hsec.body.appendChild(hList);
    hsec.body.appendChild(DOM.button("+ Add hint", () => { act.hints.push({ type: "nudge", text: "" }); onChange(); redrawHints(); }, "ghost"));
    host.appendChild(hsec.wrap);

    // 4. Feedback — short success/failure messages + solution explanation
    const fsec = makeSection("Feedback", {
      /* Tick when both correct AND incorrect feedback strings are set
         — those are the messages the student actually sees. The
         solution_explanation is optional. */
      complete: () => !!(act.feedback && act.feedback.correct && act.feedback.correct.trim().length > 0
                       && act.feedback.incorrect && act.feedback.incorrect.trim().length > 0)
    });
    DOM.field(fsec.body, "When correct", "text", (act.feedback && act.feedback.correct) || "", v => { act.feedback = act.feedback || {}; act.feedback.correct = v; saveDraft(); refreshSectionTicks(); });
    DOM.field(fsec.body, "When incorrect", "text", (act.feedback && act.feedback.incorrect) || "", v => { act.feedback = act.feedback || {}; act.feedback.incorrect = v; saveDraft(); refreshSectionTicks(); });
    DOM.field(fsec.body, "Solution explanation", "textarea", act.solution_explanation || "", v => { act.solution_explanation = v; saveDraft(); }, { rows: 2 });
    host.appendChild(fsec.wrap);

    // 4b. Follow-up reflection — HIDDEN FOR NOW (see SHOW_FOLLOWUP_ADVANCED).
    //     TODO(teacher): decide whether to remove entirely or flesh out.
    const SHOW_FOLLOWUP_ADVANCED = false;
    if (SHOW_FOLLOWUP_ADVANCED) {
    const fusec = makeSection("Follow-up (optional)", {
      complete: () => !!(act.follow_up && act.follow_up.prompt && act.follow_up.prompt.trim().length > 0)
    });
    const enabled = !!(act.follow_up && act.follow_up.prompt != null);
    DOM.field(fusec.body, "Enable follow-up", "checkbox", enabled, v => {
      if (v) {
        act.follow_up = act.follow_up || { prompt: "", mode: "free_text", teacher_only: true };
      } else {
        delete act.follow_up;
      }
      onChange();
      renderEditor();
    }, { hint: "When enabled, the student sees a short reflection box after their first Check. Responses are saved with progress and never auto-marked." });
    if (act.follow_up) {
      DOM.field(fusec.body, "Prompt", "textarea", act.follow_up.prompt || "",
        v => { act.follow_up.prompt = v; onChange(); },
        { rows: 2, hint: "The question the student sees, e.g. \"Why does this print Grace rather than Ada?\"." });
      // mode + teacher_only are pinned to v0.1 values; not exposed.
      act.follow_up.mode = "free_text";
      act.follow_up.teacher_only = true;
    }
    host.appendChild(fusec.wrap);
    }

    // 5. Per-type payload. Types that are edited live in the centre (they
    //    have a LiveEditor) don't show an Activity-body section here at all —
    //    everything for them lives in the Edit pane. Only types that still
    //    rely on the Properties form editor get this section.
    const editedInCentre = !!LiveEditors[act.type];
    if (!editedInCentre) {
      const psec = makeSection("Activity body", {
        complete: () => {
          try {
            const issues = (PyQuiz.Validator && PyQuiz.Validator.activity)
              ? PyQuiz.Validator.activity(act, "activity") : [];
            const bodyIssues = issues.filter(i => i.level === "error" && i.path && i.path.indexOf("payload") >= 0);
            return bodyIssues.length === 0 && !!act.payload;
          } catch (e) { return false; }
        }
      });
      if (Editors.has(act.type)) {
        Editors.edit(act, psec.body, { onChange: onChange, refresh: renderEditor });
      } else {
        psec.body.appendChild(document.createTextNode("(No editor for this type.)"));
      }
      host.appendChild(psec.wrap);
    }

    // 6. Advanced — HIDDEN FOR NOW (timer + teacher notes). TODO(teacher).
    if (SHOW_FOLLOWUP_ADVANCED) {
    const adv = makeSection("Advanced", { complete: null });
    DOM.field(adv.body, "Use a timer", "checkbox", !!act.timing, v => {
      act.timing = v ? { mode: "countdown", limit_seconds: 60, on_expire: "warn" } : null;
      onChange();
      renderEditor();
    });
    if (act.timing) {
      DOM.field(adv.body, "Timer mode", "radio", act.timing.mode, v => { act.timing.mode = v; saveDraft(); }, [
        ["countdown", "Countdown"], ["count_up", "Count up"]
      ]);
      DOM.field(adv.body, "Limit (seconds)", "number", act.timing.limit_seconds, v => { act.timing.limit_seconds = parseInt(v, 10) || 60; saveDraft(); });
      DOM.field(adv.body, "On expiry", "radio", act.timing.on_expire, v => { act.timing.on_expire = v; saveDraft(); }, [
        ["warn", "Warn"], ["submit", "Auto-submit"], ["lock", "Lock"]
      ]);
    }
    DOM.field(adv.body, "Teacher notes", "textarea", act.teacher_notes || "", v => { act.teacher_notes = v; saveDraft(); },
      { rows: 3, hint: "Stripped from student exports." });
    host.appendChild(adv.wrap);
    }

    // Initial computation of tick state.
    refreshSectionTicks();
  }

  /* ---- Edit-as-JSON (modal) ----
     The raw-JSON escape hatch, opened from the conspicuous button in the
     Core properties section. Validates before applying. */
  function openJsonEditor(act) {
    const body = DOM.el("div");
    body.appendChild(DOM.el("p", { class: "kbd-help" }, "Edit the raw JSON for this activity. Apply validates before saving. The id and type can't be changed here."));
    const ta = DOM.el("textarea", { class: "json-edit", style: "min-height:340px" });
    ta.value = JSON.stringify(act, null, 2);
    body.appendChild(ta);
    const err = DOM.el("p", { style: "color:var(--bad);margin:8px 0 0;min-height:1.2em" });
    body.appendChild(err);
    const footer = DOM.el("div", { class: "footer-actions" });
    const apply = DOM.button("Apply", () => {
      try {
        const obj = JSON.parse(ta.value);
        if (obj.id !== act.id) { err.textContent = "Cannot change id."; return; }
        if (obj.type !== act.type) { err.textContent = "Cannot change type — delete and recreate instead."; return; }
        const issues = Validator.activity(obj, "activity");
        const errs = issues.filter(i => i.level === "error");
        if (errs.length) { err.textContent = "Validation failed: " + errs[0].message; return; }
        Object.keys(act).forEach(k => delete act[k]);
        Object.assign(act, obj);
        saveDraft();
        dlg.close();
        refresh();
      } catch (e) { err.textContent = "Bad JSON: " + e.message; }
    }, "primary");
    footer.appendChild(apply);
    var dlg = Modal.open({ title: "Edit as JSON", body: body, maxWidth: "760px", footer: footer });
  }

  /* ---- Validation section (bottom of the properties pane) ----
     A collapsible section with a traffic-light dot: green = clean, amber
     = warnings only, red = errors. Collapsed by default. Clicking an
     issue jumps to the offending activity. */
  function renderValidationSection(host, act) {
    const wrap = DOM.el("details", { class: "form-section validation-section" });
    if (_openSections["Validation"]) wrap.setAttribute("open", "");
    wrap.addEventListener("toggle", () => { _openSections["Validation"] = wrap.open; });
    const sum = DOM.el("summary", { class: "form-section-summary" });
    const dot = DOM.el("span", { class: "validation-dot", id: "validation-dot", "aria-hidden": "true" });
    sum.appendChild(dot);
    sum.appendChild(DOM.el("span", { class: "form-section-title" }, "Validation"));
    const count = DOM.el("span", { class: "validation-count", id: "validation-count" }, "");
    sum.appendChild(count);
    wrap.appendChild(sum);
    const body = DOM.el("div", { class: "form-section-body", id: "validation-body" });
    wrap.appendChild(body);
    host.appendChild(wrap);
    refreshValidation();
  }

  /* Recompute the pack's validation and update the traffic-light dot,
     count and issue list in place (no re-render of the whole pane, so it
     can be called on every keystroke without disturbing focus). */
  function refreshValidation() {
    const dot = document.getElementById("validation-dot");
    const count = document.getElementById("validation-count");
    const body = document.getElementById("validation-body");
    if (!dot || !count || !body) return;
    const issues = Validator.pack(pack);
    const errs = Validator.errorsIn(issues).length;
    const warns = Validator.warningsIn(issues).length;
    dot.className = "validation-dot" + (errs ? " error" : warns ? " warn" : "");
    if (errs) { count.className = "validation-count error"; count.textContent = errs + (errs === 1 ? " error" : " errors") + (warns ? " · " + warns + "w" : ""); }
    else if (warns) { count.className = "validation-count warn"; count.textContent = warns + (warns === 1 ? " warning" : " warnings"); }
    else { count.className = "validation-count ok"; count.textContent = "All clear"; }

    body.innerHTML = "";
    if (!issues.length) {
      body.appendChild(DOM.el("p", { style: "color:var(--muted);margin:0;font-size:0.85em" }, "No problems found."));
      return;
    }
    const ul = DOM.el("ul", { class: "issue-list" });
    issues.forEach(iss => {
      const li = DOM.el("li");
      li.innerHTML = '<span class="level ' + iss.level + '">' + iss.level + '</span>'
        + DOM.escapeHtml(iss.message) + '<br>`' + DOM.escapeHtml(iss.path) + '`';
      li.addEventListener("click", () => goToIssue(iss));
      ul.appendChild(li);
    });
    body.appendChild(ul);
  }

  /* The properties pane content when the pack-meta editor is active
     (no activity selected). Shows just the validation summary so the
     traffic-light is always available. */
  function renderMetaProperties(props) {
    if (!props) return;
    const pane = DOM.el("div", { class: "properties-pane" });
    const head = DOM.el("div", { class: "properties-head" });
    head.appendChild(DOM.el("h2", null, "Properties"));
    pane.appendChild(head);
    const body = DOM.el("div", { class: "properties-body" });
    pane.appendChild(body);
    props.appendChild(pane);
    body.appendChild(DOM.el("p", { style: "color:var(--muted);font-size:0.85em;margin:0 0 10px" },
      "Editing pack details. Select an activity on the left to edit its properties."));
    renderValidationSection(pane, null);
  }

  /* Back-compat shim: some callers still invoke renderSidePanel() to
     refresh validation. Route it to the in-place validation refresh. */
  function renderSidePanel() { refreshValidation(); }

  function goToIssue(iss) {
    const m = iss.path.match(/^activities\[(\d+)\]/);
    if (m) {
      const idx = parseInt(m[1], 10);
      const a = pack.activities[idx];
      if (a) { currentEditId = a.id; refresh(); return; }
    }
    currentEditId = "__meta__";
    refresh();
  }

  /* ---- Drafts dialog ---- */
  function openDraftsDialog() {
    const drafts = Storage.get("pyquiz.v1.teacher.drafts") || {};
    const body = DOM.el("div");
    if (!Object.keys(drafts).length) {
      body.appendChild(DOM.el("p", { style: "color:var(--muted)" }, "No drafts yet."));
    } else {
      Object.values(drafts).sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || "")).forEach(d => {
        const card = DOM.el("div", { class: "activity-card" });
        const info = DOM.el("div", { class: "grow" });
        info.appendChild(DOM.el("div", { class: "title" }, d.title || "Untitled"));
        info.appendChild(DOM.el("div", { style: "color:var(--muted);font-size:0.85em" },
          (d.activities ? d.activities.length : 0) + " activities · updated " + (d.updated_at || "—")));
        card.appendChild(info);
        card.appendChild(DOM.button("Open", () => {
          pack = d;
          currentEditId = "__meta__";
          saveDraft(true);
          dlg.close();
          refresh();
        }));
        card.appendChild(DOM.button("Delete", () => {
          if (!confirm("Delete this draft?")) return;
          delete drafts[d.id];
          Storage.set("pyquiz.v1.teacher.drafts", drafts);
          dlg.close();
          openDraftsDialog();
        }, "danger"));
        body.appendChild(card);
      });
    }
    var dlg = Modal.open({ title: S.openDraft, body: body });
  }

  /* ---- Activity preview dialog ---- */
  // Renders ONE activity in a modal using the same renderer the student
  // tool uses. Triggered from the "Preview this activity" button in the
  // validation panel. Validates the single activity before previewing so
  // the teacher gets a clear error message instead of a broken renderer.
  function openSinglePreview(act) {
    if (!act) return;
    const issues = Validator.activity(act, "activity");
    const errs = (issues || []).filter(i => i.level === "error");
    if (errs.length) {
      alert("Activity has " + errs.length + " error(s). Fix before previewing.\nFirst: " + errs[0].message);
      return;
    }
    const body = DOM.el("div", { style: "min-height:300px" });
    const dlg = Modal.open({ title: "Preview: " + (act.title || "Untitled"), body: body, maxWidth: "900px" });
    body.appendChild(DOM.el("p", { class: "kbd-help" },
      "Live preview — uses the same renderer the student tool uses. Interactions here are not saved."));

    if (act.context) body.appendChild(DOM.el("div", { class: "activity-context" }, act.context));
    if (act.instructions) body.appendChild(DOM.el("p", null, act.instructions));
    if (Renderers.ioPanel) {
      const io = Renderers.ioPanel.build(act);
      if (io) body.appendChild(io);
    }

    const ab = skinPreviewHost(body);
    const ctrl = Renderers.render(act, ab, {});
    decoratePreview(ab, act, ctrl);

    const row = DOM.el("div", { class: "footer-actions" });
    const fb = DOM.el("span", { style: "margin-left:10px" });
    const check = DOM.button(S.check, () => {
      const apply = (r) => {
        fb.textContent = r.feedback || "";
        fb.style.color = r.status === "correct" ? "var(--ok)" : "var(--bad)";
        if (ctrl.highlight) ctrl.highlight(r.per_part);
      };
      const fail = (e) => { fb.textContent = "Could not check: " + (e.message || e); fb.style.color = "var(--bad)"; };
      try {
        const marked = previewMarkActivity(act, ctrl.getResponse());
        if (marked && typeof marked.then === "function") marked.then(apply).catch(fail);
        else apply(marked);
      } catch (e) { fail(e); }
    }, "primary");
    const reset = DOM.button(S.reset, () => { if (ctrl.reset) ctrl.reset(); fb.textContent = ""; });
    row.appendChild(check);
    row.appendChild(reset);
    row.appendChild(fb);
    body.appendChild(row);
  }

  /* ---- Export dialog ---- */
  function openExportDialog() {
    const issues = Validator.pack(pack);
    const errs = Validator.errorsIn(issues);
    const body = DOM.el("div");

    if (errs.length) {
      body.appendChild(DOM.el("p", { class: "banner error" }, S.errorsBlockExport + " (" + errs.length + " error" + (errs.length === 1 ? "" : "s") + ")"));
      const ul = DOM.el("ul", { class: "issue-list" });
      errs.slice(0, 5).forEach(e => {
        const li = DOM.el("li");
        li.innerHTML = '<span class="level error">error</span>' + DOM.escapeHtml(e.message) + '<br>`' + DOM.escapeHtml(e.path) + '`';
        ul.appendChild(li);
      });
      body.appendChild(ul);
      Modal.open({ title: "Export", body: body });
      return;
    }

    const warns = Validator.warningsIn(issues);
    if (warns.length) body.appendChild(DOM.el("p", { class: "banner" }, warns.length + " warning(s) — export is allowed, but you may want to review them first."));

    // ---- Primary: the .pyquiz file ----
    const primary = DOM.el("div", { class: "export-primary" });
    primary.appendChild(DOM.el("h3", null, "Download pack (.pyquiz)"));
    primary.appendChild(DOM.el("p", { class: "export-note" },
      "The pack file students load. Compact and self-contained. This is the file to add to your packs folder."));
    primary.appendChild(DOM.button("⬇  Download .pyquiz", async () => {
      const encoded = await Codec.encode(pack);
      DOM.download(pack.id + ".pyquiz", encoded, "text/plain");
    }, "primary big"));
    body.appendChild(primary);

    // ---- Add to your site (manifest snippet + how-to) ----
    const repo = DOM.el("details", { class: "export-repo" });
    repo.appendChild(DOM.el("summary", null, "Add this pack to your PyQuiz site"));
    const fileName = pack.id + ".pyquiz";
    const lvl = guessLevel(pack);
    const entry = {
      id: pack.id,
      title: pack.title || pack.id,
      level: lvl,
      description: (pack.description || "").slice(0, 140),
      activities: (pack.activities || []).length,
      sections: (pack.sections || []).length,
      file: fileName
    };
    const snippet = JSON.stringify(entry, null, 2);
    const ol = DOM.el("ol", { class: "export-steps" });
    const li1 = DOM.el("li"); li1.appendChild(DOM.text("Download the ")); li1.appendChild(DOM.el("code", null, ".pyquiz")); li1.appendChild(DOM.text(" file above and drop it into your repository's ")); li1.appendChild(DOM.el("code", null, "packs/")); li1.appendChild(DOM.text(" folder."));
    const li2 = DOM.el("li"); li2.appendChild(DOM.text("Open ")); li2.appendChild(DOM.el("code", null, "packs/index.json")); li2.appendChild(DOM.text(" and add the entry below to the ")); li2.appendChild(DOM.el("code", null, '"packs"')); li2.appendChild(DOM.text(" list (mind the comma between entries)."));
    const li3 = DOM.el("li", null, "Commit and push. The student chooser reads the manifest, so the pack appears automatically.");
    ol.appendChild(li1); ol.appendChild(li2); ol.appendChild(li3);
    repo.appendChild(ol);
    const snipWrap = DOM.el("div", { class: "export-snippet" });
    const pre = DOM.el("pre"); pre.appendChild(DOM.el("code", null, snippet));
    snipWrap.appendChild(pre);
    const copySnip = DOM.button("Copy manifest entry", async () => {
      try { await navigator.clipboard.writeText(snippet); copySnip.textContent = "Copied"; setTimeout(() => copySnip.textContent = "Copy manifest entry", 1500); }
      catch { alert("Copy failed — select the text and copy it manually."); }
    });
    snipWrap.appendChild(copySnip);
    repo.appendChild(snipWrap);
    repo.appendChild(DOM.el("p", { class: "export-note" },
      "Tip: adjust the level (Ages 11–14 / Ages 14–16 / Ages 16–19) and description to suit. These only affect how the pack is listed in the chooser."));
    body.appendChild(repo);

    // ---- Secondary: editable JSON (less prominent) ----
    const sec = DOM.el("details", { class: "export-json" });
    sec.appendChild(DOM.el("summary", null, "Other formats"));
    sec.appendChild(DOM.el("p", { class: "export-note" },
      "Export the full editable JSON — your source of truth, including any teacher notes and metadata. Re-import it any time to keep editing."));
    sec.appendChild(DOM.button("Download .json", () => {
      DOM.download(pack.id + ".json", JSON.stringify(pack, null, 2), "application/json");
    }, "ghost"));
    body.appendChild(sec);

    Modal.open({ title: "Export", body: body });
  }

  /* Best-guess level for the manifest entry, from the pack's audience
     or activity difficulty. The teacher can edit it in the snippet. */
  function guessLevel(p) {
    const a = (p.audience || "").toLowerCase();
    if (a.indexOf("16-19") >= 0) return "Ages 16–19";
    if (a.indexOf("14-16") >= 0) return "Ages 14–16";
    if (a.indexOf("11-14") >= 0) return "Ages 11–14";
    const diffs = (p.activities || []).map(x => x.difficulty || 1);
    const avg = diffs.length ? diffs.reduce((s, x) => s + x, 0) / diffs.length : 1;
    if (avg >= 4) return "Ages 16–19";
    if (avg >= 2.6) return "Ages 14–16";
    return "Ages 11–14";
  }

  /* ---- Top bar ---- */
  function bindTopBar() {
    // Pane collapse: each pane has a collapse button (in its head) and a rail
    // (shown when collapsed) to reopen it. Mirrors the flowchart side panel.
    const layout = () => document.getElementById("layout");
    function setTL(collapsed) { layout().classList.toggle("tl-collapsed", collapsed); }
    function setSP(collapsed) { layout().classList.toggle("sp-collapsed", collapsed); }
    const tlc = document.getElementById("tl-collapse");
    const tlr = document.getElementById("tl-rail");
    const spc = document.getElementById("sp-collapse");
    const spr = document.getElementById("sp-rail");
    if (tlc) tlc.addEventListener("click", () => setTL(true));
    if (tlr) tlr.addEventListener("click", () => setTL(false));
    if (spc) spc.addEventListener("click", () => setSP(true));
    if (spr) spr.addEventListener("click", () => setSP(false));
    document.getElementById("new-btn").addEventListener("click", () => {
      if (!confirm("Start a new blank pack? Anything unexported in the current pack will be lost.")) return;
      pack = Pack.blank();
      currentEditId = "__meta__";
      saveDraft(true);
      refresh();
    });
    document.getElementById("import-btn").addEventListener("click", () => document.getElementById("import-file").click());
    document.getElementById("import-file").addEventListener("change", async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const text = (await f.text()).trim();
      try {
        let raw = text.startsWith("v1.") ? await Codec.decode(text) : JSON.parse(text);
        const res = Pack.ingestPack(raw);
        if (!res.ok) {
          alert("Import failed: " + (res.issues.find(i => i.level === "error") || {}).message);
          return;
        }
        pack = res.pack;
        if (!pack.id) pack.id = Pack.uid("pack");
        currentEditId = "__meta__";
        saveDraft(true);
        refresh();
      } catch (err) { alert("Import failed: " + err.message); }
      e.target.value = "";
    });
    document.getElementById("export-btn").addEventListener("click", openExportDialog);
    document.getElementById("size-up").addEventListener("click", () => Settings.bumpSize(1));
    document.getElementById("size-down").addEventListener("click", () => Settings.bumpSize(-1));
    document.getElementById("theme-btn").addEventListener("click", () => Settings.cycleTheme());
    document.getElementById("settings-btn").addEventListener("click", () => Settings.openDialog());
  }

  /* Open a built-in pack as the teacher's OWN editable copy: a fresh id (so it
     never collides with the original or another teacher's), a "(copy)" title
     and no author. This is the seam the dashboard "load an existing one to
     edit" uses; later it will clone a server pack with the teacher as owner. */
  function loadBuiltInCopy(id) {
    const src = PyQuiz.BuiltInPacks && PyQuiz.BuiltInPacks.get(id);
    if (!src) return null;
    const copy = Pack.blank();          // fresh id + timestamps
    const newId = copy.id;
    Object.assign(copy, JSON.parse(JSON.stringify(src)));
    copy.id = newId;                    // keep the new id, not the source's
    copy.title = (src.title || "Pack") + " (copy)";
    copy.author = "";
    return copy;
  }

  /* ---- Init ---- */
  function init() {
    bindTopBar();
    // The dashboard only exists when hosted by the backend; reveal the link
    // there and leave it hidden in the offline single-file build.
    if (Server.enabled) {
      const dl = document.getElementById("dashboard-link");
      if (dl) dl.hidden = false;
    }
    if (Storage.mode() === "memory") {
      const b = document.getElementById("storage-banner");
      if (b) { b.hidden = false; b.textContent = S.storageBannerTeacher; }
    }
    const drafts = Storage.get("pyquiz.v1.teacher.drafts") || {};
    // The dashboard opens packs via query params: ?new (blank), ?draft=<id>
    // (resume one of mine) or ?load=<builtin-id> (start from a built-in copy).
    const params = new URLSearchParams(location.search);
    const wantDraft = params.get("draft");
    const wantLoad = params.get("load");
    const wantNew = params.get("new");
    if (wantLoad) {
      pack = loadBuiltInCopy(wantLoad) || Pack.blank();
      saveDraft(true);
    } else if (wantDraft && drafts[wantDraft]) {
      pack = drafts[wantDraft];
      Storage.set("pyquiz.v1.teacher.lastOpen", pack.id);
    } else if (wantNew) {
      pack = Pack.blank();
      saveDraft(true);
    } else {
      const lastId = Storage.get("pyquiz.v1.teacher.lastOpen");
      if (lastId && drafts[lastId]) pack = drafts[lastId];
      else { pack = Pack.blank(); saveDraft(true); }
    }
    // Drop the query string so a refresh won't re-clone or re-blank the pack.
    if ((wantLoad || wantDraft || wantNew) && window.history && history.replaceState) {
      history.replaceState(null, "", location.pathname);
    }
    const s = Settings.get();
    if (s.tl === "collapsed") document.getElementById("layout").classList.add("tl-collapsed");
    if (s.sp === "collapsed") document.getElementById("layout").classList.add("sp-collapsed");
    // Apply persisted pane widths if the user resized them earlier.
    const layout = document.getElementById("layout");
    if (s.tl_width) layout.style.setProperty("--tl-w", s.tl_width + "px");
    if (s.sp_width) layout.style.setProperty("--sp-w", s.sp_width + "px");
    // Wire the draggable resize handles. Persist new widths into the
    // shared Settings store so they carry across student/teacher.
    DOM.setupPaneResize({
      persist: function (key, width) {
        const patch = {};
        patch[key] = width;
        Settings.update(patch);
      }
    });
    renderTaskListFooter();
    refresh();
  }

  PyQuiz.TeacherApp = { init: init };
  document.addEventListener("DOMContentLoaded", init);
})();
