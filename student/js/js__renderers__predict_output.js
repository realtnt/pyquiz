/* === inlined from js/renderers/predict_output.js === */
/* =====================================================================
 * PyQuiz.Renderers — "predict_output"
 *
 * Two directions: code → output (default) or output → code. Two modes:
 * multiple choice or free text. The output_to_code direction always
 * implies multiple choice (a free-text mapping makes no sense there).
 *
 * Response shape:
 *   { value: "..." }            for free_text
 *   { selected_option: "id" }   for multiple_choice
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const DOM = PyQuiz.DOM;

  PyQuiz.Renderers.register("predict_output", function (activity, host, cb) {
    const p = activity.payload || {};
    const direction = p.direction || "code_to_output";
    const mode = p.mode || "free_text";

    const root = DOM.el("div", { class: "po" });

    if (direction === "code_to_output") {
      root.appendChild(DOM.el("h3", null, "Code"));
      root.appendChild(DOM.codeBlock(p.code || "", { lineNumbers: true, label: "Code to predict output of" }));
    } else {
      root.appendChild(DOM.el("h3", null, "Output"));
      root.appendChild(DOM.codeBlock(p.code || "", { label: "Output to match" }));
    }

    if (mode === "multiple_choice") {
      const optsBox = DOM.el("div", { class: "po-options", role: "radiogroup",
        "aria-label": direction === "code_to_output" ? "Which output is produced?" : "Which code produces this output?" });
      optsBox.appendChild(DOM.el("p", { class: "po-options-legend" },
        direction === "code_to_output" ? "Which output is produced?" : "Which code produces this output?"));
      let selected = null;
      const optionButtons = [];
      function selectOpt(id) {
        selected = id;
        optionButtons.forEach(b => {
          const on = b.dataset.optId === id;
          b.classList.toggle("selected", on);
          b.setAttribute("aria-checked", on ? "true" : "false");
        });
        if (cb.onChange) cb.onChange({ selected_option: selected });
      }
      (p.options || []).forEach(opt => {
        const btn = DOM.el("button", {
          type: "button",
          class: "po-option",
          role: "radio",
          "aria-checked": "false",
          "data-opt-id": opt.id
        });
        btn.dataset.optId = opt.id;
        btn.appendChild(DOM.el("pre", { class: "po-option-code" }, opt.content));
        btn.addEventListener("click", () => selectOpt(opt.id));
        btn.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            selectOpt(opt.id);
          }
        });
        optionButtons.push(btn);
        optsBox.appendChild(btn);
      });
      root.appendChild(optsBox);
      host.appendChild(root);
      return {
        getResponse: function () { return { selected_option: selected }; },
        setResponse: function (r) {
          if (!r || !r.selected_option) return;
          selectOpt(r.selected_option);
        },
        reset: function () {
          selected = null;
          optionButtons.forEach(b => {
            b.classList.remove("selected");
            b.setAttribute("aria-checked", "false");
          });
        },
        highlight: function () {},
        focus: function () {
          if (optionButtons.length) optionButtons[0].focus();
        }
      };
    }

    // free text
    const wrap = DOM.el("div", { class: "po-free" });
    wrap.appendChild(DOM.el("label", { for: "po-input-" + activity.id }, "Output:"));
    const ta = DOM.el("textarea", {
      id: "po-input-" + activity.id,
      class: "po-input",
      rows: "5",
      autocomplete: "off",
      spellcheck: "false",
      "aria-label": "Predicted output"
    });
    ta.addEventListener("input", () => { if (cb.onChange) cb.onChange({ value: ta.value }); });
    wrap.appendChild(ta);
    root.appendChild(wrap);
    host.appendChild(root);

    return {
      getResponse: function () { return { value: ta.value }; },
      setResponse: function (r) { if (r && r.value != null) ta.value = r.value; },
      reset: function () { ta.value = ""; },
      highlight: function () {},
      focus: function () { ta.focus(); }
    };
  });
})();
