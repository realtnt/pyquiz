/* =====================================================================
 * PyQuiz.Renderers — "starter_challenge"
 *
 * v0.1: copy-to-IDE only. The student copies the starter, works on it
 * in their own editor and ticks the acknowledgement to mark complete.
 * Pyodide / in-browser execution is deferred to v0.2.
 *
 * Response shape:
 *   { acknowledged: boolean }
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const DOM = PyQuiz.DOM;
  const S = PyQuiz.Strings;

  PyQuiz.Renderers.register("starter_challenge", function (activity, host, cb) {
    const p = activity.payload || {};
    const root = DOM.el("div", { class: "starter" });

    if (p.instructions) root.appendChild(DOM.el("p", { class: "starter-intro" }, p.instructions));

    // Starter code is OPTIONAL. Some challenges are just a problem
    // description with sample input/output — no starter code to copy.
    if (p.starter_code && p.starter_code.trim()) {
      const codeBox = DOM.el("div", { class: "starter-code" });
      codeBox.appendChild(DOM.codeBlock(p.starter_code, { label: "Starter code" }));
      const copyBtn = DOM.el("button", { type: "button", class: "btn ghost copy-btn" }, S.copyCode);
      copyBtn.addEventListener("click", async function () {
        try {
          await navigator.clipboard.writeText(p.starter_code || "");
          copyBtn.textContent = S.copied;
          setTimeout(() => copyBtn.textContent = S.copyCode, 1500);
        } catch (e) {
          const ta = document.createElement("textarea");
          ta.value = p.starter_code || "";
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand("copy"); copyBtn.textContent = S.copied; } catch (er) {}
          document.body.removeChild(ta);
          setTimeout(() => copyBtn.textContent = S.copyCode, 1500);
        }
      });
      codeBox.appendChild(copyBtn);
      root.appendChild(codeBox);
    }

    if ((p.example_calls || []).length) {
      const ex = DOM.el("div", { class: "starter-examples" });
      ex.appendChild(DOM.el("h3", null, "Example calls"));
      const tbl = DOM.el("table", { class: "examples-table" });
      const thead = DOM.el("thead");
      const trh = DOM.el("tr");
      trh.appendChild(DOM.el("th", { scope: "col" }, "Call"));
      trh.appendChild(DOM.el("th", { scope: "col" }, "Expected"));
      thead.appendChild(trh);
      tbl.appendChild(thead);
      const tbody = DOM.el("tbody");
      p.example_calls.forEach(c => {
        const tr = DOM.el("tr");
        tr.appendChild(DOM.el("td", null, DOM.el("code", null, c.call)));
        tr.appendChild(DOM.el("td", null, DOM.el("code", null, c.expected)));
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      ex.appendChild(tbl);
      root.appendChild(ex);
    }

    if (p.self_check_guidance) {
      root.appendChild(DOM.el("p", { class: "starter-guide" }, p.self_check_guidance));
    }

    const ackWrap = DOM.el("div", { class: "starter-ack" });
    const ackLabel = DOM.el("label");
    const ackChk = DOM.el("input", { type: "checkbox" });
    let acknowledged = false;
    ackChk.addEventListener("change", () => {
      acknowledged = ackChk.checked;
      if (cb.onChange) cb.onChange({ acknowledged: acknowledged });
    });
    ackLabel.appendChild(ackChk);
    ackLabel.appendChild(document.createTextNode(" I have solved this in my IDE"));
    ackWrap.appendChild(ackLabel);
    root.appendChild(ackWrap);

    host.appendChild(root);

    return {
      getResponse: function () { return { acknowledged: acknowledged }; },
      setResponse: function (r) { if (r && r.acknowledged) { acknowledged = true; ackChk.checked = true; } },
      reset: function () { acknowledged = false; ackChk.checked = false; },
      highlight: function () {},
      focus: function () { ackChk.focus(); }
    };
  });
})();
