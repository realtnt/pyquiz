/* === inlined from js/editors/flowchart.js === */
/* =====================================================================
 * PyQuiz.Editors — "flowchart" WYSIWYG editor.
 *
 * Builds a visual editor inside `host`:
 *   - Toolbar: shape-picker, delete, undo info (Ctrl+Z works), code-block,
 *     blank list opener.
 *   - Canvas: faithful grid renderer (matches the student app exactly).
 *   - Side panel: properties of the currently-selected shape / arrow.
 *
 * Mutations go straight to `act.payload.flowchart` and `act.payload.blanks`;
 * after every change we call `ctx.onChange()` so the host re-validates and
 * persists. Undo/redo is local to this editor and snapshots the payload
 * around discrete actions (one step per drag, one per focus session of a
 * text field).
 *
 * Data contract (unchanged from existing packs):
 *   shape: { id, kind: 'terminator'|'process'|'decision'|'io', text, row, col }
 *   edge:  { from, to, label?, from_side?, to_side?, bend?: {x,y} }
 *   blank: { id, mode, answer, accepted, case_sensitive?, width_hint?, options? }
 * ===================================================================== */
(function () {
  const PyQuiz = (window.PyQuiz = window.PyQuiz || {});
  const DOM = PyQuiz.DOM;
  const SVG_NS = "http://www.w3.org/2000/svg";

  /* ---- Geometry constants (must match the student renderer). ---- */
  const SHAPE_W = 170;
  const SHAPE_H = 54;
  const DEC_W   = 200;
  const DEC_H   = 84;
  const CELL_W  = 220;
  const CELL_H  = 120;
  const MARGIN  = 20;
  const IO_SKEW = 16;
  const GRID_PX = 10;

  /* ---- Text fitting (mirrors the student renderer). ---- */
  const FONT_STEPS = [13, 12, 11, 10];
  const MIN_FONT = FONT_STEPS[FONT_STEPS.length - 1];
  const CHAR_RATIO = 0.6;
  const MAX_LINES = 3;
  const MAX_SHAPE_W = CELL_W - 24;
  const MAX_DEC_W   = CELL_W - 8;
  const MAX_SHAPE_H = CELL_H - 28;
  const MAX_DEC_H   = CELL_H - 8;
  const BLANK_SLOT_PX = 30;
  function padFor(kind) {
    if (kind === "decision") return 34;
    if (kind === "io") return 22;
    return 14;
  }
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
  function wrapLine(line, innerW, fontPx) {
    const charPx = fontPx * CHAR_RATIO;
    const maxChars = Math.max(1, Math.floor(innerW / charPx));
    if (line.length <= maxChars) return [line];
    const words = line.split(/(\s+)/);
    const out = [];
    let cur = "";
    function pushCur() { if (cur.length) { out.push(cur); cur = ""; } }
    words.forEach(function (tok) {
      if (cur.length + tok.length <= maxChars) { cur += tok; return; }
      if (/^\s+$/.test(tok)) { pushCur(); return; }
      if (tok.length > maxChars) {
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

    for (let i = 0; i < FONT_STEPS.length; i++) {
      const fontPx = FONT_STEPS[i];
      const need = longestLineWidthPx(text, fontPx) + pad * 2;
      if (need <= maxW && text.indexOf("\n") < 0) {
        return { fontPx: fontPx, w: Math.max(baseW, Math.min(maxW, Math.ceil(need))),
                 h: kind === "decision" ? DEC_H : SHAPE_H, lines: [text], truncated: false };
      }
    }

    const innerW = maxW - pad * 2;
    for (let i = 0; i < FONT_STEPS.length; i++) {
      const fontPx = FONT_STEPS[i];
      const lineH = fontPx + 3;
      const lines = wrapText(text, innerW, fontPx);
      const neededH = lines.length * lineH + 14;
      if (lines.length <= MAX_LINES && neededH <= maxH) {
        let widest = 0;
        lines.forEach(function (l) { const w = lineWidthPx(l, fontPx); if (w > widest) widest = w; });
        const w = Math.max(baseW, Math.min(maxW, Math.ceil(widest + pad * 2)));
        const h = Math.max(kind === "decision" ? DEC_H : SHAPE_H, Math.ceil(neededH));
        return { fontPx: fontPx, w: w, h: Math.min(maxH, h), lines: lines, truncated: false };
      }
    }

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

  PyQuiz.Editors.register("flowchart", function (host, act, ctx) {
    const onChange = ctx.onChange || function () {};
    const p = act.payload = act.payload || {};
    p.flowchart = p.flowchart || { shapes: [], edges: [] };
    p.flowchart.shapes = Array.isArray(p.flowchart.shapes) ? p.flowchart.shapes : [];
    p.flowchart.edges = Array.isArray(p.flowchart.edges) ? p.flowchart.edges : [];
    p.blanks = Array.isArray(p.blanks) ? p.blanks : [];

    /* ---- shadowed "model" facade so all rendering / editing code can
       look at one local object. Writing to `model.shapes` writes to
       `p.flowchart.shapes` (same array reference). ---- */
    const model = {
      get shapes() { return p.flowchart.shapes; },
      set shapes(v) { p.flowchart.shapes = v; },
      get edges() { return p.flowchart.edges; },
      set edges(v) { p.flowchart.edges = v; },
      get blanks() { return p.blanks; },
      set blanks(v) { p.blanks = v; }
    };

    let sel = null;             // {type:'shape',id} or {type:'edge',index}
    let connectFrom = null;     // shape id while drawing a connector
    let connectFromSide = null;
    let lastOffset = { x: 0, y: 0 };   // centring translate applied to content

    /* ---- helpers ---------------------------------------------------- */
    function uid(prefix) {
      let n;
      do { n = prefix + Math.random().toString(36).slice(2, 5); }
      while (model.shapes.some(function (s) { return s.id === n; }));
      return n;
    }
    function el(tag, attrs, kids) {
      const e = document.createElementNS(SVG_NS, tag);
      if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
      if (kids) for (const c of kids) {
        if (c == null) continue;
        if (typeof c === "string") e.appendChild(document.createTextNode(c));
        else e.appendChild(c);
      }
      return e;
    }
    function hEl(tag, attrs, txt) {
      const e = document.createElement(tag);
      if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
      if (txt != null) e.textContent = txt;
      return e;
    }
    function snap(n) { return Math.round(n / GRID_PX) * GRID_PX; }
    function splitLabel(text) {
      const segs = [];
      const re = /\{\{([^}]+)\}\}/g;
      let last = 0, m;
      while ((m = re.exec(text)) !== null) {
        if (m.index > last) segs.push({ t: "text", v: text.slice(last, m.index) });
        segs.push({ t: "blank", id: m[1].trim() });
        last = m.index + m[0].length;
      }
      if (last < text.length) segs.push({ t: "text", v: text.slice(last) });
      if (!segs.length) segs.push({ t: "text", v: "" });
      return segs;
    }

    /* ---- geometry --------------------------------------------------- */
    function dims(s) {
      const fit = fitText(s);
      return [fit.w, fit.h];
    }
    function geom(s) {
      const wh = dims(s);
      const w = wh[0], h = wh[1];
      const cx = MARGIN + s.col * CELL_W + CELL_W / 2;
      const cy = MARGIN + s.row * CELL_H + CELL_H / 2;
      const x = cx - w / 2, y = cy - h / 2;
      const sk = s.kind === "io" ? IO_SKEW : 0;
      return {
        x: x, y: y, w: w, h: h, cx: cx, cy: cy, kind: s.kind,
        top:    { x: cx,             y: y },
        bottom: { x: cx,             y: y + h },
        left:   { x: x + sk / 2,     y: cy },
        right:  { x: x + w - sk / 2, y: cy }
      };
    }
    function gById() {
      const m = {};
      model.shapes.forEach(function (s) { m[s.id] = geom(s); });
      return m;
    }
    /* ---- Side preferences + one-shot auto-arrange ----
       Rendering is faithful: edges draw from their stored from_side/to_side.
       The teacher bakes routing via the "Auto-arrange" button, which writes
       sides into the edges. fromPrefs/toPrefs also serve as the render-time
       fallback for edges that have never been arranged. */
    function fromPrefs(a, b) {
      const vDown = b.cy > a.cy;
      const right = b.cx > a.cx;
      const sameCol = Math.abs(a.cx - b.cx) < 1;
      const sameRow = Math.abs(a.cy - b.cy) < 1;
      if (sameCol) return vDown ? ["bottom", "right", "left", "top"] : ["top", "right", "left", "bottom"];
      if (sameRow) return right ? ["right", "bottom", "top", "left"] : ["left", "bottom", "top", "right"];
      const v = vDown ? "bottom" : "top";
      const hh = right ? "right" : "left";
      return [v, hh, (hh === "right" ? "left" : "right"), (v === "bottom" ? "top" : "bottom")];
    }
    function toPrefs(a, b) {
      const vDown = b.cy > a.cy;
      const right = b.cx > a.cx;
      const sameCol = Math.abs(a.cx - b.cx) < 1;
      const sameRow = Math.abs(a.cy - b.cy) < 1;
      if (sameCol) return vDown ? ["top", "left", "right", "bottom"] : ["bottom", "left", "right", "top"];
      if (sameRow) return right ? ["left", "top", "bottom", "right"] : ["right", "top", "bottom", "left"];
      const hh = right ? "left" : "right";
      const v = vDown ? "top" : "bottom";
      return [hh, v, (v === "top" ? "bottom" : "top"), (hh === "left" ? "right" : "left")];
    }
    // Bake routing into every edge. Prefers the shared renderer implementation
    // (so the editor and student app agree exactly); falls back to a local copy
    // if it isn't available.
    function autoArrangeAll() {
      const shared = window.PyQuiz && window.PyQuiz.Flowchart && window.PyQuiz.Flowchart.autoArrange;
      if (shared) { shared(model.shapes, model.edges); return; }
      const claimed = {};
      const usedExit = {};
      const sb = {};
      model.shapes.forEach(function (s) { claimed[s.id] = {}; sb[s.id] = s; });
      function pick(id, prefs, dir, avoid) {
        const c = claimed[id] || (claimed[id] = {});
        for (let i = 0; i < prefs.length; i++) { const s = prefs[i]; if (avoid && avoid.indexOf(s) >= 0) continue; if (!c[s]) { c[s] = dir; return s; } }
        for (let i = 0; i < prefs.length; i++) { const s = prefs[i]; if (avoid && avoid.indexOf(s) >= 0) continue; if (c[s] === dir) return s; }
        for (let i = 0; i < prefs.length; i++) { if (!avoid || avoid.indexOf(prefs[i]) < 0) return prefs[i]; }
        return prefs[0];
      }
      model.edges.forEach(function (e) {
        const fromS = sb[e.from], toS = sb[e.to];
        if (!fromS || !toS) return;
        const a = geom(fromS), b = geom(toS);
        let avoid = null;
        if (fromS.kind === "decision" && usedExit[e.from]) avoid = usedExit[e.from].slice();
        const fs = pick(e.from, fromPrefs(a, b), "exit", avoid);
        const ts = pick(e.to, toPrefs(a, b), "entry", null);
        (usedExit[e.from] = usedExit[e.from] || []).push(fs);
        e.from_side = fs; e.to_side = ts; delete e.bend;
      });
    }
    function sidesFor(e, fromS, toS) {
      let fs = e.from_side, ts = e.to_side;
      if (!fs || !ts) {
        const a = geom(fromS), b = geom(toS);
        if (!fs) fs = fromPrefs(a, b)[0];
        if (!ts) ts = toPrefs(a, b)[0];
      }
      return { fs: fs, ts: ts };
    }
    /* Clamp a raw bend coordinate so the routed path doesn't self-cross.
       See the prototype for the derivation. */
    function clampBend(e, rawX, rawY, canvasB) {
      const fromS = model.shapes.find(function (s) { return s.id === e.from; });
      const toS   = model.shapes.find(function (s) { return s.id === e.to; });
      if (!fromS || !toS) return { x: snap(rawX), y: snap(rawY) };
      const a = geom(fromS), b = geom(toS);
      const sides = sidesFor(e, fromS, toS);
      const fs = sides.fs, ts = sides.ts;
      const p0 = a[fs], p1 = b[ts];
      let x = Math.max(0, Math.min(canvasB.w, rawX));
      let y = Math.max(0, Math.min(canvasB.h, rawY));
      const exitHorizontal = (fs === "left" || fs === "right");
      if (exitHorizontal) {
        const yL = Math.min(y, p1.y), yH = Math.max(y, p1.y);
        const xL = Math.min(p0.x, x), xH = Math.max(p0.x, x);
        if (p0.y > yL + 0.5 && p0.y < yH - 0.5 && p1.x > xL + 0.5 && p1.x < xH - 0.5) {
          y = p0.y;
        }
      } else {
        const xL = Math.min(x, p1.x), xH = Math.max(x, p1.x);
        const yL = Math.min(p0.y, y), yH = Math.max(p0.y, y);
        if (p0.x > xL + 0.5 && p0.x < xH - 0.5 && p1.y > yL + 0.5 && p1.y < yH - 0.5) {
          x = p0.x;
        }
      }
      return { x: snap(x), y: snap(y) };
    }
    function edgePointsArr(e, gmap) {
      const a = gmap[e.from], b = gmap[e.to];
      if (!a || !b) return null;
      const fromS = model.shapes.find(function (s) { return s.id === e.from; });
      const toS   = model.shapes.find(function (s) { return s.id === e.to; });
      const sides = sidesFor(e, fromS, toS);
      const fs = sides.fs, ts = sides.ts;
      const p0 = a[fs], p1 = b[ts];
      let pts = [p0];
      if (e.bend) {
        const bx = e.bend.x, by = e.bend.y;
        if (fs === "bottom" || fs === "top") {
          pts.push({ x: p0.x, y: by }, { x: bx, y: by }, { x: bx, y: p1.y });
        } else {
          pts.push({ x: bx, y: p0.y }, { x: bx, y: by }, { x: p1.x, y: by });
        }
      } else {
        pts = pts.concat(autoRoute(e, p0, p1, fs, ts));
      }
      pts.push(p1);
      return pts;
    }
    function edgePath(e, gmap) {
      const pts = edgePointsArr(e, gmap);
      if (!pts) return "";
      return collapse(pts);
    }
    // Place a Yes/No label near the exit port (start of the path); lift it
    // above the line for a horizontal exit so the line/arrowhead stay visible.
    const ED_LABEL_GAP = 22;
    function labelPlacement(pts) {
      const p0 = pts[0], p1 = pts[1] || pts[0];
      const vertical = Math.abs(p0.x - p1.x) < 0.5;
      const segLen = Math.abs(p0.x - p1.x) + Math.abs(p0.y - p1.y);
      const along = Math.min(ED_LABEL_GAP, segLen * 0.5);
      if (vertical) {
        const dir = p1.y >= p0.y ? 1 : -1;
        return { x: p0.x, y: p0.y + dir * along + 4, anchor: "middle", chip: true };
      }
      const dir = p1.x >= p0.x ? 1 : -1;
      return { x: p0.x + dir * along, y: p0.y - 7, anchor: "middle", chip: false };
    }
    function autoRoute(e, p0, p1, fs, ts) {
      const sameX = Math.abs(p0.x - p1.x) < 1, sameY = Math.abs(p0.y - p1.y) < 1;
      if (sameX || sameY) return [];
      const candA = [{ x: p1.x, y: p0.y }];
      const candB = [{ x: p0.x, y: p1.y }];
      const defaultIsA = (fs === "left" || fs === "right");
      const cutA = countObstacleCuts([p0].concat(candA, [p1]), e);
      const cutB = countObstacleCuts([p0].concat(candB, [p1]), e);
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
    function countObstacleCuts(pts, e) {
      let count = 0;
      for (let si = 0; si < model.shapes.length; si++) {
        const s = model.shapes[si];
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
      if (Math.abs(a.x - b.x) < 0.5) {
        const x = a.x;
        if (x <= r.x1 || x >= r.x2) return false;
        const lo = Math.min(a.y, b.y), hi = Math.max(a.y, b.y);
        return lo < r.y2 && hi > r.y1;
      }
      if (Math.abs(a.y - b.y) < 0.5) {
        const y = a.y;
        if (y <= r.y1 || y >= r.y2) return false;
        const lo = Math.min(a.x, b.x), hi = Math.max(a.x, b.x);
        return lo < r.x2 && hi > r.x1;
      }
      return false;
    }
    function zDetour(p0, p1, fs) {
      const exitHoriz = (fs === "left" || fs === "right");
      if (exitHoriz) {
        const midX = snap((p0.x + p1.x) / 2);
        return [{ x: midX, y: p0.y }, { x: midX, y: p1.y }];
      } else {
        const midY = snap((p0.y + p1.y) / 2);
        return [{ x: p0.x, y: midY }, { x: p1.x, y: midY }];
      }
    }
    function collapse(pts) {
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
      return "M " + cleaned.map(function (q) { return q.x.toFixed(1) + "," + q.y.toFixed(1); }).join(" L ");
    }
    function pathMid(d) {
      const pts = d.replace(/^M\s*/, "").split(/\s*L\s*/).map(function (s) {
        const a = s.split(",").map(Number); return { x: a[0], y: a[1] };
      });
      let bestI = 0, bestLen = -1;
      for (let i = 0; i < pts.length - 1; i++) {
        const len = Math.abs(pts[i].x - pts[i + 1].x) + Math.abs(pts[i].y - pts[i + 1].y);
        if (len > bestLen) { bestLen = len; bestI = i; }
      }
      return { x: (pts[bestI].x + pts[bestI + 1].x) / 2, y: (pts[bestI].y + pts[bestI + 1].y) / 2 };
    }

    /* ---- edge merging (mirrors the student renderer) ----
       Edges that go the same direction and converge on the same destination +
       entry side are aligned: the later one is visually trimmed to join the
       earlier one's rail, with a junction dot at the tie point. This is
       NON-DESTRUCTIVE — the true endpoints/geometry are preserved so each edge
       stays individually selectable and its handles sit at the real ends. */
    const ED_MERGE_MIN = 16;
    function railSeg(pts) {
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
    function collinearOv(s1, s2) {
      const a = s1.a, b = s1.b, c = s2.a, d2 = s2.b;
      const v1 = Math.abs(a.x - b.x) < 0.5, v2 = Math.abs(c.x - d2.x) < 0.5;
      const h1 = Math.abs(a.y - b.y) < 0.5, h2 = Math.abs(c.y - d2.y) < 0.5;
      if (v1 && v2 && Math.abs(a.x - c.x) < 0.5) {
        const lo1 = Math.min(a.y, b.y), hi1 = Math.max(a.y, b.y);
        const lo2 = Math.min(c.y, d2.y), hi2 = Math.max(c.y, d2.y);
        return Math.max(0, Math.min(hi1, hi2) - Math.max(lo1, lo2));
      }
      if (h1 && h2 && Math.abs(a.y - c.y) < 0.5) {
        const lo1 = Math.min(a.x, b.x), hi1 = Math.max(a.x, b.x);
        const lo2 = Math.min(c.x, d2.x), hi2 = Math.max(c.x, d2.x);
        return Math.max(0, Math.min(hi1, hi2) - Math.max(lo1, lo2));
      }
      return 0;
    }
    function railLen(r) { return Math.abs(r.a.x - r.b.x) + Math.abs(r.a.y - r.b.y); }
    // Build a trimmed COPY of SHORT's points that joins LONG's rail. SHORT is
    // the edge with the shorter rail (it ties into the through-line); LONG is
    // the one that keeps its arrowhead and runs all the way to the shared port.
    // The tie sits on LONG's rail at the END of SHORT's rail furthest from the
    // shared destination, so the dot lands where the two lines actually meet
    // (between the edges) rather than back at the shape.
    function trimmedCopy(SHORT, rShort, rLong) {
      const vertical = Math.abs(rLong.a.x - rLong.b.x) < 0.5;
      const sEnd = SHORT[SHORT.length - 1];   // shared destination port
      let tie;
      if (vertical) {
        // join LONG's rail (x = rLong.a.x) at SHORT's rail far-from-dest end
        const far = Math.abs(rShort.a.y - sEnd.y) >= Math.abs(rShort.b.y - sEnd.y) ? rShort.a.y : rShort.b.y;
        tie = { x: rLong.a.x, y: far };
      } else {
        const far = Math.abs(rShort.a.x - sEnd.x) >= Math.abs(rShort.b.x - sEnd.x) ? rShort.a.x : rShort.b.x;
        tie = { x: far, y: rLong.a.y };
      }
      const head = SHORT.slice(0, rShort.i + 1).map(function (p) { return { x: p.x, y: p.y }; });
      head.push({ x: tie.x, y: tie.y });
      return { pts: head, dot: { x: tie.x, y: tie.y } };
    }
    // Returns { displays: [pts|null], merged: [bool], dots: [{x,y}] }.
    function computeMerges(ptsArrs, edges) {
      const displays = ptsArrs.map(function (p) { return p ? p.slice() : null; });
      const merged = ptsArrs.map(function () { return false; });
      const dots = [];
      for (let i = 0; i < ptsArrs.length; i++) {
        const A = ptsArrs[i];
        if (!A || A.length < 3 || merged[i]) continue;
        for (let j = 0; j < i; j++) {
          const B = ptsArrs[j];
          if (!B || B.length < 3 || merged[j]) continue;
          const ra = railSeg(A), rb = railSeg(B);
          if (!ra || !rb) continue;
          const ea = edges[i], eb = edges[j];
          const converging = ea && eb && ea.to === eb.to &&
            (ea.to_side || "") === (eb.to_side || "") &&
            collinearOv(ra, rb) >= ED_MERGE_MIN;
          if (converging) {
            // Trim whichever edge has the SHORTER rail; the longer one stays
            // whole and keeps its arrowhead into the shared port.
            let shortIdx, shortPts, rShort, rLong;
            if (railLen(ra) <= railLen(rb)) { shortIdx = i; shortPts = A; rShort = ra; rLong = rb; }
            else                            { shortIdx = j; shortPts = B; rShort = rb; rLong = ra; }
            const t = trimmedCopy(shortPts, rShort, rLong);
            displays[shortIdx] = t.pts;
            merged[shortIdx] = true;
            dots.push(t.dot);
            break;
          }
        }
      }
      return { displays: displays, merged: merged, dots: dots };
    }

    function bounds() {
      let maxR = 0, maxC = 0;
      model.shapes.forEach(function (s) {
        if (s.row > maxR) maxR = s.row;
        if (s.col > maxC) maxC = s.col;
      });
      return { w: MARGIN * 2 + (maxC + 2) * CELL_W, h: MARGIN * 2 + (maxR + 2) * CELL_H };
    }

    /* ---- blanks sync ----------------------------------------------- */
    function syncBlanks() {
      const used = new Set();
      model.shapes.forEach(function (s) {
        splitLabel(s.text || "").forEach(function (x) {
          if (x.t === "blank") used.add(x.id);
        });
      });
      used.forEach(function (id) {
        if (!model.blanks.some(function (b) { return b.id === id; })) {
          model.blanks.push({
            id: id, mode: "free_text", answer: "", accepted: [],
            case_sensitive: false, width_hint: 4
          });
        }
      });
      model.blanks = model.blanks.filter(function (b) { return used.has(b.id); });
      p.blanks = model.blanks;
    }

    /* ---- DOM scaffold ---------------------------------------------- */
    host.innerHTML = "";
    host.classList.add("fc-editor-host");
    injectStylesOnce();

    const wrap = hEl("div", { class: "fc-editor-wrap" });
    const tools = hEl("div", { class: "fc-editor-toolbar" });
    const statusEl = hEl("div", { class: "fc-editor-status" });
    const paneRow = hEl("div", { class: "fc-editor-paneRow" });
    const canvasPane = hEl("div", { class: "fc-editor-canvas" });
    const svg = el("svg", { class: "fc-editor-svg" });
    canvasPane.appendChild(svg);
    const sidePane = hEl("div", { class: "fc-editor-side" });
    paneRow.appendChild(canvasPane);
    paneRow.appendChild(sidePane);
    wrap.appendChild(tools);
    wrap.appendChild(paneRow);
    host.appendChild(wrap);

    /* ---- toolbar ---- */
    const SHAPE_ICONS = {
      terminator: '<svg viewBox="0 0 60 28"><rect x="2" y="2" width="56" height="24" rx="12" class="pp pp-terminator"/></svg>',
      process:    '<svg viewBox="0 0 60 28"><rect x="2" y="2" width="56" height="24" class="pp pp-process"/></svg>',
      decision:   '<svg viewBox="0 0 60 28"><polygon points="30,2 58,14 30,26 2,14" class="pp pp-decision"/></svg>',
      io:         '<svg viewBox="0 0 60 28"><polygon points="10,2 58,2 50,26 2,26" class="pp pp-io"/></svg>'
    };
    const KIND_LABEL = {
      terminator: "Terminal (Start/End)", process: "Process",
      decision: "Decision", io: "Input/Output"
    };
    function buildShapePicker(currentKind, onPick) {
      const w = hEl("div", { class: "fc-shape-picker" });
      ["terminator","process","decision","io"].forEach(function (k) {
        const b = hEl("button", { type: "button", title: KIND_LABEL[k], "aria-label": KIND_LABEL[k], "data-kind": k });
        b.innerHTML = SHAPE_ICONS[k];
        if (k === currentKind) b.classList.add("selected");
        b.addEventListener("click", function () { onPick(k); });
        w.appendChild(b);
      });
      return w;
    }
    const addPicker = buildShapePicker(null, function (k) { addShape(k); });
    tools.appendChild(addPicker);
    const delBtn = hEl("button", { type: "button", class: "fc-tool-btn" }, "Delete");
    delBtn.addEventListener("click", function () { doDelete(); });
    tools.appendChild(delBtn);
    const arrangeBtn = hEl("button", { type: "button", class: "fc-tool-btn",
      title: "Automatically choose exit/entry ports for every connection. Overwrites manual routing." }, "Auto-arrange");
    arrangeBtn.addEventListener("click", function () {
      pushHistory();
      autoArrangeAll();
      render(); renderSide(); onChange();
      setStatus("Connections auto-arranged.");
      setTimeout(function () { setStatus(""); }, 2000);
    });
    tools.appendChild(arrangeBtn);
    tools.appendChild(statusEl);

    /* ---- undo/redo (local to editor) ---- */
    const HISTORY_CAP = 50;
    const undoStack = [];
    const redoStack = [];
    function snapshot() {
      return JSON.stringify({
        shapes: model.shapes,
        edges: model.edges,
        blanks: model.blanks,
        code_alongside: p.code_alongside || ""
      });
    }
    function restoreFrom(json) {
      const d = JSON.parse(json);
      p.flowchart.shapes = d.shapes;
      p.flowchart.edges  = d.edges;
      p.blanks = d.blanks;
      if (d.code_alongside) p.code_alongside = d.code_alongside;
      else delete p.code_alongside;
      sel = null; connectFrom = null;
      render(); renderSide(); onChange();
    }
    function pushHistory() {
      undoStack.push(snapshot());
      if (undoStack.length > HISTORY_CAP) undoStack.shift();
      redoStack.length = 0;
    }
    function undo() {
      if (!undoStack.length) return;
      redoStack.push(snapshot());
      if (redoStack.length > HISTORY_CAP) redoStack.shift();
      restoreFrom(undoStack.pop());
    }
    function redo() {
      if (!redoStack.length) return;
      undoStack.push(snapshot());
      if (undoStack.length > HISTORY_CAP) undoStack.shift();
      restoreFrom(redoStack.pop());
    }

    /* ---- selection / status ---- */
    function selectShape(id) { sel = { type: "shape", id: id }; render(); renderSide(); }
    function selectEdge(i)   { sel = { type: "edge",  index: i }; render(); renderSide(); }
    function clearSel()      { sel = null; render(); renderSide(); }
    function setStatus(msg) {
      if (msg) { statusEl.textContent = msg; statusEl.classList.add("active"); }
      else     { statusEl.textContent = "";  statusEl.classList.remove("active"); }
    }

    /* A decision's two outgoing edges may not share the same exit port. This
       returns true if `side` is already taken as an exit by another edge out
       of decision `fromId` (ignoring `exceptEdge`, used when redirecting). */
    function decisionExitConflict(fromId, side, exceptEdge) {
      const s = model.shapes.find(function (x) { return x.id === fromId; });
      if (!s || s.kind !== "decision" || !side) return false;
      return model.edges.some(function (e) {
        if (e === exceptEdge) return false;
        if (e.from !== fromId) return false;
        const es = e.from_side || (sidesFor(e, s, model.shapes.find(function (x) { return x.id === e.to; })).fs);
        return es === side;
      });
    }

    /* ---- connect mode ---- */
    function startConnect(id, side) {
      connectFrom = id; connectFromSide = side || null;
      const s = model.shapes.find(function (x) { return x.id === id; });
      setStatus('Connecting from "' + (s ? shortText(s) : id) + '" — click destination (Esc to cancel)');
      render();
    }
    function completeConnect(id, side) {
      if (connectFrom && connectFrom !== id) {
        // Block a decision's two exits sharing one port.
        if (connectFromSide && decisionExitConflict(connectFrom, connectFromSide, null)) {
          setStatus("That exit port is already used by this decision's other branch — pick a different side.");
          setTimeout(function () { if (connectFrom) setStatus('Connecting — click destination (Esc to cancel)'); }, 2200);
          return;   // keep connect mode active so they can pick another port
        }
        pushHistory();
        const e = { from: connectFrom, to: id };
        if (connectFromSide) e.from_side = connectFromSide;
        if (side) e.to_side = side;
        model.edges.push(e);
        onChange();
      }
      cancelConnect();
    }
    function cancelConnect() { connectFrom = null; connectFromSide = null; setStatus(""); render(); }
    function shortText(s) {
      const t = (s.text || "").replace(/\{\{[^}]+\}\}/g, "▢");
      return t.length > 16 ? t.slice(0, 15) + "…" : t;
    }

    /* ---- shape add / delete ---- */
    function addShape(kind) {
      pushHistory();
      const taken = new Set(model.shapes.map(function (s) { return s.row + "," + s.col; }));
      let row = 0, col = 0;
      outer: for (row = 0; row < 200; row++) {
        for (col = 0; col < 20; col++) {
          if (!taken.has(row + "," + col)) break outer;
        }
      }
      const s = {
        id: uid(kind[0]),
        kind: kind,
        text: kind === "terminator" ? "End" : (kind === "decision" ? "condition?" : "step"),
        row: row, col: col
      };
      model.shapes.push(s);
      selectShape(s.id); onChange();
    }
    function deleteShape(id) {
      pushHistory();
      model.shapes = model.shapes.filter(function (s) { return s.id !== id; });
      model.edges  = model.edges.filter(function (e)  { return e.from !== id && e.to !== id; });
      syncBlanks(); clearSel(); onChange();
    }
    function doDelete() {
      if (!sel) return;
      if (sel.type === "shape") deleteShape(sel.id);
      else {
        pushHistory();
        model.edges.splice(sel.index, 1);
        clearSel(); onChange();
      }
    }

    /* ---- key handling ---- */
    function onKey(ev) {
      // only act when our editor is on screen
      if (!host.isConnected) return;
      const typing = document.activeElement &&
        (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA");
      if (ev.key === "Escape") {
        if (connectFrom) cancelConnect();
        else if (sel) clearSel();
        return;
      }
      if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && (ev.key === "z" || ev.key === "Z")) {
        ev.preventDefault(); undo(); return;
      }
      if ((ev.ctrlKey || ev.metaKey) &&
          ((ev.key === "y" || ev.key === "Y") ||
           (ev.shiftKey && (ev.key === "z" || ev.key === "Z")))) {
        ev.preventDefault(); redo(); return;
      }
      if ((ev.key === "Delete" || ev.key === "Backspace") && sel && !typing) {
        doDelete();
      }
    }
    document.addEventListener("keydown", onKey);

    /* ---- drag shape, drag bend, drag endpoint ---- */
    let drag = null;        // shape drag
    let bendDrag = null;
    let endpointDrag = null;

    function onShapeDown(ev, id) {
      if (connectFrom) return;
      const s = model.shapes.find(function (x) { return x.id === id; });
      if (!s) return;
      drag = {
        id: id, startX: ev.clientX, startY: ev.clientY,
        row0: s.row, col0: s.col, priorSnap: snapshot(), committed: false
      };
      ev.preventDefault();
    }
    function startBendDrag(ev, index) {
      ev.stopPropagation();
      ev.preventDefault();
      bendDrag = { index: index, priorSnap: snapshot(), committed: false };
    }
    function startEndpointDrag(ev, index, which) {
      ev.stopPropagation();
      ev.preventDefault();
      const e = model.edges[index];
      const gm = gById();
      const a = gm[e.from], b = gm[e.to];
      const sides = sidesFor(e, model.shapes.find(function (s) { return s.id === e.from; }),
                                model.shapes.find(function (s) { return s.id === e.to; }));
      const start = which === "from" ? a[sides.fs] : b[sides.ts];
      endpointDrag = { index: index, which: which, preview: { x: start.x, y: start.y }, dropTarget: null };
      render();
    }
    function findPortAt(x, y, excludeId, dragWhich, dragEdge) {
      const snapPx = 24;
      const magnetPx = 40;   // larger pull toward a port that aligns edges
      let best = null, bestScore = snapPx * snapPx;
      // A port is "magnetic" if landing the dragged end there would make this
      // edge converge with another edge already entering (TO) or leaving (FROM)
      // that exact port — i.e. they'd share the port and could auto-align.
      function portIsMagnetic(shapeId, side) {
        if (!dragEdge) return false;
        return model.edges.some(function (e) {
          if (e === dragEdge) return false;
          if (dragWhich === "to") return e.to === shapeId && (e.to_side || "") === side;
          if (dragWhich === "from") return e.from === shapeId && (e.from_side || "") === side;
          return false;
        });
      }
      for (let i = 0; i < model.shapes.length; i++) {
        const s = model.shapes[i];
        if (s.id === excludeId) continue;
        const g = geom(s);
        ["top", "right", "bottom", "left"].forEach(function (side) {
          const pt = g[side];
          const dx = pt.x - x, dy = pt.y - y, d = dx * dx + dy * dy;
          const magnetic = portIsMagnetic(s.id, side);
          const radius2 = magnetic ? magnetPx * magnetPx : snapPx * snapPx;
          if (d > radius2) return;
          // Magnetic ports win ties / near-ties by scoring a bit closer.
          const score = magnetic ? d * 0.5 : d;
          if (score < bestScore) { bestScore = score; best = { shape: s.id, side: side, magnetic: magnetic }; }
        });
      }
      return best;
    }
    function svgPoint(ev) {
      const r = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;
      const w = vb.width || Number(svg.getAttribute("width"));
      const h = vb.height || Number(svg.getAttribute("height"));
      // Surface coords, then subtract the centring offset so callers work in
      // chart-local coordinates (the same space geom() produces).
      return {
        x: (ev.clientX - r.left) / r.width * w - lastOffset.x,
        y: (ev.clientY - r.top)  / r.height * h - lastOffset.y
      };
    }

    function onMove(ev) {
      if (drag) {
        const dx = ev.clientX - drag.startX, dy = ev.clientY - drag.startY;
        const s = model.shapes.find(function (x) { return x.id === drag.id; });
        if (!s) return;
        const nc = Math.max(0, drag.col0 + Math.round(dx / CELL_W));
        const nr = Math.max(0, drag.row0 + Math.round(dy / CELL_H));
        if (s.col !== nc || s.row !== nr) {
          if (!drag.committed) {
            drag.committed = true;
            undoStack.push(drag.priorSnap);
            if (undoStack.length > HISTORY_CAP) undoStack.shift();
            redoStack.length = 0;
          }
          s.col = nc; s.row = nr;
          render(); onChange();
        }
      }
      if (bendDrag) {
        const pt = svgPoint(ev);
        const b = bounds();
        const e = model.edges[bendDrag.index];
        if (!bendDrag.committed) {
          bendDrag.committed = true;
          undoStack.push(bendDrag.priorSnap);
          if (undoStack.length > HISTORY_CAP) undoStack.shift();
          redoStack.length = 0;
        }
        e.bend = clampBend(e, pt.x, pt.y, b);
        render(); onChange();
      }
      if (endpointDrag) {
        const pt = svgPoint(ev);
        const b = bounds();
        endpointDrag.preview = {
          x: Math.max(0, Math.min(b.w, pt.x)),
          y: Math.max(0, Math.min(b.h, pt.y))
        };
        const e = model.edges[endpointDrag.index];
        const excludeId = endpointDrag.which === "from" ? e.to : e.from;
        endpointDrag.dropTarget = findPortAt(pt.x, pt.y, excludeId, endpointDrag.which, e);
        render();
      }
    }
    function onUp() {
      drag = null;
      bendDrag = null;
      if (endpointDrag) {
        const dt = endpointDrag.dropTarget;
        if (dt) {
          const e = model.edges[endpointDrag.index];
          // Redirecting the FROM end onto a decision exit that the decision's
          // other branch already uses is not allowed.
          const wouldConflict = endpointDrag.which === "from" &&
            decisionExitConflict(dt.shape, dt.side, e);
          if (wouldConflict) {
            setStatus("That exit port is already used by this decision's other branch.");
            setTimeout(function () { setStatus(""); }, 2200);
          } else {
            pushHistory();
            if (endpointDrag.which === "from") { e.from = dt.shape; e.from_side = dt.side; }
            else                                { e.to   = dt.shape; e.to_side   = dt.side; }
            delete e.bend;
            onChange();
          }
        }
        endpointDrag = null;
        render(); renderSide();
      }
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);

    /* ---- render canvas --------------------------------------------- */
    function render() {
      const b = bounds();
      // Fill the available canvas area: the drawing surface is at least as
      // large as the visible pane, so the grid covers the whole area and the
      // chart sits centred within it. Fall back to the chart bounds when the
      // pane hasn't been laid out yet (e.g. first render before attach).
      const padPx = 16;   // matches .fc-editor-canvas padding *2-ish
      const availW = Math.max(0, (canvasPane.clientWidth || 0) - padPx);
      const availH = Math.max(0, (canvasPane.clientHeight || 0) - padPx);
      const w = Math.max(b.w, availW);
      const h = Math.max(b.h, availH);
      // Centre the chart's content box within the surface.
      const ox = Math.max(0, Math.round((w - b.w) / 2));
      const oy = Math.max(0, Math.round((h - b.h) / 2));
      lastOffset = { x: ox, y: oy };
      svg.setAttribute("viewBox", "0 0 " + w + " " + h);
      svg.setAttribute("width", w);
      svg.setAttribute("height", h);
      svg.innerHTML = "";

      const defs = el("defs");
      defs.appendChild(el("marker", {
        id: "fc-ed-arrow",
        viewBox: "0 0 10 10", refX: "9", refY: "5",
        markerWidth: "8", markerHeight: "8",
        orient: "auto-start-reverse"
      }, [
        el("path", { d: "M 0 0 L 10 5 L 0 10 z", class: "fc-arrowhead" })
      ]));
      svg.appendChild(defs);

      // grid lines fill the WHOLE surface, aligned to the chart's origin so
      // cells line up with shape positions wherever the chart is centred.
      const gridG = el("g", { class: "fc-grid" });
      const gx0 = ((ox + MARGIN) % CELL_W);
      for (let gx = gx0; gx <= w + 1; gx += CELL_W)
        gridG.appendChild(el("line", { x1: gx, y1: 0, x2: gx, y2: h, class: "fc-grid-line" }));
      const gy0 = ((oy + MARGIN) % CELL_H);
      for (let gy = gy0; gy <= h + 1; gy += CELL_H)
        gridG.appendChild(el("line", { x1: 0, y1: gy, x2: w, y2: gy, class: "fc-grid-line" }));
      svg.appendChild(gridG);

      // Everything else is drawn inside a translate group so the chart is
      // centred. Shape geometry stays in chart-local coords (so drag maths
      // and edge routing are unchanged); only this group's transform moves.
      const content = el("g", { class: "fc-content", transform: "translate(" + ox + "," + oy + ")" });
      svg.appendChild(content);

      // two layers: shapes painted first, edges + handles on top
      const shapesLayer = el("g", { class: "layer-shapes" });
      const edgesLayer  = el("g", { class: "layer-edges" });
      content.appendChild(shapesLayer);
      content.appendChild(edgesLayer);
      const gmap = gById();

      // shapes
      model.shapes.forEach(function (s) {
        const g = geom(s);
        const isSel = sel && sel.type === "shape" && sel.id === s.id;
        const isConnSrc = connectFrom === s.id;
        const grp = el("g", {
          class: "fc-shape-group" + (isSel ? " shape-sel" : "") + (isConnSrc ? " connecting-src" : ""),
          "data-id": s.id
        });
        let outline;
        if (s.kind === "terminator") {
          outline = el("rect", { x: g.x, y: g.y, width: g.w, height: g.h, rx: g.h / 2, ry: g.h / 2, class: "fc-shape fc-terminator" });
        } else if (s.kind === "process") {
          outline = el("rect", { x: g.x, y: g.y, width: g.w, height: g.h, class: "fc-shape fc-process" });
        } else if (s.kind === "decision") {
          const pts = [[g.cx, g.y], [g.x + g.w, g.cy], [g.cx, g.y + g.h], [g.x, g.cy]]
            .map(function (q) { return q.join(","); }).join(" ");
          outline = el("polygon", { points: pts, class: "fc-shape fc-decision" });
        } else if (s.kind === "io") {
          const pts = [[g.x + IO_SKEW, g.y], [g.x + g.w, g.y], [g.x + g.w - IO_SKEW, g.y + g.h], [g.x, g.y + g.h]]
            .map(function (q) { return q.join(","); }).join(" ");
          outline = el("polygon", { points: pts, class: "fc-shape fc-io" });
        } else {
          outline = el("rect", { x: g.x, y: g.y, width: g.w, height: g.h, class: "fc-shape" });
        }
        grp.appendChild(outline);

        // text label with inline blank placeholders
        const segs = splitLabel(s.text || "");
        const fit = fitText(s);
        const fontPx = fit.fontPx;
        if (segs.every(function (seg) { return seg.t === "text"; })) {
          const lines = fit.lines;
          const lineH = fontPx + 3;
          const startY = g.cy - ((lines.length - 1) * lineH) / 2 + 4;
          const t = el("text", {
            x: g.cx, y: startY,
            "text-anchor": "middle",
            "font-size": fontPx,
            class: "fc-shape-text"
          });
          lines.forEach(function (line, li) {
            t.appendChild(el("tspan", { x: g.cx, dy: li === 0 ? "0" : String(lineH) }, [line]));
          });
          grp.appendChild(t);
          if (lines.length > 1 || fit.truncated) {
            grp.appendChild(el("title", null, [s.text || ""]));
          }
        } else {
          const charW = fontPx * CHAR_RATIO, blankW = BLANK_SLOT_PX, gap = 2;
          let total = 0;
          segs.forEach(function (seg) {
            total += seg.t === "text" ? (seg.v.length * charW) : blankW;
          });
          let x = g.cx - total / 2;
          segs.forEach(function (seg) {
            if (seg.t === "text") {
              grp.appendChild(el("text", { x: x, y: g.cy + 5, "text-anchor": "start", "font-size": fontPx, class: "fc-shape-text" }, [seg.v]));
              x += seg.v.length * charW;
            } else {
              grp.appendChild(el("rect", { x: x, y: g.cy - 11, width: blankW, height: 22, rx: 3, class: "fc-ed-blank" }));
              x += blankW + gap;
            }
          });
        }

        grp.addEventListener("mousedown", function (ev) { onShapeDown(ev, s.id); });
        grp.addEventListener("click", function (ev) {
          ev.stopPropagation();
          if (connectFrom) completeConnect(s.id, null);
          else selectShape(s.id);
        });
        shapesLayer.appendChild(grp);

        // ports — shown when the shape is selected, while connecting (the
        // source always; other shapes reveal their ports on hover so the
        // teacher can pick the exact ENTRY port), or during an endpoint drag.
        const connecting = !!connectFrom;
        const showPorts = isSel || isConnSrc || !!endpointDrag || connecting;
        if (showPorts) {
          // While connecting, ports on shapes other than the source are
          // hover-only (CSS reveals them when the group is hovered).
          const hoverOnly = connecting && !isConnSrc && !isSel;
          ["top", "right", "bottom", "left"].forEach(function (side) {
            const pt = g[side];
            const isDrop = endpointDrag && endpointDrag.dropTarget &&
                           endpointDrag.dropTarget.shape === s.id &&
                           endpointDrag.dropTarget.side === side;
            const port = el("circle", {
              cx: pt.x, cy: pt.y, r: isDrop ? 7 : 5,
              class: "fc-ed-port" + (hoverOnly ? " hover-port" : " show") + (isDrop ? " drop-target" : "")
            });
            port.addEventListener("click", function (ev) {
              ev.stopPropagation();
              if (!connectFrom) startConnect(s.id, side);
              else completeConnect(s.id, side);
            });
            grp.appendChild(port);
          });
        }
      });

      // edges — compute geometry first so converging edges can be merged
      const edgePts = model.edges.map(function (e) { return edgePointsArr(e, gmap); });
      const mr = computeMerges(edgePts, model.edges);
      model.edges.forEach(function (e, i) {
        const ptsArr = edgePts[i];
        if (!ptsArr) return;
        const fullD = collapse(ptsArr);            // true geometry (hit + handles)
        const dispD = collapse(mr.displays[i] || ptsArr); // possibly trimmed for display
        if (!fullD) return;
        const isSel = sel && sel.type === "edge" && sel.index === i;
        // wide invisible hit path follows the TRUE geometry so the whole edge
        // stays clickable even when its visible line is trimmed by a merge.
        const hit = el("path", { d: fullD, class: "fc-edge-hit" });
        hit.addEventListener("click", function (ev) { ev.stopPropagation(); selectEdge(i); });
        edgesLayer.appendChild(hit);
        // Visible line uses the merged display path; a merged edge joins another
        // line at the junction dot, so it carries no arrowhead of its own.
        const pathAttrs = { d: dispD, class: "fc-edge" + (isSel ? " edge-sel" : "") };
        if (!mr.merged[i]) pathAttrs["marker-end"] = "url(#fc-ed-arrow)";
        const path = el("path", pathAttrs);
        path.addEventListener("click", function (ev) { ev.stopPropagation(); selectEdge(i); });
        edgesLayer.appendChild(path);
        if (e.label) {
          const lp = labelPlacement(ptsArr);
          if (lp.chip) {
            edgesLayer.appendChild(el("rect", { x: lp.x - 14, y: lp.y - 13, width: 28, height: 16, rx: 3, class: "fc-edge-label-bg" }));
          }
          edgesLayer.appendChild(el("text", { x: lp.x, y: lp.y, "text-anchor": lp.anchor, class: "fc-edge-label" }, [e.label]));
        }
        if (isSel) {
          const pts = ptsArr;                      // handles sit on TRUE ends
          const first = pts[0], last = pts[pts.length - 1];
          // FROM endpoint (hollow)
          const fx = endpointDrag && endpointDrag.index === i && endpointDrag.which === "from" ? endpointDrag.preview.x : first.x;
          const fy = endpointDrag && endpointDrag.index === i && endpointDrag.which === "from" ? endpointDrag.preview.y : first.y;
          const fh = el("circle", { cx: fx, cy: fy, r: 6, class: "fc-endpoint-handle from" });
          fh.addEventListener("mousedown", function (ev) { startEndpointDrag(ev, i, "from"); });
          edgesLayer.appendChild(fh);
          // TO endpoint (filled)
          const tx = endpointDrag && endpointDrag.index === i && endpointDrag.which === "to" ? endpointDrag.preview.x : last.x;
          const ty = endpointDrag && endpointDrag.index === i && endpointDrag.which === "to" ? endpointDrag.preview.y : last.y;
          const th = el("circle", { cx: tx, cy: ty, r: 6, class: "fc-endpoint-handle" });
          th.addEventListener("mousedown", function (ev) { startEndpointDrag(ev, i, "to"); });
          edgesLayer.appendChild(th);
          // BEND handle (on the true, untrimmed path)
          const mid = pathMid(fullD);
          const bh = el("circle", {
            cx: e.bend ? e.bend.x : mid.x,
            cy: e.bend ? e.bend.y : mid.y,
            r: 6, class: "fc-bend-handle"
          });
          bh.addEventListener("mousedown", function (ev) { startBendDrag(ev, i); });
          edgesLayer.appendChild(bh);
        }
      });
      // Junction dots for merged (auto-aligned) edges, drawn on top.
      mr.dots.forEach(function (pt) {
        edgesLayer.appendChild(el("circle", { cx: pt.x, cy: pt.y, r: 4, class: "fc-junction-dot" }));
      });
    }
    svg.addEventListener("click", function () {
      if (connectFrom) cancelConnect(); else clearSel();
    });

    /* ---- side panel ------------------------------------------------ */
    function renderSide() {
      sidePane.innerHTML = "";

      // Code alongside — always visible at top
      sidePane.appendChild(hEl("label", { class: "fc-side-label" }, "Code alongside (optional)"));
      const codeTA = hEl("textarea", { rows: 4, class: "fc-side-textarea fc-side-code" });
      codeTA.value = p.code_alongside || "";
      codeTA.addEventListener("focus", function () { pushHistory(); });
      codeTA.addEventListener("input", function () {
        if (codeTA.value.trim()) p.code_alongside = codeTA.value;
        else delete p.code_alongside;
        onChange();
      });
      sidePane.appendChild(codeTA);
      sidePane.appendChild(hEl("div", { class: "fc-side-hint" },
        "Shown above the chart. Useful for 'build the flowchart from this code' framing."));

      if (!sel) {
        sidePane.appendChild(hEl("div", { class: "fc-side-empty" },
          "Click a shape or arrow to edit it. Add shapes from the toolbar. Hover a shape to see its ports — click one, then click the destination to draw an arrow."));
        return;
      }

      if (sel.type === "shape") {
        const s = model.shapes.find(function (x) { return x.id === sel.id; });
        if (!s) { clearSel(); return; }
        sidePane.appendChild(hEl("h3", { class: "fc-side-h" }, "Shape"));
        // Text
        sidePane.appendChild(hEl("label", { class: "fc-side-label" }, "Text"));
        const ta = hEl("textarea", { rows: 2, class: "fc-side-textarea" });
        ta.value = s.text || "";
        ta.addEventListener("focus", function () { pushHistory(); });
        ta.addEventListener("input", function () {
          s.text = ta.value; syncBlanks(); render(); onChange();
        });
        ta.addEventListener("blur", function () {
          if (sel && sel.type === "shape" && sel.id === s.id) renderSide();
        });
        sidePane.appendChild(ta);
        sidePane.appendChild(hEl("div", { class: "fc-side-hint" },
          "Use {{name}} to add a blank. e.g. score {{cmp}} 50"));

        // Kind picker
        sidePane.appendChild(hEl("label", { class: "fc-side-label" }, "Kind"));
        sidePane.appendChild(buildShapePicker(s.kind, function (k) {
          pushHistory(); s.kind = k; render(); renderSide(); onChange();
        }));

        // Row/col
        const r2 = hEl("div", { class: "fc-side-row2" });
        r2.appendChild(numField("Row", s.row, function (v) {
          s.row = Math.max(0, v | 0); render(); onChange();
        }));
        r2.appendChild(numField("Col", s.col, function (v) {
          s.col = Math.max(0, v | 0); render(); onChange();
        }));
        sidePane.appendChild(r2);

        sidePane.appendChild(hEl("div", { class: "fc-side-hint" }, "ID: " + s.id));

        // Blanks for this shape
        const ids = splitLabel(s.text || "").filter(function (x) { return x.t === "blank"; })
                                            .map(function (x) { return x.id; });
        if (ids.length) {
          sidePane.appendChild(hEl("h3", { class: "fc-side-h", style: "margin-top:14px" }, "Blanks in this shape"));
          ids.forEach(function (bid) {
            let b = model.blanks.find(function (x) { return x.id === bid; });
            if (!b) {
              b = { id: bid, mode: "free_text", answer: "", accepted: [], case_sensitive: false, width_hint: 4 };
              model.blanks.push(b);
            }
            sidePane.appendChild(hEl("label", { class: "fc-side-label" }, "{{" + bid + "}} mode"));
            const modeSel = hEl("select", { class: "fc-side-select" });
            ["free_text", "select"].forEach(function (m) {
              const opt = hEl("option", null, m);
              opt.value = m;
              if (m === b.mode) opt.setAttribute("selected", "");
              modeSel.appendChild(opt);
            });
            modeSel.value = b.mode;
            modeSel.addEventListener("change", function () {
              pushHistory();
              b.mode = modeSel.value;
              if (b.mode === "select" && !Array.isArray(b.options)) b.options = [];
              onChange(); renderSide();
            });
            sidePane.appendChild(modeSel);

            sidePane.appendChild(hEl("label", { class: "fc-side-label" }, "Answer"));
            const ansInp = hEl("input", { class: "fc-side-input" });
            ansInp.value = b.answer || "";
            ansInp.addEventListener("focus", function () { pushHistory(); });
            ansInp.addEventListener("input", function () {
              b.answer = ansInp.value;
              b.accepted = [ansInp.value];
              onChange();
            });
            sidePane.appendChild(ansInp);

            if (b.mode === "select") {
              sidePane.appendChild(hEl("label", { class: "fc-side-label" }, "Options (one per line)"));
              const optTA = hEl("textarea", { rows: 3, class: "fc-side-textarea" });
              optTA.value = (b.options || []).join("\n");
              optTA.addEventListener("focus", function () { pushHistory(); });
              optTA.addEventListener("input", function () {
                b.options = optTA.value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
                onChange();
              });
              sidePane.appendChild(optTA);
            }
          });
        }

        const delBtn = hEl("button", { type: "button", class: "fc-side-btn fc-side-danger", style: "margin-top:14px" }, "Delete shape");
        delBtn.addEventListener("click", function () { deleteShape(s.id); });
        sidePane.appendChild(delBtn);
      } else {
        // edge
        const e = model.edges[sel.index];
        if (!e) { clearSel(); return; }
        sidePane.appendChild(hEl("h3", { class: "fc-side-h" }, "Arrow"));
        sidePane.appendChild(hEl("div", { class: "fc-side-hint" }, e.from + " → " + e.to));
        // Label
        sidePane.appendChild(hEl("label", { class: "fc-side-label" }, "Label (Yes/No, optional)"));
        const labInp = hEl("input", { class: "fc-side-input" });
        labInp.value = e.label || "";
        labInp.addEventListener("focus", function () { pushHistory(); });
        labInp.addEventListener("input", function () {
          if (labInp.value) e.label = labInp.value;
          else delete e.label;
          render(); onChange();
        });
        sidePane.appendChild(labInp);

        // Exit / enter sides
        sidePane.appendChild(selField("Exit side", e.from_side || "(auto)",
          ["(auto)", "top", "right", "bottom", "left"], function (v) {
            if (v !== "(auto)" && decisionExitConflict(e.from, v, e)) {
              setStatus("That exit port is already used by this decision's other branch.");
              setTimeout(function () { setStatus(""); }, 2200);
              renderSide();   // revert the dropdown to its stored value
              return;
            }
            pushHistory();
            if (v === "(auto)") delete e.from_side; else e.from_side = v;
            delete e.bend; render(); renderSide(); onChange();
          }));
        sidePane.appendChild(selField("Enter side", e.to_side || "(auto)",
          ["(auto)", "top", "right", "bottom", "left"], function (v) {
            pushHistory();
            if (v === "(auto)") delete e.to_side; else e.to_side = v;
            delete e.bend; render(); renderSide(); onChange();
          }));
        if (e.bend) {
          const rb = hEl("button", { type: "button", class: "fc-side-btn", style: "margin-top:8px" }, "Reset bend to auto");
          rb.addEventListener("click", function () {
            pushHistory(); delete e.bend; render(); renderSide(); onChange();
          });
          sidePane.appendChild(rb);
        } else {
          sidePane.appendChild(hEl("div", { class: "fc-side-hint" }, "Drag the orange dot on the arrow to bend it."));
        }
        const delBtn = hEl("button", { type: "button", class: "fc-side-btn fc-side-danger", style: "margin-top:14px" }, "Delete arrow");
        delBtn.addEventListener("click", function () {
          pushHistory(); model.edges.splice(sel.index, 1); clearSel(); onChange();
        });
        sidePane.appendChild(delBtn);
      }
    }
    function numField(label, val, on) {
      const w = hEl("div", { class: "fc-side-numwrap" });
      w.appendChild(hEl("label", { class: "fc-side-label" }, label));
      const inp = hEl("input", { type: "number", min: "0", class: "fc-side-input" });
      inp.value = val;
      inp.addEventListener("focus", function () { pushHistory(); });
      inp.addEventListener("input", function () { on(Number(inp.value)); });
      w.appendChild(inp);
      return w;
    }
    function selField(label, val, opts, on) {
      const w = hEl("div");
      w.appendChild(hEl("label", { class: "fc-side-label" }, label));
      const s = hEl("select", { class: "fc-side-select" });
      opts.forEach(function (o) {
        const op = hEl("option", null, o);
        op.value = o;
        if (o === val) op.setAttribute("selected", "");
        s.appendChild(op);
      });
      s.value = val;
      s.addEventListener("change", function () { on(s.value); });
      w.appendChild(s);
      return w;
    }

    /* ---- teardown / first render ---- */
    syncBlanks();
    render();
    renderSide();
    // The canvas pane may not have its final size on the very first render
    // (host not yet laid out). Re-render on the next frame, and whenever the
    // window resizes, so the chart stays centred and the grid keeps filling.
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(function () { if (host.isConnected) render(); });
    }
    const onResize = function () { if (host.isConnected) render(); };
    window.addEventListener("resize", onResize);

    // remove the keydown handler when the editor's DOM is destroyed
    if (typeof MutationObserver === "function") {
      const obs = new MutationObserver(function () {
        if (!host.isConnected) {
          document.removeEventListener("keydown", onKey);
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup",   onUp);
          window.removeEventListener("resize", onResize);
          obs.disconnect();
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  });

  /* ---- editor-only stylesheet (injected once) ---- */
  function injectStylesOnce() {
    if (document.getElementById("fc-editor-styles")) return;
    const css = `
.fc-editor-host { position: relative; }
.fc-editor-wrap { display: flex; flex-direction: column; gap: 8px; }
.fc-editor-toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; padding: 6px; background: var(--panel-2, #F2EEE6); border: 1px solid var(--border, #D8D0C4); border-radius: 8px; }
.fc-editor-toolbar > button,.fc-editor-toolbar > .fc-shape-picker { height: 32px; box-sizing: border-box; }
.fc-tool-btn { font: inherit; padding: 0 12px; border: 1px solid var(--border-strong, #B7AC99); border-radius: 7px; background: var(--panel, #fff); cursor: pointer; }
.fc-tool-btn:hover { background: var(--panel-2, #F2EEE6); }
.fc-shape-picker { display: inline-flex; gap: 4px; background: var(--panel, #fff); padding: 0 4px; border-radius: 8px; border: 1px solid var(--border, #D8D0C4); align-items: center; }
.fc-shape-picker button { height: 24px; padding: 0 4px; border: 1px solid transparent; border-radius: 5px; background: transparent; line-height: 0; cursor: pointer; display: inline-flex; align-items: center; }
.fc-shape-picker button:hover { background: var(--panel-2, #F2EEE6); border-color: var(--border-strong, #B7AC99); }
.fc-shape-picker button.selected { background: var(--panel-2, #F2EEE6); border-color: var(--accent, #2F6FB0); box-shadow: 0 0 0 1px var(--accent, #2F6FB0) inset; }
.fc-shape-picker svg { display: block; width: 40px; height: 18px; }
.pp { stroke: var(--border-strong, #B7AC99); stroke-width: 1.4; }
.pp-terminator { fill: var(--term, #E8ECF7); }
.pp-process    { fill: var(--proc, #fff); }
.pp-decision   { fill: var(--dec, #FBEAD7); }
.pp-io         { fill: var(--io, #E3EFE8); }
.fc-editor-status { font-size: 13px; padding: 4px 10px; border-radius: 7px; margin-left: auto; min-height: 1px; }
.fc-editor-status.active { background: #FDF1DF; border: 1px solid var(--focus, #E07A00); color: #8a4b00; }
.fc-editor-paneRow { display: flex; gap: 8px; align-items: stretch; min-height: 520px; height: 70vh; }
.fc-editor-canvas { flex: 1; min-width: 0; height: 100%; overflow: auto; background: #fff; border: 1px solid var(--border, #D8D0C4); border-radius: 8px; padding: 8px; }
.fc-editor-svg { display: block; background: #fff; -webkit-user-select: none; -moz-user-select: none; user-select: none; -webkit-touch-callout: none; }
.fc-editor-svg text, .fc-editor-svg .fc-shape-text, .fc-editor-svg .fc-edge-label { -webkit-user-select: none; -moz-user-select: none; user-select: none; }
.fc-editor-side { width: 260px; min-width: 260px; padding: 10px; background: var(--panel, #fff); border: 1px solid var(--border, #D8D0C4); border-radius: 8px; height: 100%; overflow: auto; box-sizing: border-box; }
.fc-editor-side .fc-side-h { font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b6256; margin: 0 0 6px; }
.fc-editor-side .fc-side-label { display: block; font-size: 12px; margin: 8px 0 3px; color: #444; }
.fc-editor-side .fc-side-input,.fc-editor-side .fc-side-select,.fc-editor-side .fc-side-textarea { width: 100%; font: inherit; padding: 5px 7px; border: 1px solid var(--border-strong, #B7AC99); border-radius: 6px; background: #fff; box-sizing: border-box; }
.fc-editor-side .fc-side-textarea { resize: vertical; min-height: 38px; }
.fc-editor-side .fc-side-code { font-family: var(--font-mono, ui-monospace, monospace); font-size: 12px; }
.fc-editor-side .fc-side-hint { font-size: 11px; color: #777; margin-top: 4px; }
.fc-editor-side .fc-side-empty { font-size: 13px; color: #8a8170; padding: 20px 6px; text-align: center; }
.fc-editor-side .fc-side-row2 { display: flex; gap: 8px; }
.fc-editor-side .fc-side-row2 > * { flex: 1; }
.fc-editor-side .fc-side-btn { font: inherit; padding: 5px 10px; border: 1px solid var(--border-strong, #B7AC99); border-radius: 6px; background: var(--panel, #fff); cursor: pointer; }
.fc-editor-side .fc-side-danger { color: #C0392B; }
.fc-editor-svg .fc-grid-line { stroke: rgba(0,0,0,0.06); stroke-width: 1; }
.fc-editor-svg .fc-shape { stroke: var(--border-strong, #B7AC99); stroke-width: 1.5; }
.fc-editor-svg .fc-terminator { fill: var(--term, #E8ECF7); }
.fc-editor-svg .fc-process    { fill: var(--proc, #fff); }
.fc-editor-svg .fc-decision   { fill: var(--dec, #FBEAD7); }
.fc-editor-svg .fc-io         { fill: var(--io, #E3EFE8); }
.fc-editor-svg .fc-shape-text { font-family: var(--font-mono, ui-monospace, monospace); font-size: 13px; fill: #222; }
.fc-editor-svg .fc-shape-group { cursor: move; }
.fc-editor-svg .shape-sel .fc-shape { stroke: var(--accent, #2F6FB0); stroke-width: 2.5; }
.fc-editor-svg .connecting-src .fc-shape { stroke: var(--focus, #E07A00) !important; stroke-width: 2.5 !important; }
.fc-editor-svg .fc-edge { stroke: #555; stroke-width: 1.5; fill: none; cursor: pointer; }
.fc-editor-svg .fc-edge.edge-sel { stroke: var(--accent, #2F6FB0); stroke-width: 2.5; }
.fc-editor-svg .fc-edge-hit { stroke: transparent; stroke-width: 10; fill: none; cursor: pointer; }
.fc-editor-svg .fc-edge-label-bg { fill: #fff; stroke: none; }
.fc-editor-svg .fc-edge-label { font-family: sans-serif; font-size: 12px; fill: #333; }
.fc-editor-svg .fc-junction-dot { fill: #222; stroke: none; }
.fc-editor-svg .fc-arrowhead { fill: #555; }
.fc-editor-svg .fc-ed-blank { fill: #fff; stroke: #888; stroke-width: 1; }
.fc-editor-svg .fc-ed-port { fill: #fff; stroke: var(--accent, #2F6FB0); stroke-width: 1.5; cursor: crosshair; opacity: 0; }
.fc-editor-svg .fc-ed-port.show { opacity: 1; }
.fc-editor-svg .fc-ed-port.hover-port { opacity: 0; transition: opacity 0.08s; }
.fc-editor-svg .fc-shape-group:hover .fc-ed-port.hover-port { opacity: 1; }
.fc-editor-svg .fc-ed-port.drop-target { fill: var(--accent, #2F6FB0); }
.fc-editor-svg .fc-bend-handle { fill: var(--focus, #E07A00); stroke: #fff; stroke-width: 1.5; cursor: grab; }
.fc-editor-svg .fc-endpoint-handle { fill: var(--accent, #2F6FB0); stroke: #fff; stroke-width: 1.5; cursor: grab; }
.fc-editor-svg .fc-endpoint-handle.from { fill: #fff; stroke: var(--accent, #2F6FB0); stroke-width: 2; }
`;
    const tag = document.createElement("style");
    tag.id = "fc-editor-styles";
    tag.textContent = css;
    document.head.appendChild(tag);
  }
})();
