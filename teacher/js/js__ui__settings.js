/* === inlined from js/ui/settings.js === */
/* =====================================================================
 * PyQuiz.Settings — user preferences (a11y, theme, layout)
 *
 * Single source for user-adjustable display settings. Persisted to
 * Storage under "pyquiz.v1.settings" so settings carry across student
 * and teacher.
 *
 * Public API:
 *   PyQuiz.Settings.defaults
 *   PyQuiz.Settings.get()             → current settings object (copy)
 *   PyQuiz.Settings.update(patch)     → save and re-apply
 *   PyQuiz.Settings.apply()           → re-apply current settings to <html>
 *   PyQuiz.Settings.openDialog(opts?) → open the full settings modal
 *   PyQuiz.Settings.bumpSize(+1|-1)   → step font/line-height level
 *   PyQuiz.Settings.cycleTheme()      → step through default → hc → dark
 *
 * Settings shape:
 *   font:   "atkinson" | "dyslexic" | "system"
 *   size:   "1" | "2" | "3" | "4" | "5"   (3 is default)
 *   theme:  "default" | "hc" | "dark"
 *   motion: "auto" | "on" | "off"
 *   tl, sp: "expanded" | "collapsed"  (layout defaults)
 *
 * Applied as data-* attributes on <html>: data-font, data-size,
 * data-theme, data-motion. CSS reads these.
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const Storage = PyQuiz.Storage;
  const DOM = PyQuiz.DOM;
  const Modal = PyQuiz.Modal;

  const KEY = "pyquiz.v1.settings";
  const defaults = {
    font: "atkinson",
    size: "3",
    theme: "default",
    motion: "auto",
    tl: "expanded",
    sp: "expanded",
    show_help: true     // help tips in the side panel are on by default
  };

  // Migrate legacy size values ("16" / "18" / "20" / "24") to new 1..5 scale
  function migrate(s) {
    const v = String(s.size || "3");
    if (v === "16") s.size = "2";
    else if (v === "18") s.size = "3";
    else if (v === "20") s.size = "4";
    else if (v === "24") s.size = "5";
    else if (!/^[1-5]$/.test(v)) s.size = "3";
    if (!["default", "hc", "dark"].includes(s.theme)) s.theme = "default";
    return s;
  }

  let current = migrate(Object.assign({}, defaults, Storage.get(KEY) || {}));

  function apply() {
    const html = document.documentElement;
    html.setAttribute("data-font", current.font);
    html.setAttribute("data-size", current.size);
    html.setAttribute("data-theme", current.theme === "default" ? "" : current.theme);
    html.setAttribute("data-motion", current.motion === "off" ? "off" : "");
  }

  function update(patch) {
    Object.assign(current, patch || {});
    migrate(current);
    Storage.set(KEY, current);
    apply();
  }

  function get() { return Object.assign({}, current); }

  function bumpSize(delta) {
    const n = parseInt(current.size, 10) || 3;
    const next = Math.max(1, Math.min(5, n + (delta > 0 ? 1 : -1)));
    update({ size: String(next) });
  }

  const themeOrder = ["default", "hc", "dark"];
  function cycleTheme() {
    const i = themeOrder.indexOf(current.theme);
    update({ theme: themeOrder[(i + 1) % themeOrder.length] });
  }

  /* Settings dialog. Each row puts label and control on one line.
     For settings with 2-3 options we use radio button groups so the
     student can pick visually at a glance; longer lists (size 1..5)
     stay as a select. An info button next to each label opens a
     reference popup if there's something to explain. */
  function openDialog(opts) {
    opts = opts || {};
    const body = DOM.el("div");

    const display = DOM.el("div", { class: "field-group" });
    display.appendChild(DOM.el("h3", null, "Display"));
    const inputs = {};

    function addRow(host, key, label, options, infoText) {
      const row = DOM.el("div", { class: "field-row inline" });
      const labelWrap = DOM.el("div", { class: "field-label" });
      labelWrap.appendChild(DOM.el("label", null, label));
      if (infoText) {
        const info = DOM.el("button", {
          type: "button",
          class: "field-info-btn",
          "aria-label": "About " + label,
          title: "What's this?"
        }, "ⓘ");
        info.addEventListener("click", function () { openInfoDialog(label, infoText); });
        labelWrap.appendChild(info);
      }
      row.appendChild(labelWrap);

      // Use radios for ≤4 options, select for more.
      if (options.length <= 4) {
        const grp = DOM.el("div", { class: "radio-group", role: "radiogroup", "aria-label": label });
        options.forEach(([v, l]) => {
          const id = "set-" + key + "-" + v;
          const wrap = DOM.el("label", { class: "radio-option", for: id });
          const r = DOM.el("input", { type: "radio", name: "set-" + key, value: v, id: id });
          if (String(v) === String(current[key])) r.checked = true;
          wrap.appendChild(r);
          wrap.appendChild(DOM.el("span", null, l));
          grp.appendChild(wrap);
        });
        row.appendChild(grp);
        inputs[key] = {
          get value() {
            const checked = grp.querySelector("input[type=radio]:checked");
            return checked ? checked.value : String(current[key]);
          }
        };
      } else {
        const id = "set-" + key;
        const sel = DOM.el("select", { id: id });
        options.forEach(([v, l]) => {
          const o = DOM.el("option", { value: v }, l);
          if (String(v) === String(current[key])) o.selected = true;
          sel.appendChild(o);
        });
        row.appendChild(sel);
        inputs[key] = sel;
      }
      host.appendChild(row);
    }

    addRow(display, "font", "Font", [
      ["atkinson", "Atkinson Hyperlegible"],
      ["dyslexic", "OpenDyslexic"],
      ["system", "System sans"]
    ], "Atkinson Hyperlegible is the default — a typeface designed for low-vision readers with distinctive character shapes. OpenDyslexic uses weighted bases to anchor letters and reduce confusion between similar shapes. System sans falls back to whatever your operating system uses.");
    addRow(display, "size", "Size level", [
      ["1", "1 — smallest"], ["2", "2"], ["3", "3 — default"], ["4", "4"], ["5", "5 — largest"]
    ]);
    addRow(display, "theme", "Theme", [
      ["default", "Off-white"],
      ["dark", "Dark"],
      ["hc", "High contrast"]
    ], "Off-white is the default — a warm cream background that's easier on the eyes than pure white. Dark is a muted dark grey for low-light environments. High contrast is bright yellow on black, designed for users with significant vision impairment or photophobia.");
    addRow(display, "motion", "Reduced motion", [
      ["auto", "Follow system"],
      ["on", "Always reduce"],
      ["off", "Allow motion"]
    ], "Controls whether interactive elements use animations (shake on incorrect answer, confetti on pack completion, etc). 'Follow system' respects your OS-level prefers-reduced-motion setting.");
    body.appendChild(display);

    if (opts.showLayoutDefaults) {
      const layout = DOM.el("div", { class: "field-group" });
      layout.appendChild(DOM.el("h3", null, "Layout defaults"));
      addRow(layout, "tl", "Activities pane", [
        ["expanded", "Show"], ["collapsed", "Hide"]
      ]);
      addRow(layout, "sp", "Feedback pane", [
        ["expanded", "Show"], ["collapsed", "Hide"]
      ]);
      body.appendChild(layout);
    }

    // Data management — two clearing actions. Both require an
    // explicit confirmation step before doing anything destructive.
    //
    //   1. "Reset current pack progress" — wipes the per-pack progress
    //      record so the student can start the pack over with a clean
    //      score. Doesn't touch settings, drafts, or other packs.
    //   2. "Clear all stored data" — nuclear option that empties
    //      every PyQuiz key from localStorage (progress for every
    //      pack, all teacher drafts, settings, layout sizes). Useful
    //      when something is wedged or when handing the device on.
    //
    // Both buttons live in the dialog and close it after success so
    // the user can see the reset has taken effect.
    const data = DOM.el("div", { class: "field-group" });
    data.appendChild(DOM.el("h3", null, "Data"));

    // Row 1: reset current pack
    const resetRow = DOM.el("div", { class: "field-row inline" });
    const resetLabel = DOM.el("div", { class: "field-label" });
    resetLabel.appendChild(DOM.el("label", null, "Reset progress for this pack"));
    resetRow.appendChild(resetLabel);
    const resetBtn = DOM.button("Reset…", function () {
      askConfirm({
        title: "Reset progress?",
        message: "This clears your score and all responses for the currently loaded pack. Your settings and other packs are untouched. This cannot be undone.",
        confirmLabel: "Reset progress",
        destructive: true,
        onConfirm: function () {
          /* Clear every progress key — handles the case where multiple
             packs have been loaded over time. The next pack load
             initialises a fresh record. */
          const Storage = PyQuiz.Storage;
          if (Storage && Storage.keys) {
            const all = Storage.keys();
            for (const k of all) {
              if (k.indexOf("pyquiz.v1.student.progress.") === 0) Storage.remove(k);
            }
          }
          /* Force a clean reload so the in-memory progress object the
             student app holds is rebuilt from storage. Without reload
             the UI would keep showing the old scores until you
             navigate. */
          location.reload();
        }
      });
    });
    resetRow.appendChild(resetBtn);
    data.appendChild(resetRow);

    // Row 2: nuclear clear-everything
    const wipeRow = DOM.el("div", { class: "field-row inline" });
    const wipeLabel = DOM.el("div", { class: "field-label" });
    wipeLabel.appendChild(DOM.el("label", null, "Clear all stored data"));
    /* The info button explains what disappears — helps the student
       understand whether they actually want this option vs the
       progress-only reset above. */
    const wipeInfo = DOM.el("button", {
      type: "button", class: "field-info-btn",
      "aria-label": "About clearing data", title: "What's this?"
    }, "ⓘ");
    wipeInfo.addEventListener("click", function () {
      openInfoDialog("Clear all stored data",
        "Removes EVERYTHING PyQuiz has saved on this device: progress for every pack you've worked on, any teacher drafts, your settings (font, theme, size), and remembered layout widths. The page reloads afterwards so you start from a clean slate. This cannot be undone.");
    });
    wipeLabel.appendChild(wipeInfo);
    wipeRow.appendChild(wipeLabel);
    const wipeBtn = DOM.button("Clear all…", function () {
      askConfirm({
        title: "Clear ALL data?",
        message: "Every progress record, draft, setting, and layout preference will be removed. The page will reload. This cannot be undone.",
        confirmLabel: "Clear everything",
        destructive: true,
        onConfirm: function () {
          const Storage = PyQuiz.Storage;
          if (Storage && Storage.keys) {
            const all = Storage.keys();
            for (const k of all) {
              if (k.indexOf("pyquiz.v1.") === 0) Storage.remove(k);
            }
          }
          location.reload();
        }
      });
    });
    wipeRow.appendChild(wipeBtn);
    data.appendChild(wipeRow);
    body.appendChild(data);

    // About the system row — opens a popup with activity-type info
    // and version metadata.
    const about = DOM.el("div", { class: "field-group" });
    about.appendChild(DOM.el("h3", null, "About"));
    const aboutRow = DOM.el("div", { class: "field-row inline" });
    aboutRow.appendChild(DOM.el("div", { class: "field-label" },
      DOM.el("label", null, "Activity types and versions")));
    const aboutBtn = DOM.button("View details", function () { openAboutDialog(); });
    aboutRow.appendChild(aboutBtn);
    about.appendChild(aboutRow);
    body.appendChild(about);

    const footer = DOM.el("div", { class: "modal-footer" });
    const cancel = DOM.button("Cancel", null);
    const save = DOM.button("Save", null, "primary");
    footer.appendChild(cancel);
    footer.appendChild(save);

    const dlg = Modal.open({ title: "Settings", body: body, footer: footer });
    cancel.addEventListener("click", dlg.close);
    save.addEventListener("click", () => {
      const patch = {};
      for (const k of Object.keys(inputs)) patch[k] = inputs[k].value;
      update(patch);
      dlg.close();
    });
  }

  /* Small explanation popup for a single setting. */
  function openInfoDialog(title, text) {
    const body = DOM.el("div");
    body.appendChild(DOM.el("p", null, text));
    const footer = DOM.el("div", { class: "modal-footer" });
    const ok = DOM.button("Close", null, "primary");
    footer.appendChild(ok);
    const dlg = Modal.open({ title: title, body: body, footer: footer });
    ok.addEventListener("click", dlg.close);
  }

  /* Two-step confirmation modal for destructive actions. Mirrors the
     pattern used elsewhere in the app: dialog with title, body
     paragraph and two footer buttons (Cancel + the destructive
     action styled red). Returns nothing; the caller's onConfirm runs
     after the second click. */
  function askConfirm(opts) {
    const body = DOM.el("div");
    body.appendChild(DOM.el("p", null, opts.message || "Are you sure?"));
    const footer = DOM.el("div", { class: "modal-footer" });
    const cancel = DOM.button("Cancel", null);
    const ok = DOM.button(opts.confirmLabel || "OK", null,
      opts.destructive ? "danger" : "primary");
    footer.appendChild(cancel);
    footer.appendChild(ok);
    const dlg = Modal.open({ title: opts.title || "Confirm", body: body, footer: footer });
    cancel.addEventListener("click", dlg.close);
    ok.addEventListener("click", function () {
      dlg.close();
      if (typeof opts.onConfirm === "function") opts.onConfirm();
    });
  }

  /* Activity-type reference + version metadata popup. */
  function openAboutDialog() {
    const C = (window.PyQuiz && window.PyQuiz.Constants) || {};
    const TYPE_LABELS = C.TYPE_LABELS || {};
    const TYPE_COLOURS = C.TYPE_COLOURS || {};
    const body = DOM.el("div");

    body.appendChild(DOM.el("p", null,
      "PyQuiz organises practice into seven activity types. Each tackles a different cognitive skill in programming."));

    const list = DOM.el("ul", { class: "about-types" });
    const types = [
      { key: "predict_output",    desc: "Read a snippet and predict what it prints — free text or multiple choice. Builds mental-execution skills." },
      { key: "parsons",           desc: "Reorder shuffled lines of code into a working program. Distractors must go to the bin. Builds structure intuition." },
      { key: "modify",            desc: "The code works. Change one line to make it do something different. Builds the cognitive move at the heart of PRIMM's Investigate / Modify step." },
      { key: "spot_the_bug",      desc: "The code is broken. Find the line and write a fix. Targets debugging as a separate skill from writing fresh code." },
      { key: "cloze",             desc: "Fill the blanks in a code template — free text, drop-down or click-to-place from a word bank. Useful for key-term recall." },
      { key: "trace_table",       desc: "Step through code line by line, recording how each variable changes. Builds a precise mental execution model." },
      { key: "starter_challenge", desc: "Open-ended coding task with example calls. The 'Make' step in a PRIMM journey, with optional scaffolding ladder." }
    ];
    types.forEach(function (t) {
      const li = DOM.el("li", { class: "about-type" });
      const swatch = DOM.el("span", { class: "about-type-swatch", "aria-hidden": "true" });
      swatch.style.background = TYPE_COLOURS[t.key] || "#888";
      li.appendChild(swatch);
      const text = DOM.el("div", { class: "about-type-text" });
      text.appendChild(DOM.el("strong", null, TYPE_LABELS[t.key] || t.key));
      text.appendChild(document.createTextNode(" — " + t.desc));
      li.appendChild(text);
      list.appendChild(li);
    });
    body.appendChild(list);

    body.appendChild(DOM.el("h4", { style: "margin-top:18px" }, "Versions"));
    const vlist = DOM.el("dl", { class: "about-versions" });
    function dt(k, v) {
      vlist.appendChild(DOM.el("dt", null, k));
      vlist.appendChild(DOM.el("dd", null, v));
    }
    dt("Schema version", C.SCHEMA_VERSION || "—");
    dt("Pack format version", C.PACK_FORMAT_VERSION || "—");
    dt("Schema hash", C.SCHEMA_HASH || "—");
    body.appendChild(vlist);

    const footer = DOM.el("div", { class: "modal-footer" });
    const ok = DOM.button("Close", null, "primary");
    footer.appendChild(ok);
    const dlg = Modal.open({ title: "About PyQuiz", body: body, footer: footer });
    ok.addEventListener("click", dlg.close);
  }

  apply();

  PyQuiz.Settings = {
    defaults: defaults,
    get: get,
    update: update,
    apply: apply,
    openDialog: openDialog,
    bumpSize: bumpSize,
    cycleTheme: cycleTheme
  };
})();
