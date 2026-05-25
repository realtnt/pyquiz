/* =====================================================================
 * PyQuiz.Storage — localStorage adapter with in-memory fallback (spec §7)
 *
 * Apps MUST go through this adapter; they must NOT touch localStorage
 * directly. On file:// in Chromium with default settings the adapter
 * returns "memory" and the apps should surface a non-blocking banner.
 *
 * Keyspace (spec §7.2):
 *   pyquiz.v1.student.packs
 *   pyquiz.v1.student.progress.<packId>
 *   pyquiz.v1.student.archive
 *   pyquiz.v1.teacher.drafts
 *   pyquiz.v1.teacher.lastOpen
 *   pyquiz.v1.settings
 *
 * Public API:
 *   PyQuiz.Storage.mode()                 → "local" | "memory"
 *   PyQuiz.Storage.get(key)               → any | null   (JSON-parsed)
 *   PyQuiz.Storage.set(key, value)        → boolean      (JSON-stringified)
 *   PyQuiz.Storage.remove(key)            → void
 *   PyQuiz.Storage.keys(prefix?)          → string[]
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});

  let mode = "memory";
  const mem = {};
  try {
    const k = "_pyquiz_probe";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    mode = "local";
  } catch (e) {
    mode = "memory";
  }

  PyQuiz.Storage = {
    mode: function () { return mode; },

    get: function (key) {
      try {
        if (mode === "local") {
          const v = localStorage.getItem(key);
          return v == null ? null : JSON.parse(v);
        }
        return key in mem ? JSON.parse(mem[key]) : null;
      } catch (e) { return null; }
    },

    set: function (key, value) {
      const s = JSON.stringify(value);
      try {
        if (mode === "local") localStorage.setItem(key, s);
        else mem[key] = s;
        return true;
      } catch (e) { return false; }
    },

    remove: function (key) {
      if (mode === "local") localStorage.removeItem(key);
      else delete mem[key];
    },

    keys: function (prefix) {
      const result = [];
      if (mode === "local") {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!prefix || k.startsWith(prefix)) result.push(k);
        }
      } else {
        for (const k of Object.keys(mem)) {
          if (!prefix || k.startsWith(prefix)) result.push(k);
        }
      }
      return result;
    }
  };
})();
