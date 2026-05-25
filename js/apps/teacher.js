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
    document.getElementById("pack-title").textContent = pack.title || "Untitled pack";
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
    metaBtn.appendChild(DOM.el("span", { class: "task-title", style: "font-weight:600" }, "Pack details"));
    metaLi.appendChild(metaBtn);
    ol.appendChild(metaLi);

    const sections = Array.isArray(pack.sections) ? pack.sections.slice() : [];
    sections.sort(function (a, b) {
      const an = typeof a.number === "number" ? a.number : Infinity;
      const bn = typeof b.number === "number" ? b.number : Infinity;
      if (an !== bn) return an - bn;
      return String(a.id).localeCompare(String(b.id));
    });

    // Build buckets: one per section plus an "__unsectioned" catch-all
    // for activities without a section_id (the default landing zone for
    // newly-created activities).
    const byId = {};
    sections.forEach(s => byId[s.id] = []);
    const orphan = [];
    pack.activities.forEach((act, i) => {
      const item = { act: act, i: i };
      const sid = act.section_id;
      if (sid && byId[sid]) byId[sid].push(item);
      else orphan.push(item);
    });

    // Determine which section the currently-edited activity belongs to
    // so its header gets the "is-current" tint.
    let currentSectionId = null;
    const currentAct = pack.activities.find(a => a.id === currentEditId);
    if (currentAct) currentSectionId = currentAct.section_id || "__unsectioned";

    // Render the orphan / unsectioned bucket first. It's ALWAYS shown,
    // even when empty, so the user has somewhere to drop new activities.
    // When empty we still render the group (with an empty body) so the
    // user can see the bucket exists.
    // Accordion: when the user opens any section, collapse every other
    // section. This keeps the pane scannable in long packs (90+
    // activities can't all be unfurled at once on a laptop screen).
    // Closing a section doesn't auto-open anything else — that would
    // be confusing.
    function toggleSection(id, willCollapse) {
      if (!willCollapse) {
        // The user is OPENING this section — collapse all the others.
        const known = new Set(["__unsectioned"]);
        sections.forEach(s => known.add(s.id));
        known.forEach(k => { sectionCollapsed[k] = (k !== id); });
      } else {
        sectionCollapsed[id] = true;
      }
      renderTaskList();
    }

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
      if (!items.length) return;   // hide empty named sections
      const num = typeof sec.number === "number" ? sec.number : null;
      ol.appendChild(makeGroup(
        { id: sec.id, kicker: num != null ? ("Section " + num) : "Section", title: sec.title },
        items,
        { collapsed: sectionIsCollapsed(sec.id),
          onToggle: v => toggleSection(sec.id, v),
          colour: sectionColour(sec),
          isCurrent: currentSectionId === sec.id }
      ));
    });
  }

  /* Build a collapsible section group identical in structure to the
     student tool's task-group, so the same CSS in base.css styles it
     (coloured left bar, "is-current" tint, chevron, etc.). */
  function makeGroup(sec, items, opts) {
    opts = opts || {};
    const groupLi = DOM.el("li", {
      class: "task-group"
        + (opts.collapsed ? " collapsed" : "")
        + (opts.titleOnly ? " title-only" : "")
        + (opts.isCurrent ? " is-current" : "")
    });
    if (opts.colour) groupLi.style.setProperty("--task-section-colour", opts.colour);
    const headBtn = DOM.el("button", {
      class: "task-group-header",
      type: "button",
      "aria-expanded": opts.collapsed ? "false" : "true"
    });
    headBtn.appendChild(DOM.el("span", { class: "chev", "aria-hidden": "true" }, "▾"));
    const textBlock = DOM.el("span", { class: "group-text" });
    // For the unsectioned bucket (title-only), show "Unsectioned (N)"
    // so the teacher can see how many orphans are pending placement.
    // Named sections show "Section N — Title" with no count, mirroring
    // the student tool — the count would compete visually with the
    // section number.
    const kickerText = opts.titleOnly
      ? (sec.kicker || "Section") + " (" + items.length + ")"
      : (sec.kicker || "Section");
    textBlock.appendChild(DOM.el("span", { class: "group-kicker" }, kickerText));
    if (sec.title) textBlock.appendChild(DOM.el("span", { class: "group-title" }, sec.title));
    headBtn.appendChild(textBlock);
    headBtn.addEventListener("click", () => opts.onToggle(!opts.collapsed));
    groupLi.appendChild(headBtn);
    const groupBody = DOM.el("ol", { class: "task-group-body" });
    if (!items.length) {
      // An empty section needs SOMETHING in its body so the user can see
      // it's open (vs. collapsed) and so the visual height stays
      // consistent. A muted placeholder line covers it.
      const empty = DOM.el("li", { class: "task-empty-row" }, "No activities yet");
      groupBody.appendChild(empty);
    }
    items.forEach(it => groupBody.appendChild(teacherTaskItem(it.act, it.i, opts.colour)));
    groupLi.appendChild(groupBody);
    return groupLi;
  }

  /* A single activity row inside a section. Mirrors the student
     taskItem signature but adapted for the teacher: status circle is
     just the index number (no completion state to track), the title
     truncates with ellipsis, and a small type pill on the right shows
     the activity type label. Activity inherits the SECTION colour as
     its --activity-colour so the group reads as one continuous stripe;
     this is the same trick the student tool uses. */
  function teacherTaskItem(act, i, secColour) {
    const C = PyQuiz.Constants;
    const label = (C.TYPE_LABELS && C.TYPE_LABELS[act.type]) || act.type;
    const li = DOM.el("li", { class: "task-row" });
    if (act.id === currentEditId) li.classList.add("current");
    li.style.setProperty("--activity-colour", secColour || ((C.TYPE_COLOURS && C.TYPE_COLOURS[act.type]) || "var(--accent)"));
    const btn = DOM.el("button", {
      type: "button",
      onclick: () => { currentEditId = act.id; refresh(); }
    });
    btn.appendChild(DOM.el("span", { class: "status not_started" }, String(i + 1)));
    btn.appendChild(DOM.el("span", { class: "task-title" }, act.title || "(untitled)"));
    btn.appendChild(DOM.el("span", { class: "type-pill", title: label }, label));
    li.appendChild(btn);
    return li;
  }

  /* Render the sticky "+ Add activity" footer once, at startup. */
  function renderTaskListFooter() {
    const host = document.getElementById("task-list-footer");
    if (!host) return;
    host.innerHTML = "";
    const addBtn = DOM.button("+ " + S.addActivity, openAddActivityDialog, "primary");
    host.appendChild(addBtn);
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
  function renderEditor() {
    const host = document.getElementById("main-region");
    host.innerHTML = "";
    if (currentEditId === "__meta__") return renderPackMetaEditor(host);
    const act = Pack.findActivity(pack, currentEditId);
    if (!act) {
      const empty = DOM.el("div", { class: "empty-state" },
        DOM.el("h2", null, S.noActivities),
        DOM.el("p", { html: "Click <em>Add activity</em> on the left to begin." }));
      host.appendChild(empty);
      return;
    }
    renderActivityEditor(host, act);
  }

  function renderPackMetaEditor(host) {
    const wrap = DOM.el("div", { class: "edit-wrap" });
    wrap.appendChild(DOM.el("h1", { class: "activity-title" }, "Pack details"));
    wrap.appendChild(DOM.el("p", { class: "activity-instructions" }, "These details appear at the top of the student tool and identify the pack on export."));

    const sec = DOM.el("div", { class: "form-section" });
    DOM.field(sec, "Title", "text", pack.title, v => { pack.title = v; saveDraft(); document.getElementById("pack-title").textContent = v || "Untitled pack"; });
    DOM.field(sec, "Description", "textarea", pack.description, v => { pack.description = v; saveDraft(); });
    DOM.field(sec, "Audience", "select", pack.audience, v => { pack.audience = v; saveDraft(); }, [
      ["ks3", "KS3"], ["ks4", "KS4 (OCR J277)"], ["ks5", "KS5 (OCR H446)"], ["other", "Other"]
    ]);
    DOM.field(sec, "Author", "text", pack.author, v => { pack.author = v; saveDraft(); });
    DOM.field(sec, "Tags (comma-separated)", "text", (pack.tags || []).join(", "), v => { pack.tags = v.split(",").map(s => s.trim()).filter(Boolean); saveDraft(); });
    DOM.field(sec, "Spec refs (comma-separated)", "text", (pack.spec_refs || []).join(", "), v => { pack.spec_refs = v.split(",").map(s => s.trim()).filter(Boolean); saveDraft(); });
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

    // Sections management
    const secSec = DOM.el("div", { class: "form-section" });
    secSec.appendChild(DOM.h3("Sections"));
    secSec.appendChild(DOM.el("p", { class: "kbd-help" },
      "Optional. Group activities into numbered sections (e.g. 'Section 1: Loops'). Numbers are assigned automatically and stay contiguous as you reorder or remove sections. Each section gets a colour picked from a pool by hashing its id — set the colour field to a hex value like #2D5BA6 to override."));
    if (!Array.isArray(pack.sections)) pack.sections = [];
    // Ensure numbers are clean before rendering — guards against imports
    // and hand-edited JSON.
    Pack.sortAndRenumberSections(pack);
    pack.sections.forEach((sec, i) => {
      const row = DOM.el("div", { style: "display:flex;gap:6px;align-items:center;margin-bottom:6px" });
      const numLabel = DOM.el("span", { style: "min-width:32px;font-weight:600;color:var(--muted)" }, String(sec.number));
      row.appendChild(numLabel);
      const ti = DOM.el("input", {
        type: "text", value: sec.title,
        placeholder: "Section title",
        style: "flex:1;padding:6px 8px;border:1px solid var(--border);border-radius:4px"
      });
      ti.addEventListener("input", () => { sec.title = ti.value; saveDraft(); refresh(); });
      row.appendChild(ti);
      const ci = DOM.el("input", {
        type: "text", value: sec.colour || "",
        placeholder: "#colour (auto)",
        style: "width:100px;padding:6px 8px;border:1px solid var(--border);border-radius:4px;font-family:var(--font-mono);font-size:0.9em"
      });
      ci.addEventListener("input", () => {
        const v = ci.value.trim();
        if (v) sec.colour = v; else delete sec.colour;
        saveDraft();
        // No full refresh — the input would lose focus mid-typing.
      });
      row.appendChild(ci);
      const up = DOM.button("↑", () => { if (Pack.moveSection(pack, sec.id, -1)) { saveDraft(); refresh(); } }, "icon");
      up.disabled = i === 0;
      const down = DOM.button("↓", () => { if (Pack.moveSection(pack, sec.id, 1)) { saveDraft(); refresh(); } }, "icon");
      down.disabled = i === pack.sections.length - 1;
      const del = DOM.button("✕", () => {
        if (!confirm("Remove this section? Activities currently in it will become unsectioned. Numbers will be reassigned.")) return;
        Pack.removeSection(pack, sec.id);
        saveDraft();
        refresh();
      }, "icon");
      row.appendChild(up);
      row.appendChild(down);
      row.appendChild(del);
      secSec.appendChild(row);
    });
    const addSec = DOM.button("+ Add section", () => {
      const nextNum = (pack.sections || []).length + 1;
      Pack.addSection(pack, "Section " + nextNum);
      saveDraft();
      refresh();
    }, "ghost");
    secSec.appendChild(addSec);
    wrap.appendChild(secSec);

    host.appendChild(wrap);
  }

  function renderActivityEditor(host, act) {
    const wrap = DOM.el("div");

    // Top bar with title and reorder/duplicate/delete
    const top = DOM.el("div", { style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px" });
    top.appendChild(DOM.el("h1", { class: "activity-title", style: "flex:1;min-width:200px" }, act.title || "Untitled activity"));

    const idx = pack.activities.indexOf(act);
    const upBtn = DOM.button("↑ Move up", () => { if (Pack.moveActivity(pack, act.id, -1)) { saveDraft(); refresh(); } });
    const dnBtn = DOM.button("↓ Move down", () => { if (Pack.moveActivity(pack, act.id, 1)) { saveDraft(); refresh(); } });
    upBtn.disabled = idx === 0;
    dnBtn.disabled = idx === pack.activities.length - 1;
    const dupBtn = DOM.button("Duplicate", () => {
      const copy = Pack.duplicateActivity(pack, act.id);
      if (copy) { currentEditId = copy.id; saveDraft(); refresh(); }
    });
    const delBtn = DOM.button("Delete", () => {
      if (!confirm("Delete this activity? This cannot be undone within this session.")) return;
      Pack.removeActivity(pack, act.id);
      currentEditId = "__meta__";
      saveDraft();
      refresh();
    }, "danger");
    top.appendChild(upBtn);
    top.appendChild(dnBtn);
    top.appendChild(dupBtn);
    top.appendChild(delBtn);
    wrap.appendChild(top);

    // Tabs
    const tabbar = DOM.el("div", { class: "tabbar" });
    const tabs = [["form", "Form"], ["json", "Edit as JSON"], ["preview", "Preview"]];
    let activeTab = "form";
    const tabBtns = {};
    tabs.forEach(([id, label]) => {
      const b = DOM.el("button", {
        type: "button",
        "aria-selected": id === activeTab ? "true" : "false",
        onclick: () => { activeTab = id; renderTab(); }
      }, label);
      tabbar.appendChild(b);
      tabBtns[id] = b;
    });
    wrap.appendChild(tabbar);

    const tabBody = DOM.el("div");
    wrap.appendChild(tabBody);

    function renderTab() {
      for (const id of Object.keys(tabBtns)) tabBtns[id].setAttribute("aria-selected", id === activeTab ? "true" : "false");
      tabBody.innerHTML = "";
      if (activeTab === "form") renderForm(tabBody, act);
      else if (activeTab === "json") renderJsonTab(tabBody, act);
      else renderPreviewTab(tabBody, act);
    }
    renderTab();

    host.appendChild(wrap);
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

  /* ---- Form tab ---- */
  function renderForm(host, act) {
    const onChange = () => { saveDraft(); renderSidePanel(); };

    // 1. Core — title + instructions. Always visible, top of form.
    const core = DOM.el("div", { class: "form-section" });
    core.appendChild(DOM.h3("Core"));
    DOM.field(core, "Title", "text", act.title, v => {
      act.title = v;
      saveDraft();
      const t = document.querySelector(".activity-title");
      if (t) t.textContent = v || "Untitled activity";
      renderTaskList();
      renderSidePanel();
    });
    DOM.field(core, "Instructions", "textarea", act.instructions, v => { act.instructions = v; onChange(); }, { rows: 2 });
    DOM.field(core, "Context (optional)", "textarea", act.context || "", v => { act.context = v || null; onChange(); }, { rows: 2, hint: "Optional background shown above the instructions in a tinted box." });
    host.appendChild(core);

    // 2. Classification — difficulty, topics, spec refs, section, time.
    const meta = DOM.el("div", { class: "form-section" });
    meta.appendChild(DOM.h3("Classification"));
    DOM.field(meta, "Difficulty", "radio", String(act.difficulty || 1), v => {
      act.difficulty = parseInt(v, 10) || 1;
      onChange();
    }, [["1", "★"], ["2", "★★"], ["3", "★★★"], ["4", "★★★★"], ["5", "★★★★★"]]);
    DOM.field(meta, "Topics", "text", (act.topics || []).join(", "), v => { act.topics = v.split(",").map(s => s.trim()).filter(Boolean); onChange(); }, { hint: "Comma-separated, e.g. loops, range" });
    DOM.field(meta, "Spec refs", "text", (act.spec_refs || []).join(", "), v => { act.spec_refs = v.split(",").map(s => s.trim()).filter(Boolean); onChange(); }, { hint: "Comma-separated exam-board reference codes" });
    DOM.field(meta, "Est. time (s)", "number", act.estimated_time_seconds || 0, v => { act.estimated_time_seconds = parseInt(v, 10) || 0; onChange(); });
    DOM.field(meta, "Points", "number", act.points || 0, v => { act.points = parseInt(v, 10) || 0; onChange(); });
    // Section assignment (only if the pack has any sections)
    const sectionOpts = Array.isArray(pack.sections) ? pack.sections : [];
    if (sectionOpts.length) {
      const opts = [["", "(unsectioned)"]].concat(sectionOpts.map(s => [s.id, s.title]));
      DOM.field(meta, "Section", "select", act.section_id || "", v => {
        if (v) act.section_id = v; else delete act.section_id;
        onChange();
        renderTaskList();
      }, opts);
    }
    // Colour override as a swatch picker — much more discoverable than
    // typing a hex code.
    DOM.field(meta, "Colour override", "colour", act.colour || "", v => {
      if (!v) { delete act.colour; }
      else { act.colour = v; }
      onChange();
      renderTaskList();
    }, COLOUR_PRESETS);
    host.appendChild(meta);

    // 3. Hints — list editor
    const hsec = DOM.el("div", { class: "form-section" });
    hsec.appendChild(DOM.h3("Hints"));
    act.hints = act.hints || [];
    const hList = DOM.el("div");
    function redrawHints() {
      hList.innerHTML = "";
      if (!act.hints.length) {
        hList.appendChild(DOM.el("p", { style: "color:var(--muted);font-size:0.88em;margin:4px 0" }, "No hints yet."));
      } else {
        act.hints.forEach((item, i) => {
          const row = DOM.el("div", { style: "display:flex;gap:6px;margin-bottom:5px" });
          const inp = DOM.el("input", { type: "text", style: "flex:1;padding:5px 8px;border:1px solid var(--border-strong);border-radius:4px;font:inherit;font-size:0.92em" });
          inp.value = item;
          inp.addEventListener("input", () => { act.hints[i] = inp.value; saveDraft(); });
          const del = DOM.button("✕", () => { act.hints.splice(i, 1); onChange(); redrawHints(); }, "icon");
          del.title = "Remove hint";
          row.appendChild(inp); row.appendChild(del);
          hList.appendChild(row);
        });
      }
    }
    redrawHints();
    hsec.appendChild(hList);
    hsec.appendChild(DOM.button("+ Add hint", () => { act.hints.push(""); onChange(); redrawHints(); }, "ghost"));
    host.appendChild(hsec);

    // 4. Feedback — short success/failure messages + solution explanation
    const fsec = DOM.el("div", { class: "form-section" });
    fsec.appendChild(DOM.h3("Feedback"));
    DOM.field(fsec, "When correct", "text", (act.feedback && act.feedback.correct) || "", v => { act.feedback = act.feedback || {}; act.feedback.correct = v; saveDraft(); });
    DOM.field(fsec, "When incorrect", "text", (act.feedback && act.feedback.incorrect) || "", v => { act.feedback = act.feedback || {}; act.feedback.incorrect = v; saveDraft(); });
    DOM.field(fsec, "Solution explanation", "textarea", act.solution_explanation || "", v => { act.solution_explanation = v; saveDraft(); }, { rows: 2 });
    host.appendChild(fsec);

    // 5. Per-type payload — the bulk of the editor. Each per-type editor
    //    now uses the compact radio/code-editor fields where it makes
    //    sense.
    const psec = DOM.el("div", { class: "form-section" });
    psec.appendChild(DOM.h3("Activity body"));
    const payloadHost = DOM.el("div");
    psec.appendChild(payloadHost);
    if (Editors.has(act.type)) {
      Editors.edit(act, payloadHost, { onChange: onChange, refresh: renderEditor });
    } else {
      payloadHost.appendChild(document.createTextNode("(No editor for this type.)"));
    }
    host.appendChild(psec);

    // 6. Advanced — timing and teacher notes, hidden behind a disclosure
    //    so they don't take up scroll real estate by default.
    const adv = DOM.el("details", { class: "form-advanced" });
    adv.appendChild(DOM.el("summary", null, "Advanced (timing, teacher notes)"));
    const advBody = DOM.el("div", { class: "form-advanced-body" });
    adv.appendChild(advBody);

    DOM.field(advBody, "Use a timer", "checkbox", !!act.timing, v => {
      act.timing = v ? { mode: "countdown", limit_seconds: 60, on_expire: "warn" } : null;
      onChange();
      renderEditor();
    });
    if (act.timing) {
      DOM.field(advBody, "Timer mode", "radio", act.timing.mode, v => { act.timing.mode = v; saveDraft(); }, [
        ["countdown", "Countdown"], ["count_up", "Count up"]
      ]);
      DOM.field(advBody, "Limit (seconds)", "number", act.timing.limit_seconds, v => { act.timing.limit_seconds = parseInt(v, 10) || 60; saveDraft(); });
      DOM.field(advBody, "On expiry", "radio", act.timing.on_expire, v => { act.timing.on_expire = v; saveDraft(); }, [
        ["warn", "Warn"], ["submit", "Auto-submit"], ["lock", "Lock"]
      ]);
    }
    DOM.field(advBody, "Teacher notes", "textarea", act.teacher_notes || "", v => { act.teacher_notes = v; saveDraft(); },
      { rows: 3, hint: "Stripped from student exports." });
    host.appendChild(adv);
  }

  /* ---- JSON tab ---- */
  function renderJsonTab(host, act) {
    host.appendChild(DOM.el("p", { class: "kbd-help" }, "Edit the raw JSON for this activity. Click Apply to save changes. Changes are validated before applying."));
    const ta = DOM.el("textarea", { class: "json-edit" });
    ta.value = JSON.stringify(act, null, 2);
    host.appendChild(ta);
    const row = DOM.el("div", { class: "footer-actions" });
    const err = DOM.el("span", { style: "color:var(--bad)" });
    const apply = DOM.button("Apply", () => {
      try {
        const obj = JSON.parse(ta.value);
        if (obj.id !== act.id) { err.textContent = "Cannot change id."; return; }
        if (obj.type !== act.type) { err.textContent = "Cannot change type — delete and recreate instead."; return; }
        // Validate before replacing
        const issues = Validator.activity(obj, "activity");
        const errs = issues.filter(i => i.level === "error");
        if (errs.length) { err.textContent = "Validation failed: " + errs[0].message; return; }
        Object.keys(act).forEach(k => delete act[k]);
        Object.assign(act, obj);
        err.textContent = "";
        saveDraft();
        refresh();
      } catch (e) { err.textContent = "Bad JSON: " + e.message; }
    }, "primary");
    row.appendChild(apply);
    row.appendChild(err);
    host.appendChild(row);
  }

  /* ---- Preview tab ---- */
  function renderPreviewTab(host, act) {
    host.appendChild(DOM.el("p", { class: "kbd-help" }, "Live preview — uses the same renderer the student tool uses. Interactions are not saved."));
    host.appendChild(DOM.el("h2", { style: "font-size:1.2em" }, act.title || "Untitled"));
    if (act.context) host.appendChild(DOM.el("div", { class: "activity-context" }, act.context));
    if (act.instructions) host.appendChild(DOM.el("p", { class: "activity-instructions" }, act.instructions));

    const body = DOM.el("div", { class: "activity-body" });
    host.appendChild(body);
    const ctrl = Renderers.render(act, body, {});

    const row = DOM.el("div", { class: "footer-actions" });
    const fb = DOM.el("span", { style: "margin-left:10px" });
    const check = DOM.button(S.check, () => {
      if (!ctrl) return;
      const r = Marker.mark(act, ctrl.getResponse());
      fb.textContent = r.feedback;
      fb.style.color = r.status === "correct" ? "var(--ok)" : "var(--bad)";
      if (ctrl.highlight) ctrl.highlight(r.per_part);
    }, "primary");
    const reset = DOM.button(S.reset, () => { if (ctrl && ctrl.reset) ctrl.reset(); fb.textContent = ""; });
    row.appendChild(check);
    row.appendChild(reset);
    row.appendChild(fb);
    host.appendChild(row);
  }

  /* ---- Side panel: validation + tips ---- */
  function renderSidePanel() {
    const sp = document.getElementById("side-panel");
    if (!sp) return;
    // Preserve the resize handle (added once by DOM.setupPaneResize)
    // while clearing the rest of the panel's content.
    const handle = sp.querySelector(".pane-resize");
    sp.innerHTML = "";
    if (handle) sp.appendChild(handle);
    // The side-panel is a flex column with `overflow: hidden` (shared
    // CSS rule). All scrollable content needs to live inside a
    // .feedback-stack child so it can scroll without overflowing.
    const stack = DOM.el("div", { class: "feedback-stack" });
    sp.appendChild(stack);

    const sec = DOM.el("section");
    sec.appendChild(DOM.h3("Validation"));
    // When an activity is selected, offer a one-click preview of just
    // that activity. Surfacing this in the side panel keeps it close to
    // the validation results, so the teacher can fix → preview → fix
    // without hopping back to the top bar.
    const currentAct = currentEditId && currentEditId !== "__meta__"
      ? Pack.findActivity(pack, currentEditId)
      : null;
    if (currentAct) {
      const previewBtn = DOM.button("▶  Preview this activity",
        () => openSinglePreview(currentAct), "primary");
      previewBtn.style.width = "100%";
      previewBtn.style.marginBottom = "12px";
      sec.appendChild(previewBtn);
    }
    const issues = Validator.pack(pack);
    const errs = Validator.errorsIn(issues).length;
    const warns = Validator.warningsIn(issues).length;
    const summary = DOM.el("p");
    summary.innerHTML = errs ? '<strong style="color:var(--bad)">' + errs + " error(s)</strong>" : '<strong style="color:var(--ok)">No errors</strong>';
    summary.innerHTML += warns ? ' · <span style="color:var(--warn)">' + warns + " warning(s)</span>" : "";
    sec.appendChild(summary);

    const ul = DOM.el("ul", { class: "issue-list" });
    if (!issues.length) {
      ul.appendChild(DOM.el("li", { style: "color:var(--muted)" }, "All clear."));
    } else {
      issues.forEach(iss => {
        const li = DOM.el("li");
        li.innerHTML = '<span class="level ' + iss.level + '">' + iss.level + '</span>'
          + DOM.escapeHtml(iss.message) + '<br><code>' + DOM.escapeHtml(iss.path) + '</code>';
        li.addEventListener("click", () => goToIssue(iss));
        ul.appendChild(li);
      });
    }
    sec.appendChild(ul);
    stack.appendChild(sec);

    const tips = DOM.el("section");
    tips.appendChild(DOM.h3("Tips"));
    tips.appendChild(DOM.el("p", {
      style: "font-size:0.9em;color:var(--muted)",
      html: "Drafts auto-save to local storage. Use <strong>Export</strong> to share a pack with students. The <strong>Edit as JSON</strong> tab is handy for bulk changes."
    }));
    stack.appendChild(tips);
  }

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

    const ab = DOM.el("div", { class: "activity-body" });
    body.appendChild(ab);
    const ctrl = Renderers.render(act, ab, {});

    const row = DOM.el("div", { class: "footer-actions" });
    const fb = DOM.el("span", { style: "margin-left:10px" });
    const check = DOM.button(S.check, () => {
      const r = Marker.mark(act, ctrl.getResponse());
      fb.textContent = r.feedback;
      fb.style.color = r.status === "correct" ? "var(--ok)" : "var(--bad)";
      if (ctrl.highlight) ctrl.highlight(r.per_part);
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
        li.innerHTML = '<span class="level error">error</span>' + DOM.escapeHtml(e.message) + '<br><code>' + DOM.escapeHtml(e.path) + '</code>';
        ul.appendChild(li);
      });
      body.appendChild(ul);
    } else {
      const warns = Validator.warningsIn(issues);
      if (warns.length) body.appendChild(DOM.el("p", { class: "banner" }, warns.length + " warning(s) — export allowed but consider reviewing."));
      const sec = DOM.el("div", { style: "display:flex;flex-direction:column;gap:10px" });

      const t1 = DOM.el("div");
      t1.appendChild(DOM.el("h3", null, "Teacher JSON"));
      t1.appendChild(DOM.el("p", { style: "color:var(--muted);font-size:0.9em" }, "Includes everything: teacher notes, metadata, answers. Use this as your editable source of truth."));
      t1.appendChild(DOM.button("Download .pyquiz.json", () => {
        DOM.download(pack.id + ".pyquiz.json", JSON.stringify(pack, null, 2), "application/json");
      }, "primary"));
      sec.appendChild(t1);

      const t2 = DOM.el("div");
      t2.appendChild(DOM.el("h3", null, "Student pack (encoded)"));
      t2.appendChild(DOM.el("p", { style: "color:var(--muted);font-size:0.9em" }, "Compact and obfuscated. Teacher notes and metadata are stripped, but answers remain (they are needed for offline marking)."));
      const warn = DOM.el("p", { class: "banner", style: "border-radius:var(--radius);margin:8px 0" }, S.encodedPackWarning);
      t2.appendChild(warn);
      t2.appendChild(DOM.button("Download .pyquiz", async () => {
        const encoded = await Codec.encode(pack);
        DOM.download(pack.id + ".pyquiz", encoded, "text/plain");
      }, "primary"));
      const copyBtn = DOM.button("Copy encoded string", async () => {
        const encoded = await Codec.encode(pack);
        try {
          await navigator.clipboard.writeText(encoded);
          copyBtn.textContent = "Copied";
          setTimeout(() => copyBtn.textContent = "Copy encoded string", 1500);
        } catch { alert("Copy failed — please save the file instead."); }
      });
      t2.appendChild(copyBtn);
      sec.appendChild(t2);

      body.appendChild(sec);
    }
    Modal.open({ title: "Export", body: body });
  }

  /* ---- Top bar ---- */
  function bindTopBar() {
    document.getElementById("burger").addEventListener("click", () => {
      const l = document.getElementById("layout");
      if (window.innerWidth <= 1280) l.classList.toggle("tl-open");
      else l.classList.toggle("tl-collapsed");
    });
    document.getElementById("burger-right").addEventListener("click", () => {
      document.getElementById("layout").classList.toggle("sp-collapsed");
    });
    document.getElementById("new-btn").addEventListener("click", () => {
      if (!confirm("Start a new blank pack? Current pack will remain in drafts.")) return;
      pack = Pack.blank();
      currentEditId = "__meta__";
      saveDraft(true);
      refresh();
    });
    document.getElementById("open-btn").addEventListener("click", openDraftsDialog);
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
    document.getElementById("validate-btn").addEventListener("click", () => renderSidePanel());
    document.getElementById("export-btn").addEventListener("click", openExportDialog);
    document.getElementById("size-up").addEventListener("click", () => Settings.bumpSize(1));
    document.getElementById("size-down").addEventListener("click", () => Settings.bumpSize(-1));
    document.getElementById("theme-btn").addEventListener("click", () => Settings.cycleTheme());
    document.getElementById("settings-btn").addEventListener("click", () => Settings.openDialog());
  }

  /* ---- Init ---- */
  function init() {
    bindTopBar();
    if (Storage.mode() === "memory") {
      const b = document.getElementById("storage-banner");
      if (b) { b.hidden = false; b.textContent = S.storageBannerTeacher; }
    }
    const lastId = Storage.get("pyquiz.v1.teacher.lastOpen");
    const drafts = Storage.get("pyquiz.v1.teacher.drafts") || {};
    if (lastId && drafts[lastId]) {
      pack = drafts[lastId];
    } else {
      pack = Pack.blank();
      saveDraft(true);
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
