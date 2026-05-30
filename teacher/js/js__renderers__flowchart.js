/* === inlined from js/renderers/flowchart.js === */
/* =====================================================================
 * PyQuiz.Renderers — "flowchart" (complete_flowchart mode)
 *
 * Renders a flowchart as SVG. Shapes are positioned on a teacher-
 * specified (row, col) grid; edges route as orthogonal right-angle
 * polylines. The teacher may set explicit `from_side`/`to_side` per
 * edge, or a manual `bend: {x,y}` to control the corner. Otherwise
 * the auto-router picks an elbow that avoids cutting through other
 * shapes. {{id}} placeholders in shape labels render as inline
 * <input> or <select> blanks via SVG <foreignObject>. The student
 * fills the blanks; marking is per-blank and reuses the cloze
 * acceptance logic.
 *
 * Response shape:   { blanks: { "<id>": "<value>", ... } }
 * Highlight shape:  { blanks: { "<id>": true|false, ... } }
 *
 * Faithful renderer: no dagre / no auto-layout. The teacher's grid
 * (and optional bend) is drawn exactly as specified.
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const DOM = PyQuiz.DOM;
  const SVG_NS = "http://www.w3.org/2000/svg";

  // Inject a tiny stylesheet (once) for the click-to-reveal overlay and to
  // suppress text selection when dragging on the flowchart canvas.
  (function injectFlowchartStyles() {
    if (document.getElementById("fc-renderer-styles")) return;
    const css =
      ".flowchart-svg{-webkit-user-select:none;-moz-user-select:none;user-select:none;}" +
      ".flowchart-svg .fc-truncated{cursor:pointer;}" +
      ".flowchart-svg .fc-reveal-box{fill:var(--panel,#fff);stroke:var(--accent,#2F6FB0);stroke-width:1.5;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.18));}" +
      ".flowchart-svg .fc-reveal-text{font-family:var(--font-mono,ui-monospace,monospace);fill:var(--fg,#222);}" +
      ".flowchart-svg .fc-junction-dot{fill:var(--fg,#222);stroke:none;}";
    const tag = document.createElement("style");
    tag.id = "fc-renderer-styles";
    tag.textContent = css;
    (document.head || document.documentElement).appendChild(tag);
  })();

  /* ---- Geometry constants (must match the teacher editor). ---- */
  const SHAPE_W = 170;
  const SHAPE_H = 54;
  const DEC_W   = 200;
  const DEC_H   = 84;
  const CELL_W  = 220;
  const CELL_H  = 120;
  const MARGIN  = 20;
  const IO_SKEW = 16;

  /* ---- Text fitting ----
     Strategy for a label:
       1. Try to fit on ONE line, shrinking the font 13→10 and widening the
          box up to a cap.
       2. If it won't fit at the smallest font, WRAP onto multiple lines
          (growing the box height up to a cap of MAX_LINES), still preferring
          larger fonts that allow fewer lines.
       3. If even wrapped at the smallest font and max lines it overflows,
          truncate the last visible line with an ellipsis.
     Returns { fontPx, w, h, lines, truncated }.
     Monospace char advance is ~0.6 * fontPx. */
  const FONT_STEPS = [13, 12, 11, 10];
  const MIN_FONT = FONT_STEPS[FONT_STEPS.length - 1];
  const CHAR_RATIO = 0.6;
  const MAX_LINES = 3;
  function padFor(kind) {
    if (kind === "decision") return 34;
    if (kind === "io") return 22;
    return 14;
  }
  const MAX_SHAPE_W = CELL_W - 24;   // 196
  const MAX_DEC_W   = CELL_W - 8;    // 212
  const MAX_SHAPE_H = CELL_H - 28;   // 92
  const MAX_DEC_H   = CELL_H - 8;    // 112
  const BLANK_SLOT_PX = 30;

  function lineWidthPx(line, fontPx) {
    const charPx = fontPx * CHAR_RATIO;
    let w = 0;
    const re = /\{\{[^}]+\}\}/g;
    let last = 0, m;
    while ((m = re.exec(line)) !== null) {
      w += (m.index - last) * charPx;
      w += BLANK_SLOT_PX;
      last = m.index + m[0].length;
    }
    w += (line.length - last) * charPx;
    return w;
  }
  function longestLineWidthPx(text, fontPx) {
    const lines = (text || "").split("\n");
    let max = 0;
    lines.forEach(function (l) { const w = lineWidthPx(l, fontPx); if (w > max) max = w; });
    return max;
  }
  function charsThatFit(widthPx, fontPx) {
    const charPx = fontPx * CHAR_RATIO;
    return Math.max(1, Math.floor(widthPx / charPx));
  }
  // Greedy word-wrap of `text` (already split on explicit \n by the caller)
  // into lines no wider than innerW at fontPx. Returns an array of lines. A
  // single word longer than innerW is hard-broken by character.
  function wrapLine(line, innerW, fontPx) {
    const charPx = fontPx * CHAR_RATIO;
    const maxChars = Math.max(1, Math.floor(innerW / charPx));
    if (line.length <= maxChars) return [line];
    const words = line.split(/(\s+)/);   // keep separators
    const out = [];
    let cur = "";
    function pushCur() { if (cur.length) { out.push(cur); cur = ""; } }
    words.forEach(function (tok) {
      if (cur.length + tok.length <= maxChars) { cur += tok; return; }
      // token doesn't fit on the current line
      if (/^\s+$/.test(tok)) { pushCur(); return; }
      if (tok.length > maxChars) {
        // hard-break a very long token
        pushCur();
        let rest = tok;
        while (rest.length > maxChars) { out.push(rest.slice(0, maxChars)); rest = rest.slice(maxChars); }
        cur = rest;
      } else {
        pushCur();
        cur = tok;
      }
    });
    pushCur();
    return out.map(function (l) { return l.replace(/\s+$/, ""); });
  }
  function wrapText(text, innerW, fontPx) {
    const explicit = (text || "").split("\n");
    let all = [];
    explicit.forEach(function (l) { all = all.concat(wrapLine(l, innerW, fontPx)); });
    return all;
  }
  function fitText(s) {
    const kind = s.kind;
    const baseW = kind === "decision" ? DEC_W : SHAPE_W;
    const maxW  = kind === "decision" ? MAX_DEC_W : MAX_SHAPE_W;
    const maxH  = kind === "decision" ? MAX_DEC_H : MAX_SHAPE_H;
    const pad   = padFor(kind);
    const text  = s.text || "";

    // Phase 1: single line, largest font that fits.
    for (let i = 0; i < FONT_STEPS.length; i++) {
      const fontPx = FONT_STEPS[i];
      const need = longestLineWidthPx(text, fontPx) + pad * 2;
      if (need <= maxW && text.indexOf("\n") < 0) {
        return { fontPx: fontPx, w: Math.max(baseW, Math.min(maxW, Math.ceil(need))),
                 h: kind === "decision" ? DEC_H : SHAPE_H, lines: [text], truncated: false };
      }
    }

    // Phase 2: wrap. Prefer larger fonts; the box widens to the cap, then
    // text wraps within that width. Accept the first font whose wrapped line
    // count fits in MAX_LINES and whose height fits maxH.
    const innerW = maxW - pad * 2;
    for (let i = 0; i < FONT_STEPS.length; i++) {
      const fontPx = FONT_STEPS[i];
      const lineH = fontPx + 3;
      const lines = wrapText(text, innerW, fontPx);
      const neededH = lines.length * lineH + 14;
      if (lines.length <= MAX_LINES && neededH <= maxH) {
        // width: the widest wrapped line (so narrow labels don't over-widen)
        let widest = 0;
        lines.forEach(function (l) { const w = lineWidthPx(l, fontPx); if (w > widest) widest = w; });
        const w = Math.max(baseW, Math.min(maxW, Math.ceil(widest + pad * 2)));
        const h = Math.max(kind === "decision" ? DEC_H : SHAPE_H, Math.ceil(neededH));
        return { fontPx: fontPx, w: w, h: Math.min(maxH, h), lines: lines, truncated: false };
      }
    }

    // Phase 3: even wrapped at the smallest font we overflow — wrap to
    // MAX_LINES and ellipsis-truncate the last visible line.
    const fontPx = MIN_FONT;
    const lineH = fontPx + 3;
    let lines = wrapText(text, innerW, fontPx);
    const truncated = lines.length > MAX_LINES;
    if (truncated) {
      lines = lines.slice(0, MAX_LINES);
      const maxChars = charsThatFit(innerW, fontPx);
      let last = lines[MAX_LINES - 1];
      if (last.length > maxChars - 1) last = last.slice(0, Math.max(1, maxChars - 1));
      lines[MAX_LINES - 1] = last.replace(/\s+$/, "") + "…";
    }
    const h = Math.min(maxH, Math.max(kind === "decision" ? DEC_H : SHAPE_H, lines.length * lineH + 14));
    return { fontPx: fontPx, w: maxW, h: h, lines: lines, truncated: truncated };
  }

  function svgEl(tag, attrs, children) {
    const el = document.createElementNS(SVG_NS, tag);
    if (attrs) for (const k in attrs) {
      if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    }
    if (children) {
      for (const c of children) {
        if (c == null) continue;
        if (typeof c === "string") el.appendChild(document.createTextNode(c));
        else el.appendChild(c);
      }
    }
    return el;
  }

  function dims(s) {
    const fit = fitText(s);
    return [fit.w, fit.h];
  }

  /* Bounding box + four side anchors for the shape, accounting for the
     IO parallelogram's slanted left/right edges. Top/bottom anchors sit at
     the shape's visual centre so vertical arrows look centred. */
  function geom(s) {
    const wh = dims(s);
    const w = wh[0], h = wh[1];
    const cx = MARGIN + s.col * CELL_W + CELL_W / 2;
    const cy = MARGIN + s.row * CELL_H + CELL_H / 2;
    const x = cx - w / 2, y = cy - h / 2;
    const sk = s.kind === "io" ? IO_SKEW : 0;
    return {
      x: x, y: y, w: w, h: h, cx: cx, cy: cy, kind: s.kind,
      top:    { x: cx,           y: y },
      bottom: { x: cx,           y: y + h },
      left:   { x: x + sk / 2,   y: cy },
      right:  { x: x + w - sk / 2, y: cy }
    };
  }

  /* ---- Side preferences ------------------------------------------------
     Ranked candidate sides for each end of an edge, derived from geometry and
     the patterns seen in hand-edited charts. Used by autoArrange (the one-shot
     solver) and as the render-time fallback for edges with no stored side. */

  // Ranked side preference for the FROM end of an edge (best first).
  function fromPrefs(a, b) {
    const vDown = b.cy > a.cy, vUp = b.cy < a.cy;
    const right = b.cx > a.cx, left = b.cx < a.cx;
    const sameCol = Math.abs(a.cx - b.cx) < 1;
    const sameRow = Math.abs(a.cy - b.cy) < 1;
    if (sameCol) return vDown ? ["bottom", "right", "left", "top"] : ["top", "right", "left", "bottom"];
    if (sameRow) return right ? ["right", "bottom", "top", "left"] : ["left", "bottom", "top", "right"];
    // diagonal: prefer vertical exit toward the target, then horizontal
    const v = vDown ? "bottom" : "top";
    const hh = right ? "right" : "left";
    return [v, hh, (hh === "right" ? "left" : "right"), (v === "bottom" ? "top" : "bottom")];
  }
  // Ranked side preference for the TO end of an edge (best first).
  function toPrefs(a, b) {
    const vDown = b.cy > a.cy, vUp = b.cy < a.cy;
    const right = b.cx > a.cx, left = b.cx < a.cx;
    const sameCol = Math.abs(a.cx - b.cx) < 1;
    const sameRow = Math.abs(a.cy - b.cy) < 1;
    if (sameCol) return vDown ? ["top", "left", "right", "bottom"] : ["bottom", "left", "right", "top"];
    if (sameRow) return right ? ["left", "top", "bottom", "right"] : ["right", "top", "bottom", "left"];
    const hh = right ? "left" : "right";       // enter from the side facing the source
    const v = vDown ? "top" : "bottom";
    return [hh, v, (v === "top" ? "bottom" : "top"), (hh === "left" ? "right" : "left")];
  }

  /* ---- Auto-arrange (bake routing into the edges) ----------------------
     This is the one-shot solver the teacher triggers from the editor's
     "Auto-arrange" button. It chooses an exit/entry side for every edge using
     the rules learned from hand-edited charts, then WRITES the result into
     each edge's from_side / to_side and clears any manual bend. After this,
     rendering is purely faithful: edges are drawn from their stored sides and
     nothing re-routes on its own. Returns the (mutated) edges.

     Rules:
       - A port used as an EXIT is not reused as an ENTRY (and vice versa).
       - A decision's two outgoing edges never share the same exit port.
       - Prefer unused ports; reuse a same-direction port only as a last
         resort. */
  function autoArrange(shapes, edges) {
    const claimed = {};
    shapes.forEach(function (s) { claimed[s.id] = {}; });
    const sb = {};
    shapes.forEach(function (s) { sb[s.id] = s; });
    const usedExitOf = {};   // shapeId -> Set of sides already used as an exit

    function pick(shapeId, prefs, dir, avoid) {
      const c = claimed[shapeId] || (claimed[shapeId] = {});
      // 1) first preference whose port is entirely unused (and not in `avoid`)
      for (let i = 0; i < prefs.length; i++) {
        const s = prefs[i];
        if (avoid && avoid.indexOf(s) >= 0) continue;
        if (!c[s]) { c[s] = dir; return s; }
      }
      // 2) reuse a same-direction port (never mixes exit with entry head-on)
      for (let i = 0; i < prefs.length; i++) {
        const s = prefs[i];
        if (avoid && avoid.indexOf(s) >= 0) continue;
        if (c[s] === dir) return s;
      }
      // 3) anything not in avoid
      for (let i = 0; i < prefs.length; i++) {
        if (!avoid || avoid.indexOf(prefs[i]) < 0) return prefs[i];
      }
      return prefs[0];
    }

    edges.forEach(function (e) {
      const fromS = sb[e.from], toS = sb[e.to];
      if (!fromS || !toS) return;
      const a = geom(fromS), b = geom(toS);
      // A decision's two exits must use different ports: forbid sides already
      // used as an exit by the same source decision.
      let avoid = null;
      if (fromS.kind === "decision" && usedExitOf[e.from]) {
        avoid = Array.from(usedExitOf[e.from]);
      }
      const fs = pick(e.from, fromPrefs(a, b), "exit", avoid);
      const ts = pick(e.to, toPrefs(a, b), "entry", null);
      (usedExitOf[e.from] = usedExitOf[e.from] || new Set()).add(fs);
      e.from_side = fs;
      e.to_side = ts;
      delete e.bend;
    });
    return edges;
  }

  /* Resolve the exit/entry sides for an edge for RENDERING. Faithful: uses the
     stored from_side / to_side verbatim, falling back to a geometry default
     only for edges that have never been auto-arranged or hand-set. */
  function sidesFor(e, fromS, toS) {
    let fs = e.from_side, ts = e.to_side;
    if (!fs || !ts) {
      const a = geom(fromS), b = geom(toS);
      if (!fs) fs = fromPrefs(a, b)[0];
      if (!ts) ts = toPrefs(a, b)[0];
    }
    return { fs: fs, ts: ts };
  }

  /* Right-angle path from one side to another. When a manual bend is set,
     the path is forced to pass through (bend.x, bend.y) so the visible
     line always tracks the handle. Without a bend, autoRoute picks a
     single-elbow or Z-detour that avoids cutting through other shapes. */
  /* Right-angle path POINTS from one side to another (before stringify).
     When a manual bend is set, the path is forced through (bend.x, bend.y).
     Without a bend, autoRoute picks a single-elbow or Z-detour that avoids
     cutting through other shapes. */
  function edgePoints(e, shapesById, shapes) {
    const fromS = shapesById[e.from], toS = shapesById[e.to];
    if (!fromS || !toS) return null;
    const a = geom(fromS), b = geom(toS);
    const sides = sidesFor(e, fromS, toS);
    const fs = sides.fs, ts = sides.ts;
    const p0 = { x: a[fs].x, y: a[fs].y };
    const p1 = { x: b[ts].x, y: b[ts].y };
    let pts = [p0];
    if (e.bend) {
      const bx = e.bend.x, by = e.bend.y;
      if (fs === "bottom" || fs === "top") {
        pts.push({ x: p0.x, y: by }, { x: bx, y: by }, { x: bx, y: p1.y });
      } else {
        pts.push({ x: bx, y: p0.y }, { x: bx, y: by }, { x: p1.x, y: by });
      }
    } else {
      pts = pts.concat(autoRoute(e, p0, p1, fs, ts, shapes));
    }
    pts.push(p1);
    return pts;
  }

  function edgePath(e, shapesById, shapes) {
    const pts = edgePoints(e, shapesById, shapes);
    if (!pts) return "";
    return collapseAndStringify(pts);
  }

  /* Lane-separation post-pass. The faithful renderer draws each edge exactly
     where the grid puts it — but when two shapes share a column (or row),
     edges that both route along that shared side rail land on the SAME line
     and become visually indistinguishable. This pass detects long collinear
     overlaps between the "rail" (middle) segments of different edges and
     nudges the later edge's rail sideways by a small fixed step so both
     remain visible. Shapes never move; endpoints stay put; only the interior
     rail of an already-bent/elbowed edge shifts. */
  const LANE_STEP = 14;
  const OVERLAP_MIN = 24;   // only separate substantial overlaps
  const MERGE_MIN = 16;     // collinear overlap needed to merge converging edges
  /* Reconcile overlapping edge rails. Two cases:
       - CONVERGING (same destination shape + same entry side): the edges are
         meant to arrive together. Merge them — trim the later edge so it joins
         the earlier one's rail, and record a junction dot at the tie point
         (drawn like a soldered connection on a circuit).
       - INDEPENDENT (different destination/side): keep both visible by nudging
         the later edge's rail into its own lane.
     Returns an array of junction-dot {x, y} points. `edges` is parallel to
     `pointArrays`. */
  function railLength(r) { return Math.abs(r.a.x - r.b.x) + Math.abs(r.a.y - r.b.y); }
  function mergeAndSeparate(pointArrays, edges) {
    const dots = [];
    for (let i = 0; i < pointArrays.length; i++) {
      const A = pointArrays[i];
      if (!A || A.length < 3 || A._merged) continue;
      for (let j = 0; j < i; j++) {
        const B = pointArrays[j];
        if (!B || B.length < 3 || B._merged) continue;
        const railA = railSegment(A);
        const railB = railSegment(B);
        if (!railA || !railB) continue;
        const ov = collinearOverlap(railA, railB);
        if (ov <= 0) continue;
        const ea = edges[i], eb = edges[j];
        const converging = ea && eb && ea.to === eb.to &&
          (ea.to_side || "") === (eb.to_side || "") && ov >= MERGE_MIN;
        if (converging) {
          // Trim whichever edge has the SHORTER rail; the longer one keeps its
          // arrowhead and runs all the way into the shared port.
          let SHORT, rShort, rLong;
          if (railLength(railA) <= railLength(railB)) { SHORT = A; rShort = railA; rLong = railB; }
          else                                        { SHORT = B; rShort = railB; rLong = railA; }
          const dot = mergeInto(SHORT, rShort, rLong);
          if (dot) dots.push(dot);
          break;
        } else if (ov >= OVERLAP_MIN) {
          nudgeRail(A, railA, railB);
          break; // one nudge per edge per pass
        }
      }
    }
    return dots;
  }
  /* Trim SHORT so it stops where it meets LONG's rail — a T-junction. The tie
     sits on LONG's rail at the END of SHORT's rail furthest from the shared
     destination, so the dot lands between the two edges (not back at a shape).
     SHORT is mutated in place and marked _merged (drawn with no arrowhead). */
  function mergeInto(SHORT, rShort, rLong) {
    const vertical = Math.abs(rLong.a.x - rLong.b.x) < 0.5;
    const sEnd = SHORT[SHORT.length - 1];        // shared destination port
    let tie;
    if (vertical) {
      const far = Math.abs(rShort.a.y - sEnd.y) >= Math.abs(rShort.b.y - sEnd.y) ? rShort.a.y : rShort.b.y;
      tie = { x: rLong.a.x, y: far };
    } else {
      const far = Math.abs(rShort.a.x - sEnd.x) >= Math.abs(rShort.b.x - sEnd.x) ? rShort.a.x : rShort.b.x;
      tie = { x: far, y: rLong.a.y };
    }
    const head = SHORT.slice(0, rShort.i + 1);
    head.push({ x: tie.x, y: tie.y });
    SHORT.length = 0;
    Array.prototype.push.apply(SHORT, head);
    SHORT._merged = true;
    return { x: tie.x, y: tie.y };
  }
  function separateLanes(pointArrays) {
    return mergeAndSeparate(pointArrays, []);
  }
  // The rail is the longest segment of the path. For multi-segment paths we
  // skip the very first and very last segment (they touch endpoints) when an
  // interior segment exists; for a 3-point path either segment may be the
  // rail, so we consider all but keep endpoints fixed during the nudge.
  function railSegment(pts) {
    let best = null, bestLen = -1;
    const lo = pts.length >= 4 ? 1 : 0;
    const hi = pts.length >= 4 ? pts.length - 2 : pts.length - 1;
    for (let i = lo; i < hi; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      if (len > bestLen) { bestLen = len; best = { i: i, a: a, b: b }; }
    }
    return best;
  }
  function collinearOverlap(s1, s2) {
    const a = s1.a, b = s1.b, c = s2.a, d = s2.b;
    const v1 = Math.abs(a.x - b.x) < 0.5, v2 = Math.abs(c.x - d.x) < 0.5;
    const h1 = Math.abs(a.y - b.y) < 0.5, h2 = Math.abs(c.y - d.y) < 0.5;
    if (v1 && v2 && Math.abs(a.x - c.x) < 0.5) {
      const lo1 = Math.min(a.y, b.y), hi1 = Math.max(a.y, b.y);
      const lo2 = Math.min(c.y, d.y), hi2 = Math.max(c.y, d.y);
      return Math.max(0, Math.min(hi1, hi2) - Math.max(lo1, lo2));
    }
    if (h1 && h2 && Math.abs(a.y - c.y) < 0.5) {
      const lo1 = Math.min(a.x, b.x), hi1 = Math.max(a.x, b.x);
      const lo2 = Math.min(c.x, d.x), hi2 = Math.max(c.x, d.x);
      return Math.max(0, Math.min(hi1, hi2) - Math.max(lo1, lo2));
    }
    return 0;
  }
  // Shift edge A's rail away from B's rail, keeping the true endpoints
  // (first and last points) anchored to their shapes. If the rail segment
  // touches an endpoint, we insert a short jog so the line still leaves /
  // meets the shape at the original anchor before moving into the new lane.
  function nudgeRail(pts, railA, railB) {
    const a = railA.a, b = railA.b;
    const idx = railA.i;                 // rail is segment idx → idx+1
    const vertical = Math.abs(a.x - b.x) < 0.5;
    const lastIdx = pts.length - 1;
    if (vertical) {
      const railX = a.x, otherX = railB.a.x;
      const dir = railX >= otherX ? 1 : -1;
      const nx = railX + dir * LANE_STEP;
      // Process the higher index first so an insertion doesn't shift the lower.
      shiftPointOrJog(pts, idx + 1, "x", nx, lastIdx);
      shiftPointOrJog(pts, idx, "x", nx, 0);
    } else {
      const railY = a.y, otherY = railB.a.y;
      const dir = railY >= otherY ? 1 : -1;
      const ny = railY + dir * LANE_STEP;
      shiftPointOrJog(pts, idx + 1, "y", ny, lastIdx);
      shiftPointOrJog(pts, idx, "y", ny, 0);
    }
  }
  // Move pts[i][axis] to value. If pts[i] is a protected endpoint
  // (index === protectIdx), instead splice in a NEW point next to it so the
  // endpoint stays put and a jog is created.
  function shiftPointOrJog(pts, i, axis, value, protectIdx) {
    if (i === protectIdx) {
      // insert a clone adjacent to the endpoint, on the lane side
      const clone = { x: pts[i].x, y: pts[i].y };
      clone[axis] = value;
      if (i === 0) pts.splice(1, 0, clone);
      else pts.splice(i, 0, clone);   // before the last point
    } else {
      pts[i][axis] = value;
    }
  }

  /* Auto-route without a manual bend. Tries vertical-first vs horizontal-
     first elbow, picks the candidate that crosses fewer obstacle shapes.
     Falls back to a Z-detour through the midpoint if both cut through. */
  function autoRoute(e, p0, p1, fs, ts, shapes) {
    const sameX = Math.abs(p0.x - p1.x) < 1, sameY = Math.abs(p0.y - p1.y) < 1;
    if (sameX || sameY) return [];   // straight
    const candA = [{ x: p1.x, y: p0.y }];   // horizontal-first
    const candB = [{ x: p0.x, y: p1.y }];   // vertical-first
    const defaultIsA = (fs === "left" || fs === "right");
    const cutA = countObstacleCuts([p0].concat(candA, [p1]), e, shapes);
    const cutB = countObstacleCuts([p0].concat(candB, [p1]), e, shapes);
    if (defaultIsA) {
      if (cutA === 0) return candA;
      if (cutB === 0) return candB;
      return zDetour(p0, p1, fs);
    } else {
      if (cutB === 0) return candB;
      if (cutA === 0) return candA;
      return zDetour(p0, p1, fs);
    }
  }

  function countObstacleCuts(pts, e, shapes) {
    let count = 0;
    for (let si = 0; si < shapes.length; si++) {
      const s = shapes[si];
      if (s.id === e.from || s.id === e.to) continue;
      const g = geom(s);
      const pad = 2;
      const r = { x1: g.x + pad, y1: g.y + pad, x2: g.x + g.w - pad, y2: g.y + g.h - pad };
      let hit = false;
      for (let i = 0; i < pts.length - 1; i++) {
        if (segCrossesRect(pts[i], pts[i + 1], r)) { hit = true; break; }
      }
      if (hit) count++;
    }
    return count;
  }

  function segCrossesRect(a, b, r) {
    if (Math.abs(a.x - b.x) < 0.5) {  // vertical
      const x = a.x;
      if (x <= r.x1 || x >= r.x2) return false;
      const lo = Math.min(a.y, b.y), hi = Math.max(a.y, b.y);
      return lo < r.y2 && hi > r.y1;
    }
    if (Math.abs(a.y - b.y) < 0.5) {  // horizontal
      const y = a.y;
      if (y <= r.y1 || y >= r.y2) return false;
      const lo = Math.min(a.x, b.x), hi = Math.max(a.x, b.x);
      return lo < r.x2 && hi > r.x1;
    }
    return false;
  }

  function zDetour(p0, p1, fs) {
    const exitHoriz = (fs === "left" || fs === "right");
    const GRID = 10;
    const sn = function (n) { return Math.round(n / GRID) * GRID; };
    if (exitHoriz) {
      const midX = sn((p0.x + p1.x) / 2);
      return [{ x: midX, y: p0.y }, { x: midX, y: p1.y }];
    } else {
      const midY = sn((p0.y + p1.y) / 2);
      return [{ x: p0.x, y: midY }, { x: p1.x, y: midY }];
    }
  }

  function collapseAndStringify(pts) {
    const cleaned = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const prev = cleaned[cleaned.length - 1], cur = pts[i];
      if (Math.abs(prev.x - cur.x) < 0.5 && Math.abs(prev.y - cur.y) < 0.5) continue;
      if (cleaned.length >= 2) {
        const a2 = cleaned[cleaned.length - 2], b2 = prev;
        const dx1 = b2.x - a2.x, dy1 = b2.y - a2.y;
        const dx2 = cur.x - b2.x, dy2 = cur.y - b2.y;
        if (Math.abs(dx1) < 0.5 && Math.abs(dx2) < 0.5 && Math.sign(dy1) === Math.sign(dy2)) {
          cleaned.pop(); cleaned.push(cur); continue;
        }
        if (Math.abs(dy1) < 0.5 && Math.abs(dy2) < 0.5 && Math.sign(dx1) === Math.sign(dx2)) {
          cleaned.pop(); cleaned.push(cur); continue;
        }
      }
      cleaned.push(cur);
    }
    return "M " + cleaned.map(function (p) { return p.x.toFixed(1) + "," + p.y.toFixed(1); }).join(" L ");
  }

  /* Decide where to draw an edge's Yes/No label. The label sits NEAR THE EXIT
     port (the start of the path) rather than the geometric midpoint, so it
     clearly belongs to that branch of the decision. If the first segment is
     horizontal (a side exit toward an adjacent box) the label is lifted ABOVE
     the line and the opaque chip is dropped, so the line and arrowhead stay
     visible in tight horizontal runs. Returns { x, y, anchor, chip }. */
  const LABEL_GAP = 22;        // distance from the exit port along the segment
  function labelPlacement(pts) {
    const p0 = pts[0], p1 = pts[1] || pts[0];
    const vertical = Math.abs(p0.x - p1.x) < 0.5;
    const segLen = Math.abs(p0.x - p1.x) + Math.abs(p0.y - p1.y);
    const along = Math.min(LABEL_GAP, segLen * 0.5);   // don't overshoot
    if (vertical) {
      const dir = p1.y >= p0.y ? 1 : -1;
      return { x: p0.x, y: p0.y + dir * along + 4, anchor: "middle", chip: true };
    }
    // horizontal first segment: lift the label above the line, anchored toward
    // the exit so it hugs the decision it belongs to.
    const dir = p1.x >= p0.x ? 1 : -1;
    return { x: p0.x + dir * along, y: p0.y - 7, anchor: "middle", chip: false };
  }

  function pathMidpoint(d) {
    const pts = d.replace(/^M\s*/, "").split(/\s*L\s*/).map(function (s) {
      const parts = s.split(",").map(Number);
      return { x: parts[0], y: parts[1] };
    });
    let bestI = 0, bestLen = -1;
    for (let i = 0; i < pts.length - 1; i++) {
      const len = Math.abs(pts[i].x - pts[i + 1].x) + Math.abs(pts[i].y - pts[i + 1].y);
      if (len > bestLen) { bestLen = len; bestI = i; }
    }
    return {
      x: (pts[bestI].x + pts[bestI + 1].x) / 2,
      y: (pts[bestI].y + pts[bestI + 1].y) / 2
    };
  }

  /* Split a label like 'score {{cmp}} 50' into segments: text and blank. */
  function splitLabel(text) {
    const segs = [];
    const re = /\{\{([^}]+)\}\}/g;
    let last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) segs.push({ kind: "text", value: text.slice(last, m.index) });
      segs.push({ kind: "blank", id: m[1].trim() });
      last = m.index + m[0].length;
    }
    if (last < text.length) segs.push({ kind: "text", value: text.slice(last) });
    if (!segs.length) segs.push({ kind: "text", value: "" });
    return segs;
  }

  /* Compute canvas bounds: one extra cell past the furthest shape so
     there's some breathing room around the chart edge. */
  function chartBounds(shapes) {
    let maxR = 0, maxC = 0;
    shapes.forEach(function (s) {
      if (s.row > maxR) maxR = s.row;
      if (s.col > maxC) maxC = s.col;
    });
    return {
      w: MARGIN * 2 + (maxC + 2) * CELL_W,
      h: MARGIN * 2 + (maxR + 2) * CELL_H
    };
  }

  PyQuiz.Renderers.register("flowchart", function (activity, host, cb) {
    const p = activity.payload || {};
    const fc = p.flowchart || { shapes: [], edges: [] };
    const blanksSpec = Array.isArray(p.blanks) ? p.blanks : [];
    const blanksById = {};
    blanksSpec.forEach(function (b) { if (b && b.id) blanksById[b.id] = b; });

    const studentBlanks = {};
    blanksSpec.forEach(function (b) { studentBlanks[b.id] = ""; });

    const root = DOM.el("div", { class: "flowchart-activity" });
    if (p.code_alongside) {
      root.appendChild(DOM.codeBlock(p.code_alongside, { lineNumbers: true, label: "Code" }));
    }

    const shapes = Array.isArray(fc.shapes) ? fc.shapes : [];
    const edges  = Array.isArray(fc.edges)  ? fc.edges  : [];
    const shapesById = {};
    shapes.forEach(function (s) { shapesById[s.id] = s; });

    const bounds = chartBounds(shapes);
    const chartW = bounds.w, chartH = bounds.h;
    const svg = svgEl("svg", {
      class: "flowchart-svg",
      viewBox: "0 0 " + chartW + " " + chartH,
      width: chartW,
      height: chartH,
      role: "img",
      "aria-label": "Flowchart"
    });

    const defs = svgEl("defs");
    defs.appendChild(svgEl("marker", {
      id: "fc-arrow-" + activity.id,
      viewBox: "0 0 10 10", refX: "9", refY: "5",
      markerWidth: "8", markerHeight: "8",
      orient: "auto-start-reverse"
    }, [
      svgEl("path", { d: "M 0 0 L 10 5 L 0 10 z", class: "fc-arrowhead" })
    ]));
    svg.appendChild(defs);

    /* Shapes paint first, edges on top — keeps arrowheads visible even
       when they land right against a shape edge. */
    const shapesLayer = svgEl("g", { class: "layer-shapes" });
    const edgesLayer  = svgEl("g", { class: "layer-edges" });
    svg.appendChild(shapesLayer);
    svg.appendChild(edgesLayer);

    /* ---- Shapes ---- */
    shapes.forEach(function (s) {
      const g = geom(s);
      const group = svgEl("g", { class: "fc-shape-group", "data-shape-id": s.id });
      let outline;
      if (s.kind === "terminator") {
        outline = svgEl("rect", {
          x: g.x, y: g.y, width: g.w, height: g.h,
          rx: g.h / 2, ry: g.h / 2,
          class: "fc-shape fc-terminator"
        });
      } else if (s.kind === "process") {
        outline = svgEl("rect", {
          x: g.x, y: g.y, width: g.w, height: g.h,
          class: "fc-shape fc-process"
        });
      } else if (s.kind === "decision") {
        const pts = [
          [g.cx,         g.y],
          [g.x + g.w,    g.cy],
          [g.cx,         g.y + g.h],
          [g.x,          g.cy]
        ].map(function (q) { return q.join(","); }).join(" ");
        outline = svgEl("polygon", { points: pts, class: "fc-shape fc-decision" });
      } else if (s.kind === "io") {
        const pts = [
          [g.x + IO_SKEW, g.y],
          [g.x + g.w,     g.y],
          [g.x + g.w - IO_SKEW, g.y + g.h],
          [g.x,           g.y + g.h]
        ].map(function (q) { return q.join(","); }).join(" ");
        outline = svgEl("polygon", { points: pts, class: "fc-shape fc-io" });
      } else {
        outline = svgEl("rect", { x: g.x, y: g.y, width: g.w, height: g.h, class: "fc-shape" });
      }
      group.appendChild(outline);

      const segs = splitLabel(s.text || "");
      if (segs.every(function (seg) { return seg.kind === "text"; })) {
        const fit = fitText(s);
        const fontPx = fit.fontPx;
        const lines = fit.lines;           // already wrapped + ellipsis-trimmed
        const lineH = fontPx + 3;
        const startY = g.cy - ((lines.length - 1) * lineH) / 2 + 4;
        const t = svgEl("text", {
          x: g.cx, y: startY,
          "text-anchor": "middle",
          "font-size": fontPx,
          class: "fc-shape-text"
        });
        lines.forEach(function (line, i) {
          t.appendChild(svgEl("tspan", {
            x: g.cx,
            dy: i === 0 ? "0" : String(lineH)
          }, [line]));
        });
        group.appendChild(t);
        // Whenever the label wrapped onto >1 line OR was truncated, offer the
        // full text on a single line: hover shows it via <title>, and a click
        // reveals it in an overlay (most useful when truncated).
        const wrapped = lines.length > 1;
        if (wrapped || fit.truncated) {
          group.appendChild(svgEl("title", null, [s.text || ""]));
        }
        if (fit.truncated) {
          group.classList.add("fc-truncated");
          group.style.cursor = "pointer";
          group.addEventListener("click", function (ev) {
            ev.stopPropagation();
            revealFullText(group, s, g, fontPx, lineH);
          });
        }
      } else {
        const fit = fitText(s);
        const isDec = s.kind === "decision";
        const isIo  = s.kind === "io";
        const padX = padFor(s.kind);
        const fo = svgEl("foreignObject", {
          x: g.x + padX, y: g.y, width: Math.max(20, g.w - padX * 2), height: g.h,
          class: "fc-foreign"
        });
        const wrap = document.createElement("span");
        wrap.className = "fc-shape-html";
        const fontPx = fit.fontPx;
        wrap.style.cssText = "display:flex;align-items:center;justify-content:center;flex-wrap:nowrap;width:100%;height:100%;text-align:center;line-height:1.2;font-family:var(--font-mono, ui-monospace, monospace);font-size:" + fontPx + "px;color:var(--fg);overflow:hidden;white-space:nowrap";
        segs.forEach(function (seg) {
          if (seg.kind === "text") {
            wrap.appendChild(document.createTextNode(seg.value));
          } else {
            const spec = blanksById[seg.id];
            if (!spec) {
              wrap.appendChild(document.createTextNode("{{" + seg.id + "}}"));
              return;
            }
            let input;
            if (spec.mode === "select") {
              input = document.createElement("select");
              input.className = "fc-blank fc-blank-select";
              input.setAttribute("data-blank-id", seg.id);
              input.setAttribute("aria-label", "Blank " + seg.id);
              const empty = document.createElement("option");
              empty.value = ""; empty.textContent = "—";
              input.appendChild(empty);
              (spec.options || []).forEach(function (opt) {
                const o = document.createElement("option");
                o.value = opt; o.textContent = opt;
                input.appendChild(o);
              });
            } else {
              input = document.createElement("input");
              input.type = "text";
              input.className = "fc-blank fc-blank-text";
              input.setAttribute("data-blank-id", seg.id);
              input.setAttribute("aria-label", "Blank " + seg.id);
              input.autocomplete = "off";
              input.spellcheck = false;
              const w = spec.width_hint || Math.max(2, (spec.answer || "").length + 1);
              input.style.width = (w * 0.7) + "em";
              input.style.minWidth = "2.4em";
            }
            input.addEventListener("input", function () {
              studentBlanks[seg.id] = input.value;
              if (cb.onChange) cb.onChange(snapshot());
            });
            input.addEventListener("change", function () {
              studentBlanks[seg.id] = input.value;
              if (cb.onChange) cb.onChange(snapshot());
            });
            wrap.appendChild(input);
          }
        });
        fo.appendChild(wrap);
        group.appendChild(fo);
      }
      shapesLayer.appendChild(group);
    });

    /* ---- Edges ---- */
    // Routing is faithful: each edge is drawn from its stored from_side /
    // to_side (a geometry fallback covers edges never auto-arranged).
    // mergeAndSeparate then either unifies converging edges (with a junction
    // dot) or nudges genuinely-independent overlapping rails into lanes.
    const edgePtArrays = edges.map(function (e) { return edgePoints(e, shapesById, shapes); });
    const junctionDots = mergeAndSeparate(edgePtArrays, edges);
    edges.forEach(function (e, i) {
      const ptsArr = edgePtArrays[i];
      if (!ptsArr) return;
      const d = collapseAndStringify(ptsArr);
      if (!d) return;
      const attrs = { d: d, class: "fc-edge", fill: "none" };
      // A merged edge joins another line at a junction dot, so it gets no
      // arrowhead of its own (the line it joins carries the arrow).
      if (!ptsArr._merged) attrs["marker-end"] = "url(#fc-arrow-" + activity.id + ")";
      edgesLayer.appendChild(svgEl("path", attrs));
      if (e.label) {
        const lp = labelPlacement(ptsArr);
        if (lp.chip) {
          edgesLayer.appendChild(svgEl("rect", {
            x: lp.x - 14, y: lp.y - 13,
            width: 28, height: 16, rx: 3, ry: 3,
            class: "fc-edge-label-bg"
          }));
        }
        edgesLayer.appendChild(svgEl("text", {
          x: lp.x, y: lp.y,
          "text-anchor": lp.anchor,
          class: "fc-edge-label"
        }, [e.label]));
      }
    });
    // Junction dots last, so they sit on top of the lines they tie together.
    junctionDots.forEach(function (pt) {
      edgesLayer.appendChild(svgEl("circle", {
        cx: pt.x, cy: pt.y, r: 4, class: "fc-junction-dot"
      }));
    });

    root.appendChild(svg);
    host.appendChild(root);

    // When a label is truncated, clicking the shape pops the full text in an
    // overlay above everything else. A second click (anywhere) dismisses it.
    let revealOverlay = null;
    function clearReveal() {
      if (revealOverlay && revealOverlay.parentNode) revealOverlay.parentNode.removeChild(revealOverlay);
      revealOverlay = null;
    }
    function revealFullText(group, s, g, fontPx, lineH) {
      clearReveal();
      const lines = (s.text || "").split("\n");
      const charPx = fontPx * CHAR_RATIO;
      let maxLineLen = 0;
      lines.forEach(function (l) { if (l.length > maxLineLen) maxLineLen = l.length; });
      const boxW = Math.min(chartW - 8, maxLineLen * charPx + 24);
      const boxH = lines.length * lineH + 14;
      let bx = g.cx - boxW / 2;
      bx = Math.max(4, Math.min(chartW - boxW - 4, bx));
      const by = g.y - boxH - 6 < 4 ? g.y + g.h + 6 : g.y - boxH - 6;
      const ov = svgEl("g", { class: "fc-reveal" });
      ov.appendChild(svgEl("rect", {
        x: bx, y: by, width: boxW, height: boxH, rx: 6, ry: 6,
        class: "fc-reveal-box"
      }));
      const t = svgEl("text", {
        x: bx + boxW / 2, y: by + lineH,
        "text-anchor": "middle", "font-size": fontPx, class: "fc-reveal-text"
      });
      lines.forEach(function (line, i) {
        t.appendChild(svgEl("tspan", { x: bx + boxW / 2, dy: i === 0 ? "0" : String(lineH) }, [line]));
      });
      ov.appendChild(t);
      // Overlay lives in a dedicated top layer so nothing obscures it.
      svg.appendChild(ov);
      revealOverlay = ov;
      // Dismiss on next click anywhere.
      setTimeout(function () {
        const dismiss = function () { clearReveal(); document.removeEventListener("click", dismiss, true); };
        document.addEventListener("click", dismiss, true);
      }, 0);
    }

    function snapshot() {
      return { blanks: Object.assign({}, studentBlanks) };
    }

    function blankInput(id) {
      const all = root.querySelectorAll(".fc-blank");
      for (let i = 0; i < all.length; i++) {
        if (all[i].getAttribute("data-blank-id") === id) return all[i];
      }
      return null;
    }

    return {
      getResponse: snapshot,
      setResponse: function (r) {
        if (!r || !r.blanks) return;
        for (const id in r.blanks) {
          studentBlanks[id] = r.blanks[id];
          const inp = blankInput(id);
          if (inp) inp.value = r.blanks[id];
        }
      },
      reset: function () {
        for (const id in studentBlanks) {
          studentBlanks[id] = "";
          const inp = blankInput(id);
          if (inp) inp.value = "";
        }
      },
      highlight: function (per_part) {
        root.querySelectorAll(".fc-blank").forEach(function (el) {
          el.classList.remove("fc-blank-ok", "fc-blank-bad");
        });
        if (!per_part || !per_part.blanks) return;
        for (const id in per_part.blanks) {
          const inp = blankInput(id);
          if (!inp) continue;
          inp.classList.add(per_part.blanks[id] ? "fc-blank-ok" : "fc-blank-bad");
        }
      },
      focus: function () {
        const first = root.querySelector(".fc-blank");
        if (first && first.focus) first.focus();
      }
    };
  });

  // Expose the one-shot auto-router so the teacher editor's "Auto-arrange"
  // button can bake routing into the edges. Geometry helpers are shared so the
  // editor and renderer stay in lock-step.
  PyQuiz.Flowchart = PyQuiz.Flowchart || {};
  PyQuiz.Flowchart.autoArrange = autoArrange;
})();
