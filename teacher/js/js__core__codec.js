/* === inlined from js/core/codec.js === */
/* =====================================================================
 * PyQuiz.Codec — pack encoding pipeline (spec §6)
 *
 * Pipeline:
 *   teacher JSON
 *   → stripForStudent   (drop teacher_notes, spec_refs, metadata, author,
 *                        any key starting with _internal)
 *   → JSON.stringify
 *   → gzip via CompressionStream (falls back to no compression if absent)
 *   → base64url (RFC 4648 §5, no padding)
 *   → "v1." prefix
 *
 * Decoding reverses the pipeline. Failures throw with a precise message
 * naming the failing step.
 *
 * Public API:
 *   PyQuiz.Codec.stripForStudent(pack)         → cloned pack with private fields removed
 *   PyQuiz.Codec.encode(pack)                  → Promise<string>  ("v1....")
 *   PyQuiz.Codec.decode(encoded)               → Promise<pack>
 *   PyQuiz.Codec.toBase64Url(uint8Array)       → string
 *   PyQuiz.Codec.fromBase64Url(string)         → Uint8Array
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});

  const Codec = {
    stripForStudent: function (pack) {
      const clone = JSON.parse(JSON.stringify(pack));
      delete clone.author;
      delete clone.created_by;
      delete clone.spec_refs;
      if (Array.isArray(clone.activities)) {
        for (const act of clone.activities) {
          delete act.teacher_notes;
          delete act.spec_refs;
          delete act.created_by;
          delete act.metadata;
          for (const k of Object.keys(act)) if (k.startsWith("_internal")) delete act[k];
        }
      }
      return clone;
    },

    encode: async function (pack) {
      const stripped = this.stripForStudent(pack);
      const json = JSON.stringify(stripped);
      const bytes = new TextEncoder().encode(json);
      if (typeof CompressionStream === "undefined") {
        // Fallback for very old browsers — accept the size penalty.
        return "v1." + this.toBase64Url(bytes);
      }
      const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
      const gz = new Uint8Array(await new Response(stream).arrayBuffer());
      return "v1." + this.toBase64Url(gz);
    },

    decode: async function (encoded) {
      if (typeof encoded !== "string" || !encoded.startsWith("v1.")) {
        throw new Error("Pack failed at version check: expected v1. prefix");
      }
      const b64 = encoded.slice(3);
      let bytes;
      try { bytes = this.fromBase64Url(b64); }
      catch (e) { throw new Error("Pack failed at base64 decode."); }

      let jsonBytes;
      if (typeof DecompressionStream !== "undefined") {
        try {
          const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
          jsonBytes = new Uint8Array(await new Response(stream).arrayBuffer());
        } catch (e) {
          // Might have been encoded without gzip (old-browser fallback path).
          jsonBytes = bytes;
        }
      } else {
        jsonBytes = bytes;
      }
      try {
        return JSON.parse(new TextDecoder().decode(jsonBytes));
      } catch (e) {
        throw new Error("Pack failed at JSON parse.");
      }
    },

    toBase64Url: function (bytes) {
      let s = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      }
      return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    },

    fromBase64Url: function (b64) {
      let s = b64.replace(/-/g, "+").replace(/_/g, "/");
      while (s.length % 4) s += "=";
      const bin = atob(s);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }
  };

  PyQuiz.Codec = Codec;
})();
