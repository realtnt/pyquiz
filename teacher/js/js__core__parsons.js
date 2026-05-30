/* === inlined from js/core/parsons.js === */
/* =====================================================================
 * PyQuiz.Parsons — runtime expansion of the compact Parsons payload
 *
 * The compact payload stores:
 *   - canonical_code        : Python source, one block per line
 *   - distractors           : one distractor block per line (optional)
 *   - swap_groups           : groups of line numbers that can be permuted
 *   - extra_accepted_orderings : optional manually-authored orderings
 *
 * Runtime callers (renderer, marker, validator, io_panel) need a richer
 * "lines" structure with stable IDs, indents, and a set of accepted
 * orderings to check student responses against. That work is centralised
 * here so the storage format and the runtime shape can evolve
 * independently.
 *
 * Public API:
 *   PyQuiz.Parsons.expand(payload) → {
 *     lines: [{ id, code, indent, distractor }],
 *     canonicalIds:        ["1", "2", ..., "N"],
 *     distractorIds:       ["d1", "d2", ...],
 *     acceptedOrderings:   [[id, id, ...], ...],
 *     indentSize:          4,
 *     discardRequired:     true
 *   }
 *   PyQuiz.Parsons.assemble(orderedIds, lines, indentSize) → string
 *      Produces the assembled Python program for the given order.
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});

  /* Strip a single leading-spaces prefix from a code line, returning
     { code, indent } where indent is the integer indent level (spaces
     / indentSize). Lines that have indents that aren't multiples of
     indentSize round DOWN, which matches Python's convention of
     "spaces must match a level". */
  function splitIndent(line, indentSize) {
    const m = line.match(/^( *)(.*)$/);
    const lead = (m && m[1]) || "";
    const rest = (m && m[2]) || "";
    return { code: rest, indent: Math.floor(lead.length / (indentSize || 4)) };
  }

  /* Parse a multiline code string into [{ id, code, indent }, ...].
     `idPrefix` distinguishes canonical lines ("1", "2", ...) from
     distractors ("d1", "d2", ...). Blank lines are skipped. */
  function parseLines(text, indentSize, idPrefix) {
    if (!text) return [];
    const raw = String(text).split("\n");
    const result = [];
    let n = 0;
    for (const r of raw) {
      if (r.trim() === "") continue;
      n++;
      const split = splitIndent(r, indentSize);
      result.push({
        id: idPrefix ? (idPrefix + n) : String(n),
        code: split.code,
        indent: split.indent
      });
    }
    return result;
  }

  /* Generate every permutation of an array (recursive). For a 4-item
     group this produces 24 permutations — fine. Swap-group sizes
     should stay reasonable (≤6 ideally) since 7! = 5040 and the
     marker pre-computes all orderings. */
  function permutations(arr) {
    if (arr.length <= 1) return [arr.slice()];
    const out = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = arr.slice(0, i).concat(arr.slice(i + 1));
      for (const p of permutations(rest)) {
        out.push([arr[i]].concat(p));
      }
    }
    return out;
  }

  /* Given the canonical ordering [id1, id2, ..., idN] and a list of
     swap groups (each a list of 1-indexed positions into canonical),
     return the set of all accepted orderings.
     Groups are applied independently: the cross-product of each
     group's permutations is taken.
     Returns an array of orderings; duplicates are removed.  */
  function expandAcceptedOrderings(canonical, swapGroups) {
    if (!swapGroups || !swapGroups.length) return [canonical.slice()];
    let orderings = [canonical.slice()];
    for (const group of swapGroups) {
      if (!group || group.length < 2) continue;
      const positions = group.map(p => p - 1);     // 0-indexed
      const next = [];
      for (const ord of orderings) {
        const items = positions.map(p => ord[p]);
        for (const perm of permutations(items)) {
          const newOrd = ord.slice();
          positions.forEach((p, i) => { newOrd[p] = perm[i]; });
          next.push(newOrd);
        }
      }
      orderings = next;
    }
    /* Deduplicate via JSON-stringify. The orderings are short arrays
       of short strings so this is fine. */
    const seen = new Set();
    const uniq = [];
    for (const o of orderings) {
      const k = JSON.stringify(o);
      if (seen.has(k)) continue;
      seen.add(k);
      uniq.push(o);
    }
    return uniq;
  }

  function expand(payload) {
    payload = payload || {};
    const indentSize = payload.indent_size_spaces || 4;
    const canonicalLines = parseLines(payload.canonical_code || "", indentSize, "");
    const distractorLines = parseLines(payload.distractors || "", indentSize, "d");

    canonicalLines.forEach(l => { l.distractor = false; });
    distractorLines.forEach(l => { l.distractor = true; });

    const canonicalIds  = canonicalLines.map(l => l.id);
    const distractorIds = distractorLines.map(l => l.id);

    /* Build accepted orderings: start with canonical + swap-group
       expansion, then add any extra orderings explicitly authored. */
    const orderings = expandAcceptedOrderings(canonicalIds, payload.swap_groups || []);
    const orderingSet = new Set(orderings.map(o => JSON.stringify(o)));
    (payload.extra_accepted_orderings || []).forEach(ord => {
      /* Authored orderings use 1-indexed positions into canonical;
         convert to ID arrays for runtime use. Skip malformed entries
         silently — the validator surfaces them as errors. */
      if (!Array.isArray(ord)) return;
      const ids = ord.map(p => canonicalIds[p - 1]).filter(Boolean);
      if (ids.length !== canonicalIds.length) return;
      const k = JSON.stringify(ids);
      if (!orderingSet.has(k)) { orderingSet.add(k); orderings.push(ids); }
    });

    return {
      lines: canonicalLines.concat(distractorLines),
      canonicalIds: canonicalIds,
      distractorIds: distractorIds,
      acceptedOrderings: orderings,
      indentSize: indentSize,
      discardRequired: payload.discard_required !== false
    };
  }

  function assemble(orderedIds, lines, indentSize) {
    const byId = {};
    lines.forEach(l => { byId[l.id] = l; });
    return orderedIds
      .map(id => byId[id])
      .filter(Boolean)
      .map(l => " ".repeat((l.indent || 0) * (indentSize || 4)) + l.code)
      .join("\n");
  }

  PyQuiz.Parsons = {
    expand: expand,
    assemble: assemble,
    /* Exposed for the editor's "Accepted orderings" preview pane. */
    expandAcceptedOrderings: expandAcceptedOrderings,
    permutations: permutations
  };
})();
