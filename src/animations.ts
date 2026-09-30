/**
 * One small animation for each of Resnick & Silverman's ten principles, drawn on a canvas the
 * slide gives it.
 *
 * Each is a factory: it returns a frame function that keeps its own state and repaints the whole
 * canvas every frame, given the canvas's size in CSS pixels and the seconds since the last frame.
 * They are drawn in the deck's own palette — ink, a muted grey, and the one orange — except the
 * one about colour, where colour is the subject.
 */
export type Frame = (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number) => void;

export type AnimationName =
  | "designers"
  | "floor"
  | "salient"
  | "paths"
  | "simple"
  | "blackboxes"
  | "programming"
  | "want"
  | "yourself"
  | "iterate"
  | "picbreeder";

const INK = "#1b1d22";
const MUTED = "#9097a1";
const FAINT = "rgba(27, 29, 34, 0.12)";
const ORANGE = "rgb(242, 115, 5)";
const ORANGE_SOFT = "rgba(242, 115, 5, 0.16)";
const PAGE = "#ffffff";
const SERIF = '"KaTeX_Main", "Latin Modern Roman", Georgia, serif';
const MONO = "ui-monospace, Menlo, Consolas, monospace";

const clamp01 = (u: number) => (u < 0 ? 0 : u > 1 ? 1 : u);
const ease = (u: number) => {
  const v = clamp01(u);
  return v * v * (3 - 2 * v);
};
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const TAU = Math.PI * 2;

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

/** Words joined by arrows, the one at `lit` in orange. */
const arrows = (words: string[], lit: number) =>
  words.flatMap((text, i) => [
    ...(i ? [{ text: "  →  ", lit: false }] : []),
    { text, lit: i === lit },
  ]);

function caption(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size = 15, color = MUTED) {
  ctx.font = `${size}px ${SERIF}`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

/* ---- 1. design for designers: the same six pieces, made into one thing after another ---- */

function designers(): Frame {
  type Kind = "tri" | "rect" | "circle";
  // Each piece's kind, then where it is in each design: centre, width, height, turn (unit square).
  const KINDS: Kind[] = ["rect", "tri", "rect", "circle", "circle", "rect"];
  const DESIGNS: { name: string; pieces: [number, number, number, number, number][] }[] = [
    {
      name: "casa",
      pieces: [
        [0.5, 0.62, 0.44, 0.32, 0],
        [0.5, 0.35, 0.56, 0.22, 0],
        [0.5, 0.7, 0.1, 0.16, 0],
        [0.36, 0.57, 0.09, 0.09, 0],
        [0.84, 0.16, 0.12, 0.12, 0],
        [0.5, 0.8, 0.84, 0.02, 0],
      ],
    },
    {
      name: "árbol",
      pieces: [
        [0.5, 0.66, 0.06, 0.3, 0],
        [0.5, 0.34, 0.4, 0.34, 0],
        [0.82, 0.2, 0.07, 0.03, 0.3],
        [0.36, 0.46, 0.2, 0.2, 0],
        [0.64, 0.44, 0.22, 0.22, 0],
        [0.5, 0.82, 0.64, 0.03, 0],
      ],
    },
    {
      name: "barco",
      pieces: [
        [0.5, 0.68, 0.58, 0.1, 0],
        [0.6, 0.44, 0.3, 0.34, 0],
        [0.44, 0.24, 0.1, 0.05, 0],
        [0.3, 0.68, 0.05, 0.05, 0],
        [0.16, 0.18, 0.12, 0.12, 0],
        [0.44, 0.44, 0.02, 0.4, 0],
      ],
    },
    {
      name: "cohete",
      pieces: [
        [0.5, 0.52, 0.18, 0.38, 0],
        [0.5, 0.25, 0.18, 0.14, 0],
        [0.5, 0.74, 0.32, 0.05, 0],
        [0.5, 0.44, 0.07, 0.07, 0],
        [0.2, 0.22, 0.04, 0.04, 0],
        [0.5, 0.84, 0.04, 0.1, 0],
      ],
    },
  ];
  const HOLD = 2.2, MOVE = 1.4;
  let clock = 0;

  return (ctx, w, h, dt) => {
    clock += dt;
    const period = HOLD + MOVE;
    const n = Math.floor(clock / period) % DESIGNS.length;
    const from = DESIGNS[n]!, to = DESIGNS[(n + 1) % DESIGNS.length]!;
    const u = ease((clock % period - HOLD) / MOVE);

    const s = Math.min(w, h - 60);
    const ox = (w - s) / 2, oy = 4;
    KINDS.forEach((kind, i) => {
      const a = from.pieces[i]!, b = to.pieces[i]!;
      const [cx, cy, pw, ph, turn] = a.map((value, k) => lerp(value, b[k]!, u)) as [number, number, number, number, number];
      ctx.save();
      ctx.translate(ox + cx * s, oy + cy * s);
      ctx.rotate(turn);
      ctx.beginPath();
      if (kind === "rect") ctx.rect((-pw * s) / 2, (-ph * s) / 2, pw * s, ph * s);
      else if (kind === "circle") ctx.ellipse(0, 0, (pw * s) / 2, (ph * s) / 2, 0, 0, TAU);
      else {
        ctx.moveTo((-pw * s) / 2, (ph * s) / 2);
        ctx.lineTo((pw * s) / 2, (ph * s) / 2);
        ctx.lineTo(0, (-ph * s) / 2);
        ctx.closePath();
      }
      ctx.fillStyle = u > 0 && u < 1 ? ORANGE_SOFT : PAGE;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    });

    const lit = u < 0.5 ? n : (n + 1) % DESIGNS.length;
    sequence(ctx, arrows(DESIGNS.map((d) => d.name), lit), w / 2, h - 40, 17);
    caption(ctx, "las mismas seis piezas; lo que se hace con ellas lo decide quien juega", w / 2, h - 14, 14);
  };
}

/* ---- 2. low floor, wide walls: one easy start, and roads out to very different places ---- */

function floor(): Frame {
  type Road = { tx: number; ty: number; cx: number; shape: number };
  let roads: Road[] = [];
  let clock = 0;
  const EACH = 0.55, DRAW = 1.1, HOLD = 2.4, FADE = 0.7;

  const reset = () => {
    const count = 9;
    roads = Array.from({ length: count }, (_, i) => {
      const spread = (i + 0.5) / count;
      return {
        tx: 0.06 + spread * 0.88 + (Math.random() - 0.5) * 0.04,
        ty: 0.14 + Math.random() * 0.38,
        cx: 0.5 + (spread - 0.5) * 0.4,
        shape: i % 6,
      };
    }).sort(() => Math.random() - 0.5);
    clock = 0;
  };
  reset();

  const icon = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, shape: number) => {
    ctx.beginPath();
    switch (shape) {
      case 0:
        ctx.arc(x, y, r, 0, TAU);
        break;
      case 1:
        ctx.rect(x - r, y - r, 2 * r, 2 * r);
        break;
      case 2:
        ctx.moveTo(x, y - r); ctx.lineTo(x + r, y + r); ctx.lineTo(x - r, y + r); ctx.closePath();
        break;
      case 3:
        for (let k = 0; k < 10; k++) {
          const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r * 1.1;
          ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
        }
        ctx.closePath();
        break;
      case 4:
        ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
        break;
      default:
        for (let k = 0; k <= 40; k++) {
          const a = (k / 40) * TAU * 2, rr = (k / 40) * r * 1.1;
          ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
        }
    }
  };

  return (ctx, w, h, dt) => {
    clock += dt;
    const end = (roads.length - 1) * EACH + DRAW + HOLD;
    if (clock > end + FADE) reset();
    const fade = clock > end ? 1 - clamp01((clock - end) / FADE) : 1;

    const floorY = h - 58;
    const sx = w / 2, sy = floorY;
    // The walls move out as more kinds of thing are reached.
    const reached = clamp01(clock / ((roads.length - 1) * EACH + DRAW));
    const wall = lerp(0.3, 0.02, ease(reached)) * w;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(wall, 10); ctx.lineTo(wall, floorY);
    ctx.lineTo(w - wall, floorY); ctx.lineTo(w - wall, 10);
    ctx.stroke();

    ctx.globalAlpha = fade;
    roads.forEach((road, i) => {
      const u = ease((clock - i * EACH) / DRAW);
      if (u <= 0) return;
      const tx = road.tx * w, ty = road.ty * (floorY - 20) + 10, cx = road.cx * w, cy = floorY - 30;
      ctx.strokeStyle = MUTED;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      const steps = 40;
      for (let k = 0; k <= steps * u; k++) {
        const t = k / steps;
        const x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * tx;
        const y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ty;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (u >= 1) {
        const pop = ease((clock - i * EACH - DRAW) / 0.3);
        icon(ctx, tx, ty, 9 * pop, road.shape);
        ctx.fillStyle = clock - i * EACH - DRAW < 0.8 ? ORANGE : INK;
        if (road.shape === 5) {
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = 1.6;
          ctx.stroke();
        } else ctx.fill();
      }
    });
    ctx.globalAlpha = 1;

    ctx.fillStyle = ORANGE;
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, TAU);
    ctx.fill();
    caption(ctx, "suelo bajo: empezar es fácil", w / 2, floorY + 20, 15, ORANGE);
    caption(ctx, "paredes anchas: se llega a cosas muy distintas", w / 2, floorY + 44, 14);
  };
}

/* ---- 3. powerful ideas made salient: a line follower, and the loop that keeps it on the line ---- */

function salient(): Frame {
  let clock = 0;
  let offset = 0, speed = 0;
  let nextKick = 1.5;
  const history: number[] = [];

  return (ctx, w, h, dt) => {
    clock += dt;
    if (clock > nextKick) {
      speed += (Math.random() < 0.5 ? -1 : 1) * (70 + Math.random() * 50);
      nextKick = clock + 2.6 + Math.random() * 1.4;
    }
    // Feedback: the farther from the line, the harder it steers back.
    speed += (-7 * offset - 2.4 * speed) * dt;
    offset += speed * dt;
    history.push(offset);
    if (history.length > 360) history.shift();

    // The track, a wavy loop on the left.
    const cx = w * 0.32, cy = (h - 30) / 2, rx = w * 0.25, ry = (h - 30) * 0.36;
    const at = (a: number) => {
      const r = 1 + 0.08 * Math.sin(3 * a);
      return [cx + rx * r * Math.cos(a), cy + ry * r * Math.sin(a)] as const;
    };
    ctx.strokeStyle = FAINT;
    ctx.lineWidth = 8;
    ctx.beginPath();
    for (let k = 0; k <= 200; k++) {
      const [x, y] = at((k / 200) * TAU);
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    const a = clock * 0.45;
    const [px, py] = at(a);
    const [qx, qy] = at(a + 0.01);
    const tx = qx - px, ty = qy - py, len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len, ny = tx / len;
    const off = Math.max(-40, Math.min(40, offset));
    const rx0 = px + nx * off, ry0 = py + ny * off;
    const lost = Math.abs(offset) > 6;
    ctx.save();
    ctx.translate(rx0, ry0);
    ctx.rotate(Math.atan2(ty, tx) - Math.atan(speed / 120));
    ctx.fillStyle = PAGE;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(-11, -8, 22, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = lost ? ORANGE : INK;
    ctx.beginPath();
    ctx.arc(15, 0, 3.5, 0, TAU);
    ctx.fill();
    ctx.restore();

    // The loop that does it: sensor, decide, motor, and round again.
    const lx = w * 0.8, ly = (h - 30) * 0.3, R = Math.min(w * 0.12, (h - 30) * 0.2);
    const names = ["sensor", "decide", "motor"];
    const pulse = (clock * 0.8) % 1;
    ctx.strokeStyle = MUTED;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(lx, ly, R, 0, TAU);
    ctx.stroke();
    names.forEach((name, i) => {
      const angle = -Math.PI / 2 + (i * TAU) / 3;
      const x = lx + R * Math.cos(angle), y = ly + R * Math.sin(angle);
      const here = Math.floor(pulse * 3) === i;
      ctx.fillStyle = PAGE;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = here ? (lost ? ORANGE : INK) : MUTED;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, TAU);
      ctx.fill();
      caption(ctx, name, x + Math.cos(angle) * 30, y + Math.sin(angle) * 18, 14, here ? INK : MUTED);
    });
    const pa = -Math.PI / 2 + pulse * TAU;
    ctx.fillStyle = lost ? ORANGE : INK;
    ctx.beginPath();
    ctx.arc(lx + R * Math.cos(pa), ly + R * Math.sin(pa), 3, 0, TAU);
    ctx.fill();

    // How far off the line, over the last few seconds.
    const bx = w * 0.64, bw = w * 0.32, by = (h - 30) * 0.66, bh = (h - 30) * 0.24;
    ctx.strokeStyle = FAINT;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx, by + bh / 2); ctx.lineTo(bx + bw, by + bh / 2);
    ctx.stroke();
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    history.forEach((value, i) => {
      const x = bx + (i / 359) * bw, y = by + bh / 2 - Math.max(-1, Math.min(1, value / 40)) * (bh / 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    caption(ctx, "distancia a la línea", bx + bw / 2, by + bh + 14, 13);
    caption(ctx, "la retroalimentación se ve mientras se juega", w / 2, h - 12, 15);
  };
}

/* ---- 4. many paths, many styles: the planner and the tinkerer make the same heart ---- */

function paths(): Frame {
  const SHAPE = [".OO.OO.", "OOOOOOO", "OOOOOOO", ".OOOOO.", "..OOO..", "...O..."];
  const COLS = 7, ROWS = SHAPE.length;
  const inside = (c: number, r: number) => SHAPE[r]![c] === "O";
  const TARGET: [number, number][] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (inside(c, r)) TARGET.push([c, r]);

  let plan = 0;
  let tinker = new Map<string, number>();
  let clock = 0, nextPlan = 0, nextTinker = 0, doneAt = -1;

  const reset = () => {
    plan = 0;
    tinker = new Map();
    clock = 0;
    nextPlan = 0.5;
    nextTinker = 0.5;
    doneAt = -1;
  };
  reset();
  const cellOf = (k: string) => k.split(",").map(Number) as [number, number];
  const tinkerDone = () =>
    TARGET.every(([c, r]) => tinker.has(`${c},${r}`)) && [...tinker.keys()].every((k) => inside(...cellOf(k)));

  return (ctx, w, h, dt) => {
    clock += dt;
    if (clock > nextPlan && plan < TARGET.length) {
      plan++;
      nextPlan = clock + 0.2;
    }
    if (clock > nextTinker && !tinkerDone()) {
      nextTinker = clock + 0.14;
      const wrong = [...tinker.keys()].filter((k) => !inside(...cellOf(k)));
      if (wrong.length && Math.random() < 0.3) tinker.delete(wrong[Math.floor(Math.random() * wrong.length)]!);
      else {
        const free: [number, number][] = [];
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!tinker.has(`${c},${r}`)) free.push([c, r]);
        const good = free.filter(([c, r]) => inside(c, r));
        const pool = good.length && Math.random() < 0.7 ? good : free;
        if (pool.length) {
          const [c, r] = pool[Math.floor(Math.random() * pool.length)]!;
          tinker.set(`${c},${r}`, clock);
        }
      }
    }
    if (doneAt < 0 && plan === TARGET.length && tinkerDone()) doneAt = clock;
    if (doneAt >= 0 && clock > doneAt + 2.8) reset();

    const gap = 30;
    const pw = (w - gap) / 2;
    const cs = Math.min((pw - 30) / COLS, (h - 110) / ROWS);
    const panel = (x0: number, title: string, cells: (c: number, r: number) => "on" | "wrong" | "fresh" | null, planned: boolean) => {
      const gx = x0 + (pw - cs * COLS) / 2, gy = 36;
      caption(ctx, title, x0 + pw / 2, 14, 16, INK);
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          const x = gx + c * cs, y = gy + r * cs;
          const state = cells(c, r);
          if (planned && inside(c, r) && !state) {
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = MUTED;
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 3, y + 3, cs - 6, cs - 6);
            ctx.setLineDash([]);
          } else if (!state) {
            ctx.fillStyle = "#f4f5f6";
            ctx.fillRect(x + 2, y + 2, cs - 4, cs - 4);
          }
          if (state === "on" || state === "fresh") {
            ctx.fillStyle = state === "fresh" ? ORANGE : INK;
            ctx.fillRect(x + 2, y + 2, cs - 4, cs - 4);
          } else if (state === "wrong") {
            ctx.strokeStyle = ORANGE;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 3, y + 3, cs - 6, cs - 6);
          }
        }
    };
    panel(0, "planificar", (c, r) => {
      const i = TARGET.findIndex(([tc, tr]) => tc === c && tr === r);
      return i >= 0 && i < plan ? (i === plan - 1 && plan < TARGET.length ? "fresh" : "on") : null;
    }, true);
    panel(pw + gap, "bricolaje", (c, r) => {
      const at = tinker.get(`${c},${r}`);
      if (at === undefined) return null;
      if (!inside(c, r)) return "wrong";
      return clock - at < 0.35 ? "fresh" : "on";
    }, false);
    ctx.strokeStyle = FAINT;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pw + gap / 2, 30);
    ctx.lineTo(pw + gap / 2, h - 50);
    ctx.stroke();
    caption(ctx, doneAt >= 0 ? "dos estilos, el mismo resultado" : "de arriba abajo · probando y quitando", w / 2, h - 18, 15, doneAt >= 0 ? ORANGE : MUTED);
  };
}

/* ---- 5. as simple as possible, and maybe simpler: a shape losing points and keeping itself ---- */

function simple(): Frame {
  const N = 240;
  const points: [number, number][] = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * TAU;
    const r = 1 + 0.28 * Math.sin(5 * a) + 0.06 * Math.sin(17 * a) + 0.03 * Math.cos(29 * a);
    return [r * Math.cos(a - Math.PI / 2), r * Math.sin(a - Math.PI / 2)];
  });
  // The order in which points go: always the one whose triangle with its neighbours is smallest.
  const rank = new Map<number, number>();
  {
    const left = points.map((_, i) => i);
    const area = (k: number) => {
      const a = points[left[(k - 1 + left.length) % left.length]!]!, b = points[left[k]!]!, c = points[left[(k + 1) % left.length]!]!;
      return Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]));
    };
    let order = 0;
    while (left.length > 3) {
      let best = 0, bestArea = Infinity;
      for (let k = 0; k < left.length; k++) {
        const value = area(k);
        if (value < bestArea) { bestArea = value; best = k; }
      }
      rank.set(left[best]!, order++);
      left.splice(best, 1);
    }
  }

  const DOWN = 6.5, HOLD = 2.2, BACK = 1.2;
  let clock = 0;

  return (ctx, w, h, dt) => {
    clock += dt;
    const period = DOWN + HOLD + BACK + 0.8;
    const t = clock % period;
    // Counted down on a logarithmic scale — 240, 120, 60, … — so each halving takes as long.
    const u = t < DOWN ? ease(t / DOWN) : t < DOWN + HOLD ? 1 : 1 - ease((t - DOWN - HOLD) / BACK);
    const keep = Math.max(3, Math.round(Math.exp(lerp(Math.log(N), Math.log(5), u))));
    const gone = N - keep;
    const kept = points.filter((_, i) => (rank.get(i) ?? Infinity) >= gone);

    const s = Math.min(w, h - 70) * 0.38;
    const cx = w / 2, cy = (h - 50) / 2 + 6;
    const draw = (list: [number, number][]) => {
      ctx.beginPath();
      list.forEach(([x, y], i) => (i ? ctx.lineTo(cx + x * s, cy + y * s) : ctx.moveTo(cx + x * s, cy + y * s)));
      ctx.closePath();
    };
    draw(points);
    ctx.strokeStyle = FAINT;
    ctx.lineWidth = 6;
    ctx.stroke();
    draw(kept);
    ctx.fillStyle = ORANGE_SOFT;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    if (keep <= 60) {
      ctx.fillStyle = ORANGE;
      for (const [x, y] of kept) {
        ctx.beginPath();
        ctx.arc(cx + x * s, cy + y * s, 3.2, 0, TAU);
        ctx.fill();
      }
    }
    caption(ctx, `${keep} puntos`, w / 2, h - 38, 18, INK);
    caption(ctx, keep <= 6 ? "…y quizá aún más simple" : "lo más simple posible", w / 2, h - 14, 15, keep <= 6 ? ORANGE : MUTED);
  };
}

/* ---- 6. choose black boxes carefully: where the primitives are is a choice ---- */

function blackboxes(): Frame {
  const LEVELS = 4;
  const SAYS = [
    "todo escondido: no hay nada que explorar",
    "pocas piezas, y muy grandes",
    "piezas con las que se puede pensar",
    "todo a la vista: demasiadas piezas",
  ];
  const ORDER = [0, 1, 2, 3, 2];
  const STEP = 2;
  let clock = 0;
  let shown = 0;

  return (ctx, w, h, dt) => {
    clock += dt;
    const cut = ORDER[Math.floor(clock / STEP) % ORDER.length]!;
    shown += (cut - shown) * Math.min(1, dt * 4);

    const top = 30, bottom = h - 70;
    const rowY = (k: number) => top + (k / (LEVELS - 1)) * (bottom - top - 24);
    const span = w * 0.92;
    const node = (k: number, i: number) => ({ x: (w - span) / 2 + ((i + 0.5) / 3 ** k) * span, y: rowY(k) });
    const size = (k: number) => Math.min(44 - k * 6, span / 3 ** k - 4);

    for (let k = 0; k < LEVELS; k++) {
      const visible = clamp01(shown - k + 1);
      if (visible <= 0) continue;
      const count = 3 ** k;
      for (let i = 0; i < count; i++) {
        const { x, y } = node(k, i);
        const s = size(k);
        ctx.globalAlpha = visible;
        if (k > 0) {
          const parent = node(k - 1, Math.floor(i / 3));
          ctx.strokeStyle = FAINT;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(parent.x, parent.y + size(k - 1) / 2);
          ctx.lineTo(x, y - s / 2);
          ctx.stroke();
        }
        const closed = clamp01(1 - Math.abs(shown - k));
        ctx.fillStyle = `rgba(27, 29, 34, ${closed})`;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x - s / 2, y - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;

    // The cut: what sits on it is taken as given.
    const y = rowY(shown);
    ctx.strokeStyle = ORANGE;
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(4, y);
    ctx.lineTo(w - 4, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `13px ${SERIF}`;
    ctx.fillStyle = ORANGE;
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText("primitivas", 6, y - size(Math.round(shown)) / 2 - 4);

    caption(ctx, `${3 ** cut} ${cut === 0 ? "caja negra" : "cajas negras"}`, w / 2, h - 38, 17, INK);
    caption(ctx, SAYS[cut]!, w / 2, h - 14, 15, cut === 2 ? ORANGE : MUTED);
  };
}

/* ---- 7. a little bit of programming: four lines, a hundred and forty-four strokes ---- */

function programming(): Frame {
  const TEXT = ["repeat 36 [", "  repeat 4 [fd 100 rt 90]", "  rt 10", "]"].join("\n");
  const segments: [number, number, number, number][] = [];
  {
    let x = 0, y = 0, heading = 0;
    for (let i = 0; i < 36; i++) {
      for (let j = 0; j < 4; j++) {
        const nx = x + 100 * Math.sin((heading * Math.PI) / 180), ny = y - 100 * Math.cos((heading * Math.PI) / 180);
        segments.push([x, y, nx, ny]);
        x = nx; y = ny;
        heading += 90;
      }
      heading += 10;
    }
  }
  const TYPE = 2.2, DRAW = 6, HOLD = 2.5, FADE = 0.7;
  let clock = 0;

  return (ctx, w, h, dt) => {
    clock += dt;
    if (clock > TYPE + DRAW + HOLD + FADE) clock = 0;
    const fade = clock > TYPE + DRAW + HOLD ? 1 - clamp01((clock - TYPE - DRAW - HOLD) / FADE) : 1;
    ctx.globalAlpha = fade;

    const wide = w > h * 1.15;
    const codeX = wide ? 8 : w / 2 - 110, codeY = wide ? (h - 40) / 2 - 40 : 10;
    const typed = Math.floor(clamp01(clock / TYPE) * TEXT.length);
    ctx.font = `16px ${MONO}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const lines = TEXT.slice(0, typed).split("\n");
    ctx.fillStyle = INK;
    lines.forEach((line, i) => ctx.fillText(line, codeX, codeY + i * 24));
    if (clock < TYPE && Math.floor(clock * 3) % 2 === 0) {
      const last = lines[lines.length - 1] ?? "";
      ctx.fillStyle = ORANGE;
      ctx.fillRect(codeX + ctx.measureText(last).width + 1, codeY + (lines.length - 1) * 24, 8, 18);
    }

    const areaX = wide ? w * 0.42 : 0, areaW = wide ? w * 0.58 : w;
    const areaY = wide ? 0 : 110, areaH = h - 40 - areaY;
    const scale = Math.min(areaW, areaH) / 300;
    const ox = areaX + areaW / 2, oy = areaY + areaH / 2;
    const done = clamp01((clock - TYPE) / DRAW) * segments.length;
    ctx.lineWidth = 1;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    let tip: [number, number] | null = null;
    for (let i = 0; i < Math.ceil(done); i++) {
      const [x0, y0, x1, y1] = segments[i]!;
      const f = Math.min(1, done - i);
      const ex = lerp(x0, x1, f), ey = lerp(y0, y1, f);
      ctx.moveTo(ox + x0 * scale, oy + y0 * scale);
      ctx.lineTo(ox + ex * scale, oy + ey * scale);
      tip = [ox + ex * scale, oy + ey * scale];
    }
    ctx.stroke();
    if (tip && done < segments.length) {
      ctx.fillStyle = ORANGE;
      ctx.beginPath();
      ctx.arc(tip[0], tip[1], 4, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    caption(ctx, `4 líneas  →  ${Math.floor(done)} trazos`, w / 2, h - 16, 16, done >= segments.length ? ORANGE : MUTED);
  };
}

/* ---- 8. what they want, not what they ask for: eight buttons, and the wheel they wanted ---- */

function want(): Frame {
  const ASK = 3.2, BECOME = 1.6, PAINT = 6, FADE = 0.7;
  const hues = Array.from({ length: 8 }, (_, i) => (i * 360) / 8);
  let clock = 0;
  let trail: { x: number; y: number; hue: number }[] = [];

  return (ctx, w, h, dt) => {
    clock += dt;
    const total = ASK + BECOME + PAINT + FADE;
    if (clock > total) {
      clock = 0;
      trail = [];
    }
    const fade = clock > total - FADE ? 1 - clamp01((clock - (total - FADE)) / FADE) : 1;

    // What was asked for.
    const said = "«quiero un botón para cada color»";
    ctx.globalAlpha = fade * ease(clock / 0.5);
    ctx.font = `17px ${SERIF}`;
    const bw = ctx.measureText(said).width + 28;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(w / 2 - bw / 2, 26 - 17, bw, 34, 17);
    ctx.stroke();
    caption(ctx, said, w / 2, 26, 17, INK);

    const become = ease((clock - ASK) / BECOME);
    const rx = w * 0.3, ry = (h + 20) / 2, R = Math.min(w * 0.2, (h - 110) * 0.42);
    hues.forEach((hue, i) => {
      const appear = ease((clock - 0.6 - i * 0.22) / 0.3);
      if (appear <= 0) return;
      const row = { x: w / 2 + (i - 3.5) * Math.min(52, w / 9), y: 92 };
      const angle = (hue * Math.PI) / 180 - Math.PI / 2;
      const x = lerp(row.x, rx + R * Math.cos(angle), become), y = lerp(row.y, ry + R * Math.sin(angle), become);
      const size = lerp(34, 10, become) * appear;
      ctx.globalAlpha = fade * (1 - clamp01((clock - ASK - BECOME) / 0.6));
      ctx.fillStyle = `hsl(${hue} 80% 55%)`;
      ctx.beginPath();
      ctx.roundRect(x - size / 2, y - size / 2, size, size, 6);
      ctx.fill();
    });

    // What was wanted: any colour at all, and something to paint with it.
    const wheel = ease((clock - ASK - BECOME * 0.6) / 0.8);
    if (wheel > 0) {
      ctx.globalAlpha = fade * wheel;
      ctx.lineWidth = 14;
      for (let k = 0; k < 120; k++) {
        const a0 = (k / 120) * TAU - Math.PI / 2, a1 = ((k + 1.2) / 120) * TAU - Math.PI / 2;
        ctx.strokeStyle = `hsl(${(k / 120) * 360} 80% 55%)`;
        ctx.beginPath();
        ctx.arc(rx, ry, R, a0, a1);
        ctx.stroke();
      }
      const t = Math.max(0, clock - ASK - BECOME);
      const hue = (t * 70) % 360;
      const ha = (hue * Math.PI) / 180 - Math.PI / 2;
      ctx.fillStyle = PAGE;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rx + R * Math.cos(ha), ry + R * Math.sin(ha), 9, 0, TAU);
      ctx.fill();
      ctx.stroke();
      if (t > 0 && clock < total - FADE)
        trail.push({ x: w * 0.72 + Math.sin(t * 1.3) * w * 0.17, y: ry + Math.sin(t * 2.1 + 1) * R * 0.9, hue });
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      for (let k = 1; k < trail.length; k++) {
        ctx.strokeStyle = `hsl(${trail[k]!.hue} 80% 55%)`;
        ctx.beginPath();
        ctx.moveTo(trail[k - 1]!.x, trail[k - 1]!.y);
        ctx.lineTo(trail[k]!.x, trail[k]!.y);
        ctx.stroke();
      }
      ctx.lineCap = "butt";
    }
    ctx.globalAlpha = 1;
    sequence(ctx, arrows(["lo que pide", "lo que quiere"], clock > ASK + BECOME * 0.5 ? 1 : 0), w / 2, h - 16, 16);
  };
}

/* ---- 9. invent things you would use yourself: build a chair, sit on it, fix it, sit again ---- */

function yourself(): Frame {
  type Point = [number, number];
  type Pose = { head: Point; neck: Point; hip: Point; knee: Point; foot: Point; hand: Point };
  const STAND: Pose = { head: [-1.3, 3.5], neck: [-1.3, 3.0], hip: [-1.3, 1.8], knee: [-1.3, 0.9], foot: [-1.3, 0], hand: [-0.75, 2.05] };
  const SIT: Pose = { head: [0.72, 2.85], neck: [0.72, 2.35], hip: [0.68, 1.15], knee: [0.02, 1.15], foot: [0.02, 0.05], hand: [0.2, 1.75] };
  const KEYS = Object.keys(STAND) as (keyof Pose)[];
  const mapPose = (f: (k: keyof Pose) => Point) => Object.fromEntries(KEYS.map((k) => [k, f(k)])) as Pose;

  const T = { build: [0, 2.4], sit1: [2.6, 3.4], tip: [3.4, 3.9], up: [4.8, 5.6], fix: [5.8, 6.8], sit2: [7.1, 7.9], end: 10.5 };
  let clock = 0;

  return (ctx, w, h, dt) => {
    clock += dt;
    if (clock > T.end) clock = 0;
    const t = clock;
    const phase = (range: number[]) => ease((t - range[0]!) / (range[1]! - range[0]!));

    const u = Math.min(w / 6, (h - 70) / 4.3);
    const gx = w / 2 - 0.2 * u, gy = h - 62;
    const X = (x: number) => gx + x * u, Y = (y: number) => gy - y * u;

    ctx.strokeStyle = MUTED;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(X(-2.6), gy + 0.5); ctx.lineTo(X(2.4), gy + 0.5);
    ctx.stroke();

    // The front leg is short until it is fixed; while it is, sitting down tips the chair.
    const fixed = phase(T.fix);
    const frontLen = lerp(0.72, 1, fixed);
    const sitting = t < T.up[0]! ? phase(T.sit1) * (1 - phase(T.up)) : phase(T.sit2);
    const tipping = t < T.fix[0]! ? phase(T.tip) * (1 - phase(T.up)) : 0;
    const angle = tipping * Math.atan((1 - 0.72) / 0.8);
    const rot = (p: Point): Point => {
      const px = p[0] - 0.9, py = p[1];
      return [0.9 + px * Math.cos(angle) - py * Math.sin(angle), px * Math.sin(angle) + py * Math.cos(angle)];
    };
    const parts: [Point, Point, boolean][] = [
      [[0, 1], [1, 1], false],
      [[1, 1], [1, 2.3], false],
      [[0.9, 1], [0.9, 0], false],
      [[0.1, 1], [0.1, 1 - frontLen], true],
    ];
    const built = clamp01(t / T.build[1]!) * parts.length;
    ctx.lineCap = "round";
    parts.forEach(([a, b, front], i) => {
      const f = clamp01(built - i);
      if (f <= 0) return;
      const pa = rot(a), pb = rot([lerp(a[0], b[0], f), lerp(a[1], b[1], f)]);
      ctx.strokeStyle = front && fixed < 1 && t > T.tip[0]! ? ORANGE : INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(X(pa[0]), Y(pa[1]));
      ctx.lineTo(X(pb[0]), Y(pb[1]));
      ctx.stroke();
    });

    let pose = mapPose((k) => [lerp(STAND[k][0], SIT[k][0], sitting), lerp(STAND[k][1], SIT[k][1], sitting)]);
    if (sitting > 0.5) {
      const sat = pose;
      pose = mapPose((k) => rot(sat[k]));
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(X(pose.neck[0]), Y(pose.neck[1])); ctx.lineTo(X(pose.hip[0]), Y(pose.hip[1]));
    ctx.lineTo(X(pose.knee[0]), Y(pose.knee[1])); ctx.lineTo(X(pose.foot[0]), Y(pose.foot[1]));
    ctx.moveTo(X(pose.neck[0]), Y(pose.neck[1] - 0.25)); ctx.lineTo(X(pose.hand[0]), Y(pose.hand[1]));
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(X(pose.head[0]), Y(pose.head[1]), 0.34 * u, 0, TAU);
    ctx.fillStyle = PAGE;
    ctx.fill();
    ctx.stroke();
    ctx.lineCap = "butt";

    const stage = t < T.sit1[0]! ? 0 : t < T.up[0]! ? 1 : t < T.sit2[0]! ? 2 : 3;
    sequence(ctx, arrows(["diseñar", "usar", "arreglar", "usar"], stage), w / 2, 16, 16);
    const note = stage === 1 && tipping > 0.5 ? "se tambalea" : stage === 3 && sitting > 0.9 ? "ahora sí" : "";
    if (note) caption(ctx, note, X(0.5), Y(3.7), 16, ORANGE);
    caption(ctx, "el primer usuario es uno mismo", w / 2, h - 16, 15);
  };
}

/* ---- 10. iterate: a polygon getting closer to the circle each time round ---- */

function iterate(): Frame {
  const SIDES = [3, 4, 5, 6, 8, 10, 12, 16, 24, 48];
  const EACH = 1.5, HOLD = 2.4;
  const error = (n: number) => 1 - (n * Math.sin(TAU / n)) / (2 * Math.PI);
  let clock = 0;

  return (ctx, w, h, dt) => {
    clock += dt;
    if (clock > SIDES.length * EACH + HOLD) clock = 0;
    const i = Math.min(SIDES.length - 1, Math.floor(clock / EACH));
    const n = SIDES[i]!;
    const within = (clock - i * EACH) / EACH;

    const plotW = w > h ? w * 0.36 : 0;
    const R = Math.min((w - plotW) * 0.42, (h - 70) * 0.46);
    const cx = (w - plotW) / 2, cy = (h - 44) / 2;
    ctx.fillStyle = ORANGE_SOFT;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    for (let k = 0; k <= n; k++) {
      const a = (k / n) * TAU - Math.PI / 2;
      if (k === 0) ctx.moveTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
      else ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
    }
    ctx.fillStyle = PAGE;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = MUTED;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    if (plotW) {
      // Each try's error, falling.
      const px = w - plotW + 10, pw = plotW - 20, py = 30, ph = h - 120;
      ctx.strokeStyle = FAINT;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, py); ctx.lineTo(px, py + ph); ctx.lineTo(px + pw, py + ph);
      ctx.stroke();
      const top = error(3);
      for (let k = 0; k <= i; k++) {
        const x = px + ((k + 0.5) / SIDES.length) * pw, y = py + ph - (error(SIDES[k]!) / top) * ph;
        ctx.fillStyle = k === i ? ORANGE : INK;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, TAU);
        ctx.fill();
      }
      caption(ctx, "error en cada intento", px + pw / 2, py + ph + 16, 13);
    }

    const stage = Math.min(2, Math.floor(within * 3));
    sequence(ctx, arrows(["construir", "probar", "ajustar"], clock > SIDES.length * EACH ? -1 : stage), (w - plotW) / 2, h - 40, 16);
    caption(ctx, `intento ${i + 1}: ${n} lados · error ${(error(n) * 100).toFixed(1)} %`, (w - plotW) / 2, h - 14, 15, INK);
  };
}

/* ---- maravilla accidental: Picbreeder's tree, where nobody was looking for what turned up ---- */

/**
 * A little picture-making network, as Picbreeder's were: the colour at (x, y) is worked out from x,
 * y and the distance to the middle, through a few nodes each bending its sum with its own function.
 * A child is its parent with the weights nudged and now and then a node added, so pictures along
 * a branch look related while drifting anywhere at all.
 */
type Net = { fn: number; from: { k: number; w: number }[] }[];
const FNS: ((v: number) => number)[] = [
  Math.sin,
  (v) => Math.exp(-v * v * 2),
  Math.tanh,
  (v) => Math.abs(v) - 0.5,
  (v) => Math.cos(3 * v),
];
const INPUTS = 4; // x, y, d, bias
const gauss = () => Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(TAU * Math.random());

function randomNet(): Net {
  const net: Net = [];
  const add = () => {
    const sources = INPUTS + net.length;
    net.push({
      fn: Math.floor(Math.random() * FNS.length),
      from: Array.from({ length: 2 + Math.floor(Math.random() * 2) }, () => ({ k: Math.floor(Math.random() * sources), w: gauss() * 1.6 })),
    });
  };
  for (let i = 0; i < 5; i++) add();
  return net;
}

function mutate(net: Net): Net {
  const child: Net = net.map((node) => ({
    fn: Math.random() < 0.08 ? Math.floor(Math.random() * FNS.length) : node.fn,
    from: node.from.map((c) => ({ k: c.k, w: c.w + (Math.random() < 0.7 ? gauss() * 0.45 : 0) })),
  }));
  if (Math.random() < 0.45) {
    // A new node before the three outputs, feeding one of them.
    const at = child.length - 3;
    const sources = INPUTS + at;
    const node = { fn: Math.floor(Math.random() * FNS.length), from: [0, 1].map(() => ({ k: Math.floor(Math.random() * sources), w: gauss() * 1.6 })) };
    child.splice(at, 0, node);
    for (let j = at + 1; j < child.length; j++) for (const c of child[j]!.from) if (c.k >= INPUTS + at) c.k++;
    child[at + 1 + Math.floor(Math.random() * 3)]!.from.push({ k: INPUTS + at, w: gauss() * 1.6 });
  }
  return child;
}

function paint(net: Net, size: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const c = canvas.getContext("2d")!;
  const image = c.createImageData(size, size);
  const values = new Float64Array(INPUTS + net.length);
  for (let py = 0; py < size; py++)
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * 2 - 1, y = (py / (size - 1)) * 2 - 1;
      values[0] = x * 1.5; values[1] = y * 1.5; values[2] = Math.hypot(x, y) * 1.5; values[3] = 1;
      net.forEach((node, i) => {
        let sum = 0;
        for (const { k, w } of node.from) sum += values[k]! * w;
        values[INPUTS + i] = FNS[node.fn]!(sum);
      });
      const n = INPUTS + net.length;
      const hue = ((Math.tanh(values[n - 3]!) + 1) * 180 + 200) % 360;
      const sat = 0.35 + 0.65 * Math.abs(Math.tanh(values[n - 2]!));
      const light = 0.12 + 0.8 * Math.abs(Math.tanh(values[n - 1]!));
      // hsl to rgb
      const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat, p = 2 * light - q;
      const channel = (t: number) => {
        t = ((t % 1) + 1) % 1;
        return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
      };
      const o = (py * size + px) * 4, h01 = hue / 360;
      image.data[o] = channel(h01 + 1 / 3) * 255;
      image.data[o + 1] = channel(h01) * 255;
      image.data[o + 2] = channel(h01 - 1 / 3) * 255;
      image.data[o + 3] = 255;
    }
  c.putImageData(image, 0, 0);
  return canvas;
}

const FINDS = ["img/picbreeder-1.png", "img/picbreeder-2.png", "img/picbreeder-3.png"].map((src) => {
  const image = new Image();
  image.src = src;
  return image;
});

function picbreeder(): Frame {
  type Node = { depth: number; parent: number; y: number; picture: HTMLCanvasElement | HTMLImageElement; find: number; at: number };
  const DEPTH = 5;
  let nodes: Node[] = [];
  let path: number[] = [];
  let clock = 0;
  const STEP = 1.05, GROWN = DEPTH * STEP + 1.3, FOUND = GROWN + 1.8, TRACE = FOUND + 4.2, END = TRACE + 1;

  const reset = () => {
    // A tree: each picture published, and one to three people carrying on from it.
    type Raw = { depth: number; parent: number; net: Net };
    const raw: Raw[] = [{ depth: 0, parent: -1, net: randomNet() }];
    for (let d = 0; d < DEPTH; d++) {
      const level = raw.map((node, i) => ({ node, i })).filter(({ node }) => node.depth === d);
      level.forEach(({ node, i }) => {
        const children = d === 0 ? 2 : d < 2 ? 1 + Math.floor(Math.random() * 2) + (Math.random() < 0.3 ? 1 : 0) : Math.random() < 0.25 ? 0 : 1 + (Math.random() < 0.35 ? 1 : 0);
        for (let k = 0; k < children && raw.filter((n) => n.depth === d + 1).length < 6; k++)
          raw.push({ depth: d + 1, parent: i, net: mutate(mutate(node.net)) });
      });
      // Some branches die out, but at least three reach the end, where the finds are.
      while (raw.filter((n) => n.depth === d + 1).length < 3) {
        const { node, i } = level[Math.floor(Math.random() * level.length)]!;
        raw.push({ depth: d + 1, parent: i, net: mutate(mutate(node.net)) });
      }
    }
    // Rows: each leaf its own, a parent in the middle of its children.
    const kids = raw.map((_, i) => raw.map((node, j) => ({ node, j })).filter(({ node }) => node.parent === i).map(({ j }) => j));
    const ys = new Array<number>(raw.length).fill(0);
    let row = 0;
    const place = (i: number): number => {
      const c = kids[i]!;
      ys[i] = c.length ? c.map(place).reduce((a, b) => a + b, 0) / c.length : row++;
      return ys[i]!;
    };
    place(0);
    const leaves = raw.map((node, i) => ({ node, i })).filter(({ node, i }) => node.depth === DEPTH && kids[i]!.length === 0);
    const finds = [...leaves].sort(() => Math.random() - 0.5).slice(0, 3).map(({ i }) => i);
    nodes = raw.map((node, i) => ({
      depth: node.depth,
      parent: node.parent,
      y: ys[i]! / Math.max(1, row - 1),
      picture: finds.includes(i) ? FINDS[finds.indexOf(i)]! : paint(node.net, 36),
      find: finds.indexOf(i),
      at: node.depth * STEP + Math.random() * 0.35,
    }));
    // The road to the butterfly, the last of the finds.
    path = [];
    for (let i = finds[finds.length - 1] ?? 0; i >= 0; i = nodes[i]!.parent) path.unshift(i);
    clock = 0;
  };
  reset();

  return (ctx, w, h, dt) => {
    clock += dt;
    if (clock > END) reset();
    const fade = clock > TRACE ? 1 - clamp01((clock - TRACE) / (END - TRACE)) : 1;
    const tracing = ease((clock - FOUND) / 0.8);

    const top = 14, bottom = h - 56;
    const rows = nodes.filter((node) => node.depth === DEPTH || nodes.every((m) => m.parent !== nodes.indexOf(node))).length;
    const size = Math.min((w - 20) / (DEPTH + 1) * 0.62, ((bottom - top) / Math.max(1, rows)) * 0.86, 64);
    const X = (d: number) => 10 + size / 2 + (d / DEPTH) * (w - 20 - size);
    const Y = (y: number) => top + size / 2 + y * (bottom - top - size);
    const onPath = (i: number) => path.includes(i);

    ctx.globalAlpha = fade;
    nodes.forEach((node, i) => {
      if (node.parent < 0) return;
      const grow = ease((clock - node.at + 0.5) / 0.5);
      if (grow <= 0) return;
      const p = nodes[node.parent]!;
      const x0 = X(p.depth) + size / 2, y0 = Y(p.y), x1 = X(node.depth) - size / 2, y1 = Y(node.y);
      const lit = onPath(i) && tracing > 0;
      ctx.globalAlpha = fade * (tracing > 0 && !lit ? lerp(1, 0.3, tracing) : 1);
      ctx.strokeStyle = lit ? ORANGE : MUTED;
      ctx.lineWidth = lit ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      const xm = lerp(x0, x1, grow);
      ctx.bezierCurveTo(lerp(x0, xm, 0.5), y0, lerp(x0, xm, 0.5), lerp(y0, y1, grow), xm, lerp(y0, y1, grow));
      ctx.stroke();
    });
    nodes.forEach((node, i) => {
      const show = ease((clock - node.at) / 0.35);
      if (show <= 0) return;
      const found = node.find >= 0;
      if (found && clock < GROWN) return;
      const pop = found ? ease((clock - GROWN) / 0.4) : show;
      const s = size * pop * (found ? 1.12 : 1);
      const x = X(node.depth), y = Y(node.y);
      const lit = onPath(i) && tracing > 0;
      ctx.globalAlpha = fade * (tracing > 0 && !lit && !found ? lerp(1, 0.3, tracing) : 1);
      const picture = node.picture;
      if (!(picture instanceof HTMLImageElement) || picture.complete) {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(picture, x - s / 2, y - s / 2, s, s);
      }
      if (found || lit) {
        ctx.strokeStyle = ORANGE;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - s / 2 - 2, y - s / 2 - 2, s + 4, s + 4);
      }
    });
    ctx.globalAlpha = 1;

    const words =
      clock < STEP * 1.6
        ? "cada quien elige lo que le parece interesante y lo publica"
        : clock < GROWN
          ? "otros continúan desde ahí, sin un objetivo común"
          : clock < FOUND
            ? "nadie buscaba esto"
            : "ninguno de los pasos intermedios parecía una mariposa";
    caption(ctx, words, w / 2, h - 30, 16, clock >= GROWN && clock < TRACE ? ORANGE : MUTED);
    caption(ctx, "las imágenes al final de las ramas son hallazgos reales de Picbreeder", w / 2, h - 8, 12);
  };
}

export const ANIMATIONS: Readonly<Record<AnimationName, () => Frame>> = {
  designers,
  floor,
  salient,
  paths,
  simple,
  blackboxes,
  programming,
  want,
  yourself,
  iterate,
  picbreeder,
};
