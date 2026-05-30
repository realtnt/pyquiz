/* === inlined from js/ui/dom.js === */
/* =====================================================================
 * PyQuiz.DOM — DOM construction helpers
 *
 * Small, dependency-free helpers used by renderers, editors and shells.
 * Keeps imperative DOM noise out of the activity-specific files.
 *
 * Public API:
 *   PyQuiz.DOM.el(tag, attrs, ...children)
 *     Build an element. `attrs` may contain:
 *       class:  string (becomes className)
 *       style:  string (becomes style attribute)
 *       html:   string (becomes innerHTML)
 *       on<X>:  function (added as event listener for event "x")
 *       <other>: set as attribute (verbatim)
 *     Children may be strings (text nodes), elements, or null (skipped).
 *
 *   PyQuiz.DOM.text(text)               → text node
 *   PyQuiz.DOM.button(label, onClick, cls?)  → <button type="button">
 *   PyQuiz.DOM.h3(text)                 → <h3>
 *   PyQuiz.DOM.escapeHtml(s)            → HTML-escaped string
 *
 *   PyQuiz.DOM.codeBlock(code, opts?)
 *     opts: { lineNumbers?: boolean, label?: string }
 *
 *   PyQuiz.DOM.field(host, label, type, value, onChange, opts?)
 *     Append a form-row to `host`. type in:
 *       "text" | "number" | "textarea" | "select" | "checkbox"
 *     For "select", opts = [[value, label], ...]
 *
 *   PyQuiz.DOM.download(filename, content, mimeType)
 *     Trigger a browser download of an in-memory string.
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});

  function el(tag, attrs) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        const v = attrs[k];
        if (v == null) continue;
        if (k === "class") e.className = v;
        else if (k === "style") e.setAttribute("style", v);
        else if (k === "html") e.innerHTML = v;
        else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v);
      }
    }
    for (let i = 2; i < arguments.length; i++) {
      const c = arguments[i];
      if (c == null) continue;
      if (typeof c === "string") e.appendChild(document.createTextNode(c));
      else e.appendChild(c);
    }
    return e;
  }

  function text(s) { return document.createTextNode(s == null ? "" : String(s)); }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function button(label, onClick, cls) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn " + (cls || "");
    b.textContent = label;
    if (onClick) b.addEventListener("click", onClick);
    return b;
  }

  function h3(t) {
    const h = document.createElement("h3");
    h.textContent = t;
    return h;
  }

  function codeBlock(code, opts) {
    opts = opts || {};
    const wrap = el("div", { class: "code-block" + (opts.lineNumbers ? " with-lines" : "") });
    const pre = el("pre", { "aria-label": opts.label || "Code snippet" });
    if (opts.lineNumbers) {
      const lines = (code || "").split("\n");
      lines.forEach((l, i) => {
        const row = el("span", { class: "code-row" },
          el("span", { class: "code-ln" }, String(i + 1)),
          el("span", { class: "code-src" }, l || " "));
        pre.appendChild(row);
      });
    } else {
      pre.appendChild(el("code", null, code || ""));
    }
    wrap.appendChild(pre);
    return wrap;
  }

  /* field(host, label, type, value, onChange, opts) builds a labelled
     form row inside `host`. Supported types:
       text, number, textarea, select, checkbox, radio, colour, code
     opts varies per type:
       select  → array of [value, label]
       radio   → array of [value, label]  (renders as pill buttons)
       colour  → array of hex strings; user picks one or clears
       code    → { language?: "python", lineNumbers?: true, rows?: 8 }
     Any type accepts opts.inline (true) to render label and control on
     one row instead of stacking. opts.hint = small grey helper text. */
  /* Standalone syntax-highlighted code editor. A textarea is overlaid on a
     <pre> that renders the highlighted code with matching font metrics; both
     scroll in sync, with an optional line-number gutter on the left. Returns
     { editor, input, refresh }. Used by field("code", …) and directly by the
     teacher's live-edit surface. */
  function codeEditor(value, onChange, opts) {
    const cfg = opts || {};
    const lang = cfg.language || "python";
    const highlightFn = (lang === "python") ? highlightPython : escapeHtml;
    const editor = el("div", { class: "code-editor" + (cfg.lineNumbers === false ? "" : " has-gutter") });
    const gutter = el("div", { class: "code-editor-gutter", "aria-hidden": "true" });
    const wrap = el("div", { class: "code-editor-wrap" });
    const highlight = el("pre", { class: "code-editor-highlight", "aria-hidden": "true" });
    const codeEl = el("code", { class: "language-" + lang });
    highlight.appendChild(codeEl);
    const input = document.createElement("textarea");
    input.className = "code-editor-input";
    input.spellcheck = false;
    input.value = value == null ? "" : value;
    input.rows = cfg.rows || 8;
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("autocapitalize", "off");
    if (cfg.id) input.id = cfg.id;
    function refresh() {
      const src = input.value;
      codeEl.innerHTML = highlightFn(src);
      const lineCount = src.split("\n").length;
      let nums = "";
      for (let i = 1; i <= lineCount; i++) nums += i + "\n";
      gutter.textContent = nums;
    }
    input.addEventListener("input", () => { refresh(); if (onChange) onChange(input.value); });
    input.addEventListener("scroll", () => {
      highlight.scrollTop = input.scrollTop;
      highlight.scrollLeft = input.scrollLeft;
      gutter.scrollTop = input.scrollTop;
    });
    input.addEventListener("keydown", function (ev) {
      if (ev.key === "Tab") {
        ev.preventDefault();
        const start = input.selectionStart, end = input.selectionEnd;
        input.value = input.value.slice(0, start) + "    " + input.value.slice(end);
        input.selectionStart = input.selectionEnd = start + 4;
        refresh();
        if (onChange) onChange(input.value);
      }
    });
    wrap.appendChild(highlight);
    wrap.appendChild(input);
    editor.appendChild(gutter);
    editor.appendChild(wrap);
    refresh();
    return { editor: editor, input: input, refresh: refresh };
  }

  /* Convenience: append a bare code editor (no form-row label) to `host`. */
  function codeField(host, value, onChange, opts) {
    const ce = codeEditor(value, onChange, opts);
    host.appendChild(ce.editor);
    return ce.input;
  }

  /* A chips/tags field. Renders the current values as removable pills plus a
     short text input; typing a value and pressing Enter (or comma) adds it,
     Backspace on the empty input removes the last chip. Calls onChange(array)
     with the de-duplicated, trimmed list after any change. Appended to `host`
     inside a labelled form-row. Returns the wrapper element. */
  function chipsField(host, label, values, onChange, opts) {
    opts = opts || {};
    // Splitter turns a typed string into one-or-more values. Default splits on
    // commas; callers (e.g. the cloze word bank) can pass a brace-aware
    // splitter so a value containing a comma can be entered as {{a,b}}.
    const splitter = opts.splitter || function (s) { return s.split(",").map(x => x.trim()).filter(Boolean); };
    const caseSensitive = !!opts.caseSensitive;
    const row = el("div", { class: "form-row" });
    const id = "chips-" + Math.random().toString(36).slice(2, 8);
    row.appendChild(el("label", { for: id }, label));
    const box = el("div", { class: "chips-field" });
    let items = (values || []).map(s => String(s).trim()).filter(Boolean);

    function commit() {
      // De-dupe preserving order (case-insensitively unless caseSensitive).
      const seen = {}; const out = [];
      items.forEach(v => { const k = caseSensitive ? v : v.toLowerCase(); if (v && !seen[k]) { seen[k] = 1; out.push(v); } });
      items = out;
      onChange(items.slice());
    }
    function rebuild(focusInput) {
      box.innerHTML = "";
      items.forEach((v, i) => {
        const chip = el("span", { class: "chip" });
        chip.appendChild(el("span", { class: "chip-text" }, v));
        const x = el("button", { type: "button", class: "chip-x", "aria-label": "Remove " + v }, "\u00d7");
        x.addEventListener("click", () => { items.splice(i, 1); commit(); rebuild(true); });
        chip.appendChild(x);
        box.appendChild(chip);
      });
      const inp = el("input", { type: "text", class: "chips-input", id: id,
        autocomplete: "off", placeholder: items.length ? "" : (opts.placeholder || "Add\u2026") });
      function addFromInput() {
        const parts = splitter(inp.value);
        if (parts.length) { items = items.concat(parts); inp.value = ""; commit(); rebuild(true); }
      }
      inp.addEventListener("keydown", ev => {
        // A comma only triggers an add when it isn't inside a {{...}} group.
        if (ev.key === "Enter") { ev.preventDefault(); addFromInput(); }
        else if (ev.key === ",") {
          const open = (inp.value.match(/\{\{/g) || []).length;
          const close = (inp.value.match(/\}\}/g) || []).length;
          if (open <= close) { ev.preventDefault(); addFromInput(); }
        }
        else if (ev.key === "Backspace" && inp.value === "" && items.length) {
          ev.preventDefault(); items.pop(); commit(); rebuild(true);
        }
      });
      inp.addEventListener("blur", () => { if (inp.value.trim()) addFromInput(); });
      box.appendChild(inp);
      if (focusInput) inp.focus();
    }
    rebuild(false);
    row.appendChild(box);
    if (opts.hint) row.appendChild(el("p", { class: "form-hint" }, opts.hint));
    host.appendChild(row);
    return row;
  }

  function field(host, label, type, value, onChange, opts) {
    const isOpts = opts && typeof opts === "object" && !Array.isArray(opts);
    const arrOpts = Array.isArray(opts) ? opts : null;
    const optObj = isOpts ? opts : {};
    const inline = optObj.inline === true;
    const hint = optObj.hint || null;
    const row = el("div", { class: "form-row" + (inline ? " form-row-inline" : "") });
    const id = "fld-" + Math.random().toString(36).slice(2, 8);
    const lbl = el("label", { for: id }, label);
    row.appendChild(lbl);

    let input;
    if (type === "textarea") {
      input = document.createElement("textarea");
      input.value = value == null ? "" : value;
      input.rows = optObj.rows || 3;
      // Prose textareas (e.g. a pack description) use a normal font rather
      // than the monospace default applied to code-ish fields.
      if (optObj.prose) input.classList.add("prose-textarea");
    } else if (type === "select") {
      input = document.createElement("select");
      (arrOpts || []).forEach(([v, l]) => {
        const o = document.createElement("option");
        o.value = v;
        o.textContent = l;
        if (String(v) === String(value)) o.selected = true;
        input.appendChild(o);
      });
    } else if (type === "checkbox") {
      const wrap = el("div", { class: "form-checkbox-wrap" });
      input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !!value;
      input.id = id;
      wrap.appendChild(input);
      row.appendChild(wrap);
      if (hint) row.appendChild(el("p", { class: "form-hint" }, hint));
      input.addEventListener("change", () => onChange(input.checked));
      host.appendChild(row);
      return input;
    } else if (type === "radio") {
      // Toggle-button group (no radio inputs): each option is a button that
      // highlights when selected. opts.disabled is an array of values to grey
      // out (used to hide combinations that don't make sense).
      const disabled = (optObj && optObj.disabled) || [];
      const grp = el("div", { class: "form-btn-group", role: "group", "aria-label": label });
      function paint() {
        Array.from(grp.children).forEach(b => {
          const on = String(b.getAttribute("data-val")) === String(value);
          b.classList.toggle("active", on);
          b.setAttribute("aria-pressed", on ? "true" : "false");
        });
      }
      (arrOpts || []).forEach(([v, l]) => {
        const b = el("button", { type: "button", class: "form-btn-toggle", "data-val": String(v) }, l);
        if (disabled.indexOf(v) !== -1) { b.disabled = true; b.classList.add("is-disabled"); }
        b.addEventListener("click", () => {
          if (b.disabled) return;
          value = b.getAttribute("data-val");
          paint();
          onChange(value);
        });
        grp.appendChild(b);
      });
      paint();
      row.appendChild(grp);
      if (hint) row.appendChild(el("p", { class: "form-hint" }, hint));
      host.appendChild(row);
      return grp;
    } else if (type === "slider") {
      // Range slider with discrete notches and a live value label. opts.min,
      // opts.max, opts.step, opts.labels (array mapping value→label).
      const min = (optObj.min != null) ? optObj.min : 1;
      const max = (optObj.max != null) ? optObj.max : 5;
      const step = optObj.step || 1;
      const labels = optObj.labels || null;
      const wrap = el("div", { class: "form-slider-wrap" });
      input = document.createElement("input");
      input.type = "range";
      input.className = "form-slider";
      input.min = String(min); input.max = String(max); input.step = String(step);
      input.value = String(value != null ? value : min);
      input.id = id;
      const valLabel = el("span", { class: "form-slider-value" }, labels ? (labels[input.value] || input.value) : input.value);
      // Notch ticks.
      const ticks = el("div", { class: "form-slider-ticks", "aria-hidden": "true" });
      for (let v = min; v <= max; v += step) ticks.appendChild(el("span", { class: "form-slider-tick" }));
      wrap.appendChild(input);
      wrap.appendChild(ticks);
      wrap.appendChild(valLabel);
      input.addEventListener("input", () => {
        valLabel.textContent = labels ? (labels[input.value] || input.value) : input.value;
        onChange(input.value);
      });
      row.appendChild(wrap);
      if (hint) row.appendChild(el("p", { class: "form-hint" }, hint));
      host.appendChild(row);
      return input;
    } else if (type === "colour") {
      // Swatch picker — a row of preset colours plus a "clear" option.
      const wrap = el("div", { class: "form-swatch-wrap" });
      const swatches = arrOpts || [];
      const current = (value || "").trim();
      // "default" swatch — clears the override
      const clearBtn = el("button", {
        type: "button",
        class: "form-swatch form-swatch-clear" + (!current ? " is-selected" : ""),
        title: "Use the default colour for this activity type",
        "aria-label": "Use default colour"
      });
      clearBtn.addEventListener("click", () => {
        for (const s of wrap.querySelectorAll(".form-swatch")) s.classList.remove("is-selected");
        clearBtn.classList.add("is-selected");
        onChange("");
      });
      wrap.appendChild(clearBtn);
      swatches.forEach(hex => {
        const sw = el("button", {
          type: "button",
          class: "form-swatch" + (current.toLowerCase() === hex.toLowerCase() ? " is-selected" : ""),
          title: hex,
          "aria-label": "Pick colour " + hex
        });
        sw.style.background = hex;
        sw.addEventListener("click", () => {
          for (const s of wrap.querySelectorAll(".form-swatch")) s.classList.remove("is-selected");
          sw.classList.add("is-selected");
          onChange(hex);
        });
        wrap.appendChild(sw);
      });
      row.appendChild(wrap);
      if (hint) row.appendChild(el("p", { class: "form-hint" }, hint));
      host.appendChild(row);
      return wrap;
    } else if (type === "code") {
      // Syntax-highlighted code editor with line numbers (shared builder).
      const cfg = optObj || {};
      const ce = codeEditor(value, onChange, { language: cfg.language || "python",
        lineNumbers: cfg.lineNumbers, rows: cfg.rows, id: id });
      input = ce.input;
      row.appendChild(ce.editor);
      if (hint) row.appendChild(el("p", { class: "form-hint" }, hint));
      host.appendChild(row);
      return input;
    } else {
      input = document.createElement("input");
      input.type = type;
      input.value = value == null ? "" : value;
    }
    input.id = id;
    input.addEventListener(type === "select" ? "change" : "input", () => onChange(input.value));
    row.appendChild(input);
    if (hint) row.appendChild(el("p", { class: "form-hint" }, hint));
    host.appendChild(row);
    return input;
  }

  /* Minimal Python syntax highlighter. Operates on plain strings and
     returns HTML with <span class="tok-*"> wrappers. Designed for the
     editor preview — not a full lexer; handles the common token classes
     well enough to colour-code a teacher's draft snippet. */
  const PY_KEYWORDS = new Set([
    "False", "None", "True", "and", "as", "assert", "async", "await", "break",
    "class", "continue", "def", "del", "elif", "else", "except", "finally",
    "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal",
    "not", "or", "pass", "raise", "return", "try", "while", "with", "yield",
    "match", "case"
  ]);
  const PY_BUILTINS = new Set([
    "print", "input", "len", "range", "int", "float", "str", "bool", "list",
    "dict", "tuple", "set", "abs", "min", "max", "sum", "round", "sorted",
    "reversed", "enumerate", "zip", "map", "filter", "type", "isinstance",
    "open", "any", "all", "chr", "ord", "format", "iter", "next", "repr"
  ]);
  function highlightPython(src) {
    const out = [];
    let i = 0;
    const N = src.length;
    function pushTok(cls, text) {
      out.push('<span class="tok-' + cls + '">' + escapeHtml(text) + '</span>');
    }
    function pushRaw(text) {
      out.push(escapeHtml(text));
    }
    while (i < N) {
      const c = src[i];
      // Comments — # to end of line
      if (c === "#") {
        let j = i;
        while (j < N && src[j] !== "\n") j++;
        pushTok("comment", src.slice(i, j));
        i = j;
        continue;
      }
      // Strings — single-line "..." or '...', and triple-quoted
      if (c === '"' || c === "'") {
        const triple = src.slice(i, i + 3);
        if (triple === '"""' || triple === "'''") {
          const close = triple;
          let j = i + 3;
          while (j < N && src.slice(j, j + 3) !== close) j++;
          const end = Math.min(N, j + 3);
          pushTok("string", src.slice(i, end));
          i = end;
          continue;
        }
        let j = i + 1;
        while (j < N && src[j] !== c && src[j] !== "\n") {
          if (src[j] === "\\" && j + 1 < N) j += 2;
          else j++;
        }
        if (j < N && src[j] === c) j++;
        pushTok("string", src.slice(i, j));
        i = j;
        continue;
      }
      // Numbers — digits with optional . and digit separators. We do NOT
      // include +/- here: a trailing sign belongs to the following operator
      // (e.g. "2-3" is number, op, number), and swallowing it mis-coloured
      // the rest of the line. Exponent signs are handled by allowing e/E only
      // immediately, which is rare enough in teaching snippets to skip.
      if (c >= "0" && c <= "9") {
        let j = i;
        while (j < N && /[0-9_.xXbBoOeEa-fA-F]/.test(src[j])) j++;
        pushTok("number", src.slice(i, j));
        i = j;
        continue;
      }
      // Identifiers (and keywords / builtins)
      if (/[A-Za-z_]/.test(c)) {
        let j = i;
        while (j < N && /[A-Za-z0-9_]/.test(src[j])) j++;
        const word = src.slice(i, j);
        if (PY_KEYWORDS.has(word))      pushTok("keyword", word);
        else if (PY_BUILTINS.has(word)) pushTok("builtin", word);
        else                            pushRaw(word);
        i = j;
        continue;
      }
      // Operators and punctuation
      if (/[+\-*/%=<>!&|^~]/.test(c)) {
        let j = i;
        while (j < N && /[+\-*/%=<>!&|^~]/.test(src[j])) j++;
        pushTok("op", src.slice(i, j));
        i = j;
        continue;
      }
      pushRaw(c);
      i++;
    }
    return out.join("");
  }

  function download(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType || "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* Drag-to-resize side panes.
     Used by both the student and teacher shells. The handle is a thin
     vertical strip pinned to the inner edge of the pane that updates a
     CSS variable on .layout so the grid track resizes in real time.

     setupPaneResize(opts?) wires both panes. opts.persist (default false)
     is a function (key, width) called on mouseup so callers can persist
     widths in their own settings store; pass undefined to skip persistence
     entirely.

       opts.persist: function(settingsKey, width) → void
       opts.min:     min width in px (default 220 task-list, 240 side-panel)
       opts.max:     max width in px (default 480 task-list, 720 side-panel)
  */
  function setupPaneResize(opts) {
    opts = opts || {};
    setupResizeFor("task-list",  "tl_width", "--tl-w", { side: "right", min: 220, max: 480 }, opts.persist);
    setupResizeFor("side-panel", "sp_width", "--sp-w", { side: "left",  min: 280, max: 720 }, opts.persist);
  }
  function setupResizeFor(paneId, settingsKey, cssVar, paneOpts, persist) {
    const pane = document.getElementById(paneId);
    if (!pane || pane.querySelector(".pane-resize")) return;
    const handle = document.createElement("div");
    handle.className = "pane-resize pane-resize-" + paneOpts.side;
    handle.setAttribute("aria-label", "Drag to resize");
    handle.setAttribute("role", "separator");
    handle.setAttribute("aria-orientation", "vertical");
    pane.appendChild(handle);

    const layout = document.getElementById("layout");
    let startX = 0;
    let startW = 0;
    let dragging = false;
    function onDown(ev) {
      const x = ev.clientX != null ? ev.clientX : (ev.touches && ev.touches[0].clientX);
      if (x == null) return;
      const cs = getComputedStyle(layout);
      startW = parseFloat(cs.getPropertyValue(cssVar)) || pane.getBoundingClientRect().width || 280;
      startX = x;
      dragging = true;
      layout.classList.add("resizing");
      document.body.style.userSelect = "none";
      document.body.style.cursor = "ew-resize";
      ev.preventDefault();
    }
    function onMove(ev) {
      if (!dragging) return;
      const x = ev.clientX != null ? ev.clientX : (ev.touches && ev.touches[0].clientX);
      if (x == null) return;
      const sign = paneOpts.side === "right" ? 1 : -1;
      const delta = sign * (x - startX);
      const w = Math.max(paneOpts.min, Math.min(paneOpts.max, startW + delta));
      layout.style.setProperty(cssVar, w + "px");
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      layout.classList.remove("resizing");
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      if (typeof persist === "function") {
        const w = parseFloat(getComputedStyle(layout).getPropertyValue(cssVar)) || (paneOpts.side === "right" ? 280 : 360);
        persist(settingsKey, Math.round(w));
      }
    }
    handle.addEventListener("mousedown", onDown);
    handle.addEventListener("touchstart", onDown);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onUp);
  }

  PyQuiz.DOM = {
    el: el, text: text, escapeHtml: escapeHtml,
    button: button, h3: h3, codeBlock: codeBlock,
    field: field, codeEditor: codeEditor, codeField: codeField,
    chipsField: chipsField,
    download: download,
    setupPaneResize: setupPaneResize
  };
})();
