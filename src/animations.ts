/**
 * One small animation for each of the principles, drawn on a canvas the slide gives it.
 *
 * Each is a factory: it returns a frame function that keeps its own state and repaints the whole
 * canvas every frame, given the canvas's size in CSS pixels and the seconds since the last frame.
 * They are drawn in the deck's own palette — ink, a muted grey, and the one orange.
 */
export type Frame = (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number) => void;

export type AnimationName =
  | "closure"
  | "locality"
  | "orthogonality"
  | "alphabet"
  | "encapsulation"
  | "undo"
  | "blackbox";

const INK = "#1b1d22";
const MUTED = "#9097a1";
const FAINT = "rgba(27, 29, 34, 0.12)";
const ORANGE = "rgb(242, 115, 5)";
const PAGE = "#ffffff";
const SERIF = '"KaTeX_Main", "Latin Modern Roman", Georgia, serif';
const SANS = "ui-sans-serif, system-ui, sans-serif";
const MONO = "ui-monospace, Menlo, Consolas, monospace";

const clamp01 = (u: number) => (u < 0 ? 0 : u > 1 ? 1 : u);
const ease = (u: number) => {
  const v = clamp01(u);
  return v * v * (3 - 2 * v);
};
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const pick = <T>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]!;

/** A line of words, some of them lit, set centred at (x, y). */
function sequence(ctx: CanvasRenderingContext2D, parts: { text: string; lit: boolean }[], x: number, y: number, size: number) {
  ctx.font = `${size}px ${SERIF}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const widths = parts.map((part) => ctx.measureText(part.text).width);
  let at = x - widths.reduce((sum, each) => sum + each, 0) / 2;
  parts.forEach((part, i) => {
    ctx.fillStyle = part.lit ? ORANGE : MUTED;
    ctx.fillText(part.text, at, y);
    at += widths[i]!;
  });
}

function caption(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size = 15, color = MUTED) {
  ctx.font = `${size}px ${SERIF}`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

/* ---- closure: point → line → intersection → point, and round again ---- */

function closure(): Frame {
  type Point = { u: number; v: number; born: number; made: boolean };
  type Line = { a: Point; b: Point; born: number };
  let points: Point[] = [];
  let lines: Line[] = [];
  let clock = 0;
  let next = 0;
  let fading = -1;
  let last: "punto" | "recta" | "intersección" = "punto";

  const reset = () => {
    points = Array.from({ length: 3 }, () => ({
      u: 0.25 + Math.random() * 0.5,
      v: 0.25 + Math.random() * 0.5,
      born: 0,
      made: false,
    }));
    lines = [];
    clock = 0;
    next = 1;
    fading = -1;
    last = "punto";
  };
  reset();

  const joined = (a: Point, b: Point) => lines.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));

  const addLine = () => {
    // Prefer the newest point, so what was just made is what gets used.
    const newest = points[points.length - 1]!;
    const pairs: [Point, Point][] = [];
    for (const a of points) for (const b of points) if (a !== b && !joined(a, b)) pairs.push([a, b]);
    const fresh = pairs.filter(([a]) => a === newest);
    const chosen = fresh.length ? pick(fresh) : pairs.length ? pick(pairs) : null;
    if (!chosen) return false;
    lines.push({ a: chosen[0], b: chosen[1], born: clock });
    last = "recta";
    return true;
  };

  const meet = (l: Line, m: Line): { u: number; v: number } | null => {
    const d1u = l.b.u - l.a.u, d1v = l.b.v - l.a.v;
    const d2u = m.b.u - m.a.u, d2v = m.b.v - m.a.v;
    const cross = d1u * d2v - d1v * d2u;
    if (Math.abs(cross) < 0.02 * Math.hypot(d1u, d1v) * Math.hypot(d2u, d2v)) return null;
    const s = ((m.a.u - l.a.u) * d2v - (m.a.v - l.a.v) * d2u) / cross;
    return { u: l.a.u + s * d1u, v: l.a.v + s * d1v };
  };

  const addPoint = () => {
    const newest = lines[lines.length - 1];
    if (!newest) return false;
    const found = lines
      .filter((l) => l !== newest)
      .map((l) => meet(newest, l))
      .filter(
        (p): p is { u: number; v: number } =>
          p !== null &&
          p.u > 0.05 && p.u < 0.95 && p.v > 0.05 && p.v < 0.95 &&
          points.every((q) => Math.hypot(q.u - p.u, q.v - p.v) > 0.05),
      );
    if (!found.length) return false;
    points.push({ ...pick(found), born: clock, made: true });
    last = "intersección";
    return true;
  };

  return (ctx, w, h, dt) => {
    clock += dt;
    if (fading < 0 && clock > next) {
      next = clock + 1.1;
      if (last === "recta") {
        if (!addPoint()) addLine();
      } else if (!addLine()) fading = clock;
      if (points.length >= 12 || lines.length >= 16) fading = clock + 1.6;
    }
    if (fading >= 0 && clock > fading + 1.2) reset();

    const pad = 18;
    const fh = h - 44;
    const x = (u: number) => pad + u * (w - 2 * pad);
    const y = (v: number) => pad + v * (fh - 2 * pad);
    ctx.globalAlpha = fading >= 0 ? 1 - clamp01((clock - fading) / 1.2) : 1;

    const reach = Math.hypot(w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, fh);
    ctx.clip();
    ctx.lineWidth = 1.2;
    for (const l of lines) {
      const r = ease((clock - l.born) / 0.7);
      const ax = x(l.a.u), ay = y(l.a.v), bx = x(l.b.u), by = y(l.b.v);
      const len = Math.hypot(bx - ax, by - ay) || 1;
      const dx = (bx - ax) / len, dy = (by - ay) / len;
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      ctx.strokeStyle = clock - l.born < 1.1 ? ORANGE : MUTED;
      ctx.beginPath();
      ctx.moveTo(mx - dx * reach * r, my - dy * reach * r);
      ctx.lineTo(mx + dx * reach * r, my + dy * reach * r);
      ctx.stroke();
    }
    ctx.restore();

    for (const p of points) {
      const age = clock - p.born;
      const grow = p.made ? ease(age / 0.35) : 1;
      ctx.fillStyle = p.made && age < 1.8 ? ORANGE : INK;
      ctx.beginPath();
      ctx.arc(x(p.u), y(p.v), 4.5 * grow, 0, Math.PI * 2);
      ctx.fill();
    }

    sequence(
      ctx,
      [
        { text: "punto", lit: last === "punto" },
        { text: "  →  ", lit: false },
        { text: "recta", lit: last === "recta" },
        { text: "  →  ", lit: false },
        { text: "intersección", lit: last === "intersección" },
        { text: "  →  ", lit: false },
        { text: "punto", lit: last === "intersección" },
      ],
      w / 2,
      h - 18,
      17,
    );
    ctx.globalAlpha = 1;
  };
}

/* ---- locality: rule 110, each cell read off the three above it ---- */

function locality(): Frame {
  const RULE = 110;
  const COLS = 64;
  const SPEED = 190; // cells a second
  const rule = (l: number, c: number, r: number) => (RULE >> ((l << 2) | (c << 1) | r)) & 1;
  let rows: Uint8Array[] = [];
  let building = new Uint8Array(COLS);
  let progress = 0;

  const first = new Uint8Array(COLS);
  first[COLS - 2] = 1;
  rows.push(first);
  // Some of it already grown, so the slide does not open on an empty page.
  for (let k = 0; k < 24; k++) {
    const above = rows[rows.length - 1]!;
    rows.push(above.map((_, i) => rule(above[(i - 1 + COLS) % COLS]!, above[i]!, above[(i + 1) % COLS]!)));
  }

  return (ctx, w, h, dt) => {
    const above = rows[rows.length - 1]!;
    const before = Math.floor(progress);
    progress += dt * SPEED;
    for (let i = before; i < Math.min(COLS, Math.floor(progress)); i++)
      building[i] = rule(above[(i - 1 + COLS) % COLS]!, above[i]!, above[(i + 1) % COLS]!);
    if (progress >= COLS) {
      rows.push(building);
      building = new Uint8Array(COLS);
      progress = 0;
    }

    const tableH = 70;
    const cs = Math.min(w / COLS, 14);
    const left = (w - cs * COLS) / 2;
    const visible = Math.max(2, Math.floor((h - tableH - 10) / cs));
    if (rows.length > visible - 1) rows = rows.slice(rows.length - (visible - 1));
    const gap = cs > 6 ? 1 : 0;

    const drawRow = (row: Uint8Array, r: number, upTo = COLS) => {
      for (let i = 0; i < upTo; i++) {
        ctx.fillStyle = row[i] ? INK : "#f1f2f4";
        ctx.fillRect(left + i * cs, r * cs, cs - gap, cs - gap);
      }
    };
    rows.forEach((row, r) => drawRow(row, r));
    const at = Math.min(COLS - 1, Math.floor(progress));
    const r = rows.length;
    drawRow(building, r, at);

    // The window: three cells above, the one cell they decide.
    const top = rows[r - 1]!;
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 2;
    ctx.strokeRect(left + (at - 1) * cs - 1, (r - 1) * cs - 1, cs * 3 + 1, cs + 1);
    ctx.fillStyle = ORANGE;
    ctx.fillRect(left + at * cs, r * cs, cs - gap, cs - gap);

    // The whole rule, eight cases, with the one being used lit.
    const l = top[(at - 1 + COLS) % COLS]!, c = top[at]!, rr = top[(at + 1) % COLS]!;
    const using = (l << 2) | (c << 1) | rr;
    const tc = Math.min(12, (w - 40) / 36);
    const tw = 8 * 3 * tc + 7 * 1.5 * tc;
    let x0 = (w - tw) / 2;
    const y0 = h - tableH + 16;
    for (let k = 7; k >= 0; k--) {
      const lit = k === using;
      for (let j = 0; j < 3; j++) {
        const on = (k >> (2 - j)) & 1;
        ctx.fillStyle = on ? (lit ? ORANGE : INK) : "#f1f2f4";
        ctx.fillRect(x0 + j * tc, y0, tc - 1, tc - 1);
      }
      ctx.fillStyle = rule((k >> 2) & 1, (k >> 1) & 1, k & 1) ? (lit ? ORANGE : INK) : "#f1f2f4";
      ctx.fillRect(x0 + tc, y0 + tc + 3, tc - 1, tc - 1);
      if (lit) {
        ctx.strokeStyle = ORANGE;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x0 - 3, y0 - 3, 3 * tc + 5, 2 * tc + 9);
      }
      x0 += 4.5 * tc;
    }
    caption(ctx, "cada celda mira solo a sus tres vecinas · regla 110", w / 2, h - 10, 14);
  };
}

/* ---- orthogonality: three different pieces against eight nearly equal ones ---- */

function orthogonality(): Frame {
  let t = 0;
  const NAMES = ["quieto", "mover", "girar", "mover + girar", "crecer", "mover + crecer", "girar + crecer", "las tres"];
  return (ctx, w, h, dt) => {
    t += dt;
    const head = 34;
    const gap = 26;
    const pw = (w - gap) / 2;
    const cw = pw / 4;
    const ch = (h - head) / 2;
    const side = Math.min(cw, ch) * 0.26;

    const panel = (x0: number, title: string, lit: boolean, draw: (k: number, cx: number, cy: number) => void) => {
      caption(ctx, title, x0 + pw / 2, 12, 15, lit ? ORANGE : MUTED);
      for (let k = 0; k < 8; k++) {
        const cx = x0 + (k % 4) * cw + cw / 2;
        const cy = head + Math.floor(k / 4) * ch + ch / 2 - 8;
        draw(k, cx, cy);
      }
    };

    const square = (cx: number, cy: number, angle: number, scale: number, fill: string) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.scale(scale, scale);
      ctx.fillStyle = fill;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2 / scale;
      ctx.fillRect(-side / 2, -side / 2, side, side);
      ctx.strokeRect(-side / 2, -side / 2, side, side);
      ctx.restore();
    };

    const label = (text: string, cx: number, cy: number) => {
      ctx.font = `11px ${SANS}`;
      ctx.fillStyle = MUTED;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(text, cx, cy + side * 1.1 + 12);
    };

    panel(0, "3 piezas distintas → 8 comportamientos", true, (k, cx, cy) => {
      const move = k & 1, turn = k & 2, grow = k & 4;
      square(
        cx + (move ? Math.sin(t * 1.7) * cw * 0.2 : 0),
        cy,
        turn ? t * 1.3 : 0,
        grow ? 1 + 0.35 * Math.sin(t * 2.2) : 1,
        "rgba(242, 115, 5, 0.18)",
      );
      label(NAMES[k]!, cx, cy);
    });

    ctx.strokeStyle = FAINT;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pw + gap / 2, head);
    ctx.lineTo(pw + gap / 2, h - 6);
    ctx.stroke();

    panel(pw + gap, "8 piezas casi iguales → 1 comportamiento", false, (k, cx, cy) => {
      square(cx + Math.sin(t * 1.7 * (1 + 0.04 * k)) * cw * (0.19 + 0.005 * k), cy, 0, 1, "#eef0f2");
      label(`mover · ${100 + 4 * k} %`, cx, cy);
    });
  };
}

/* ---- small alphabet, large language: words over F + − drawn by a turtle ---- */

function alphabet(): Frame {
  const TURN = 60;
  type Drawing = { word: string; path: [number, number][] };

  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const make = (): Drawing => {
    for (;;) {
      const length = 4 + Math.floor(Math.random() * 5);
      const word = Array.from({ length }, () => pick(["F", "F", "+", "−"])).join("");
      const net = ((([...word].filter((c) => c === "+").length - [...word].filter((c) => c === "−").length) * TURN) % 360 + 360) % 360;
      // At least two strokes with a turn between them, or all it can draw is a polygon.
      const strokes = word.split(/[+−]+/).filter(Boolean).length;
      if (net === 0 || strokes < 2) continue;
      const times = 360 / gcd(net, 360);
      const path: [number, number][] = [[0, 0]];
      let x = 0, y = 0, heading = 0;
      for (let k = 0; k < times; k++)
        for (const c of word) {
          if (c === "+") heading += TURN;
          else if (c === "−") heading -= TURN;
          else {
            x += Math.cos((heading * Math.PI) / 180);
            y += Math.sin((heading * Math.PI) / 180);
            path.push([x, y]);
          }
        }
      if (path.length > 3) return { word, path };
    }
  };

  let batch: Drawing[] = [];
  let clock = 0;
  const STAGGER = 0.5, DRAW = 1.6, HOLD = 3, FADE = 0.8;
  const reset = () => {
    batch = Array.from({ length: 12 }, make);
    clock = 0;
  };
  reset();

  return (ctx, w, h, dt) => {
    clock += dt;
    const end = 11 * STAGGER + DRAW + HOLD;
    if (clock > end + FADE) reset();
    ctx.globalAlpha = clock > end ? 1 - clamp01((clock - end) / FADE) : 1;

    // The alphabet itself, and how many words it has.
    const head = 50;
    ctx.font = `20px ${MONO}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ["F", "+", "−"].forEach((c, i) => {
      const x = w / 2 - 44 + i * 44;
      ctx.strokeStyle = FAINT;
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 15, 2, 30, 30);
      ctx.fillStyle = c === "F" ? INK : ORANGE;
      ctx.fillText(c, x, 18);
    });
    caption(ctx, "3 letras · palabras de 8 letras: 3⁸ = 6 561", w / 2, 44, 14);

    const cols = w >= h ? 4 : 3;
    const rows = 12 / cols;
    const cw = w / cols;
    const ch = (h - head - 8) / rows;
    batch.forEach((d, i) => {
      const cx = (i % cols) * cw + cw / 2;
      const top = head + 8 + Math.floor(i / cols) * ch;
      const box = Math.min(cw, ch - 22) * 0.8;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const [x, y] of d.path) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      const scale = box / Math.max(maxX - minX, maxY - minY, 1e-6);
      const ox = cx - ((minX + maxX) / 2) * scale;
      const oy = top + (ch - 22) / 2 - ((minY + maxY) / 2) * scale;
      const u = clamp01((clock - i * STAGGER) / DRAW);
      if (u <= 0) return;
      const upTo = u * (d.path.length - 1);
      ctx.strokeStyle = u < 1 ? ORANGE : INK;
      ctx.lineWidth = 1.3;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(ox + d.path[0]![0] * scale, oy + d.path[0]![1] * scale);
      for (let k = 1; k <= Math.floor(upTo); k++) ctx.lineTo(ox + d.path[k]![0] * scale, oy + d.path[k]![1] * scale);
      const k = Math.floor(upTo);
      if (k < d.path.length - 1) {
        const f = upTo - k, [ax, ay] = d.path[k]!, [bx, by] = d.path[k + 1]!;
        ctx.lineTo(ox + lerp(ax, bx, f) * scale, oy + lerp(ay, by, f) * scale);
      }
      ctx.stroke();

      ctx.font = `12px ${MONO}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      let x = cx - ctx.measureText(d.word).width / 2;
      for (const c of d.word) {
        ctx.fillStyle = c === "F" ? INK : ORANGE;
        ctx.fillText(c, x, top + ch - 12);
        x += ctx.measureText(c).width;
      }
    });
    ctx.globalAlpha = 1;
  };
}

/* ---- encapsulation: a figure named, and three of it made into the next ---- */

function encapsulation(): Frame {
  const TOP = 6;
  const SUB = "₀₁₂₃₄₅₆₇₈₉";
  const T = (k: number) => `T${SUB[k]}`;
  const SPLIT = 1.5, HOLD = 1.7;
  let level = 0;
  let clock = 0;

  const sier = (ctx: CanvasRenderingContext2D, k: number, x: number, y: number, s: number) => {
    if (k === 0) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + s, y);
      ctx.lineTo(x + s / 2, y - (s * Math.sqrt(3)) / 2);
      ctx.closePath();
      return;
    }
    const half = s / 2;
    sier(ctx, k - 1, x, y, half);
    sier(ctx, k - 1, x + half, y, half);
    sier(ctx, k - 1, x + half / 2, y - (half * Math.sqrt(3)) / 2, half);
  };

  const outline = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + s, y);
    ctx.lineTo(x + s / 2, y - (s * Math.sqrt(3)) / 2);
    ctx.closePath();
    ctx.stroke();
  };

  return (ctx, w, h, dt) => {
    clock += dt;
    const stay = level === TOP ? HOLD + 1.8 : HOLD;
    if (clock > (level === 0 ? HOLD : SPLIT + stay)) {
      level = level === TOP ? 0 : level + 1;
      clock = 0;
    }

    const foot = 58;
    const S = Math.min(w * 0.82, ((h - foot - 30) * 2) / Math.sqrt(3));
    const H = (S * Math.sqrt(3)) / 2;
    const X = (w - S) / 2;
    const Y = 14 + H;

    // Splitting: the named figure, three times, each half the size, going to its corner.
    const u = level === 0 ? 1 : ease(clock / SPLIT);
    const copies: [number, number, number][] =
      level === 0
        ? [[X, Y, S]]
        : [
            [X, Y, lerp(S, S / 2, u)],
            [lerp(X, X + S / 2, u), Y, lerp(S, S / 2, u)],
            [lerp(X, X + S / 4, u), lerp(Y, Y - H / 2, u), lerp(S, S / 2, u)],
          ];
    ctx.fillStyle = INK;
    ctx.beginPath();
    for (const [x, y, s] of copies) sier(ctx, Math.max(0, level - 1), x, y, s);
    if (level === 0) {
      ctx.beginPath();
      sier(ctx, 0, X, Y, S);
    }
    ctx.fill();

    // Once in place, each copy is seen for what it is: one thing with a name.
    const settled = level === 0 ? 1 : clock - SPLIT;
    if (level > 0 && settled > 0) {
      const a = Math.min(1, settled / 0.3) * (1 - clamp01((settled - 1.2) / 0.5));
      ctx.globalAlpha = a;
      ctx.strokeStyle = ORANGE;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      for (const [x, y, s] of copies) {
        outline(ctx, x - 4, y + 3, s + 8);
        caption(ctx, T(level - 1), x + s / 2, y - (s * Math.sqrt(3)) / 4 + 10, 14, ORANGE);
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    const named = level === 0 || clock > SPLIT + 0.9;
    caption(
      ctx,
      level === 0 ? `${T(0)} = un triángulo` : `${T(level)} = tres copias de ${T(level - 1)}`,
      w / 2,
      h - foot + 18,
      17,
      named ? ORANGE : MUTED,
    );
    caption(ctx, `${level} ${level === 1 ? "paso" : "pasos"} · ${3 ** level} triángulos`, w / 2, h - foot + 42, 14);
  };
}

/* ---- persistence and a free undo: blocks that stay, and steps that come back off ---- */

function undo(): Frame {
  const COLS = 10;
  const TALL = 7;
  type Block = { col: number; level: number; born: number; gone: number };
  let history: Block[] = [];
  let cursor = 0;
  let leaving: Block[] = [];
  let clock = 0;
  let next = 0.6;
  let sinceUndo = 0;
  let undoing = 0;
  let lastUndo = -10;
  let fading = -1;

  const heights = () => {
    const out = new Array<number>(COLS).fill(0);
    for (let i = 0; i < cursor; i++) out[history[i]!.col]!++;
    return out;
  };

  const reset = () => {
    history = [];
    cursor = 0;
    leaving = [];
    clock = 0;
    next = 0.6;
    sinceUndo = 0;
    undoing = 0;
    fading = -1;
  };

  return (ctx, w, h, dt) => {
    clock += dt;
    if (fading < 0 && clock > next) {
      next = clock + 0.5;
      if (undoing > 0 && cursor > 0) {
        cursor--;
        leaving.push({ ...history[cursor]!, gone: clock });
        undoing--;
        lastUndo = clock;
      } else if (sinceUndo >= 6 && Math.random() < 0.3) {
        undoing = 2 + Math.floor(Math.random() * 3);
        sinceUndo = 0;
      } else {
        const hs = heights();
        const open = hs.map((height, col) => ({ height, col })).filter((c) => c.height < TALL);
        // Lower columns first, more often than not, so it builds up rather than out.
        open.sort((a, b) => a.height - b.height);
        const choice = open.length ? open[Math.floor(Math.random() ** 2 * open.length)]! : null;
        if (!choice) fading = clock;
        else {
          history.length = cursor;
          history.push({ col: choice.col, level: choice.height, born: clock, gone: -1 });
          cursor++;
          sinceUndo++;
        }
      }
      if (history.length >= 44) fading = clock + 1.5;
    }
    if (fading >= 0 && clock > fading + 1) reset();
    ctx.globalAlpha = fading >= 0 ? 1 - clamp01((clock - fading) / 1) : 1;

    const foot = 64;
    const b = Math.min((w - 40) / COLS, (h - foot - 20) / (TALL + 1));
    const left = (w - b * COLS) / 2;
    const ground = h - foot;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left - 10, ground + 0.5);
    ctx.lineTo(left + b * COLS + 10, ground + 0.5);
    ctx.stroke();

    const block = (blk: Block, dy: number, fill: string, alpha: number) => {
      ctx.globalAlpha *= alpha;
      ctx.fillStyle = fill;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      const x = left + blk.col * b + 2, y = ground - (blk.level + 1) * b + 2 + dy;
      ctx.fillRect(x, y, b - 4, b - 4);
      ctx.strokeRect(x, y, b - 4, b - 4);
      ctx.globalAlpha /= alpha;
    };
    for (let i = 0; i < cursor; i++) {
      const blk = history[i]!;
      const fall = ease((clock - blk.born) / 0.4);
      block(blk, -(1 - fall) * (ground - (blk.level + 1) * b + b), clock - blk.born < 0.9 ? ORANGE : PAGE, 1);
    }
    leaving = leaving.filter((blk) => clock - blk.gone < 0.6);
    for (const blk of leaving) {
      const u = clamp01((clock - blk.gone) / 0.6);
      block(blk, -u * b * 1.4, "rgba(242, 115, 5, 0.35)", 1 - u);
    }

    // The history: each step a dot; what was undone stays hollow until something new replaces it.
    const ty = h - 26;
    const step = Math.min(14, (w - 120) / 44);
    const tx = w / 2 - (44 * step) / 2;
    ctx.font = `13px ${SERIF}`;
    ctx.fillStyle = MUTED;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText("historial", tx - 10, ty);
    history.forEach((_, i) => {
      ctx.beginPath();
      ctx.arc(tx + i * step, ty, 3.2, 0, Math.PI * 2);
      if (i < cursor) {
        ctx.fillStyle = INK;
        ctx.fill();
      } else {
        ctx.strokeStyle = MUTED;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
    const cx = tx + (cursor - 0.5) * step;
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, ty - 9);
    ctx.lineTo(cx, ty + 9);
    ctx.stroke();
    if (clock - lastUndo < 0.9) caption(ctx, "↶ deshacer", cx, ty - 20, 14, ORANGE);
    ctx.globalAlpha = 1;
  };
}

/* ---- black box and glass box: the same sum, once hidden and once shown ---- */

function blackbox(): Frame {
  const CYCLE = 7.5;
  let clock = 0;
  let cycle = -1;
  let a = 3, b = 4;
  let lid = 1;

  return (ctx, w, h, dt) => {
    clock += dt;
    const n = Math.floor(clock / CYCLE);
    if (n !== cycle) {
      cycle = n;
      a = 1 + Math.floor(Math.random() * 5);
      b = 1 + Math.floor(Math.random() * 5);
    }
    const t = clock - n * CYCLE;
    const opaque = n % 2 === 0;
    lid += ((opaque ? 1 : 0) - lid) * Math.min(1, dt * 5);

    const foot = 40;
    const cy = (h - foot) / 2;
    const bw = w * 0.36, bh = (h - foot) * 0.5;
    const bx = (w - bw) / 2, by = cy - bh / 2;
    const r = Math.max(4, Math.min(w, h) * 0.017);
    const inA = { x: w * 0.17, y: cy - bh * 0.22 }, inB = { x: w * 0.17, y: cy + bh * 0.22 };
    const out = { x: w * 0.9, y: cy };

    // The wires.
    ctx.strokeStyle = FAINT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(inA.x, inA.y); ctx.lineTo(bx, inA.y);
    ctx.moveTo(inB.x, inB.y); ctx.lineTo(bx, inB.y);
    ctx.moveTo(bx + bw, cy); ctx.lineTo(out.x, out.y);
    ctx.stroke();

    const dots: { color: string; from: { x: number; y: number }; k: number }[] = [
      ...Array.from({ length: a }, (_, k) => ({ color: INK, from: inA, k })),
      ...Array.from({ length: b }, (_, k) => ({ color: ORANGE, from: inB, k })),
    ];
    const fadeIn = clamp01(t / 0.5), fadeOut = 1 - clamp01((t - (CYCLE - 0.6)) / 0.6);
    ctx.globalAlpha = fadeIn * fadeOut;

    const cluster = (from: { x: number; y: number }, k: number) => ({ x: from.x - (k % 3) * r * 2.6, y: from.y + (Math.floor(k / 3) - 0.5) * r * 2.6 });
    const row = (i: number, total: number) => ({ x: w / 2 + (i - (total - 1) / 2) * r * 2.6, y: cy });
    const outAt = (i: number, total: number) => ({ x: out.x + (i % 5) * r * 2.6 - r * 5, y: out.y + (Math.floor(i / 5) - (total > 5 ? 0.5 : 0)) * r * 2.6 - r * 3.4 });
    const total = a + b;

    // Inside first, so a black box covers it.
    const placed = dots.map((dot, i) => {
      const start = cluster(dot.from, dot.k);
      const door = { x: bx + r, y: dot.from.y };
      const mid = row(i, total);
      const exit = { x: bx + bw - r, y: cy };
      const end = outAt(i, total);
      const stagger = i * 0.08;
      const go1 = ease((t - 0.8 - stagger) / 1.2);
      const go2 = ease((t - 2.4 - stagger) / 1.1);
      const go3 = ease((t - 3.9 - stagger) / 0.6);
      const go4 = ease((t - 4.6 - stagger) / 1.1);
      let p = { x: lerp(start.x, door.x, go1), y: lerp(start.y, door.y, go1) };
      if (go2 > 0) p = { x: lerp(door.x, mid.x, go2), y: lerp(door.y, mid.y, go2) };
      if (go3 > 0) p = { x: lerp(mid.x, exit.x, go3), y: lerp(mid.y, exit.y, go3) };
      if (go4 > 0) p = { x: lerp(exit.x, end.x, go4), y: lerp(exit.y, end.y, go4) };
      const inside = p.x > bx && p.x < bx + bw && p.y > by && p.y < by + bh;
      return { p, inside, color: go4 > 0 && opaque ? INK : dot.color };
    });

    const disc = (x: number, y: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    for (const d of placed) if (d.inside) disc(d.p.x, d.p.y, d.color);
    if (lid < 0.5 && t > 2.4 && t < 4.4) {
      // The mechanism, when it can be seen: every unit on one tray, counted.
      ctx.strokeStyle = MUTED;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 2 - total * r * 1.4, cy + r * 1.8);
      ctx.lineTo(w / 2 + total * r * 1.4, cy + r * 1.8);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // The box: ink when shut, an outline when it is glass.
    ctx.fillStyle = `rgba(27, 29, 34, ${lid})`;
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bw, bh);
    if (lid > 0.05) {
      ctx.globalAlpha = lid;
      caption(ctx, "?", w / 2, cy, Math.min(bh * 0.5, 64), PAGE);
      ctx.globalAlpha = 1;
    }

    ctx.globalAlpha = fadeIn * fadeOut;
    for (const d of placed) if (!d.inside) disc(d.p.x, d.p.y, d.color);
    ctx.font = `18px ${SERIF}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = INK;
    ctx.fillText(String(a), w * 0.03, inA.y);
    ctx.fillStyle = ORANGE;
    ctx.fillText(String(b), w * 0.03, inB.y);
    if (t > 5.6) {
      ctx.fillStyle = INK;
      ctx.fillText(String(total), out.x, out.y + r * 6.5);
    }
    ctx.globalAlpha = 1;

    caption(
      ctx,
      opaque ? "caja negra: vemos qué entra y qué sale" : "caja transparente: vemos también cómo",
      w / 2,
      h - 16,
      15,
      opaque ? MUTED : ORANGE,
    );
  };
}

export const ANIMATIONS: Readonly<Record<AnimationName, () => Frame>> = {
  closure,
  locality,
  orthogonality,
  alphabet,
  encapsulation,
  undo,
  blackbox,
};
