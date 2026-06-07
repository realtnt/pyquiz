/* === inlined from js/apps/student.js === */
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
  let currentRefreshPlay = null;
  let currentResetBtn = null;
  let currentConfidencePicker = () => null;
  /* Disable the per-activity reset button (anti-cheat). Called both at render
     time for already-terminal activities and live from doCheck the moment a
     correct answer or final wrong attempt lands. */
  function lockReset() {
    const r = currentResetBtn;
    if (!r) return;
    r.disabled = true;
    r.setAttribute("aria-disabled", "true");
    r.setAttribute("title", "Locked — this activity has been answered. Clear progress in Settings if you need to start over.");
  }
  /* The current pack's attempts cap. Returns Infinity when unlimited.
     Read in doCheck and in refreshPlayButton. */
  function attemptsCap() {
    const s = (pack && pack.settings) || {};
    const v = s.attempts_per_activity;
    if (v == null || v === 0) return Infinity;
    return Number(v) || Infinity;
  }
  /* Whether the pack is in sequential mode. */
  function isSequential() {
    return !!(pack && pack.settings && pack.settings.sequential);
  }
  /* Is the given activity terminal — correct or failed? */
  function isTerminal(ap) {
    return ap && (ap.status === "correct" || ap.status === "failed");
  }
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
    if (layout) layout.classList.add("welcome-mode");
    /* Also tag the body so CSS can hide the topbar burgers — those
       toggle the side panes, which are collapsed in welcome mode, so
       the buttons would be no-ops. */
    document.body.classList.add("welcome-mode");

    const wrap = DOM.el("div", { class: "welcome" });

    // Hero
    const hero = DOM.el("section", { class: "welcome-hero" });
    hero.appendChild(DOM.el("div", { class: "welcome-logo", "aria-hidden": "true" }, "P"));
    hero.appendChild(DOM.el("h1", { class: "welcome-title" }, "PyQuiz"));
    hero.appendChild(DOM.el("p", { class: "welcome-tagline" },
      "A Python practice tool for computing teachers. Build your own packs of bite-sized activities, structured the way you teach — and let your students work through them at their own pace, with instant feedback."));
    const heroAction = DOM.el("div", { class: "welcome-cta welcome-cta-row" });
    const cta = DOM.button("📂  Load a pack", () => {
      document.getElementById("load-btn").click();
    }, "primary");
    cta.classList.add("big", "welcome-btn-load");
    const createCta = DOM.button("✎  Create your own", () => {
      window.open("../teacher/index.html", "_blank");
    }, "primary");
    createCta.classList.add("big", "welcome-btn-create");
    heroAction.appendChild(cta);
    heroAction.appendChild(createCta);
    hero.appendChild(heroAction);
    wrap.appendChild(hero);

    /* Pack chooser — fetched from packs/index.json (the manifest). Static
       sites have no directory listing, so the manifest is the source of
       truth. Grouped by level. Falls back silently if absent (e.g. when
       the app is opened as a bare file with no packs folder alongside). */
    const chooser = DOM.el("section", { class: "welcome-chooser" });
    chooser.appendChild(DOM.el("h2", { class: "welcome-chooser-h" }, "Choose an activity pack"));
    const chooserBody = DOM.el("div", { class: "welcome-chooser-body" });
    chooserBody.appendChild(DOM.el("p", { class: "welcome-chooser-loading" }, "Loading packs\u2026"));
    chooser.appendChild(chooserBody);
    wrap.appendChild(chooser);

    (function loadManifest() {
      // Resolve packs/ relative to the app folder (…/student/ → …/packs/).
      if (typeof fetch !== "function") { showChooser(null); return; }
      const candidates = ["../packs/index.json", "packs/index.json"];
      let idx = 0;
      function tryNext() {
        if (idx >= candidates.length) { showChooser(null); return; }
        const url = candidates[idx++];
        fetch(url, { cache: "no-cache" })
          .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
          .then(m => showChooser(m, url))
          .catch(() => tryNext());
      }
      tryNext();
    })();

    function showChooser(manifest, url) {
      chooserBody.innerHTML = "";
      const packs = manifest && Array.isArray(manifest.packs) ? manifest.packs : [];
      if (!packs.length) {
        // No manifest reachable — hide the chooser heading and lean on the
        // built-in cards + Load button below.
        chooser.style.display = "none";
        return;
      }
      const base = url ? url.replace(/index\.json$/, "") : "../packs/";
      const groups = {};
      packs.forEach(p => { (groups[p.level || "Other"] = groups[p.level || "Other"] || []).push(p); });
      const order = ["Ages 11–14", "Ages 14–16", "Ages 16–19", "Other"];
      order.filter(k => groups[k]).forEach(level => {
        const g = DOM.el("div", { class: "welcome-chooser-group" });
        g.appendChild(DOM.el("div", { class: "welcome-chooser-level" }, level));
        const grid = DOM.el("div", { class: "welcome-builtin-grid" });
        groups[level].forEach(p => {
          const card = DOM.el("button", { type: "button", class: "welcome-builtin-card", "aria-label": "Load pack: " + p.title });
          card.appendChild(DOM.el("div", { class: "welcome-builtin-card-title" }, p.title));
          card.appendChild(DOM.el("div", { class: "welcome-builtin-card-desc" }, p.description || ""));
          const meta = [];
          if (p.activities) meta.push(p.activities + " activities");
          if (p.sections) meta.push(p.sections + " sections");
          if (meta.length) card.appendChild(DOM.el("div", { class: "welcome-chooser-meta" }, meta.join(" \u00b7 ")));
          card.addEventListener("click", () => loadPackFromUrl(base + p.file, card));
          grid.appendChild(card);
        });
        g.appendChild(grid);
        chooserBody.appendChild(g);
      });
    }

    function loadPackFromUrl(url, card) {
      if (card) { card.disabled = true; card.classList.add("is-loading"); }
      fetch(url, { cache: "no-cache" })
        .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
        .then(async text => {
          // Packs ship as .pyquiz (encoded) or plain .json.
          let pack = null;
          const trimmed = (text || "").trim();
          if (trimmed.indexOf("v1.") === 0 && PyQuiz.Codec && PyQuiz.Codec.decode) {
            pack = await PyQuiz.Codec.decode(trimmed);
          } else {
            pack = JSON.parse(trimmed);
          }
          if (PyQuiz.Pack && PyQuiz.Pack.ingestPack) {
            const r = PyQuiz.Pack.ingestPack(pack);
            if (r.ok) pack = r.pack; else { throw new Error("Pack failed validation."); }
          }
          loadPack(pack);
        })
        .catch(err => {
          if (card) { card.disabled = false; card.classList.remove("is-loading"); }
          console.error("Could not load pack:", url, err);
          alert("Sorry — that pack could not be loaded.");
        });
    }

    /* Built-in packs — bundled with the app for testing and quick demos.
       This section is intentionally easy to hide later by emptying
       PyQuiz.BuiltInPacks.list (or removing the inlined module). */
    if (PyQuiz.BuiltInPacks && Array.isArray(PyQuiz.BuiltInPacks.list) && PyQuiz.BuiltInPacks.list.length) {
      const built = DOM.el("section", { class: "welcome-builtin" });
      built.appendChild(DOM.el("p", { class: "welcome-builtin-title" }, "Start with a built-in pack:"));
      const grid = DOM.el("div", { class: "welcome-builtin-grid" });
      PyQuiz.BuiltInPacks.list.forEach(meta => {
        const card = DOM.el("button", {
          type: "button",
          class: "welcome-builtin-card",
          "data-pack-id": meta.id,
          "aria-label": "Load built-in pack: " + meta.title
        });
        card.appendChild(DOM.el("div", { class: "welcome-builtin-card-title" }, meta.title));
        card.appendChild(DOM.el("div", { class: "welcome-builtin-card-desc" }, meta.description || ""));
        card.addEventListener("click", () => {
          const pack = PyQuiz.BuiltInPacks.get(meta.id);
          if (!pack) {
            console.error("Built-in pack failed to build:", meta.id);
            return;
          }
          loadPack(pack);
        });
        grid.appendChild(card);
      });
      built.appendChild(grid);
      wrap.appendChild(built);
    }


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
        icon: "♿",
        title: "Accessible by default",
        desc: "Atkinson Hyperlegible or OpenDyslexic typefaces, adjustable size, high-contrast theme, full keyboard support and aria-live announcements. Designed with younger readers in mind."
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
    types.appendChild(DOM.el("h2", null, "Eight activity types"));
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
        value: "Targets specific syntactic elements (a keyword, an operator, a function name) in isolation. Useful for key-term recall.",
        sample: "for i in ____(5):\n    ____(i)"
      },
      {
        type: "trace_table",
        title: "Trace table",
        desc: "Step through a program line by line and record how each variable changes.",
        value: "Builds a precise mental model of how code executes. A transferable skill across courses and qualifications.",
        sample: "  i  x  out\n  0  0\n  1  1"
      },
      {
        type: "testing",
        title: "Testing",
        desc: "Design a table of test cases — Normal, Boundary, Invalid and Erroneous — for a function. Leave cells blank for the student to complete.",
        value: "Test design appears in many computing courses. Students classify inputs and reason about edge cases — a skill that's hard to practise with code-writing alone.",
        sample: "name   type   expected\n\"Sam\"  normal  Hi, Sam\n\"\"     bound.  Hi, "
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
  function loadPack(p, opts) {
    opts = opts || {};
    const ingested = Pack.ingestPack(p);
    // Server packs are answer-stripped (the answers never leave the backend),
    // so the client validator — which requires answers — would reject them.
    // They are already validated server-side on publish, hence `trusted`.
    if (!ingested.ok && !opts.trusted) {
      const first = ingested.issues.find(i => i.level === "error");
      showError("Pack has errors. " + (first ? first.message : ""));
      return;
    }
    // Leaving welcome mode — restore both side panes to whatever the
    // student's saved layout preference was. Without this, packs would
    // load with both panes still hidden.
    var _lay = document.getElementById("layout"); if (_lay) _lay.classList.remove("welcome-mode");
    document.body.classList.remove("welcome-mode");
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
        const focused = !!(pack && pack.settings && pack.settings.focused);
        if (!willCollapse) {
          if (focused) {
            // Focused mode: opening a section closes all the others.
            const known = new Set(["__unsectioned"]);
            sections.forEach(s => known.add(s.id));
            known.forEach(k => { sectionCollapsed[k] = (k !== id); });
          } else {
            // Free mode: just open this one, leave the rest as they are.
            sectionCollapsed[id] = false;
          }
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
    let attempted = 0;
    for (const id of Object.keys(progress.activities)) {
      const ap = progress.activities[id];
      if (ap.status === "correct") score++;
      if (ap.status === "correct" || ap.status === "failed") attempted++;
    }
    const total = pack.activities.length;
    const scoreEl = document.getElementById("score");
    if (scoreEl) scoreEl.textContent = score + " / " + total;
    const fillEl = document.getElementById("task-list-progress-fill");
    if (fillEl) {
      const pct = total ? Math.round((attempted / total) * 100) : 0;
      fillEl.style.width = pct + "%";
      fillEl.classList.toggle("complete", attempted === total && total > 0);
    }
    try { renderCarousel(); } catch (e) {}
  }

  /* ---- Carousel (top activity tape) ---- */
  function renderCarousel() {
    const tape = document.getElementById("tape");
    if (!tape || !pack) return;
    const acts = pack.activities || [];
    // Build the tokens ONCE per pack so navigation only toggles classes —
    // that lets the CSS transitions animate (slide, turn purple, expand)
    // instead of re-creating elements in their final state each time.
    if (tape.dataset.packId !== pack.id || tape.childElementCount !== acts.length) {
      tape.dataset.packId = pack.id;
      tape.innerHTML = "";
      acts.forEach((a, i) => {
        const tok = DOM.el("button", {
          class: "sk-tok", type: "button", role: "tab", "data-id": a.id,
          title: (i + 1) + ". " + (a.title || a.type)
        });
        tok.appendChild(DOM.el("span", { class: "num", "aria-hidden": "true" }, String(i + 1)));
        tok.appendChild(DOM.el("span", { class: "lab" }, a.title || (PyQuiz.Constants.TYPE_LABELS[a.type] || a.type)));
        tok.addEventListener("click", () => selectActivity(a.id));
        tape.appendChild(tok);
      });
    }
    // Update current / done state on the existing tokens (animates).
    acts.forEach((a, i) => {
      const ap = progress.activities[a.id] || {};
      const tok = tape.children[i];
      if (!tok) return;
      const isCur = a.id === currentId;
      tok.classList.toggle("current", isCur);
      tok.classList.toggle("done", ap.status === "correct");
      tok.classList.toggle("failed", ap.status === "failed");
      tok.setAttribute("aria-selected", isCur ? "true" : "false");
    });
    // Centre now, and again once the current token has finished expanding
    // so the final (wider) token lands dead-centre.
    requestAnimationFrame(centreCarousel);
    setTimeout(centreCarousel, 340);
    const curIdx = acts.findIndex(a => a.id === currentId);
    const prev = document.getElementById("nav-prev"), next = document.getElementById("nav-next");
    if (prev) prev.disabled = curIdx <= 0;
    if (next) next.disabled = curIdx < 0 || curIdx >= acts.length - 1;
    try { renderScoreBar(); } catch (e) {}
  }

  function centreCarousel() {
    const tape = document.getElementById("tape");
    const dock = document.getElementById("dock");
    if (!tape || !dock) return;
    const cur = tape.querySelector(".sk-tok.current");
    if (!cur) { tape.style.transform = "translateX(0)"; return; }
    const x = dock.clientWidth / 2 - (cur.offsetLeft + cur.offsetWidth / 2);
    tape.style.transform = "translateX(" + x + "px)";
  }

  /* Thin segmented score bar in the drawer: one segment per activity,
     green = correct, red = failed (out of attempts), grey = not answered,
     with "correct / total" at the end. */
  function renderScoreBar() {
    const track = document.getElementById("sk-score-track");
    const num = document.getElementById("sk-score-num");
    if (!track || !pack) return;
    const acts = pack.activities || [];
    if (track.childElementCount !== acts.length) {
      track.innerHTML = "";
      acts.forEach(() => track.appendChild(DOM.el("i")));
    }
    let correct = 0;
    acts.forEach((a, i) => {
      const ap = progress.activities[a.id] || {};
      const seg = track.children[i];
      if (!seg) return;
      seg.classList.toggle("ok", ap.status === "correct");
      seg.classList.toggle("bad", ap.status === "failed");
      if (ap.status === "correct") correct++;
    });
    if (num) num.textContent = correct + "/" + acts.length;
  }

  function carouselStep(dir) {
    if (!pack) return;
    const acts = pack.activities || [];
    const i = acts.findIndex(a => a.id === currentId);
    const j = Math.max(0, Math.min(acts.length - 1, (i < 0 ? 0 : i) + dir));
    if (acts[j]) selectActivity(acts[j].id);
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
    const C = PyQuiz.Constants;
    const li = DOM.el("li", { class: "task-row" });
    if (act.id === currentId) li.classList.add("current");
    const isChallenge = act.type === "starter_challenge";
    const challengeLetter = challengeLetters[act.id];
    /* Status icons:
         correct   → ✓ (green, scored)
         failed    → ✗ (red, out of attempts, NOT scored)
         incorrect → small ✗ (still has attempts — transitional)
         else      → activity number */
    const statusContent =
      ap.status === "correct"     ? "✓" :
      ap.status === "failed"      ? "✗" :
      ap.status === "incorrect"   ? "✗" :
      ap.status === "in_progress" ? "…" :
      isChallenge && ap.status === "revealed"    ? challengeLetter :
      isChallenge && ap.status === "not_started" ? challengeLetter :
      ap.status === "revealed"    ? "i" :
      String(i + 1);
    const status = DOM.el("span", {
      class: "status " + ap.status +
        (isChallenge && (ap.status === "not_started" || ap.status === "revealed") ? " status-challenge" : ""),
      title: S[ap.status] || ap.status
    }, statusContent);
    /* Sequential lock indicator: items past the first non-terminal one
       are locked. Marker is added later once we know the position. */
    // Small abbreviated type pill — uses the activity-type's default
    // colour (NOT the section colour) so the kind of activity is
    // glanceable even within a uniformly-coloured section. Three
    // letters keep it unobtrusive in a narrow pane; the long label is
    // exposed via the title attribute for screen readers and hover.
    const typeColour = (C.TYPE_COLOURS && C.TYPE_COLOURS[act.type]) || "var(--accent)";
    const typeLabel  = (C.TYPE_LABELS  && C.TYPE_LABELS[act.type])  || act.type;
    const typeAbbrev = (C.TYPE_ABBREV  && C.TYPE_ABBREV[act.type])  || typeLabel.slice(0, 3).toLowerCase();
    const pill = DOM.el("span", { class: "type-pill type-pill-abbrev", title: typeLabel }, typeAbbrev);
    pill.style.backgroundColor = typeColour;
    const btn = DOM.el("button", {
      type: "button",
      "aria-current": act.id === currentId ? "true" : "false",
      onclick: () => selectActivity(act.id)
    }, status, DOM.el("span", { class: "task-title" }, act.title), pill);
    /* Sequential lock: greyed-out + disabled. Tagged with a class so the
       task-list rendering pass can add a 🔒 indicator. */
    if (isSequential()) {
      const ids = pack.activities.map(a => a.id);
      let firstOpen = ids.length;
      for (let k = 0; k < ids.length; k++) {
        if (!isTerminal(progress.activities[ids[k]])) { firstOpen = k; break; }
      }
      if (i > firstOpen) {
        btn.disabled = true;
        btn.classList.add("task-locked");
        btn.title = "Locked — finish the current activity to unlock this one";
        // Replace the status numeral with a lock glyph
        status.textContent = "🔒";
      }
    }
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
    /* Sequential gating: in sequential mode, the student can only open
       activities up to and including the first non-terminal one. */
    if (isSequential()) {
      const ids = pack.activities.map(a => a.id);
      const targetIdx = ids.indexOf(id);
      let firstOpen = ids.length;
      for (let i = 0; i < ids.length; i++) {
        if (!isTerminal(progress.activities[ids[i]])) { firstOpen = i; break; }
      }
      if (targetIdx > firstOpen) {
        // Locked — silently refuse navigation. Task list rendering also
        // disables these items so this is a defensive guard.
        return;
      }
    }
    currentId = id;
    progress.current_activity_id = id;
    revealedHints = 0;
    // New activity always opens on the Brief tab.
    _activeDrawerTab = "brief";
    // Clear any open hint/solution post-it notes from the previous activity.
    try { const nl = document.getElementById("notes"); if (nl) nl.innerHTML = ""; } catch (e) {}
    try { _closeSolutionNote && _closeSolutionNote(); } catch (e) {}
    try { const hb = document.getElementById("hint-btn"); if (hb) hb.classList.remove("on"); } catch (e) {}
    /* Make sure the section containing this activity is open in the task
       list. In focused mode, opening it closes the others; in free mode
       the others are left as the student had them. This is what makes
       "advance to next section" auto-close the old one and open the new. */
    ensureSectionOpen(act.section_id || "__unsectioned");
    renderActivity(act);
    renderSidePanel(act);
    renderTaskList();
    persistProgress();
  }

  /* Open the given section in the task list. Honours the pack's focused
     setting: when focused, all other sections are collapsed. */
  function ensureSectionOpen(sectionId) {
    const focused = !!(pack && pack.settings && pack.settings.focused);
    if (focused) {
      const known = new Set(["__unsectioned"]);
      (pack.sections || []).forEach(s => known.add(s.id));
      known.add(sectionId);
      known.forEach(k => { sectionCollapsed[k] = (k !== sectionId); });
    } else {
      sectionCollapsed[sectionId] = false;
    }
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

    /* Copy-code icon button — sits LEFT of the Reset button so it sits
       on the outermost edge of the action group. Starter-challenge
       activities have their own larger "Copy code" button beneath the
       starter code box, so we skip the header icon there to avoid two
       buttons that do similar things. */
    /* Copy-code is only meaningful for activities that have code to take
       to an IDE. Flowcharts and testing tables have no source to copy, so
       the button is omitted entirely for them. Starter challenges have
       their own Copy button under the code box. */
    const COPYABLE = { parsons: 1, cloze: 1, spot_the_bug: 1, modify: 1, trace_table: 1, predict_output: 1 };
    if (COPYABLE[act.type]) {
      const copy = DOM.el("button", {
        type: "button",
        class: "btn icon-only",
        "aria-label": "Copy code",
        title: "Copy code"
      });
      /* 📋 clipboard emoji — small, instantly recognisable, no extra
         icon asset needed and works across all themes including HC. */
      copy.textContent = "📋";
      let resetTimer = null;
      copy.addEventListener("click", async function () {
        /* Copy the CURRENT state of the activity, not the canonical answer:
           assemble from the live controller response so any edits the
           student has made are reflected. If they've solved it that's the
           correct code; if not it's their work in progress. Falls back to
           codeForCopy when there's no response yet (fresh activity). */
        let code = "";
        try {
          const resp = currentController && currentController.getResponse
            ? currentController.getResponse() : null;
          if (resp && PyQuiz.Code && PyQuiz.Code.assemble) {
            code = PyQuiz.Code.assemble(act, resp);
          }
        } catch (e) { /* fall through to canonical */ }
        if (!code) {
          code = (PyQuiz.Code && PyQuiz.Code.codeForCopy) ? PyQuiz.Code.codeForCopy(act) : "";
        }
        if (!code) return;
        try {
          await navigator.clipboard.writeText(code);
        } catch (e) {
          /* Older browser fallback: textarea + execCommand. */
          const ta = document.createElement("textarea");
          ta.value = code; document.body.appendChild(ta);
          ta.select(); try { document.execCommand("copy"); } catch (er) {}
          document.body.removeChild(ta);
        }
        copy.textContent = "✓";
        copy.classList.add("success");
        if (resetTimer) clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          copy.textContent = "📋";
          copy.classList.remove("success");
        }, 1200);
      });
      actions.appendChild(copy);
    }

    const reset = DOM.button("↺", () => {
      if (currentController && currentController.reset) currentController.reset();
      ap.response = null;
      ap.status = "not_started";
      ap.attempts = 0;
      try { lockActivityBody(false); } catch (e) {}
      persistProgress();
      renderTaskList();
      /* Re-render the whole activity so a previously locked/solution-filled
         flowchart returns to a fresh, editable state. */
      selectActivity(act.id);
    });
    reset.setAttribute("aria-label", S.reset);
    reset.setAttribute("title", S.reset);
    reset.classList.add("icon-only");
    currentResetBtn = reset;
    /* Lock the reset button once the outcome is terminal — a correct answer
       or running out of attempts (e.g. a second wrong answer). A single wrong
       answer with attempts still remaining keeps reset available so the
       student can clear and retry. Progress can always be cleared from
       Settings. lockReset() is also called live from doCheck so the button
       disables the instant the outcome happens, not only on re-entry. */
    if (ap.status === "correct" || ap.status === "failed") {
      lockReset();
    }

    // Single Play button: first press = check; if last check was correct
    // the next press navigates to the next activity. This replaces the
    // old separate Check / Next buttons.
    const play = DOM.button("▶", null, "primary");
    play.id = "play-btn";
    play.classList.add("icon-only");
    function refreshPlayButton() {
      const apNow = progress.activities[act.id];
      const ready = isTerminal(apNow);  // correct OR failed both let the student move on
      play.setAttribute("aria-label", ready ? S.next : S.check);
      const tip = ready
        ? (apNow.status === "correct"
            ? S.next + " (correct — press to move on)"
            : S.next + " (out of attempts — press to move on)")
        : S.check;
      play.setAttribute("title", tip);
      play.classList.toggle("success", apNow && apNow.status === "correct");
      play.classList.toggle("failed",  apNow && apNow.status === "failed");
      play.classList.toggle("primary", !ready);
      /* Disable the button if we've used our attempts and the student
         hasn't yet pressed it to move on — keeps the visual cue but
         prevents accidental re-checks. */
      play.disabled = false;
    }
    play.addEventListener("click", playAction);
    refreshPlayButton();

    /* Holds the most recent confidence selection (null until the modal
       sets it). The picker closure declared just below this comment
       exposes the current value to doCheck via currentConfidencePicker. */
    let pickedConfidence = null;
    currentConfidencePicker = () => pickedConfidence;

    function playAction() {
      const apNow = progress.activities[act.id];
      if (isTerminal(apNow)) {
        goToNext();
        return;
      }
      /* Reset confidence between attempts so the modal asks again each
         time the student presses Check. */
      pickedConfidence = null;
      if (pack.settings && pack.settings.ask_confidence) {
        showConfidenceModal(level => {
          pickedConfidence = level;  // null when dismissed/skipped
          doCheck(act);
          refreshPlayButton();
        });
      } else {
        doCheck(act);
        refreshPlayButton();
      }
    }

    /* The modal. Built fresh per call. Calls onProceed with a level
       (low|medium|high) or null when the student skipped or dismissed.
       The check is always run afterwards — making the dialog feel like
       a friendly extra step rather than a gate. */
    function showConfidenceModal(onProceed) {
      const body = DOM.el("div", { class: "confidence-modal-body" });
      body.appendChild(DOM.el("p", { class: "confidence-modal-prompt" },
        "Before checking — how confident are you in your answer?"));
      body.appendChild(DOM.el("p", { class: "confidence-modal-help" },
        "Your choice is optional and never affects marking. Teachers use these to spot misconceptions and fragile understanding."));

      const opts = [
        { level: "low",    label: "Low",    desc: "Just guessing" },
        { level: "medium", label: "Medium", desc: "Fairly sure"   },
        { level: "high",   label: "High",   desc: "Confident"     }
      ];
      const grid = DOM.el("div", { class: "confidence-modal-options" });
      let proceeded = false;
      let pickedLevel = null;
      let modalRef;
      function pick(level) {
        if (proceeded) return;
        proceeded = true;
        pickedLevel = level;
        modalRef.close();
      }
      opts.forEach(o => {
        const btn = DOM.el("button", {
          type: "button",
          class: "confidence-modal-option confidence-option-" + o.level,
          "aria-label": o.label + " — " + o.desc
        });
        btn.appendChild(DOM.el("div", { class: "confidence-option-label" }, o.label));
        btn.appendChild(DOM.el("div", { class: "confidence-option-desc" }, o.desc));
        btn.addEventListener("click", () => pick(o.level));
        grid.appendChild(btn);
      });
      body.appendChild(grid);

      const footer = DOM.el("div", { class: "modal-footer" });
      const skipBtn = DOM.button("Skip", () => pick(null), "ghost");
      footer.appendChild(skipBtn);

      modalRef = PyQuiz.Modal.open({
        title: "How confident are you?",
        body: body,
        footer: footer,
        maxWidth: "520px",
        dismissible: true,
        onClose: function () { onProceed(pickedLevel); }
      });
    }
    // Expose the most recent play action so the global Ctrl+Enter handler
    // can call it without re-binding per render.
    currentPlayAction = playAction;
    /* Expose for the onChange callback (defined ABOVE this block)
       so it can flip the button back to "Check" when the student
       modifies a previously-correct response. */
    currentRefreshPlay = refreshPlayButton;

    /* Confidence rating is now a modal triggered from playAction (see
       above). The selection is held in pickedConfidence (declared in
       the playAction closure region) and exposed via currentConfidencePicker
       so doCheck can record it. The modal renders only when the pack
       has settings.ask_confidence === true. */
    actions.appendChild(reset);
    actions.appendChild(play);
    header.appendChild(actions);
    wrap.appendChild(header);

    /* Title, difficulty stars, timing and instructions are intentionally
       NOT shown in the work area — the drawer Brief pane carries the
       instructions, and the header is kept only to host the Reset/Play
       proxies the bottom bar drives. */

    /* Standard I/O panel (Expected / Current behaviour, Input, Output) is
       NOT shown in the work area any more — it is surfaced in the drawer
       Brief pane instead (see renderSidePanel). */

    const body = DOM.el("div", { class: "activity-body" });
    wrap.appendChild(body);

    /* Wrap renderer in try/catch — a renderer that throws would
       otherwise leave the body completely empty (which the user sees
       as a silent blank pane) with the error only visible in the
       browser console. Surface a visible error instead so the
       student/teacher knows what happened and can report it. */
    try {
      currentController = Renderers.render(act, body, {
        onChange: function (resp) {
          const ap = progress.activities[act.id];
          ap.response = resp;
          /* Any edit AFTER the activity has been marked invalidates the
             previous outcome. Reset to in_progress so the play button
             goes back to "Check" instead of "Next" — the student must
             re-check after changing the response. Also clears any per-
             part highlight from the previous marking so stale green/red
             ticks don't sit on outdated content. */
          if (ap.status === "correct" || ap.status === "incorrect") {
            ap.status = "in_progress";
            if (currentController && currentController.highlight) {
              try { currentController.highlight(null); } catch (e) {}
            }
            /* Re-render the side panel so the previous feedback message
               disappears. */
            renderSidePanel(act);
            /* Update the play button so it switches from "Next →" back
               to "Check". */
            if (typeof currentRefreshPlay === "function") {
              try { currentRefreshPlay(); } catch (e) {}
            }
          } else if (ap.status === "not_started") {
            ap.status = "in_progress";
          }
          ap.last_updated = nowISO();
          persistProgress();
          renderTaskList();
        }
      });
    } catch (e) {
      console.error("Renderer threw for activity", act.id, e);
      body.innerHTML = "";
      const errBox = DOM.el("div", { class: "render-error" });
      errBox.appendChild(DOM.el("h3", null, "Couldn't render this activity"));
      errBox.appendChild(DOM.el("p", null, "The activity definition might be malformed or this version of PyQuiz can't handle it. Press the ↺ Reset button to clear any saved response — that often helps."));
      errBox.appendChild(DOM.el("pre", { class: "render-error-detail" }, String(e && e.message ? e.message : e)));
      body.appendChild(errBox);
      currentController = null;
    }

    /* Also wrap setResponse + highlight replay — restoring a stale
       response from local storage onto a renderer whose shape has
       changed could throw, blanking the body even though render()
       succeeded. */
    if (ap.response && currentController && currentController.setResponse) {
      try {
        currentController.setResponse(ap.response);
        /* If we're returning to an already-marked activity, replay the
           per-part highlight so the green ticks (or red marks) show up
           in the activity body — not just in the side panel's feedback
           line. Without this, the body looks like a fresh attempt while
           the side panel announces it's already solved, which is
           confusing. */
        if ((ap.status === "correct" || ap.status === "incorrect") && currentController.highlight) {
          try {
            // Prefer the stored per-part (saved when checked). Only re-mark as
            // a fallback when offline — in server mode the browser has no
            // answers to mark with.
            let pp = ap.per_part;
            if (!pp && !Server.enabled) pp = Marker.mark(act, ap.response).per_part;
            if (pp) currentController.highlight(pp);
          } catch (e) {}
        }
      } catch (e) {
        console.warn("setResponse threw for", act.id, "— discarding stored response", e);
        /* Discard the bad response so the student can start fresh
           next time without seeing the same error. */
        ap.response = null;
        ap.status = "not_started";
        persistProgress();
      }
    }

    /* If this activity is already terminal (correct or out of attempts),
       autofill a failed flowchart's canonical answers before mounting. */
    if (ap.status === "failed" && act.type === "flowchart") {
      try { fillFlowchartSolution(act); } catch (e) {}
    }

    main.appendChild(wrap);
    try { if (PyQuiz.Skin) PyQuiz.Skin.decorate(main, { getCode: function () { return skinCodeForCopy(act); } }); } catch (e) {}
    /* Lock the body AFTER it is in the DOM (lockActivityBody queries the
       document). Once correct or out of attempts, the activity can't be
       edited again. */
    if (ap.status === "correct" || ap.status === "failed") {
      lockActivityBody(true);
    }
    startTimer(act);

    // Auto-focus the first input/control so the student can start
    // working immediately without clicking. Defer a tick so the layout
    // settles first.
    setTimeout(function () {
      if (currentController && typeof currentController.focus === "function") {
        try { currentController.focus(); } catch (e) {}
      }
      maybeRenderFollowUp(act);
    }, 0);
  }


  /* ----- follow_up reflection rendering -----
     If the activity declares a follow_up prompt, render a textarea
     below the activity body the first time the activity is checked.
     The response is stored on the progress record and never auto-
     marked. teacher_only:true (the only mode in v0.1) means the
     student gets no feedback on their reflection. */
  function maybeRenderFollowUp(act) {
    const fu = act && act.follow_up;
    if (!fu || !fu.prompt) return;
    const ap = progress.activities[act.id];
    if (!ap || (ap.status !== "correct" && ap.status !== "incorrect")) return;
    // Find the wrap; bail if the activity-body isn't in the DOM (e.g. error fallback).
    const wrap = document.querySelector(".activity-wrap") || document.getElementById("main-region");
    if (!wrap) return;
    let host = wrap.querySelector(".activity-followup");
    if (!host) {
      host = DOM.el("section", { class: "activity-followup", "aria-label": "Reflection" });
      wrap.appendChild(host);
    } else {
      host.innerHTML = "";
    }
    const h = DOM.el("h3", { style: "margin:0 0 6px 0" }, "Reflection");
    host.appendChild(h);
    host.appendChild(DOM.el("p", { class: "followup-prompt" }, fu.prompt));
    const ta = DOM.el("textarea", {
      class: "followup-text",
      rows: "3",
      "aria-label": "Your reflection",
      placeholder: "Write a sentence or two…"
    });
    ta.value = ap.follow_up_response || "";
    ta.addEventListener("input", function () {
      ap.follow_up_response = ta.value;
      ap.last_updated = nowISO();
      persistProgress();
    });
    host.appendChild(ta);
    host.appendChild(DOM.el("p", { class: "kbd-help" },
      "Saved automatically. Your teacher can see this when you export your progress."));
  }

  /* Server-marking client (api_client). Off unless a pack was loaded from
     the backend (?code=/?pack=), in which case marking is the single source
     of truth on the server and answers never reach the browser. */
  const Server = {
    enabled: false,
    context: null,                       // { code } or { pack_id }
    async mark(act, resp) {
      const body = Object.assign({ activity_id: act.id, response: resp }, this.context);
      const r = await fetch("/api/v1/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-cache"
      });
      if (!r.ok) throw new Error("Marking failed (" + r.status + ")");
      return r.json();
    },
    async loadByCode(code) {
      const r = await fetch("/api/v1/codes/" + encodeURIComponent(code), { cache: "no-cache" });
      if (!r.ok) throw new Error("Code not found");
      const data = await r.json();
      this.enabled = true; this.context = { code: String(code) };
      return data.pack;
    },
    async loadPlay(packId) {
      const r = await fetch("/api/v1/packs/" + encodeURIComponent(packId) + "/play", { cache: "no-cache" });
      if (!r.ok) throw new Error("Pack not found");
      const data = await r.json();
      this.enabled = true; this.context = { pack_id: String(packId) };
      return data.pack;
    }
  };
  PyQuiz.Server = Server;

  /* Marking indirection. In server mode this returns a Promise<MarkResult>;
     offline it runs the JS marker synchronously, so the offline single-file
     build and the jsdom regression are byte-for-byte unchanged. */
  function markActivity(act, resp) {
    if (Server.enabled) return Server.mark(act, resp);
    return Marker.mark(act, resp);
  }

  function doCheck(act) {
    if (!currentController) return;
    const resp = currentController.getResponse();
    const marked = markActivity(act, resp);
    if (marked && typeof marked.then === "function") {
      marked
        .then(result => applyCheckResult(act, resp, result))
        .catch(err => {
          A11y.announceAssertive("Couldn't reach the marking server.");
          showError("Marking failed: " + (err && err.message ? err.message : err));
        });
    } else {
      applyCheckResult(act, resp, marked);
    }
  }

  function applyCheckResult(act, resp, result) {
    const ap = progress.activities[act.id];
    ap.response = resp;
    // Keep the server's per-part detail so re-entry can replay the highlight
    // without re-marking (in server mode the browser has no answers to mark).
    ap.per_part = result.per_part;
    ap.attempts = (ap.attempts || 0) + 1;
    /* Two-attempt model: after `attempts_per_activity` wrong checks, the
       activity is "failed" (red ✗, no points, solution shown). 0 means
       unlimited and is the historic behaviour. Default for new packs is 2. */
    const cap = attemptsCap();
    if (result.status === "correct") {
      ap.status = "correct";
    } else if (cap !== Infinity && ap.attempts >= cap) {
      ap.status = "failed";
    } else {
      ap.status = "incorrect";
    }
    ap.last_updated = nowISO();
    // Anti-cheat: lock the reset button the instant the outcome is terminal —
    // a correct answer, or attempts exhausted (e.g. a second wrong answer).
    if (ap.status === "correct" || ap.status === "failed") {
      try { lockReset(); } catch (e) {}
    }
    // Record confidence picked for this attempt (if any). Stored as a
    // small history so teachers can see trends across attempts.
    try {
      const c = currentConfidencePicker && currentConfidencePicker();
      if (c) {
        ap.confidence_history = Array.isArray(ap.confidence_history) ? ap.confidence_history : [];
        ap.confidence_history.push({
          confidence: c,
          correct: ap.status === "correct",
          attempt: ap.attempts,
          ts: ap.last_updated
        });
      }
    } catch (e) { /* never block check on a recording problem */ }
    persistProgress();
    renderTaskList();
    /* Suppress per-item red/green during mid-attempt incorrect — students
       should consult hints rather than narrow down by elimination.
       Highlights stay enabled for correct (positive reinforcement) and
       are suppressed for failed too (solution is shown separately). */
    let announce;
    if (ap.status === "correct") {
      announce = "Correct. " + result.feedback;
      if (currentController.highlight) currentController.highlight(result.per_part);
    } else if (ap.status === "failed") {
      announce = "Out of attempts. The solution is now shown.";
    } else {
      const remaining = (cap === Infinity) ? null : (cap - ap.attempts);
      announce = "Not quite." + (remaining != null
        ? " You have " + remaining + " attempt" + (remaining === 1 ? "" : "s") + " remaining."
        : " Try again.");
    }
    A11y.announceAssertive(announce);
    _justChecked = true;
    renderSidePanel(act);
    /* On a terminal outcome, lock the body. For a failed flowchart, first
       autofill the blanks with the correct answers, marked orange. */
    if (ap.status === "correct" || ap.status === "failed") {
      if (act.type === "flowchart" && ap.status === "failed") {
        try { fillFlowchartSolution(act); } catch (e) {}
      }
      lockActivityBody(true);
    }
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
    maybeRenderFollowUp(act);
  }

  function goToNext() {
    const ids = pack.activities.map(a => a.id);
    const idx = ids.indexOf(currentId);
    /* In sequential mode the student must walk through in strict order:
       just advance to ids[idx + 1] regardless of status (the next item
       in the order is by definition the next one to attempt). */
    if (isSequential()) {
      if (idx + 1 < ids.length) { selectActivity(ids[idx + 1]); return; }
      showCompletion();
      return;
    }
    /* Free mode: skip over activities that are already correct (we don't
       want to re-show them) but accept failed ones as "to revisit". */
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

  /* Render a small subset of inline markup safely. Currently only
     backtick code spans: `like this` → <code>like this</code>.
     We build DOM nodes directly (never innerHTML) so user-supplied
     pack content can't smuggle in script or HTML. Returns a
     DocumentFragment ready to append. */
  function renderInlineMarkup(text) {
    const frag = document.createDocumentFragment();
    if (text == null) return frag;
    const s = String(text);
    if (!s.length) return frag;
    /* Split on `…` runs. Backslash escapes — \` — are honoured. */
    const re = /`((?:\\.|[^`\\])+?)`/g;
    let last = 0, m;
    while ((m = re.exec(s)) !== null) {
      if (m.index > last) {
        frag.appendChild(document.createTextNode(s.slice(last, m.index)));
      }
      const codeEl = document.createElement("code");
      /* Unescape \` back to `. */
      codeEl.textContent = m[1].replace(/\\([`\\])/g, "$1");
      frag.appendChild(codeEl);
      last = m.index + m[0].length;
    }
    if (last < s.length) {
      frag.appendChild(document.createTextNode(s.slice(last)));
    }
    return frag;
  }


  /* Build a human-readable description of the canonical answer for any
     activity type. Returns a DOM element ready to drop into the side
     panel, or null when no useful description is available. */
  function canonicalAnswerEl(act) {
    const p = act.payload || {};
    function code(s) {
      const pre = document.createElement("pre");
      pre.className = "solution-code";
      pre.textContent = String(s);
      return pre;
    }
    function paragraph(s) {
      return DOM.el("p", { class: "solution-text" }, String(s));
    }
    function list(entries) {
      const ul = DOM.el("ul", { class: "solution-list" });
      entries.forEach(e => ul.appendChild(DOM.el("li", null, e)));
      return ul;
    }
    const wrap = DOM.el("div");
    try {
      switch (act.type) {
        case "predict_output": {
          wrap.appendChild(paragraph("The output is:"));
          wrap.appendChild(code(p.answer || ""));
          break;
        }
        case "cloze": {
          const blanks = Array.isArray(p.blanks) ? p.blanks : [];
          wrap.appendChild(paragraph("Correct answers:"));
          wrap.appendChild(list(blanks.map(b => "Blank " + b.id + ": " + (b.answer != null ? b.answer : ""))));
          break;
        }
        case "flowchart": {
          const blanks = Array.isArray(p.blanks) ? p.blanks : [];
          wrap.appendChild(paragraph("Correct answers:"));
          wrap.appendChild(list(blanks.map(b => "{{" + b.id + "}} → " + (b.answer != null ? b.answer : ""))));
          break;
        }
        case "parsons": {
          wrap.appendChild(paragraph("Correct order:"));
          wrap.appendChild(code(p.canonical_code || ""));
          break;
        }
        case "spot_the_bug":
        case "modify": {
          const bugs = Array.isArray(p.bugs) ? p.bugs : [];
          wrap.appendChild(paragraph("Correct fix" + (bugs.length === 1 ? "" : "es") + ":"));
          wrap.appendChild(list(bugs.map(b => "Line " + b.line + ": " + (b.fix || ""))));
          break;
        }
        case "trace_table": {
          const rows = Array.isArray(p.rows) ? p.rows : [];
          const cols = Array.isArray(p.columns) ? p.columns : [];
          wrap.appendChild(paragraph("Correct trace:"));
          const tbl = DOM.el("table", { class: "solution-table" });
          const thead = DOM.el("thead");
          const trh = DOM.el("tr", null, DOM.el("th", null, "Line"));
          cols.forEach(c => trh.appendChild(DOM.el("th", null, c.label || c.id)));
          thead.appendChild(trh);
          tbl.appendChild(thead);
          const tbody = DOM.el("tbody");
          rows.forEach(r => {
            const tr = DOM.el("tr");
            tr.appendChild(DOM.el("td", null, String(r.line)));
            cols.forEach(c => {
              const v = (r.values || {})[c.id];
              tr.appendChild(DOM.el("td", null, v == null ? "" : String(v)));
            });
            tbody.appendChild(tr);
          });
          tbl.appendChild(tbody);
          wrap.appendChild(tbl);
          break;
        }
        case "testing": {
          const rows = Array.isArray(p.rows) ? p.rows : [];
          const cols = Array.isArray(p.input_columns) ? p.input_columns : [];
          wrap.appendChild(paragraph("Correct test cases:"));
          const tbl = DOM.el("table", { class: "solution-table" });
          const thead = DOM.el("thead");
          const trh = DOM.el("tr");
          cols.forEach(c => trh.appendChild(DOM.el("th", null, c.label || c.id)));
          trh.appendChild(DOM.el("th", null, "Output"));
          trh.appendChild(DOM.el("th", null, "Test type"));
          thead.appendChild(trh);
          tbl.appendChild(thead);
          const tbody = DOM.el("tbody");
          rows.forEach(r => {
            const v = r.values || {};
            const tr = DOM.el("tr");
            cols.forEach(c => tr.appendChild(DOM.el("td", null, v[c.id] == null ? "" : String(v[c.id]))));
            tr.appendChild(DOM.el("td", null, v.output == null ? "" : String(v.output)));
            tr.appendChild(DOM.el("td", null, v.test_type == null ? "" : String(v.test_type)));
            tbody.appendChild(tr);
          });
          tbl.appendChild(tbody);
          wrap.appendChild(tbl);
          break;
        }
        case "starter_challenge": {
          if (p.model_solution) {
            wrap.appendChild(paragraph("Model solution:"));
            wrap.appendChild(code(p.model_solution));
          } else {
            return null;
          }
          break;
        }
        default:
          return null;
      }
    } catch (e) {
      console.warn("canonicalAnswerEl failed for", act.type, e);
      return null;
    }
    return wrap;
  }


  /* Disable every interactive control inside the activity body so a
     student who is out of attempts (or has already got it right) can no
     longer change their answer. Covers form controls, draggable parsons
     blocks, and contenteditable regions. Idempotent. Pass lock=false to
     re-enable (used when the activity is reset). */
  function lockActivityBody(lock) {
    const body = document.querySelector(".activity-body");
    if (!body) return;
    body.classList.toggle("activity-locked", !!lock);
    // Form controls
    body.querySelectorAll("input, select, textarea, button").forEach(el => {
      // Never disable the in-SVG flowchart blanks here if we are UNlocking —
      // they are re-enabled by re-render. When locking, disable everything.
      el.disabled = !!lock;
    });
    // Draggable blocks (parsons)
    body.querySelectorAll("[draggable]").forEach(el => {
      if (lock) {
        el.setAttribute("data-was-draggable", el.getAttribute("draggable"));
        el.setAttribute("draggable", "false");
        el.setAttribute("aria-disabled", "true");
        el.tabIndex = -1;
      } else {
        const prev = el.getAttribute("data-was-draggable");
        if (prev != null) el.setAttribute("draggable", prev);
        el.removeAttribute("aria-disabled");
      }
    });
    // contenteditable (defensive — not currently used by any renderer)
    body.querySelectorAll("[contenteditable]").forEach(el => {
      el.setAttribute("contenteditable", lock ? "false" : "true");
    });
    // Clickable non-form elements (parsons blocks, cloze chips, spot-the-bug
    // lines, MC options). pointer-events:none (CSS) stops the mouse; remove
    // them from the tab order so keyboard can't activate them either.
    body.querySelectorAll('[role="button"], .chip, .parsons-block, .stb-line-block, .po-option').forEach(el => {
      if (lock) {
        if (!el.hasAttribute("data-prev-tabindex")) el.setAttribute("data-prev-tabindex", el.getAttribute("tabindex") || "");
        el.setAttribute("tabindex", "-1");
        el.setAttribute("aria-disabled", "true");
      } else {
        const prev = el.getAttribute("data-prev-tabindex");
        if (prev !== null) { if (prev === "") el.removeAttribute("tabindex"); else el.setAttribute("tabindex", prev); el.removeAttribute("data-prev-tabindex"); }
        el.removeAttribute("aria-disabled");
      }
    });
  }


  /* For a failed flowchart, write the canonical answer into each blank
     input/select and style it as the revealed solution (orange). The
     student's wrong value is replaced so the chart now shows the correct
     completed diagram. */
  function fillFlowchartSolution(act) {
    // In server mode the pack is answer-stripped — there are no canonical
    // answers to fill in, so skip rather than show empty "correct" boxes.
    if (Server.enabled) return;
    const body = document.querySelector(".activity-body");
    if (!body) return;
    const blanks = (act.payload && act.payload.blanks) || [];
    blanks.forEach(b => {
      const el = body.querySelector('[data-blank-id="' + b.id + '"]');
      if (!el) return;
      const ans = b.answer != null ? String(b.answer) : "";
      el.value = ans;
      el.classList.remove("fc-blank-bad", "fc-blank-ok");
      el.classList.add("fc-blank-solution");
      el.setAttribute("title", "Correct answer");
    });
  }

  /* ---- Drawer: Brief + Feedback panes (retrofit shell) ---- */
  function renderSidePanel(act) {
    const sp = document.getElementById("side-panel-body");
    if (!sp) return;
    const ap = progress.activities[act.id] || {};

    // Tag button shows the activity type.
    const tag = document.getElementById("tagtext");
    if (tag) tag.textContent = (PyQuiz.Constants.TYPE_LABELS[act.type] || act.type);

    // Brief pane: instructions + light meta.
    // Brief pane: instructions only (no "Brief" label or difficulty meta).
    const brief = DOM.el("div", { class: "sk-pane show", "data-pane": "brief" });
    const desc = DOM.el("p", { class: "sk-desc" });
    desc.appendChild(renderInlineMarkup(act.instructions || ""));
    brief.appendChild(desc);
    // The Expected / Current behaviour + Input/Output panel now lives here,
    // beneath the instructions, rather than in the work area.
    try {
      if (Renderers.ioPanel) {
        const io = Renderers.ioPanel.build(act);
        if (io) brief.appendChild(io);
      }
    } catch (e) {}

    // Feedback pane.
    const fbPane = DOM.el("div", { class: "sk-pane", "data-pane": "fb" });
    const terminal = (ap.status === "correct" || ap.status === "incorrect" || ap.status === "failed");
    if (terminal) {
      const good = ap.status === "correct";
      const fb = act.feedback || {};
      let text;
      if (ap.status === "correct") text = fb.correct || S.correctDefault;
      else if (ap.status === "failed") text = "Out of attempts — the solution is shown on the activity.";
      else text = fb.incorrect || S.incorrectDefault;
      const box = DOM.el("div", { class: "sk-fb" + (good ? "" : " bad") });
      box.appendChild(DOM.el("span", { class: "ic", "aria-hidden": "true" }, good ? "✓" : "✕"));
      const txtWrap = DOM.el("span");
      txtWrap.appendChild(DOM.el("b", null, good ? "Correct" : (ap.status === "failed" ? "Not solved" : "Not quite")));
      const sub = DOM.el("span", { class: "sub" });
      sub.appendChild(renderInlineMarkup(text));
      txtWrap.appendChild(sub);
      box.appendChild(txtWrap);
      fbPane.appendChild(box);
      // On a failed activity, surface the canonical answer here too (the
      // hold-to-reveal Solution post-it remains available as well).
      if (ap.status === "failed") {
        try {
          const ansEl = canonicalAnswerEl(act);
          if (ansEl) {
            fbPane.appendChild(DOM.el("div", { class: "sk-plabel", style: "margin-top:14px" }, "Answer"));
            fbPane.appendChild(ansEl);
          }
        } catch (e) {}
      }
    } else {
      fbPane.appendChild(DOM.el("p", { class: "sk-desc", style: "color:var(--muted)" },
        "Press Check to see how you did."));
    }

    sp.innerHTML = "";
    sp.appendChild(brief);
    sp.appendChild(fbPane);

    // After a Check (right or wrong) show Feedback; otherwise the active
    // tab — which selectActivity resets to Brief for each new activity.
    const wantFb = _justChecked;
    setDrawerTab(wantFb ? "fb" : (_activeDrawerTab || "brief"));
    _justChecked = false;

    // Feedback dot indicates fresh, unseen feedback.
    const dot = document.getElementById("fb-dot");
    if (dot) dot.hidden = !terminal;

    // Stash hint/solution data for the bottom-bar buttons.
    _activeAct = act;
    refreshBottomBarState(act);
    syncCheckButton(act);
  }

  /* The bottom-bar Check button mirrors the per-activity Play button: it
     reads "Check ✓" until the activity is solved/terminal, then "Next ›". */
  function syncCheckButton(act) {
    const btn = document.getElementById("check-btn");
    if (!btn) return;
    const ap = progress.activities[act.id] || {};
    const terminal = (ap.status === "correct" || ap.status === "failed");
    btn.textContent = terminal ? "Next ›" : "Check ✓";
    btn.classList.toggle("is-next", terminal);
    // At the very last activity there's nowhere to advance to.
    const acts = pack ? pack.activities : [];
    const isLast = acts.length && acts[acts.length - 1].id === act.id;
    btn.disabled = terminal && isLast;
  }

  let _activeDrawerTab = "brief";
  let _justChecked = false;
  let _activeAct = null;

  function setDrawerTab(pane) {
    _activeDrawerTab = pane;
    document.querySelectorAll(".sk-tab").forEach(t => {
      const on = t.dataset.pane === pane;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll("#side-panel-body .sk-pane").forEach(p => {
      p.classList.toggle("show", p.dataset.pane === pane);
    });
    if (pane === "fb") { const dot = document.getElementById("fb-dot"); if (dot) dot.hidden = true; }
  }

  /* Build a plain-text solution string for the current activity, where one
     can be derived without running code. Returns "" when not derivable. */
  function deriveSolution(act) {
    const p = act.payload || {};
    try {
      if (act.type === "predict_output") {
        if (p.mode === "multiple_choice") {
          const opt = (p.options || []).find(o => o.id === p.answer);
          return opt ? String(opt.content) : "";
        }
        return p.answer != null ? String(p.answer) : "";
      }
      if (act.type === "cloze") {
        const lines = (p.blanks || []).map(b => b.id + " = " + (b.answer != null ? b.answer : ""));
        return lines.join("\n");
      }
      if (act.type === "parsons") return p.canonical_code || "";
      if (act.type === "starter_challenge") return p.model_solution || "";
      if (act.type === "spot_the_bug" || act.type === "modify") {
        if (p.constraint === "remove_line" && p.solution_code) return p.solution_code;
        const b = (p.bugs || [])[0];
        if (b) return "Line " + b.line + ": " + (b.fix != null ? b.fix : "(identify this line)");
        return "";
      }
      if (act.type === "flowchart") {
        return (p.blanks || []).map(b => b.id + " = " + (b.answer != null ? b.answer : "")).join("\n");
      }
      if (act.type === "trace_table") {
        return "Work through each line and record the variable values after it runs.";
      }
      if (act.type === "testing") {
        return "Each blank cell is checked automatically against the input's type and range.";
      }
    } catch (e) {}
    return "";
  }

  function refreshBottomBarState(act) {
    const hintBtn = document.getElementById("hint-btn");
    const solnBtn = document.getElementById("soln-btn");
    const hasHints = Array.isArray(act.hints) && act.hints.length > 0;
    if (hintBtn) hintBtn.disabled = !hasHints;
    const soln = deriveSolution(act);
    _activeSolution = soln;
    // Solutions are gated by the pack's show_solutions setting + outcome,
    // mirroring the previous behaviour: never before a terminal outcome
    // when the pack hides solutions until submission.
    const ap = progress.activities[act.id] || {};
    const showMode = (pack && pack.settings && pack.settings.show_solutions) || "submission";
    const allowed = soln && (showMode === "always" ||
      (showMode === "submission" && (ap.status === "correct" || ap.status === "failed" || ap.status === "incorrect")));
    if (solnBtn) solnBtn.disabled = !allowed;
  }
  let _activeSolution = "";

  /* ---- Timer ---- */
  function startTimer(act) {
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
    if (!act.timing) return;
    let remaining = act.timing.limit_seconds;
    const label = DOM.el("div", { class: "kbd-help", id: "timer-label", style: "position:sticky;top:0" }, "Time: " + fmt(remaining));
    const metaHost = document.querySelector(".activity-meta") || document.querySelector(".activity-wrap");
    if (metaHost) metaHost.appendChild(label);
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

  /* ---- Top bar / shell chrome ---- */
  function bindTopBar() {
    const byId = id => document.getElementById(id);
    function on(id, ev, fn) { const e = byId(id); if (e) e.addEventListener(ev, fn); }
    // Surviving tool buttons (desktop + mobile mirrors).
    on("size-up", "click", () => Settings.bumpSize(1));
    on("size-down", "click", () => Settings.bumpSize(-1));
    on("theme-btn", "click", () => Settings.cycleTheme());
    on("settings-btn", "click", () => Settings.openDialog({ showLayoutDefaults: true }));
    on("load-btn", "click", openLoadDialog);
    on("export-btn", "click", exportProgress);
    on("size-up-m", "click", () => Settings.bumpSize(1));
    on("size-down-m", "click", () => Settings.bumpSize(-1));
    on("theme-btn-m", "click", () => Settings.cycleTheme());
    on("settings-btn-m", "click", () => Settings.openDialog({ showLayoutDefaults: true }));
    on("load-btn-m", "click", openLoadDialog);
    bindSkinChrome();
  }

  function setupPaneResize() { /* no resizable panes in the retrofit shell */ }

  /* ---- Retrofit shell controller: carousel nav, drawer tabs, collapse,
     bottom bar (Check/Reset proxies + Hint/Solution post-its), modals. ---- */
  let _hintIdx = 0;
  function bindSkinChrome() {
    const byId = id => document.getElementById(id);
    // Carousel navigation.
    const prev = byId("nav-prev"), next = byId("nav-next");
    if (prev) prev.addEventListener("click", () => carouselStep(-1));
    if (next) next.addEventListener("click", () => carouselStep(1));
    window.addEventListener("resize", centreCarousel);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { try { centreCarousel(); } catch (e) {} });
    // Arrow-key navigation (ignored while typing).
    document.addEventListener("keydown", ev => {
      if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
      const a = document.activeElement;
      if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return;
      ev.preventDefault();
      carouselStep(ev.key === "ArrowLeft" ? -1 : 1);
    });

    // Drawer tabs + collapse / handle.
    document.querySelectorAll(".sk-tab").forEach(tb =>
      tb.addEventListener("click", () => setDrawerTab(tb.dataset.pane)));
    const bodyEl = byId("bodyEl");
    if (byId("collapse")) byId("collapse").addEventListener("click", () => bodyEl.classList.add("collapsed"));
    if (byId("handle")) byId("handle").addEventListener("click", () => bodyEl.classList.remove("collapsed"));

    // Bottom bar — Check / Reset proxy the per-activity buttons the engine
    // builds inside #main-region (preserving all their logic + locking).
    if (byId("check-btn")) byId("check-btn").addEventListener("click", () => {
      if (typeof currentPlayAction === "function") currentPlayAction();
    });
    if (byId("reset-btn")) byId("reset-btn").addEventListener("click", () => {
      if (!currentResetBtn || currentResetBtn.disabled) return;
      // "Re-load" swap: fade the work area + drawer out, perform the reset
      // (which re-renders the activity), then fade back in.
      const work = byId("main-region");
      const tb = byId("side-panel-body");
      if (work) work.classList.add("sk-swap");
      if (tb) tb.classList.add("sk-swap");
      setTimeout(() => {
        try { currentResetBtn.click(); } catch (e) {}
        requestAnimationFrame(() => {
          const w2 = byId("main-region"); if (w2) w2.classList.remove("sk-swap");
          const t2 = byId("side-panel-body"); if (t2) t2.classList.remove("sk-swap");
        });
      }, 180);
    });

    // Hint — cycling post-it note from the active activity's hints.
    if (byId("hint-btn")) byId("hint-btn").addEventListener("click", toggleHintNote);
    // Solution — 3-second hold to reveal a post-it.
    bindSolutionHold();

    // tag button → "how this activity works" modal.
    if (byId("tagbtn")) byId("tagbtn").addEventListener("click", openHelpModal);
    if (byId("info-btn")) byId("info-btn").addEventListener("click", openInfoModal);
    // Modal close handlers.
    document.querySelectorAll("[data-sk-close]").forEach(x =>
      x.addEventListener("click", e => e.target.closest(".sk-scrim").classList.remove("on")));
    document.querySelectorAll(".sk-scrim").forEach(scr =>
      scr.addEventListener("click", e => { if (e.target === scr) scr.classList.remove("on"); }));
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") document.querySelectorAll(".sk-scrim.on").forEach(s => s.classList.remove("on"));
    });
  }

  function notesLayer() { return document.getElementById("notes"); }
  function anchorNote(note, btn, side) {
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    note.style.bottom = (window.innerHeight - r.top + 8) + "px";
    if (side === "right") { note.style.right = (window.innerWidth - cx) + "px"; note.style.left = "auto"; note.style.transformOrigin = "bottom right"; }
    else { note.style.left = cx + "px"; note.style.right = "auto"; note.style.transformOrigin = "bottom left"; }
    requestAnimationFrame(() => {
      const n = note.getBoundingClientRect();
      if (n.right > window.innerWidth - 6) { note.style.left = "auto"; note.style.right = "6px"; }
      if (n.left < 6) { note.style.right = "auto"; note.style.left = "6px"; }
    });
  }

  function normaliseHintText(h) {
    if (typeof h === "string") return h;
    if (h && typeof h === "object") return String(h.text || "");
    return "";
  }
  function toggleHintNote() {
    const btn = document.getElementById("hint-btn");
    const layer = notesLayer();
    const existing = layer.querySelector(".note.hint");
    if (existing) { existing.remove(); btn.classList.remove("on"); return; }
    const act = _activeAct;
    if (!act || !Array.isArray(act.hints) || !act.hints.length) return;
    _hintIdx = 0;
    btn.classList.add("on");
    const multi = act.hints.length > 1;
    const note = DOM.el("div", { class: "note hint" });
    note.style.setProperty("--rot", "-2.5deg");
    note.appendChild(DOM.el("div", { class: "ntape", "aria-hidden": "true" }));
    const head = DOM.el("div", { class: "nhead" });
    const cnt = DOM.el("span", { class: "cnt" });
    cnt.appendChild(document.createTextNode("💡 Hint "));
    const cntN = DOM.el("b", null, "1");
    cnt.appendChild(cntN);
    if (multi) cnt.appendChild(document.createTextNode(" / " + act.hints.length));
    head.appendChild(cnt);
    if (multi) {
      const cyc = DOM.el("div", { class: "cyc" });
      const back = DOM.el("button", { type: "button", "aria-label": "Previous hint" }, "‹");
      const fwd = DOM.el("button", { type: "button", "aria-label": "Next hint" }, "›");
      cyc.appendChild(back); cyc.appendChild(fwd);
      head.appendChild(cyc);
      const upd = () => { textEl.innerHTML = ""; textEl.appendChild(renderInlineMarkup(normaliseHintText(act.hints[_hintIdx]))); cntN.textContent = String(_hintIdx + 1); };
      back.addEventListener("click", () => { _hintIdx = (_hintIdx - 1 + act.hints.length) % act.hints.length; upd(); });
      fwd.addEventListener("click", () => { _hintIdx = (_hintIdx + 1) % act.hints.length; upd(); });
    }
    const close = DOM.el("button", { class: "nclose", type: "button", "aria-label": "Close hint" }, "✕");
    head.appendChild(close);
    note.appendChild(head);
    const textEl = DOM.el("div", { class: "ntext" });
    textEl.appendChild(renderInlineMarkup(normaliseHintText(act.hints[0])));
    note.appendChild(textEl);
    layer.appendChild(note);
    anchorNote(note, btn, "right");
    close.addEventListener("click", () => { note.remove(); btn.classList.remove("on"); });
  }

  function openSolutionNote() {
    const btn = document.getElementById("soln-btn");
    const layer = notesLayer();
    const old = layer.querySelector(".note.soln");
    if (old) old.remove();
    if (!_activeSolution) return;
    const note = DOM.el("div", { class: "note soln" });
    note.style.setProperty("--rot", "2.5deg");
    note.appendChild(DOM.el("div", { class: "ntape", "aria-hidden": "true" }));
    const head = DOM.el("div", { class: "nhead" });
    head.appendChild(document.createTextNode("🔑 Solution"));
    const close = DOM.el("button", { class: "nclose", type: "button", "aria-label": "Close solution" }, "✕");
    head.appendChild(close);
    note.appendChild(head);
    note.appendChild(DOM.el("pre", null, _activeSolution));
    layer.appendChild(note);
    anchorNote(note, btn, "left");
    btn.classList.add("on");
    close.addEventListener("click", () => { note.remove(); btn.classList.remove("on"); });
  }

  function bindSolutionHold() {
    const btn = document.getElementById("soln-btn");
    const fill = document.getElementById("soln-fill");
    if (!btn) return;
    let timer = null, open = false, pendingClose = false;
    function resetFill() { if (fill) { fill.style.transition = "width .2s ease"; fill.style.width = "0%"; } }
    function close() { const n = notesLayer().querySelector(".note.soln"); if (n) n.remove(); open = false; btn.classList.remove("on"); }
    function cancelHold() { if (timer) { clearTimeout(timer); timer = null; } resetFill(); }
    btn.addEventListener("pointerdown", e => {
      if (btn.disabled) return;
      e.preventDefault();
      if (open) { pendingClose = true; return; }
      if (fill) { fill.style.transition = "width 3s linear"; requestAnimationFrame(() => { fill.style.width = "100%"; }); }
      timer = setTimeout(() => { timer = null; resetFill(); openSolutionNote(); open = true; }, 3000);
    });
    btn.addEventListener("pointerup", () => {
      if (pendingClose) { pendingClose = false; close(); resetFill(); return; }
      cancelHold();
    });
    btn.addEventListener("pointerleave", () => { pendingClose = false; cancelHold(); });
    btn.addEventListener("pointercancel", cancelHold);
    // Re-render clears notes; expose a resetter used by selectActivity.
    _closeSolutionNote = () => { close(); resetFill(); };
  }
  let _closeSolutionNote = function () {};

  function openHelpModal() {
    const act = _activeAct; if (!act) return;
    const label = PyQuiz.Constants.TYPE_LABELS[act.type] || act.type;
    const meta = (PyQuiz.Constants.TYPE_HELP && PyQuiz.Constants.TYPE_HELP[act.type]) || {};
    const icon = document.getElementById("help-icon");
    const title = document.getElementById("help-title");
    const body = document.getElementById("help-body");
    if (icon) icon.textContent = meta.icon || "📋";
    if (title) title.textContent = label;
    if (body) {
      body.innerHTML = "";
      const p = DOM.el("p");
      p.appendChild(renderInlineMarkup(meta.text || ("This is a " + label + " activity. " + (act.instructions || ""))));
      body.appendChild(p);
    }
    document.getElementById("help-scrim").classList.add("on");
  }

  function openInfoModal() {
    const title = document.getElementById("info-title");
    const body = document.getElementById("info-body");
    if (title) title.textContent = pack ? (pack.title || "Pack") : "Pack";
    if (body) {
      body.innerHTML = "";
      if (pack && pack.description) {
        const p = DOM.el("p"); p.appendChild(renderInlineMarkup(pack.description)); body.appendChild(p);
      }
      let done = 0; const total = (pack && pack.activities) ? pack.activities.length : 0;
      Object.keys(progress.activities || {}).forEach(id => { if (progress.activities[id].status === "correct") done++; });
      const secCount = (pack && pack.sections) ? pack.sections.length : 0;
      const ul = DOM.el("ul");
      ul.appendChild(DOM.el("li", null, total + " activities" + (secCount ? " across " + secCount + " sections" : "")));
      ul.appendChild(DOM.el("li", null, "Progress: " + done + " / " + total + " complete"));
      ul.appendChild(DOM.el("li", null, "Green tokens in the bar show what you've finished. Use the arrows or ← → keys to move."));
      body.appendChild(ul);
    }
    document.getElementById("info-scrim").classList.add("on");
  }

  /* Code-box "windows" are decorated by the shared PyQuiz.Skin module
     (integration/skin.js, injected by apply.py) so the player and the teacher
     preview build identical chrome. The clipboard prefers this activity's
     assembled/canonical code, falling back to the visible text. */
  function skinCodeForCopy(act) {
    try {
      if (currentController && currentController.getResponse && PyQuiz.Code && PyQuiz.Code.assemble) {
        return PyQuiz.Code.assemble(act, currentController.getResponse());
      }
    } catch (e) {}
    try { return (PyQuiz.Code && PyQuiz.Code.codeForCopy) ? PyQuiz.Code.codeForCopy(act) : ""; } catch (e) {}
    return "";
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
    // Server-hosted entry: ?code=NNNNNN (join by six-digit code) or ?pack=<id>
    // (open a pack directly). Either loads the answer-stripped pack from the
    // backend and switches marking to the server.
    const params = new URLSearchParams(location.search);
    const joinCode = params.get("code");
    const playPackId = params.get("pack");
    if (joinCode || playPackId) {
      try {
        const stripped = joinCode
          ? await Server.loadByCode(joinCode)
          : await Server.loadPlay(playPackId);
        loadPack(stripped, { trusted: true });
        return;
      } catch (e) {
        showError("Couldn't load from the server: " + (e && e.message ? e.message : e));
        showLoader();
        return;
      }
    }
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
