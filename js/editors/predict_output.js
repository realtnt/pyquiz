/* =====================================================================
 * PyQuiz.Editors — "predict_output" form editor
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const DOM = PyQuiz.DOM;

  PyQuiz.Editors.register("predict_output", function (host, act, ctx) {
    const p = act.payload;
    const onChange = ctx.onChange || function () {};
    const refresh = ctx.refresh || function () {};

    DOM.field(host, "Direction", "radio", p.direction || "code_to_output", v => {
      p.direction = v;
      if (v === "output_to_code") p.mode = "multiple_choice";
      onChange();
      refresh();
    }, [
      ["code_to_output", "Code → output"],
      ["output_to_code", "Output → code"]
    ]);

    const modeOpts = p.direction === "output_to_code"
      ? [["multiple_choice", "Multiple choice"]]
      : [["free_text", "Free text"], ["multiple_choice", "Multiple choice"]];
    DOM.field(host, "Mode", "radio", p.mode || "free_text", v => { p.mode = v; onChange(); refresh(); }, modeOpts);

    // Code or output stem — line-numbered editor for code, plain
    // textarea for the output stem (it's not Python).
    if (p.direction === "output_to_code") {
      DOM.field(host, "Output (stem)", "textarea", p.code || "",
        v => { p.code = v; onChange(); }, { rows: 4 });
    } else {
      DOM.field(host, "Code", "code", p.code || "",
        v => { p.code = v; onChange(); },
        { rows: 6, language: "python", lineNumbers: true });
    }

    if (p.mode === "multiple_choice") {
      const sec = DOM.el("div", { style: "margin-top:10px" });
      sec.appendChild(DOM.h3("Options"));
      p.options = p.options || [];
      const list = DOM.el("div");
      sec.appendChild(list);

      function redrawOpts() {
        list.innerHTML = "";
        if (!p.options.length) {
          list.appendChild(DOM.el("p", { class: "form-empty" }, "No options yet — add at least two for multiple choice."));
        }
        (p.options || []).forEach((o, i) => {
          const card = DOM.el("div", { class: "form-card" });
          const head = DOM.el("div", { class: "form-card-head" });
          // Radio + label on the left, delete button on the right
          const radioLab = DOM.el("label", { class: "form-card-radio" });
          const r = DOM.el("input", { type: "radio", name: "po-answer-" + act.id });
          r.checked = p.answer === o.id;
          r.addEventListener("change", () => { p.answer = o.id; onChange(); });
          radioLab.appendChild(r);
          radioLab.appendChild(document.createTextNode("Correct answer"));
          head.appendChild(radioLab);
          head.appendChild(DOM.button("✕", () => { p.options.splice(i, 1); onChange(); redrawOpts(); }, "icon"));
          card.appendChild(head);
          DOM.field(card, "ID", "text", o.id, v => {
            if (p.answer === o.id) p.answer = v;
            o.id = v;
            onChange();
          }, { hint: "Short identifier used internally — students never see this." });
          DOM.field(card, "Content", "textarea", o.content || "",
            v => { o.content = v; onChange(); }, { rows: 2 });
          list.appendChild(card);
        });
      }
      redrawOpts();
      sec.appendChild(DOM.button("+ Add option", () => {
        p.options.push({ id: "o" + ((p.options || []).length + 1), content: "" });
        onChange(); redrawOpts();
      }, "ghost"));
      host.appendChild(sec);
    } else {
      DOM.field(host, "Answer", "textarea", p.answer || "", v => { p.answer = v; onChange(); }, { rows: 2, hint: "The canonical output — what a correct program would print." });
      DOM.field(host, "Also accepted", "textarea", (p.accepted_answers || []).join("\n"), v => { p.accepted_answers = v.split("\n").filter(x => x.length); onChange(); }, { rows: 2, hint: "One per line — alternative outputs also accepted." });
    }
  });
})();
