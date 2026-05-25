/* =====================================================================
 * PyQuiz.StudentApp — student shell entry point
 *
 * Wires the shared modules together for the student tool. Responsible
 * only for navigation, progress storage, top-bar wiring and the
 * loader UI. All activity logic lives in PyQuiz.Renderers and
 * PyQuiz.Marker.
 *
 * Public entry: PyQuiz.StudentApp.init()
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const { Codec, Storage, Pack, Validator, Marker, Renderers, Demo, Strings: S } = PyQuiz;
  const { DOM, A11y, Settings, Modal } = PyQuiz;

  let pack = null;
  let progress = null;
  let currentId = null;
  let currentController = null;
  let currentPlayAction = null;
  let revealedHints = 0;
  let timerHandle = null;

  function nowISO() { return new Date().toISOString(); }

  /* ---- Storage banner ---- */
  function maybeShowStorageBanner() {
    if (Storage.mode() === "memory") {
      const b = document.getElementById("storage-banner");
      if (b) { b.hidden = false; b.textContent = S.storageBanner; }
    }
  }

  function showError(msg) {
    const banner = document.getElementById("error-banner");
    if (!banner) return;
    banner.textContent = msg;
    banner.hidden = false;
    clearTimeout(showError._t);
    showError._t = setTimeout(() => banner.hidden = true, 6000);
  }

  /* ---- Loader ---- */
  // Look at file content and decide if it's a pack (encoded or JSON) or
  // a progress file. Returns { kind: "pack"|"progress", value }.
  async function classifyFile(text) {
    text = (text || "").trim();
    if (text.startsWith("v1.")) {
      return { kind: "pack", value: await Codec.decode(text) };
    }
    let obj;
    try { obj = JSON.parse(text); }
    catch (e) { throw new Error("Not a valid PyQuiz file (couldn't parse JSON)."); }
    // Progress file: has pack_id and an activities object (map keyed by id).
    if (obj && obj.pack_id && obj.activities && !Array.isArray(obj.activities)) {
      return { kind: "progress", value: obj };
    }
    // Pack: has id and an activities array.
    if (obj && obj.id && Array.isArray(obj.activities)) {
      return { kind: "pack", value: obj };
    }
    throw new Error("This doesn't look like a PyQuiz pack or a progress file.");
  }

  function showLoader() {
    const main = document.getElementById("main-region");
    main.innerHTML = "";
    // Hide both side panes on the welcome screen — students who haven't
    // loaded a pack yet have nothing to put there, and the empty panes
    // make the page feel half-broken. The `welcome-mode` class on the
    // layout collapses both panes; removeWelcomeMode() restores them on
    // the first pack load.
    const layout = document.getElementById("layout");
    layout.classList.add("welcome-mode");

    const wrap = DOM.el("div", { class: "welcome" });

    // Hero
    const hero = DOM.el("section", { class: "welcome-hero" });
    hero.appendChild(DOM.el("div", { class: "welcome-logo", "aria-hidden": "true" }, "{ }"));
    hero.appendChild(DOM.el("h1", { class: "welcome-title" }, "PyQuiz"));
    hero.appendChild(DOM.el("p", { class: "welcome-tagline" },
      "A Python practice tool for KS3 and KS4 computing teachers. Build your own packs of bite-sized activities, structured the way you teach — and let your students work through them at their own pace, with instant feedback."));
    const heroAction = DOM.el("div", { class: "welcome-cta" });
    const cta = DOM.button("Load a pack to begin", () => {
      document.getElementById("load-btn").click();
    }, "primary");
    cta.classList.add("big");
    heroAction.appendChild(cta);
    heroAction.appendChild(DOM.el("p", { class: "welcome-cta-hint" },
      "Or use the Load pack button in the top right."));
    hero.appendChild(heroAction);
    wrap.appendChild(hero);

    // What makes it useful (teacher-focused pitch)
    const overview = DOM.el("section", { class: "welcome-section" });
    overview.appendChild(DOM.el("h2", null, "Built for the way you teach"));
    overview.appendChild(DOM.el("p", null,
      "PyQuiz is structured around how programming is actually learned — read code before you write it, change a little before you change a lot, and only then take on the open challenge. Teachers author each activity, group them into sections and decide how the journey unfolds."));
    const featuresGrid = DOM.el("div", { class: "welcome-features" });
    const features = [
      {
        icon: "✎",
        title: "You author the content",
        desc: "Open the teacher tool to build your own packs. Pick from six activity types, sequence them into sections, add hints and feedback. Export a single file and share it with your class."
      },
      {
        icon: "↻",
        title: "PRIMM-friendly by design",
        desc: "The activity types support a Predict → Investigate → Modify → Make journey. Build sections that scaffold students from reading code to writing it without leaving the tool."
      },
      {
        icon: "✓",
        title: "Instant self-marking",
        desc: "Every activity marks itself the moment the student presses Check. No accounts, no waiting on the teacher between attempts. You see the patterns; they see the feedback."
      },
      {
        icon: "▶",
        title: "Real Python execution",
        desc: "When a student gets an activity right, PyQuiz runs their code with Pyodide. They see the program actually work — which is often the moment something clicks."
      },
      {
        icon: "♿",
        title: "Accessible by default",
        desc: "Atkinson Hyperlegible or OpenDyslexic typefaces, adjustable size, high-contrast theme, full keyboard support and aria-live announcements. Designed with KS3 reading levels in mind."
      },
      {
        icon: "✦",
        title: "Differentiated scaffolding",
        desc: "Each 'Make' challenge can come in three flavours — heavy scaffolding, just-the-signature, and open. Stretch a strong student and support one who needs the structure, from the same pack."
      }
    ];
    features.forEach(f => {
      const card = DOM.el("div", { class: "welcome-feature" });
      card.appendChild(DOM.el("div", { class: "welcome-feature-icon", "aria-hidden": "true" }, f.icon));
      card.appendChild(DOM.el("h3", null, f.title));
      card.appendChild(DOM.el("p", null, f.desc));
      featuresGrid.appendChild(card);
    });
    overview.appendChild(featuresGrid);
    wrap.appendChild(overview);

    // Activity types — educational value front and centre
    const types = DOM.el("section", { class: "welcome-section" });
    types.appendChild(DOM.el("h2", null, "Seven activity types"));
    types.appendChild(DOM.el("p", null,
      "Each targets a different cognitive skill in programming. Use them in combination to build a complete learning journey on a topic."));
    const typesGrid = DOM.el("div", { class: "welcome-types" });
    const Constants = PyQuiz.Constants;
    const activityTypes = [
      {
        type: "predict_output",
        title: "Predict output",
        desc: "Read a short snippet and predict what it prints. Free text or multiple choice.",
        value: "Forces students to mentally execute the program — the cognitive move at the heart of computational thinking.",
        sample: "for i in range(3):\n    print(i * 2)\n# → 0, 2, 4"
      },
      {
        type: "parsons",
        title: "Parsons",
        desc: "Reorder shuffled lines of code into a working program. Distractors must go to the bin.",
        value: "Builds program-structure intuition (indentation, ordering, control flow) without the cognitive load of writing from scratch — well evidenced in CS education research.",
        sample: "for i in range(5):\n    print(i)"
      },
      {
        type: "modify",
        title: "Modify",
        desc: "The code works. Change one line so it does something different.",
        value: "The 'Investigate / Modify' step in PRIMM. Builds confidence to tinker before students are asked to write from scratch.",
        sample: "for i in range(5):\n    print(i)\n# → change to print 0–9"
      },
      {
        type: "spot_the_bug",
        title: "Spot the bug",
        desc: "The code is broken. Click the bad line and write a fix.",
        value: "Debugging is a separate skill from writing fresh code. Highlights the difference between syntax errors, logic errors and off-by-one mistakes.",
        sample: "for n in nums:\n    total + n   # ←"
      },
      {
        type: "cloze",
        title: "Cloze",
        desc: "Fill in the blanks in a code template — free text, drop-down, or click-to-place from a word bank.",
        value: "Targets specific syntactic elements (a keyword, an operator, a function name) in isolation. Useful for J277-style key-term recall.",
        sample: "for i in ____(5):\n    ____(i)"
      },
      {
        type: "trace_table",
        title: "Trace table",
        desc: "Step through a program line by line and record how each variable changes.",
        value: "Builds a precise mental model of how code executes. A favourite of both OCR J277 and H446 — and a transferable skill across exam boards.",
        sample: "  i  x  out\n  0  0\n  1  1"
      },
      {
        type: "starter_challenge",
        title: "Challenge",
        desc: "An open-ended coding task with a starter, example calls and a model solution.",
        value: "Closes the journey with a 'Make' task in the PRIMM cycle. Students stretch on a fuller problem after the bite-sized tasks, then self-check against the examples.",
        sample: "def double(n):\n    return n * 2"
      }
    ];
    activityTypes.forEach(t => {
      const card = DOM.el("article", { class: "welcome-type" });
      const colour = (Constants && Constants.TYPE_COLOURS && Constants.TYPE_COLOURS[t.type]) || "#666";
      card.style.setProperty("--type-colour", colour);
      const head = DOM.el("header", { class: "welcome-type-head" });
      head.appendChild(DOM.el("span", { class: "welcome-type-badge" }, t.title));
      card.appendChild(head);
      card.appendChild(DOM.el("p", { class: "welcome-type-desc" }, t.desc));
      const pre = DOM.el("pre", { class: "welcome-type-sample" });
      pre.appendChild(DOM.el("code", null, t.sample));
      card.appendChild(pre);
      const val = DOM.el("p", { class: "welcome-type-value" });
      val.appendChild(DOM.el("strong", null, "Why it matters: "));
      val.appendChild(document.createTextNode(t.value));
      card.appendChild(val);
      typesGrid.appendChild(card);
    });
    types.appendChild(typesGrid);
    wrap.appendChild(types);

    // Authoring CTA
    const footer = DOM.el("section", { class: "welcome-footer" });
    footer.appendChild(DOM.el("h2", null, "Make your first pack"));
    footer.appendChild(DOM.el("p", { class: "welcome-footer-lede" },
      "Have a topic in mind? Sequence a journey for it. A typical section starts with a Predict, follows up with a Parsons, three small Modify tasks, a bug-fix, then three challenges of increasing independence."));
    const footerActions = DOM.el("div", { class: "welcome-cta" });
    const teacherCta = DOM.button("Open the authoring tool", () => {
      window.open("teacher.html", "_blank");
    }, "primary");
    teacherCta.classList.add("big");
    footerActions.appendChild(teacherCta);
    footer.appendChild(footerActions);
    wrap.appendChild(footer);

    main.appendChild(wrap);
  }

  /* Open the OS file picker directly. Wired to the load-btn topbar
     button and to the welcome CTA. */
  async function openLoadDialog() {
    let fileInput = document.getElementById("global-file-input");
    if (!fileInput) {
      fileInput = DOM.el("input", {
        type: "file",
        accept: ".pyquiz,.txt,.json",
        id: "global-file-input",
        style: "display:none"
      });
      document.body.appendChild(fileInput);
      fileInput.addEventListener("change", async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const text = await f.text();
        let parsed;
        try { parsed = await classifyFile(text); }
        catch (err) { showError(err.message); return; }
        if (parsed.kind === "pack") {
          loadPack(parsed.value);
        } else {
          const data = parsed.value;
          Storage.set("pyquiz.v1.student.progress." + data.pack_id, data);
          showError("Progress saved. Upload the matching pack file to continue.");
        }
        // Reset so re-selecting the same file fires the change event again.
        fileInput.value = "";
      });
    }
    fileInput.click();
  }

  /* ---- Pack load ---- */
  function loadPack(p) {
    const ingested = Pack.ingestPack(p);
    if (!ingested.ok) {
      const first = ingested.issues.find(i => i.level === "error");
      showError("Pack has errors. " + (first ? first.message : ""));
      return;
    }
    // Leaving welcome mode — restore both side panes to whatever the
    // student's saved layout preference was. Without this, packs would
    // load with both panes still hidden.
    document.getElementById("layout").classList.remove("welcome-mode");
    pack = ingested.pack;
    document.getElementById("pack-title").textContent = pack.title || "Untitled pack";

    const key = "pyquiz.v1.student.progress." + pack.id;
    progress = Storage.get(key);
    if (!progress) {
      progress = {
        pack_id: pack.id,
        activities: {},
        current_activity_id: pack.activities[0] && pack.activities[0].id,
        score: 0
      };
      for (const act of pack.activities) {
        progress.activities[act.id] = { status: "not_started", response: null, attempts: 0, time_spent_seconds: 0, last_updated: nowISO() };
      }
      Storage.set(key, progress);
    }

    renderTaskList();
    const first = progress.current_activity_id || pack.activities[0].id;
    selectActivity(first);
  }

  function persistProgress() {
    if (!pack || !progress) return;
    Storage.set("pyquiz.v1.student.progress." + pack.id, progress);
  }

  // Group collapse state. Activities and any sections each have their
  // own toggle; sections default to collapsed.
  let activitiesCollapsed = false;
  const sectionCollapsed = {};
  // Help section open/closed state — persisted via Settings.show_help.
  // We compute the initial value lazily at first render so we don't
  // depend on Settings being initialised before this module loads.
  let helpCollapsed = false;
  function sectionIsCollapsed(id) {
    return sectionCollapsed[id] === undefined ? true : !!sectionCollapsed[id];
  }

  // Colour palette used to colour-code sections. Chosen for WCAG-AA
  // contrast as a 7px left border on the off-white pane background.
  const SECTION_COLOURS = [
    "#2D5BA6", "#1E6E3C", "#8A5A00", "#7B2D6B",
    "#0F6E84", "#A0461E", "#5B4ABF", "#7A6C09"
  ];

  // Pick a section's display colour. Honour an explicit hex override on
  // the section object; otherwise hash the section id to pick from the
  // pool. The hash is stable so the same id always lands on the same
  // colour across sessions / page loads.
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
    buildChallengeLetters();

    const sectionsRaw = Array.isArray(pack.sections) ? pack.sections : [];
    const sections = sectionsRaw.slice().sort(function (a, b) {
      const an = typeof a.number === "number" ? a.number : Infinity;
      const bn = typeof b.number === "number" ? b.number : Infinity;
      if (an !== bn) return an - bn;
      return String(a.id).localeCompare(String(b.id));
    });

    // Which section does the current activity belong to? Used to highlight
    // its group header with the section colour tint while leaving the
    // other section headers neutral.
    const currentAct = pack.activities.find(a => a.id === progress.current_activity_id);
    const currentSectionId = currentAct ? (currentAct.section_id || "__unsectioned") : null;

    // Build every activity row, keeping them in their original pack
    // order. Activities stay in their section regardless of status.
    const all = pack.activities.map((act, i) => {
      const ap = progress.activities[act.id] || { status: "not_started" };
      return { act, i, ap };
    });

    function allCorrect(items) {
      return items.length > 0 && items.every(it => it.ap.status === "correct");
    }

    if (!sections.length) {
      // No sections defined: render activities as a flat list under the
      // static "Activities" heading at the top of the pane.
      all.forEach(({ act, i, ap }) => ol.appendChild(taskItem(act, i, ap)));
    } else {
      // Sections defined: render every section that has activities in
      // section-number order. Activities stay in their section even
      // after they're marked correct.
      const byId = {};
      sections.forEach(s => byId[s.id] = []);
      const orphan = [];
      all.forEach(item => {
        const sid = item.act.section_id;
        if (sid && byId[sid]) byId[sid].push(item);
        else orphan.push(item);
      });
      // Accordion: opening a section collapses all the others. Keeps
      // the pane scannable even in long packs. Closing a section does
      // not auto-open anything.
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
      if (orphan.length) {
        ol.appendChild(makeGroup(
          { id: "__unsectioned", kicker: "Unsectioned", title: null },
          orphan,
          { collapsed: sectionIsCollapsed("__unsectioned"),
            onToggle: v => toggleSection("__unsectioned", v),
            colour: "#888",
            showCount: false,
            titleOnly: true,
            isCurrent: currentSectionId === "__unsectioned",
            complete: allCorrect(orphan) }
        ));
      }
      sections.forEach(sec => {
        const items = byId[sec.id];
        if (!items.length) return;   // hide empty sections
        const num = typeof sec.number === "number" ? sec.number : null;
        ol.appendChild(makeGroup(
          { id: sec.id, kicker: num != null ? ("Section " + num) : "Section", title: sec.title },
          items,
          { collapsed: sectionIsCollapsed(sec.id),
            onToggle: v => toggleSection(sec.id, v),
            colour: sectionColour(sec),
            showCount: false,
            isCurrent: currentSectionId === sec.id,
            complete: allCorrect(items) }
        ));
      });
    }

    let score = 0;
    for (const id of Object.keys(progress.activities)) if (progress.activities[id].status === "correct") score++;
    document.getElementById("score").textContent = score + " / " + pack.activities.length;
  }

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
    const showCount = opts.showCount !== false;
    const kickerText = (sec.kicker || "Section") + (showCount ? " " + items.length : "");
    textBlock.appendChild(DOM.el("span", { class: "group-kicker" }, kickerText));
    if (sec.title) textBlock.appendChild(DOM.el("span", { class: "group-title" }, sec.title));
    headBtn.appendChild(textBlock);
    // Section complete tick — green ✓ on the right when every activity
    // in this section has been answered correctly.
    if (opts.complete) {
      headBtn.appendChild(DOM.el("span", {
        class: "group-complete-tick",
        "aria-label": "Section complete",
        title: "All activities in this section are complete"
      }, "✓"));
      groupLi.classList.add("section-complete");
    }
    headBtn.addEventListener("click", () => opts.onToggle(!opts.collapsed));
    groupLi.appendChild(headBtn);
    const groupBody = DOM.el("ol", { class: "task-group-body" });
    items.forEach(({ act, i, ap }) => groupBody.appendChild(taskItem(act, i, ap, opts.colour)));
    groupLi.appendChild(groupBody);
    return groupLi;
  }

  function activityColour(act) {
    if (act.colour && /^#[0-9a-fA-F]{6}$/.test(act.colour)) return act.colour;
    return (PyQuiz.Constants.TYPE_COLOURS && PyQuiz.Constants.TYPE_COLOURS[act.type]) || "var(--accent)";
  }

  // Map: activity id -> challenge letter (A, B, …) for starter_challenge
  // activities. Used in the status circle only (title and badge stay
  // generic). Rebuilt at the start of every renderTaskList.
  let challengeLetters = {};
  function buildChallengeLetters() {
    challengeLetters = {};
    let i = 0;
    for (const act of pack.activities) {
      if (act.type === "starter_challenge") {
        challengeLetters[act.id] = String.fromCharCode(65 + i);
        i++;
      }
    }
  }

  function taskItem(act, i, ap, sectionColour) {
    const li = DOM.el("li");
    if (act.id === currentId) li.classList.add("current");
    const isChallenge = act.type === "starter_challenge";
    const challengeLetter = challengeLetters[act.id];
    const statusContent =
      ap.status === "correct"     ? "✓" :
      ap.status === "incorrect"   ? "✗" :
      ap.status === "in_progress" ? "…" :
      isChallenge && ap.status === "revealed"    ? challengeLetter :
      isChallenge && ap.status === "not_started" ? challengeLetter :
      ap.status === "revealed"    ? "i" :
      String(i + 1);
    const status = DOM.el("span", { class: "status " + ap.status, title: S[ap.status] || "" }, statusContent);
    const btn = DOM.el("button", {
      type: "button",
      "aria-current": act.id === currentId ? "true" : "false",
      onclick: () => selectActivity(act.id)
    }, status, DOM.el("span", { class: "task-title" }, act.title));
    // Within a section, the activity inherits the SECTION's colour so the
    // group reads as one continuous coloured stripe. Outside a section
    // (flat list), use the activity's own type colour.
    btn.style.setProperty("--activity-colour", sectionColour || activityColour(act));
    li.appendChild(btn);
    return li;
  }

  /* ---- Activity rendering ---- */
  function selectActivity(id) {
    const act = pack.activities.find(a => a.id === id);
    if (!act) return;
    currentId = id;
    progress.current_activity_id = id;
    revealedHints = 0;
    renderActivity(act);
    renderSidePanel(act);
    renderTaskList();
    persistProgress();
  }

  function renderActivity(act) {
    const main = document.getElementById("main-region");
    main.innerHTML = "";
    const wrap = DOM.el("div", { class: "activity-wrap" });

    const ap = progress.activities[act.id];

    // Header row: title + difficulty (left) and action buttons (right)
    const header = DOM.el("div", { class: "activity-header" });
    const titleBlock = DOM.el("div", { style: "flex:1;min-width:0;display:flex;align-items:center;gap:12px;flex-wrap:wrap" });
    // Type badge — small coloured chip showing the type label
    const badge = DOM.el("span", {
      class: "type-badge",
      title: "Activity type: " + (PyQuiz.Constants.TYPE_LABELS[act.type] || act.type)
    }, (PyQuiz.Constants.TYPE_LABELS[act.type] || act.type));
    badge.style.backgroundColor = activityColour(act);
    titleBlock.appendChild(badge);
    titleBlock.appendChild(DOM.el("h1", { class: "activity-title" }, act.title));
    if (act.difficulty) {
      const stars = "★".repeat(act.difficulty) + "☆".repeat(5 - act.difficulty);
      titleBlock.appendChild(DOM.el("span", { class: "difficulty-badge", title: "Difficulty " + act.difficulty + " of 5" }, stars));
    }
    header.appendChild(titleBlock);

    const actions = DOM.el("div", { class: "activity-actions" });
    const reset = DOM.button("↺", () => {
      if (currentController && currentController.reset) currentController.reset();
      ap.response = null;
      ap.status = "not_started";
      persistProgress();
      renderTaskList();
      renderSidePanel(act);
      refreshPlayButton();
    });
    reset.setAttribute("aria-label", S.reset);
    reset.setAttribute("title", S.reset);
    reset.classList.add("icon-only");

    // Single Play button: first press = check; if last check was correct
    // the next press navigates to the next activity. This replaces the
    // old separate Check / Next buttons.
    const play = DOM.button("▶", null, "primary");
    play.id = "play-btn";
    play.classList.add("icon-only");
    function refreshPlayButton() {
      const apNow = progress.activities[act.id];
      const ready = apNow && apNow.status === "correct";
      play.setAttribute("aria-label", ready ? S.next : S.check);
      play.setAttribute("title", ready ? S.next + " (the answer is correct — press again to move on)" : S.check);
      play.classList.toggle("success", ready);
      play.classList.toggle("primary", !ready);
    }
    play.addEventListener("click", playAction);
    refreshPlayButton();

    function playAction() {
      const apNow = progress.activities[act.id];
      if (apNow && apNow.status === "correct") {
        goToNext();
      } else {
        doCheck(act);
        refreshPlayButton();
      }
    }
    // Expose the most recent play action so the global Ctrl+Enter handler
    // can call it without re-binding per render.
    currentPlayAction = playAction;

    actions.appendChild(reset);
    actions.appendChild(play);
    header.appendChild(actions);
    wrap.appendChild(header);

    const meta = DOM.el("div", { class: "activity-meta" });
    if (act.estimated_time_seconds) meta.appendChild(DOM.el("span", null, "~" + Math.round(act.estimated_time_seconds / 60) + " min"));
    if (act.timing) meta.appendChild(DOM.el("span", null, "Timed: " + act.timing.limit_seconds + "s"));
    if (meta.children.length) wrap.appendChild(meta);

    if (act.context) wrap.appendChild(DOM.el("div", { class: "activity-context" }, act.context));
    if (act.instructions) wrap.appendChild(DOM.el("p", { class: "activity-instructions" }, act.instructions));

    const body = DOM.el("div", { class: "activity-body" });
    wrap.appendChild(body);

    currentController = Renderers.render(act, body, {
      onChange: function (resp) {
        const ap = progress.activities[act.id];
        ap.response = resp;
        if (ap.status === "not_started") ap.status = "in_progress";
        ap.last_updated = nowISO();
        persistProgress();
        renderTaskList();
      }
    });

    if (ap.response && currentController && currentController.setResponse) currentController.setResponse(ap.response);

    main.appendChild(wrap);
    startTimer(act);

    // Auto-focus the first input/control so the student can start
    // working immediately without clicking. Defer a tick so the layout
    // settles first.
    setTimeout(function () {
      if (currentController && typeof currentController.focus === "function") {
        try { currentController.focus(); } catch (e) {}
      }
    }, 0);
  }

  function doCheck(act) {
    if (!currentController) return;
    const resp = currentController.getResponse();
    const result = Marker.mark(act, resp);
    const ap = progress.activities[act.id];
    ap.response = resp;
    ap.attempts = (ap.attempts || 0) + 1;
    ap.status = result.status === "correct" ? "correct" : "incorrect";
    ap.last_updated = nowISO();
    persistProgress();
    renderTaskList();
    A11y.announceAssertive((result.status === "correct" ? "Correct. " : "Not quite. ") + result.feedback);
    if (currentController.highlight) currentController.highlight(result.per_part);
    renderSidePanel(act);
    if (result.status === "correct") {
      const pb = document.getElementById("play-btn");
      if (pb) pb.focus();
      // Celebrate when the student has just finished all the non-challenge
      // activities. Challenges are independent and don't count towards
      // 'completion' of the main pack content.
      const nonChallenge = pack.activities.filter(a => a.type !== "starter_challenge");
      const allDone = nonChallenge.length > 0 &&
        nonChallenge.every(a => (progress.activities[a.id] || {}).status === "correct");
      if (allDone && !progress._celebrated && PyQuiz.Confetti) {
        progress._celebrated = true;
        persistProgress();
        PyQuiz.Confetti.celebrate();
      }
    }
    maybeShowRunner(act, result.status);
  }

  /* ---- Pyodide runner panel (lives in the side panel) ---- */
  function runnerPolicy() {
    if (!pack || !pack.settings) return "correct";
    return pack.settings.show_runner_after || "correct";
  }
  function maybeShowRunner(act, statusAfterCheck) {
    if (!PyQuiz.Pyodide) return;
    const policy = runnerPolicy();
    if (policy === "never") return;
    if (policy === "correct" && statusAfterCheck !== "correct") return;
    runActivityInPyodide(act);
  }

  // Build / replace the runner section in the side panel.
  // Returns the <pre.runner-output> element so callers can update it.
  function ensureRunnerSection() {
    const sp = document.getElementById("side-panel");
    if (!sp) return null;
    // The runner lives inside the top sub-pane (.feedback-stack) so it
    // scrolls with the rest of the feedback content and the Help sub-
    // pane stays pinned to the bottom edge.
    const stack = sp.querySelector(".feedback-stack") || sp;
    let sec = stack.querySelector("section.runner-section");
    if (sec) {
      sec.innerHTML = "";
    } else {
      sec = DOM.el("section", { class: "runner-section", "aria-label": "Python output" });
      stack.appendChild(sec);
    }
    sec.appendChild(DOM.el("h3", { class: "runner-panel-title" }, "Python output"));
    const status = DOM.el("p", { class: "runner-status" }, "");
    sec.appendChild(status);
    const out = DOM.el("pre", { class: "runner-output", "aria-live": "polite" });
    sec.appendChild(out);
    return { sec: sec, status: status, out: out };
  }

  async function runActivityInPyodide(act) {
    const refs = ensureRunnerSection();
    if (!refs) return;
    const resp = currentController ? currentController.getResponse() : {};
    const code = PyQuiz.Pyodide.assemble(act, resp);
    if (!code.trim()) {
      refs.status.textContent = "(no code to run)";
      return;
    }
    refs.status.innerHTML = "";
    refs.status.appendChild(DOM.el("span", { class: "runner-spinner", "aria-hidden": "true" }));
    refs.status.appendChild(document.createTextNode(PyQuiz.Pyodide.isReady() ? "Running…" : "Loading Python…"));
    refs.out.textContent = "";
    try {
      const inputs = Array.isArray(act.runner_inputs) ? act.runner_inputs : null;
      const r = await PyQuiz.Pyodide.run(code, inputs ? { inputs: inputs } : {});
      refs.status.textContent = r.error ? "Finished with an error." : "Finished.";
      if (r.stdout) refs.out.appendChild(DOM.el("span", null, r.stdout));
      if (r.stderr) refs.out.appendChild(DOM.el("span", { class: "stderr" }, r.stderr));
      if (r.error) refs.out.appendChild(DOM.el("span", { class: "stderr" }, "\n" + r.error));
      if (!r.stdout && !r.stderr && !r.error) refs.out.textContent = "(no output)";
    } catch (e) {
      refs.status.textContent = "Could not run: " + e.message;
    }
  }

  function goToNext() {
    const ids = pack.activities.map(a => a.id);
    const idx = ids.indexOf(currentId);
    for (let i = idx + 1; i < ids.length; i++) {
      if (progress.activities[ids[i]].status !== "correct") { selectActivity(ids[i]); return; }
    }
    for (let i = 0; i < idx; i++) {
      if (progress.activities[ids[i]].status !== "correct") { selectActivity(ids[i]); return; }
    }
    showCompletion();
  }

  function showCompletion() {
    const main = document.getElementById("main-region");
    main.innerHTML = "";
    const wrap = DOM.el("div", { class: "empty-state" },
      DOM.el("h2", null, "Pack complete"),
      DOM.el("p", null, "Nice work. You can review tasks from the task list at any time."),
      DOM.el("div", { style: "margin-top:16px" },
        DOM.button("Review tasks", () => selectActivity(pack.activities[0].id), "primary")));
    main.appendChild(wrap);
  }

  /* ---- Side panel ---- */
  function renderSidePanel(act) {
    const sp = document.getElementById("side-panel");
    // Preserve the resize handle (added once by setupPaneResize) while
    // clearing the rest of the panel's content.
    const handle = sp.querySelector(".pane-resize");
    sp.innerHTML = "";
    if (handle) sp.appendChild(handle);
    // The side panel is laid out as a vertical flex column with TWO
    // visible regions:
    //   1. .feedback-stack (top, flex:1) — feedback, hints, solution,
    //      Python runner. Scrolls internally if its content overflows.
    //   2. .help-section (bottom, flex-shrink:0) — always pinned to the
    //      bottom edge of the side panel, regardless of how much
    //      content is above it.
    // Everything except the resize handle and the help-section is
    // appended to feedbackStack instead of sp directly.
    const feedbackStack = DOM.el("div", { class: "feedback-stack" });
    sp.appendChild(feedbackStack);
    const fbSec = DOM.el("section");
    fbSec.appendChild(DOM.h3(S.feedback));
    const fbBody = DOM.el("div", { id: "feedback-body", class: "live-region", "aria-live": "polite" });
    fbSec.appendChild(fbBody);
    feedbackStack.appendChild(fbSec);
    const ap = progress.activities[act.id];
    if (ap && (ap.status === "correct" || ap.status === "incorrect")) {
      const fb = act.feedback || {};
      const text = ap.status === "correct" ? (fb.correct || S.correctDefault) : (fb.incorrect || S.incorrectDefault);
      fbBody.appendChild(DOM.el("div", { class: "feedback " + ap.status }, text));
    }

    if (Array.isArray(act.hints) && act.hints.length) {
      const hsec = DOM.el("section");
      const heading = DOM.el("div", { class: "section-heading-row" });
      heading.appendChild(DOM.el("h3", { style: "margin:0" }, "Hints"));
      const counter = DOM.el("span", { class: "hint-counter" },
        act.hints.length + (act.hints.length === 1 ? " hint available" : " hints available"));
      heading.appendChild(counter);
      hsec.appendChild(heading);
      const hintHost = DOM.el("div");
      hsec.appendChild(hintHost);
      const btn = DOM.button("💡 " + S.showHint, null);
      btn.classList.add("hint-btn");
      btn.addEventListener("click", () => {
        if (revealedHints >= act.hints.length) return;
        hintHost.appendChild(DOM.el("div", { class: "hint" }, act.hints[revealedHints]));
        revealedHints++;
        // Update the counter so the student always knows how many are
        // left without having to track in their head.
        const left = act.hints.length - revealedHints;
        counter.textContent = revealedHints + " of " + act.hints.length + " revealed"
          + (left > 0 ? (" — " + left + " left") : "");
        if (revealedHints >= act.hints.length) btn.disabled = true;
      });
      hsec.appendChild(btn);
      feedbackStack.appendChild(hsec);
    }

    const policy = (pack.settings && pack.settings.show_solutions_after) || "submission";
    const ap2 = progress.activities[act.id];
    const canReveal = policy === "submission" || (policy === "correct_only" && ap2.status === "correct");
    const hasSolution = act.solution_explanation || (act.type === "starter_challenge" && act.payload && act.payload.model_solution);
    if (hasSolution && policy !== "never" && canReveal) {
      const ssec = DOM.el("section");
      ssec.appendChild(DOM.h3("Solution"));
      // 3-press reveal: yellow → orange → red → reveals. Makes peeking a
      // deliberate act rather than an accident, regardless of activity type.
      const solBox = DOM.el("div", { hidden: "" });
      if (act.solution_explanation) solBox.appendChild(DOM.el("p", null, act.solution_explanation));
      if (act.type === "starter_challenge" && act.payload.model_solution) {
        const pre = DOM.el("pre", { class: "code-block", style: "font-family:var(--font-mono)" });
        pre.textContent = act.payload.model_solution;
        solBox.appendChild(pre);
      }

      let presses = 0;
      const revealBtn = DOM.button(S.revealSolution, null);
      revealBtn.classList.add("reveal-btn");
      const updateBtn = function () {
        revealBtn.classList.remove("stage-1", "stage-2", "stage-3");
        if (!solBox.hasAttribute("hidden")) { revealBtn.textContent = "Hide solution"; return; }
        if (presses === 0) { revealBtn.textContent = S.revealSolution; }
        else if (presses === 1) { revealBtn.classList.add("stage-1"); revealBtn.textContent = "Sure? Press again."; }
        else if (presses === 2) { revealBtn.classList.add("stage-2"); revealBtn.textContent = "Really sure? Press once more."; }
        else { revealBtn.classList.add("stage-3"); }
      };
      updateBtn();
      revealBtn.addEventListener("click", () => {
        if (solBox.hasAttribute("hidden")) {
          presses++;
          if (presses >= 3) {
            solBox.removeAttribute("hidden");
            const ap3 = progress.activities[act.id];
            if (ap3.status !== "correct") ap3.status = "revealed";
            persistProgress();
            renderTaskList();
          }
          updateBtn();
        } else {
          solBox.setAttribute("hidden", "");
          presses = 0;
          updateBtn();
        }
      });
      ssec.appendChild(revealBtn);
      ssec.appendChild(solBox);
      feedbackStack.appendChild(ssec);
    }

    // Per-type help — generic tips that apply to every activity of this
    // type. Sticks to the bottom of the side panel, collapsible via a
    // disclosure triangle, open by default. The collapsed state persists
    // across activities so the student's preference is respected.
    // The tip strings are trusted (PyQuiz.Strings, not from any pack)
    // so we render them as HTML to support the <kbd> shortcut pills.
    const tips = (S.help && S.help[act.type]) || [];
    if (tips.length) {
      const helpSec = DOM.el("details", { class: "help-section" });
      if (!helpCollapsed) helpSec.setAttribute("open", "");
      const sum = DOM.el("summary");
      sum.appendChild(DOM.el("span", { class: "help-summary-text" }, "Help"));
      const counter = DOM.el("span", { class: "help-summary-count" },
        tips.length + " " + (tips.length === 1 ? "tip" : "tips"));
      sum.appendChild(counter);
      helpSec.appendChild(sum);
      const ul = DOM.el("ul", { class: "help-list" });
      tips.forEach(t => {
        const li = DOM.el("li");
        li.innerHTML = t;
        ul.appendChild(li);
      });
      helpSec.appendChild(ul);
      helpSec.addEventListener("toggle", function () {
        helpCollapsed = !helpSec.open;
        Settings.update({ show_help: !helpCollapsed });
      });
      sp.appendChild(helpSec);
    }
  }

  /* ---- Timer ---- */
  function startTimer(act) {
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
    if (!act.timing) return;
    let remaining = act.timing.limit_seconds;
    const label = DOM.el("div", { class: "kbd-help", id: "timer-label", style: "position:sticky;top:0" }, "Time: " + fmt(remaining));
    document.querySelector(".activity-meta").appendChild(label);
    function fmt(s) { const m = Math.floor(s / 60); const r = s % 60; return m + ":" + String(r).padStart(2, "0"); }
    timerHandle = setInterval(() => {
      remaining--;
      label.textContent = "Time: " + fmt(remaining);
      if (remaining <= 0) {
        clearInterval(timerHandle);
        timerHandle = null;
        A11y.announceAssertive("Time is up.");
        if (act.timing.on_expire === "submit") doCheck(act);
        else if (act.timing.on_expire === "lock") {
          document.querySelectorAll(".activity-body input, .activity-body button, .activity-body select, .activity-body textarea")
            .forEach(e => e.disabled = true);
        }
      }
    }, 1000);
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
    document.getElementById("size-up").addEventListener("click", () => Settings.bumpSize(1));
    document.getElementById("size-down").addEventListener("click", () => Settings.bumpSize(-1));
    document.getElementById("theme-btn").addEventListener("click", () => Settings.cycleTheme());
    document.getElementById("settings-btn").addEventListener("click", () => Settings.openDialog({ showLayoutDefaults: true }));
    document.getElementById("load-btn").addEventListener("click", openLoadDialog);
    document.getElementById("export-btn").addEventListener("click", exportProgress);

    setupPaneResize();

    const s = Settings.get();
    if (s.tl === "collapsed") document.getElementById("layout").classList.add("tl-collapsed");
    if (s.sp === "collapsed") document.getElementById("layout").classList.add("sp-collapsed");
    if (s.tl_width) document.getElementById("layout").style.setProperty("--tl-w", s.tl_width + "px");
    if (s.sp_width) document.getElementById("layout").style.setProperty("--sp-w", s.sp_width + "px");
  }

  function setupPaneResize() {
    DOM.setupPaneResize({
      persist: function (key, width) {
        const patch = {};
        patch[key] = width;
        Settings.update(patch);
      }
    });
  }

  function exportProgress() {
    if (!progress) { showError("No progress to export."); return; }
    DOM.download((pack ? pack.id : "pyquiz") + "-progress.json", JSON.stringify(progress, null, 2), "application/json");
  }

  /* ---- Init ---- */
  function bindKeyboardShortcuts() {
    document.addEventListener("keydown", function (ev) {
      // Ctrl+Enter (or Cmd+Enter on Mac) acts as the Play button — it
      // checks the current activity, or moves to the next if the last
      // check was correct. Works from anywhere on the page, including
      // text inputs, so the student doesn't have to break their flow to
      // click. Shift+Enter inside textareas is still a newline as normal.
      if (ev.key !== "Enter") return;
      if (!(ev.ctrlKey || ev.metaKey)) return;
      if (typeof currentPlayAction !== "function") return;
      ev.preventDefault();
      currentPlayAction();
    });
  }

  async function init() {
    maybeShowStorageBanner();
    bindTopBar();
    bindKeyboardShortcuts();
    // Sync persisted help-section preference into local state.
    helpCollapsed = Settings.get().show_help === false;
    // Preload Pyodide in the background so the first run after a correct
    // answer doesn't make the student wait. Failures here are silent;
    // the runner will surface the error if it's actually used.
    if (PyQuiz.Pyodide) PyQuiz.Pyodide.load().catch(() => {});
    if (location.hash && location.hash.startsWith("#pack=")) {
      const encoded = decodeURIComponent(location.hash.slice(6));
      if (encoded.length > 8192) {
        showError("URL fragment exceeds 8 KB cap. Use upload or paste instead.");
        showLoader();
        return;
      }
      try {
        const p = await Codec.decode(encoded);
        loadPack(p);
        return;
      } catch (e) {
        showError("Failed to load pack from URL: " + e.message);
      }
    }
    showLoader();
  }

  PyQuiz.StudentApp = { init: init, loadPack: loadPack };
  document.addEventListener("DOMContentLoaded", init);
})();
