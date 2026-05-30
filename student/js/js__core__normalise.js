/* === inlined from js/core/normalise.js === */
/* =====================================================================
 * PyQuiz.Normalise — text normalisation profiles (spec §10.1)
 *
 * The ONLY place text-equality rules live. Markers MUST use these
 * functions. Per-activity flags do not override these profiles in v0.1.
 *
 * Public API:
 *   PyQuiz.Normalise.baseClean(s)
 *     tabs -> 4 spaces; strip trailing whitespace per line; strip
 *     trailing blank lines.
 *
 *   PyQuiz.Normalise.collapseOutsideStrings(s)
 *     collapse runs of internal spaces to one space, OUTSIDE string
 *     literals. Detects single/double/triple quoted strings with a
 *     small state machine. If quotes don't balance, falls back to no
 *     collapse.
 *
 *   PyQuiz.Normalise.pythonCode(s)
 *     Profile for cloze free-text answers and spot_the_bug fixes.
 *     = baseClean + collapseOutsideStrings.
 *
 *   PyQuiz.Normalise.outputText(s)
 *     Profile for predict_output free text. = baseClean only
 *     (internal whitespace preserved).
 *
 *   PyQuiz.Normalise.traceCell(s)
 *     Profile for trace table cells. Trim only.
 *
 *   PyQuiz.Normalise.equalsAny(response, acceptedArray, profileFn)
 *     Convenience: does `response` (after profile) equal any item of
 *     `acceptedArray` (each also after profile)?
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});

  const Normalise = {
    baseClean: function (s) {
      if (s == null) return "";
      s = String(s).replace(/\t/g, "    ");
      s = s.split("\n").map(l => l.replace(/[ \t]+$/g, "")).join("\n");
      s = s.replace(/\n+$/g, "");
      return s;
    },

    collapseOutsideStrings: function (s) {
      let out = "";
      let i = 0;
      let inStr = null; // null | { quote, triple }
      while (i < s.length) {
        const c = s[i];
        if (inStr) {
          out += c;
          if (inStr.triple) {
            if (s.substr(i, 3) === inStr.quote.repeat(3)) {
              out += s[i + 1] + s[i + 2];
              i += 3;
              inStr = null;
              continue;
            }
            if (c === "\\" && i + 1 < s.length) { out += s[i + 1]; i += 2; continue; }
            i++;
          } else {
            if (c === "\\" && i + 1 < s.length) { out += s[i + 1]; i += 2; continue; }
            if (c === inStr.quote) { inStr = null; }
            i++;
          }
        } else {
          if (c === '"' || c === "'") {
            if (s.substr(i, 3) === c.repeat(3)) {
              inStr = { quote: c, triple: true };
              out += s.substr(i, 3);
              i += 3;
              continue;
            }
            inStr = { quote: c, triple: false };
            out += c;
            i++;
          } else if (c === " ") {
            out += " ";
            while (i + 1 < s.length && s[i + 1] === " ") i++;
            i++;
          } else {
            out += c;
            i++;
          }
        }
      }
      if (inStr) return s; // unterminated — bail to original
      return out;
    },

    pythonCode: function (s) {
      s = this.baseClean(s);
      s = this.collapseOutsideStrings(s);
      return s;
    },

    outputText: function (s) {
      return this.baseClean(s);
    },

    traceCell: function (s) {
      if (s == null) return "";
      return String(s).trim();
    },

    equalsAny: function (response, accepted, fn) {
      const n = fn.call(this, response);
      for (const a of accepted) if (n === fn.call(this, a)) return true;
      return false;
    }
  };

  PyQuiz.Normalise = Normalise;
})();
