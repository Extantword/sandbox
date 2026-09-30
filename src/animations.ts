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

/* ---- 1. design for designers: somebody's world, walked through, left as nothing but its edges ---- */

/**
 * A first-person walk through a blocky world, drawn as the edges of its blocks and nothing else.
 *
 * The world is a set of unit cubes on the integer lattice, and what is drawn is the boundary
 * between a block and the air beside it: every face with nothing in front of it gives its four
 * edges, each edge kept once however many faces meet along it. Faces turned away from the eye are
 * dropped — with no fill there is nothing to hide the far side of a box, and the back of every
 * block showing through the front is a thicket rather than a place. What is left reads as the
 * world's own scaffolding: the ground's grid, the trees, and the hut somebody put beside the path.
 *
 * The walk never ends because the world repeats every `L` blocks ahead: the ground is generated
 * from functions periodic in z, so the copy the walker is in and the copy in front of them join
 * seamlessly, and the one behind is simply left behind.
 */
function designers(): Frame {
  const L = 40; // how far ahead the world repeats
  const HALF = 12; // how far to each side it is built
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const wrap = (z: number) => ((z % L) + L) % L;
  const solid = new Set<string>();
  const put = (x: number, y: number, z: number) => void solid.add(key(x, y, wrap(z)));
  const has = (x: number, y: number, z: number) => solid.has(key(x, y, wrap(z)));

  /** How high the ground stands at a column: level along the path, rolling away from it. */
  const ground = (x: number, z: number) => {
    const away = Math.max(0, Math.abs(x) - 2.5);
    const roll = Math.sin((TAU * z) / L) * 0.9 + Math.cos((TAU * 2 * z) / L + 1.7) * 0.6;
    return Math.round(away * 0.5 + roll * (away > 0 ? 1 : 0.2));
  };

  for (let z = 0; z < L; z++) {
    for (let x = -HALF; x <= HALF; x++) {
      const top = ground(x, z);
      put(x, top, z);
      put(x, top - 1, z);
    }
  }

  /** A trunk with a blob of leaves on top, the way anyone's first tree comes out. */
  const tree = (x: number, z: number, tall = 4) => {
    const base = ground(x, z) + 1;
    for (let k = 0; k < tall; k++) put(x, base + k, z);
    for (let dy = tall - 2; dy <= tall + 1; dy++) {
      const reach = dy >= tall ? 1 : 2;
      for (let dx = -reach; dx <= reach; dx++) {
        for (let dz = -reach; dz <= reach; dz++) {
          if (Math.abs(dx) + Math.abs(dz) > reach + 1) continue;
          put(x + dx, base + dy, z + dz);
        }
      }
    }
  };

  /** A hut with a door on the path, which is what everybody builds first. */
  const hut = (x0: number, z0: number, wide: number, deep: number, tall: number) => {
    const base = ground(x0, z0) + 1;
    for (let dx = 0; dx < wide; dx++) {
      for (let dz = 0; dz < deep; dz++) {
        for (let dy = 0; dy < tall; dy++) {
          if (dx === 0 || dz === 0 || dx === wide - 1 || dz === deep - 1) put(x0 + dx, base + dy, z0 + dz);
        }
        put(x0 + dx, base + tall, z0 + dz);
      }
    }
    const door = x0 + Math.floor(wide / 2);
    solid.delete(key(door, base, wrap(z0)));
    solid.delete(key(door, base + 1, wrap(z0)));
  };

  /** A tower of blocks, left unfinished, as they always are. */
  const tower = (x: number, z: number, tall: number) => {
    const base = ground(x, z) + 1;
    for (let k = 0; k < tall; k++) {
      for (let dx = 0; dx < 2; dx++) for (let dz = 0; dz < 2; dz++) put(x + dx, base + k, z + dz);
    }
    solid.delete(key(x + 1, base + tall - 1, wrap(z + 1)));
  };

  // Everything anybody built stands back from the path, so that walking it is walking a street
  // rather than pushing through a thicket of one's own boxes.
  tree(-9, 5);
  tree(9, 12, 5);
  tree(-10, 24);
  tree(8, 31, 3);
  hut(8, 17, 5, 5, 3);
  hut(-11, 33, 4, 4, 2);
  tower(-9, 14, 6);
  // A bridge over the path: something nobody needed, which is the point of building it.
  for (let x = -4; x <= 4; x++) {
    put(x, ground(0, 27) + 5, 27);
    put(x, ground(0, 27) + 5, 28);
  }
  for (let k = 0; k < 5; k++) {
    put(-4, ground(-4, 27) + k, 27);
    put(4, ground(4, 27) + k, 28);
  }

  // ---- the edges, built once: each one kept with the directions of the faces that meet along it
  type Edge = { ax: number; ay: number; az: number; bx: number; by: number; bz: number; sides: number };
  const found = new Map<string, Edge>();
  const addEdge = (
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    side: number,
  ) => {
    const one = `${ax},${ay},${az}`;
    const other = `${bx},${by},${bz}`;
    const id = one < other ? `${one}|${other}` : `${other}|${one}`;
    const already = found.get(id);
    if (already) already.sides |= side;
    else found.set(id, { ax, ay, az, bx, by, bz, sides: side });
  };
  const quad = (corners: [number, number, number][], side: number) => {
    for (let i = 0; i < 4; i++) {
      const a = corners[i]!;
      const b = corners[(i + 1) % 4]!;
      addEdge(a[0], a[1], a[2], b[0], b[1], b[2], side);
    }
  };
  for (const cell of solid) {
    const [x, y, z] = cell.split(",").map(Number) as [number, number, number];
    if (!has(x + 1, y, z)) quad([[x + 1, y, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x + 1, y, z + 1]], 1);
    if (!has(x - 1, y, z)) quad([[x, y, z], [x, y + 1, z], [x, y + 1, z + 1], [x, y, z + 1]], 2);
    if (!has(x, y + 1, z)) quad([[x, y + 1, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]], 4);
    if (!has(x, y - 1, z)) quad([[x, y, z], [x + 1, y, z], [x + 1, y, z + 1], [x, y, z + 1]], 8);
    if (!has(x, y, z + 1)) quad([[x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]], 16);
    if (!has(x, y, z - 1)) quad([[x, y, z], [x + 1, y, z], [x + 1, y + 1, z], [x, y + 1, z]], 32);
  }
  const EDGES = [...found.values()];

  const NEAR = 0.16;
  const FULL = 7; // as far as an edge is drawn at its darkest
  const FAR = 21; // and where it has faded away altogether
  const STEPS = 6; // how many shades the fading is done in

  /*
   * What the player does, on a loop: walk a while, stop and build a little arch out of four
   * blocks, look at it, take one back, and walk on. The blocks they place are kept apart from the
   * world's own — they are few, they come and go, and the world's edges are worked out once.
   */
  const WALK = 7.5, BUILD = 4.4, ADMIRE = 1.6, MINE = 1.6, AFTER = 3.5;
  const beat = WALK + BUILD + ADMIRE + MINE + AFTER;
  type Block = { x: number; y: number; z: number; born: number };
  let placed: Block[] = [];
  let taken = 0; // when the last one was broken, so the break can be animated
  let clock = 0;
  let swing = 0; // how long ago the arm swung

  return (ctx, w, h, dt) => {
    clock += dt;
    const round = Math.floor(clock / beat);
    const inside = clock % beat;
    const building = inside > WALK && inside <= WALK + BUILD;
    const admiring = inside > WALK + BUILD && inside <= WALK + BUILD + ADMIRE;
    const mining = inside > WALK + BUILD + ADMIRE && inside <= WALK + BUILD + ADMIRE + MINE;
    ctx.fillStyle = PAGE;
    ctx.fillRect(0, 0, w, h);

    // ---- where the walker is, and which way they are looking
    // They stop to build: the distance covered is the walking part of the beat only.
    const moved = round * (WALK + AFTER) + Math.min(inside, WALK) + Math.max(0, inside - (WALK + BUILD + ADMIRE + MINE));
    const travel = moved * 1.9;
    const camX = 0.8 * Math.sin(travel * 0.11);
    const camZ = travel;
    const stride = travel * 2.4;
    const still = building || admiring || mining;
    const camY = ground(Math.round(camX), Math.round(camZ)) + 1.66 + (still ? 0 : 0.055 * Math.sin(stride));
    // While building they look down at what they are doing; walking, they look about.
    const aim = building || mining ? 1 : admiring ? 1 : 0;
    const yaw = (1 - aim) * (0.26 * Math.sin(travel * 0.14)) + aim * 0.5;
    const pitch = -0.07 - aim * 0.22 + (still ? 0 : 0.018 * Math.sin(stride + 0.8));
    const [cy, sy] = [Math.cos(yaw), Math.sin(yaw)];
    const [cp, sp] = [Math.cos(pitch), Math.sin(pitch)];
    const f = h * 0.92;
    /** A point of the world, in what the eye sees: across, up, and how far off. */
    const seen = (x: number, y: number, z: number) => {
      const [dx, dy, dz] = [x - camX, y - camY, z - camZ];
      return [
        dx * cy - dz * sy,
        -dx * sy * sp + dy * cp - dz * cy * sp,
        dx * sy * cp + dy * sp + dz * cy * cp,
      ] as [number, number, number];
    };
    const onScreen = (x: number, y: number, z: number) => {
      const [sxv, syv, sz] = seen(x, y, z);
      return sz < NEAR ? null : ([w / 2 + (f * sxv) / sz, h / 2 - (f * syv) / sz, sz] as [number, number, number]);
    };

    // The lines are gathered by how far off they are and each shade drawn in one go, since a
    // stroke apiece for a few thousand of them is the whole frame's time.
    const shades: Path2D[] = Array.from({ length: STEPS }, () => new Path2D());
    const copies = [Math.floor(camZ / L) * L, (Math.floor(camZ / L) + 1) * L];
    for (const shift of copies) {
      for (const edge of EDGES) {
        const [az, bz] = [edge.az + shift, edge.bz + shift];
        // Which side of this edge faces the walker: with nothing filled in, a face turned away
        // would show through the one in front of it.
        const [mx, my, mz] = [(edge.ax + edge.bx) / 2, (edge.ay + edge.by) / 2, (az + bz) / 2];
        const [ox, oy, oz] = [mx - camX, my - camY, mz - camZ];
        const facing =
          ((edge.sides & 1) !== 0 && ox < 0) ||
          ((edge.sides & 2) !== 0 && ox > 0) ||
          ((edge.sides & 4) !== 0 && oy < 0) ||
          ((edge.sides & 8) !== 0 && oy > 0) ||
          ((edge.sides & 16) !== 0 && oz < 0) ||
          ((edge.sides & 32) !== 0 && oz > 0);
        if (!facing) continue;
        if (oz > FAR + 2 || Math.hypot(ox, oy, oz) > FAR + 3) continue;

        let one = seen(edge.ax, edge.ay, az);
        let other = seen(edge.bx, edge.by, bz);
        if (one[2] < NEAR && other[2] < NEAR) continue;
        if (one[2] < NEAR || other[2] < NEAR) {
          const [behind, ahead] = one[2] < NEAR ? [one, other] : [other, one];
          const along = (NEAR - behind[2]) / (ahead[2] - behind[2]);
          const cut: [number, number, number] = [
            behind[0] + (ahead[0] - behind[0]) * along,
            behind[1] + (ahead[1] - behind[1]) * along,
            NEAR,
          ];
          if (one[2] < NEAR) one = cut;
          else other = cut;
        }
        const away = (one[2] + other[2]) / 2;
        if (away > FAR) continue;
        const dim = away <= FULL ? 0 : Math.min(STEPS - 1, Math.floor(((away - FULL) / (FAR - FULL)) * STEPS));
        const path = shades[dim]!;
        path.moveTo(w / 2 + (f * one[0]) / one[2], h / 2 - (f * one[1]) / one[2]);
        path.lineTo(w / 2 + (f * other[0]) / other[2], h / 2 - (f * other[1]) / other[2]);
      }
    }
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    shades.forEach((path, i) => {
      ctx.strokeStyle = `rgba(27, 29, 34, ${(0.9 * (STEPS - i)) / STEPS})`;
      ctx.stroke(path);
    });

    // ---- what the crosshair is on: the block hit, and the empty cell just before it
    const look: [number, number, number] = [sy * cp, sp, cy * cp];
    const standing = (x: number, y: number, z: number) =>
      has(x, y, z) || placed.some((b) => b.x === x && b.y === y && b.z === z);
    let aimed: [number, number, number] | null = null;
    let against: [number, number, number] | null = null;
    {
      let last: [number, number, number] | null = null;
      for (let step = 0.1; step < 6 && !aimed; step += 0.04) {
        const cell: [number, number, number] = [
          Math.floor(camX + look[0] * step),
          Math.floor(camY + look[1] * step),
          Math.floor(camZ + look[2] * step),
        ];
        if (standing(cell[0], cell[1], cell[2])) {
          aimed = cell;
          against = last;
        } else last = cell;
      }
    }

    // ---- building: one block every so often, laid against whatever is being looked at
    if (building && against) {
      const wanted = Math.floor((inside - WALK) / (BUILD / 4));
      if (placed.length <= wanted && placed.length < 4) {
        const at = against;
        if (!placed.some((b) => b.x === at[0] && b.y === at[1] && b.z === at[2])) {
          placed.push({ x: at[0], y: at[1], z: at[2], born: clock });
          swing = clock;
        }
      }
    }
    if (mining && placed.length > 0 && clock - taken > MINE * 0.7) {
      taken = clock;
      placed.pop();
      swing = clock;
    }
    // Each round starts afresh: blocks left behind would be walked through, and a block standing
    // where the eye is turns the picture into a wall.
    if (inside < 0.2 && placed.length > 0) placed = [];

    // ---- the blocks they put there, drawn whole: they are what the walk is for
    const cube = (x: number, y: number, z: number, paint: string, width: number, grow = 1) => {
      const box = new Path2D();
      const pad = (1 - grow) / 2;
      const rung = (
        x1: number, y1: number, z1: number,
        x2: number, y2: number, z2: number,
      ) => {
        const a = onScreen(x + pad + x1 * grow, y + pad + y1 * grow, z + pad + z1 * grow);
        const b = onScreen(x + pad + x2 * grow, y + pad + y2 * grow, z + pad + z2 * grow);
        if (!a || !b) return;
        box.moveTo(a[0], a[1]);
        box.lineTo(b[0], b[1]);
      };
      for (let k = 0; k < 2; k++) {
        rung(0, k, 0, 1, k, 0);
        rung(1, k, 0, 1, k, 1);
        rung(1, k, 1, 0, k, 1);
        rung(0, k, 1, 0, k, 0);
      }
      for (const [dx, dz] of [[0, 0], [1, 0], [1, 1], [0, 1]] as [number, number][]) rung(dx, 0, dz, dx, 1, dz);
      ctx.strokeStyle = paint;
      ctx.lineWidth = width;
      ctx.stroke(box);
    };
    for (const block of placed) {
      const age = clamp01((clock - block.born) / 0.25);
      cube(block.x, block.y, block.z, INK, 1.6, 0.4 + 0.6 * ease(age));
    }
    // The block being broken shows the cracks first, the way it does in the game.
    if (mining && placed.length > 0) {
      const last = placed[placed.length - 1]!;
      const going = clamp01((inside - (WALK + BUILD + ADMIRE)) / (MINE * 0.7));
      ctx.strokeStyle = MUTED;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k < Math.floor(going * 6); k++) {
        const a = onScreen(last.x + 0.1 + (k % 3) * 0.3, last.y + 0.15 + Math.floor(k / 3) * 0.4, last.z + 1.001);
        const b = onScreen(last.x + 0.35 + (k % 3) * 0.3, last.y + 0.5 + Math.floor(k / 3) * 0.4, last.z + 1.001);
        if (!a || !b) continue;
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
      }
      ctx.stroke();
    }
    // Not when it is right against the eye: a block at arm's length fills the screen with its
    // own edges and there is nothing left to see.
    if (aimed && Math.hypot(aimed[0] + 0.5 - camX, aimed[1] + 0.5 - camY, aimed[2] + 0.5 - camZ) > 1.4) {
      cube(aimed[0], aimed[1], aimed[2], ORANGE, 2);
    }

    // ---- the hand, holding a block, swinging when it is used
    const swung = Math.max(0, 1 - (clock - swing) / 0.35);
    const arm = Math.sin(swung * Math.PI) * h * 0.06 + (still ? 0 : Math.sin(stride) * h * 0.008);
    ctx.save();
    ctx.translate(w * 0.82, h - h * 0.07 + arm);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    const hand = Math.min(w, h) * 0.17;
    // a block held out in front, drawn the way the game shows it: three faces of a cube
    ctx.beginPath();
    ctx.moveTo(0, -hand * 0.95);
    ctx.lineTo(hand * 0.62, -hand * 0.6);
    ctx.lineTo(hand * 0.62, hand * 0.12);
    ctx.lineTo(0, hand * 0.48);
    ctx.lineTo(-hand * 0.62, hand * 0.12);
    ctx.lineTo(-hand * 0.62, -hand * 0.6);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-hand * 0.62, -hand * 0.6);
    ctx.lineTo(0, -hand * 0.25);
    ctx.lineTo(hand * 0.62, -hand * 0.6);
    ctx.moveTo(0, -hand * 0.25);
    ctx.lineTo(0, hand * 0.48);
    ctx.stroke();
    ctx.restore();

    // ---- the crosshair and the hotbar: the whole of the interface
    ctx.strokeStyle = MUTED;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 9, h / 2);
    ctx.lineTo(w / 2 + 9, h / 2);
    ctx.moveTo(w / 2, h / 2 - 9);
    ctx.lineTo(w / 2, h / 2 + 9);
    ctx.stroke();

    const slot = Math.min(w / 12, h * 0.062);
    const bar = slot * 9;
    const barY = h - slot * 1.4;
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = FAINT;
    for (let k = 0; k < 9; k++) ctx.strokeRect(w / 2 - bar / 2 + k * slot, barY, slot, slot);
    // what is in the hand is the slot that is lit
    const held = 2;
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 2;
    ctx.strokeRect(w / 2 - bar / 2 + held * slot - 1.5, barY - 1.5, slot + 3, slot + 3);
    // a few of the slots have something in them, drawn as the little cube each one is
    ctx.strokeStyle = MUTED;
    ctx.lineWidth = 1;
    for (const k of [0, 1, 2, 4, 7]) {
      const [cx, cyy] = [w / 2 - bar / 2 + k * slot + slot / 2, barY + slot / 2];
      const r = slot * 0.26;
      ctx.beginPath();
      ctx.moveTo(cx, cyy - r);
      ctx.lineTo(cx + r, cyy - r * 0.45);
      ctx.lineTo(cx + r, cyy + r * 0.45);
      ctx.lineTo(cx, cyy + r);
      ctx.lineTo(cx - r, cyy + r * 0.45);
      ctx.lineTo(cx - r, cyy - r * 0.45);
      ctx.closePath();
      ctx.moveTo(cx - r, cyy - r * 0.45);
      ctx.lineTo(cx, cyy);
      ctx.lineTo(cx + r, cyy - r * 0.45);
      ctx.moveTo(cx, cyy);
      ctx.lineTo(cx, cyy + r);
      ctx.stroke();
    }
    // hearts over the bar, which is how anybody knows at a glance what game this is
    const heart = slot * 0.3;
    for (let k = 0; k < 10; k++) {
      const [hx, hy] = [w / 2 - bar / 2 + k * (heart * 1.5) + heart * 0.6, barY - heart * 1.9];
      ctx.beginPath();
      ctx.moveTo(hx, hy + heart * 0.7);
      ctx.bezierCurveTo(hx - heart * 1.3, hy - heart * 0.3, hx - heart * 0.4, hy - heart * 1.1, hx, hy - heart * 0.3);
      ctx.bezierCurveTo(hx + heart * 0.4, hy - heart * 1.1, hx + heart * 1.3, hy - heart * 0.3, hx, hy + heart * 0.7);
      ctx.strokeStyle = k < 9 ? MUTED : FAINT;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
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

/* ---- a child, drawn with as few strokes as will still read as one ---- */

/**
 * A child, standing, `tall` pixels from head to heel at (x, y) — y being the ground under them.
 *
 * Two of these slides are about somebody doing something rather than about the thing being done,
 * so the figure has to be plain enough to sit beside a drawing without competing with it.
 */
function child(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tall: number,
  arms: { left: [number, number]; right: [number, number] },
) {
  const head = tall * 0.15;
  const [neck, hip] = [y - tall * 0.7, y - tall * 0.34];
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, tall * 0.022);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.arc(x, y - tall * 0.85, head, 0, TAU);
  ctx.moveTo(x, neck);
  ctx.lineTo(x, hip);
  ctx.moveTo(x, hip);
  ctx.lineTo(x - tall * 0.12, y);
  ctx.moveTo(x, hip);
  ctx.lineTo(x + tall * 0.12, y);
  const shoulder = y - tall * 0.64;
  ctx.moveTo(x, shoulder);
  ctx.lineTo(x + arms.left[0] * tall, shoulder + arms.left[1] * tall);
  ctx.moveTo(x, shoulder);
  ctx.lineTo(x + arms.right[0] * tall, shoulder + arms.right[1] * tall);
  ctx.stroke();
}

/** dy/dx, set as a fraction, the way it is written by hand. */
function derivative(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ORANGE;
  ctx.strokeStyle = ORANGE;
  ctx.font = `italic ${size}px ${SERIF}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("dy", x, y - size * 0.22);
  ctx.fillText("dx", x, y + size * 0.96);
  ctx.lineWidth = Math.max(1, size * 0.045);
  ctx.beginPath();
  ctx.moveTo(x - size * 0.46, y + size * 0.1);
  ctx.lineTo(x + size * 0.46, y + size * 0.1);
  ctx.stroke();
  ctx.restore();
}

/* ---- 3. powerful ideas made salient: a child after a circle, and what turns up on the way ---- */

/**
 * Somebody playing with the turtle decides to draw a circle, and tries.
 *
 * The first go is a square, the second an octagon, the third a turn of one degree at a time — and
 * that third one is a circle, near enough to satisfy anybody. Nobody was taught that a curve is
 * what a great many small turns come to; it is what the third attempt *is*, and that is the idea
 * arriving while the thing is being played with rather than being handed over in a lesson.
 */
function salient(): Frame {
  const TRIES = [
    { sides: 4, step: 1, says: "repeat 4 [fd 120 rt 90]" },
    { sides: 8, step: 1, says: "repeat 8 [fd 62 rt 45]" },
    { sides: 90, step: 1, says: "repeat 90 [fd 5.6 rt 4]" },
  ];
  const IDEA = 1.6, DRAW = 2.3, HOLD = 1.1, PROUD = 3.2;
  const period = IDEA + TRIES.length * (DRAW + HOLD) + PROUD;
  let clock = 0;

  /** The corners of a regular polygon of the given number of sides, drawn the turtle's way. */
  const corners = (sides: number) => {
    const points: [number, number][] = [[0, 0]];
    let [x, y, heading] = [0, 0, -Math.PI / 2];
    const side = (TAU * 1) / sides; // a unit circle's perimeter, cut into equal steps
    for (let k = 0; k < sides; k++) {
      x += Math.cos(heading) * side;
      y += Math.sin(heading) * side;
      heading += TAU / sides;
      points.push([x, y]);
    }
    return points;
  };
  const SHAPES = TRIES.map((each) => {
    const points = corners(each.sides);
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const middle: [number, number] = [
      (Math.min(...xs) + Math.max(...xs)) / 2,
      (Math.min(...ys) + Math.max(...ys)) / 2,
    ];
    const reach = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    return { ...each, points, middle, reach };
  });

  return (ctx, w, h, dt) => {
    clock = (clock + dt) % period;
    ctx.fillStyle = PAGE;
    ctx.fillRect(0, 0, w, h);

    const floor = h - 52;
    const tall = Math.min(h * 0.42, 150);
    const kid = w * 0.17;
    const stage: [number, number] = [w * 0.62, h * 0.46];
    const size = Math.min(w * 0.42, h * 0.62);

    // Which attempt is being drawn, and how far into it.
    let at = clock - IDEA;
    let round = -1;
    let along = 0;
    let settled = false;
    if (at >= 0) {
      round = Math.min(TRIES.length - 1, Math.floor(at / (DRAW + HOLD)));
      const inside = at - round * (DRAW + HOLD);
      along = clamp01(inside / DRAW);
      settled = inside > DRAW;
      if (at >= TRIES.length * (DRAW + HOLD)) {
        round = TRIES.length - 1;
        along = 1;
        settled = true;
      }
    }
    const done = clock > IDEA + TRIES.length * (DRAW + HOLD);
    const rest = done ? clock - (IDEA + TRIES.length * (DRAW + HOLD)) : 0;

    // ---- the idea: a circle, in a bubble over their head
    if (clock < IDEA + 0.6) {
      const show = ease(clock / 0.6) * (1 - ease((clock - IDEA) / 0.6));
      ctx.save();
      ctx.globalAlpha = show;
      ctx.strokeStyle = MUTED;
      ctx.lineWidth = 1.4;
      const [bx, by] = [kid + tall * 0.42, floor - tall * 1.16];
      ctx.beginPath();
      ctx.arc(bx, by, tall * 0.26, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(kid + tall * 0.2, floor - tall * 0.95, tall * 0.035, 0, TAU);
      ctx.moveTo(kid + tall * 0.29, floor - tall * 1.02);
      ctx.arc(kid + tall * 0.26, floor - tall * 1.02, tall * 0.055, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = ORANGE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, by, tall * 0.15, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // ---- the attempt itself
    if (round >= 0) {
      const shape = SHAPES[round]!;
      const scale = (size * 0.8) / shape.reach;
      const place = ([px, py]: [number, number]): [number, number] => [
        stage[0] + (px - shape.middle[0]) * scale,
        stage[1] + (py - shape.middle[1]) * scale,
      ];
      const upto = along * shape.sides;
      const whole = Math.floor(upto);
      ctx.strokeStyle = round === TRIES.length - 1 && settled ? ORANGE : INK;
      ctx.lineWidth = round === TRIES.length - 1 && settled ? 3 : 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      const first = place(shape.points[0]!);
      ctx.moveTo(first[0], first[1]);
      for (let k = 1; k <= Math.min(whole, shape.sides); k++) {
        const next = place(shape.points[k]!);
        ctx.lineTo(next[0], next[1]);
      }
      let pen = place(shape.points[Math.min(whole, shape.sides)]!);
      if (whole < shape.sides) {
        const from = shape.points[whole]!;
        const to = shape.points[whole + 1]!;
        const part = upto - whole;
        pen = place([from[0] + (to[0] - from[0]) * part, from[1] + (to[1] - from[1]) * part]);
        ctx.lineTo(pen[0], pen[1]);
      }
      ctx.stroke();

      // the turtle, where the pen is
      if (!settled) {
        ctx.fillStyle = ORANGE;
        ctx.beginPath();
        ctx.arc(pen[0], pen[1], 5, 0, TAU);
        ctx.fill();
      }
      caption(ctx, shape.says, stage[0], h - 18, 15, settled && round === 2 ? ORANGE : MUTED);
    }

    // ---- the child, and what came to them once the circle came out
    const wave = done ? Math.sin(rest * 6) * 0.06 : 0;
    child(ctx, kid, floor, tall, {
      left: [-0.26, 0.1],
      right: done ? [0.3, -0.26 + wave] : [0.26, 0.12],
    });
    if (done) {
      const rise = clamp01(rest / PROUD);
      derivative(
        ctx,
        kid + tall * 0.1,
        floor - tall * 1.06 - rise * tall * 0.5,
        tall * 0.3,
        Math.min(1, rest / 0.5) * (1 - ease((rest - PROUD * 0.62) / (PROUD * 0.38))),
      );
    }
  };
}

/* ---- 4. many paths, many styles: the same afternoon painted twice ---- */

/**
 * Two pictures being painted side by side: a landscape on the left, and on the right the same
 * afternoon as blocks of colour and a few marks.
 *
 * Neither is the picture the other was trying to make, and neither is late: the realist lays a
 * horizon and then keeps adding, the abstract lays one big shape and then decides. A kit that
 * suits only one of those two ways of working has already chosen who it is for.
 */
function paths(): Frame {
  type Stroke = { at: number; draw: (ctx: CanvasRenderingContext2D, s: number, u: number) => void };
  const SHOW = 7.5, LINGER = 1.8;

  /** The realist's picture: a horizon, hills, a tree, a sun, and then the small things. */
  const REAL: Stroke[] = [
    { at: 0.0, draw: (c, s, u) => { c.strokeStyle = MUTED; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0.06 * s, 0.6 * s); c.lineTo((0.06 + 0.88 * u) * s, 0.6 * s); c.stroke(); } },
    { at: 0.12, draw: (c, s, u) => { c.strokeStyle = INK; c.lineWidth = 1.8; c.beginPath(); c.moveTo(0.06 * s, 0.6 * s); for (let k = 0; k <= 40 * u; k++) { const t = k / 40; c.lineTo((0.06 + 0.5 * t) * s, (0.6 - 0.16 * Math.sin(t * 3.1)) * s); } c.stroke(); } },
    { at: 0.24, draw: (c, s, u) => { c.strokeStyle = INK; c.lineWidth = 1.8; c.beginPath(); c.moveTo(0.42 * s, 0.53 * s); for (let k = 0; k <= 40 * u; k++) { const t = k / 40; c.lineTo((0.42 + 0.52 * t) * s, (0.53 + 0.1 * Math.sin(t * 2.4 + 1)) * s); } c.stroke(); } },
    { at: 0.36, draw: (c, s, u) => { c.strokeStyle = ORANGE; c.lineWidth = 2; c.beginPath(); c.arc(0.74 * s, 0.26 * s, 0.09 * s, -Math.PI / 2, -Math.PI / 2 + TAU * u); c.stroke(); } },
    { at: 0.48, draw: (c, s, u) => { c.strokeStyle = INK; c.lineWidth = 2.4; c.beginPath(); c.moveTo(0.28 * s, 0.6 * s); c.lineTo(0.28 * s, (0.6 - 0.2 * u) * s); c.stroke(); } },
    { at: 0.58, draw: (c, s, u) => { c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.arc(0.28 * s, 0.34 * s, 0.11 * s, 0, TAU * u); c.stroke(); } },
    { at: 0.7, draw: (c, s, u) => { c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.rect(0.52 * s, (0.6 - 0.13 * u) * s, 0.14 * s, 0.13 * u * s); c.stroke(); c.beginPath(); c.moveTo(0.5 * s, (0.6 - 0.13) * s); c.lineTo(0.59 * s, (0.6 - 0.22 * u) * s); c.lineTo(0.68 * s, (0.6 - 0.13) * s); c.stroke(); } },
    { at: 0.82, draw: (c, s, u) => { c.strokeStyle = MUTED; c.lineWidth = 1.2; c.beginPath(); for (let k = 0; k < 6 * u; k++) { const t = 0.1 + k * 0.14; c.moveTo(t * s, (0.68 + (k % 2) * 0.05) * s); c.lineTo((t + 0.06) * s, (0.68 + (k % 2) * 0.05) * s); } c.stroke(); } },
  ];

  /** The other one: three shapes laid down big, and then a few marks over them. */
  const ABSTRACT: Stroke[] = [
    { at: 0.04, draw: (c, s, u) => { c.fillStyle = ORANGE_SOFT; c.fillRect(0.1 * s, 0.14 * s, 0.46 * s * u, 0.4 * s); } },
    { at: 0.2, draw: (c, s, u) => { c.fillStyle = "rgba(27, 29, 34, 0.08)"; c.beginPath(); c.arc(0.66 * s, 0.42 * s, 0.2 * s * u, 0, TAU); c.fill(); } },
    { at: 0.34, draw: (c, s, u) => { c.strokeStyle = INK; c.lineWidth = 3.2; c.beginPath(); c.moveTo(0.16 * s, 0.66 * s); c.lineTo((0.16 + 0.68 * u) * s, (0.66 - 0.26 * u) * s); c.stroke(); } },
    { at: 0.48, draw: (c, s, u) => { c.strokeStyle = ORANGE; c.lineWidth = 2.4; c.beginPath(); c.arc(0.34 * s, 0.34 * s, 0.13 * s, 0.6, 0.6 + 4.4 * u); c.stroke(); } },
    { at: 0.6, draw: (c, s, u) => { c.fillStyle = INK; for (let k = 0; k < 7 * u; k++) c.fillRect((0.2 + k * 0.09) * s, (0.72 + (k % 3) * 0.04) * s, 0.035 * s, 0.035 * s); } },
    { at: 0.74, draw: (c, s, u) => { c.strokeStyle = MUTED; c.lineWidth = 1.6; c.beginPath(); for (let k = 0; k < 5; k++) { const t = k / 4; c.moveTo((0.62 + t * 0.26) * s, 0.14 * s); c.lineTo((0.62 + t * 0.26) * s, (0.14 + 0.3 * u) * s); } c.stroke(); } },
    { at: 0.86, draw: (c, s, u) => { c.strokeStyle = ORANGE; c.lineWidth = 2; c.beginPath(); c.moveTo(0.58 * s, 0.6 * s); c.lineTo((0.58 + 0.2 * u) * s, (0.6 + 0.16 * u) * s); c.stroke(); } },
  ];

  let clock = 0;
  return (ctx, w, h, dt) => {
    clock = (clock + dt) % (SHOW + LINGER);
    ctx.fillStyle = PAGE;
    ctx.fillRect(0, 0, w, h);
    const u = clamp01(clock / SHOW);

    const s = Math.min(w * 0.44, h * 0.74);
    const tops = h * 0.12;
    const frames: [number, Stroke[], string][] = [
      [w * 0.5 - s - w * 0.02, REAL, "realista"],
      [w * 0.5 + w * 0.02, ABSTRACT, "abstracto"],
    ];
    for (const [left, strokes, name] of frames) {
      ctx.save();
      ctx.translate(left, tops);
      // the canvas on its easel
      ctx.strokeStyle = FAINT;
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, s, s * 0.8);
      ctx.beginPath();
      ctx.moveTo(s * 0.5, s * 0.8);
      ctx.lineTo(s * 0.5, s * 0.94);
      ctx.moveTo(s * 0.32, s * 0.98);
      ctx.lineTo(s * 0.5, s * 0.8);
      ctx.lineTo(s * 0.68, s * 0.98);
      ctx.stroke();
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, s, s * 0.8);
      ctx.clip();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const stroke of strokes) {
        const along = clamp01((u - stroke.at) / 0.13);
        if (along <= 0) continue;
        stroke.draw(ctx, s, ease(along));
      }
      ctx.restore();
      caption(ctx, name, s / 2, s * 1.1, 15);
      ctx.restore();
    }
    caption(ctx, "el mismo material, dos maneras de trabajar", w / 2, h - 14, 14);
  };
}

/* ---- 5. as simple as possible, and maybe simpler: the robot with everything taken off it ---- */

/**
 * A robot with far too much on it, losing a part at a time until it is one a child can use.
 *
 * Every part taken away is a real feature, and each of them was somebody's good idea. What is left
 * over is the thing that can be picked up: the remote comes out only once the robot is simple
 * enough to be worth pointing it at.
 */
function simple(): Frame {
  type Part = {
    /** how far into the stripping it goes, from 0 (first off) */
    off: number;
    draw: (ctx: CanvasRenderingContext2D, s: number) => void;
  };
  // The body everybody keeps, drawn last so the extras sit behind it.
  const core = (ctx: CanvasRenderingContext2D, s: number, blink: number, tilt: number) => {
    ctx.save();
    ctx.rotate(tilt);
    ctx.strokeStyle = INK;
    ctx.lineWidth = s * 0.018;
    ctx.lineJoin = "round";
    ctx.fillStyle = PAGE;
    // body
    ctx.beginPath();
    ctx.roundRect(-0.3 * s, -0.22 * s, 0.6 * s, 0.52 * s, 0.07 * s);
    ctx.fill();
    ctx.stroke();
    // head
    ctx.beginPath();
    ctx.roundRect(-0.22 * s, -0.56 * s, 0.44 * s, 0.32 * s, 0.06 * s);
    ctx.fill();
    ctx.stroke();
    // eyes, and a mouth that is only a line
    ctx.fillStyle = INK;
    for (const dx of [-0.09, 0.09]) {
      ctx.beginPath();
      ctx.ellipse(dx * s, -0.44 * s, 0.035 * s, 0.035 * s * blink, 0, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(-0.07 * s, -0.33 * s);
    ctx.quadraticCurveTo(0, -0.28 * s, 0.07 * s, -0.33 * s);
    ctx.stroke();
    // arms and wheels
    ctx.beginPath();
    ctx.moveTo(-0.3 * s, -0.08 * s);
    ctx.lineTo(-0.44 * s, 0.06 * s);
    ctx.moveTo(0.3 * s, -0.08 * s);
    ctx.lineTo(0.44 * s, 0.06 * s);
    ctx.stroke();
    ctx.fillStyle = PAGE;
    for (const dx of [-0.17, 0.17]) {
      ctx.beginPath();
      ctx.arc(dx * s, 0.34 * s, 0.075 * s, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  };
  // Everything else: each of them useful, each of them one more thing to understand.
  const EXTRAS: Part[] = [
    { off: 0, draw: (c, s) => { c.beginPath(); c.arc(0.02 * s, -0.92 * s, 0.13 * s, Math.PI * 0.15, Math.PI * 0.85, true); c.moveTo(0.02 * s, -0.79 * s); c.lineTo(0.02 * s, -0.6 * s); c.stroke(); } },
    { off: 1, draw: (c, s) => { for (const dx of [-0.16, 0.16]) { c.beginPath(); c.moveTo(dx * s, -0.56 * s); c.lineTo(dx * 1.7 * s, -0.86 * s); c.arc(dx * 1.7 * s, -0.88 * s, 0.022 * s, 0, TAU); c.stroke(); } } },
    { off: 2, draw: (c, s) => { c.beginPath(); c.rect(-0.62 * s, -0.16 * s, 0.24 * s, 0.34 * s); c.moveTo(-0.5 * s, -0.16 * s); c.lineTo(-0.5 * s, 0.18 * s); c.moveTo(-0.62 * s, 0.01 * s); c.lineTo(-0.38 * s, 0.01 * s); c.stroke(); } },
    { off: 3, draw: (c, s) => { c.beginPath(); c.moveTo(0.3 * s, 0.1 * s); c.lineTo(0.62 * s, 0.24 * s); c.lineTo(0.72 * s, 0.14 * s); c.moveTo(0.62 * s, 0.24 * s); c.lineTo(0.7 * s, 0.34 * s); c.stroke(); } },
    { off: 4, draw: (c, s) => { for (let k = 0; k < 6; k++) { c.beginPath(); c.arc((-0.2 + k * 0.08) * s, 0.2 * s, 0.022 * s, 0, TAU); c.stroke(); } } },
    { off: 5, draw: (c, s) => { c.beginPath(); c.arc(-0.13 * s, -0.02 * s, 0.075 * s, 0, TAU); c.moveTo(-0.13 * s, -0.02 * s); c.lineTo(-0.09 * s, -0.07 * s); c.stroke(); } },
    { off: 6, draw: (c, s) => { c.beginPath(); c.rect(0.02 * s, -0.12 * s, 0.2 * s, 0.14 * s); for (let k = 1; k < 4; k++) { c.moveTo((0.02 + k * 0.05) * s, -0.12 * s); c.lineTo((0.02 + k * 0.05) * s, 0.02 * s); } c.stroke(); } },
    { off: 7, draw: (c, s) => { c.beginPath(); c.moveTo(-0.44 * s, 0.06 * s); c.lineTo(-0.56 * s, 0.4 * s); c.moveTo(0.44 * s, 0.06 * s); c.lineTo(0.58 * s, 0.4 * s); c.stroke(); } },
    { off: 8, draw: (c, s) => { c.beginPath(); c.rect(-0.34 * s, 0.3 * s, 0.68 * s, 0.1 * s); for (let k = 0; k < 5; k++) { c.moveTo((-0.3 + k * 0.15) * s, 0.3 * s); c.lineTo((-0.3 + k * 0.15) * s, 0.4 * s); } c.stroke(); } },
  ];
  const STRIP = 0.62; // how long one part takes to go
  const WAIT = 1.4;
  const PLAY = 5.4;
  const period = WAIT + EXTRAS.length * STRIP + PLAY;
  let clock = 0;

  return (ctx, w, h, dt) => {
    clock = (clock + dt) % period;
    ctx.fillStyle = PAGE;
    ctx.fillRect(0, 0, w, h);

    const floor = h - 46;
    const tall = Math.min(h * 0.4, 145);
    const s = Math.min(w * 0.34, h * 0.52);
    const robot: [number, number] = [w * 0.64, floor - s * 0.5];
    const stripped = clamp01((clock - WAIT) / (EXTRAS.length * STRIP));
    const gone = ((clock - WAIT) / STRIP);
    const playing = clock > WAIT + EXTRAS.length * STRIP;
    const rest = playing ? clock - (WAIT + EXTRAS.length * STRIP) : 0;

    // ---- the robot, with whatever is still bolted to it
    ctx.save();
    ctx.translate(robot[0], robot[1]);
    ctx.lineCap = "round";
    for (const part of EXTRAS) {
      const leaving = clamp01(gone - part.off);
      if (leaving >= 1) continue;
      ctx.save();
      ctx.globalAlpha = 1 - ease(leaving);
      // Coming off, a part drifts away rather than blinking out, so it reads as a decision.
      ctx.translate(ease(leaving) * s * 0.5, -ease(leaving) * s * 0.35);
      ctx.strokeStyle = MUTED;
      ctx.lineWidth = s * 0.014;
      part.draw(ctx, s);
      ctx.restore();
    }
    const roll = playing ? Math.sin(rest * 2.1) * s * 0.28 : 0;
    ctx.translate(roll, 0);
    const blink = playing && Math.sin(rest * 3.4) > 0.93 ? 0.15 : 1;
    core(ctx, s, blink, playing ? Math.sin(rest * 2.1 + Math.PI / 2) * 0.05 : 0);
    ctx.restore();

    // ---- the child, who picks up the remote once there is something to point it at
    const tookIt = clamp01((clock - (WAIT + EXTRAS.length * STRIP)) / 0.6);
    child(ctx, w * 0.2, floor, tall, {
      left: [-0.22, 0.14],
      right: [0.2 + tookIt * 0.12, 0.12 - tookIt * 0.3],
    });
    if (tookIt > 0) {
      ctx.save();
      ctx.globalAlpha = tookIt;
      const [rx, ry] = [w * 0.2 + tall * 0.32, floor - tall * 0.82];
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8;
      ctx.fillStyle = PAGE;
      ctx.beginPath();
      ctx.roundRect(rx - tall * 0.06, ry - tall * 0.1, tall * 0.12, tall * 0.2, tall * 0.02);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rx, ry - tall * 0.1);
      ctx.lineTo(rx + tall * 0.04, ry - tall * 0.22);
      ctx.stroke();
      // the button being held down, and what it says to the robot
      const pressed = Math.sin(rest * 2.1) > 0 ? 0 : 1;
      ctx.fillStyle = ORANGE;
      ctx.beginPath();
      ctx.arc(rx - tall * 0.025 + pressed * tall * 0.05, ry - tall * 0.03, tall * 0.018, 0, TAU);
      ctx.fill();
      if (playing) {
        ctx.strokeStyle = ORANGE;
        ctx.lineWidth = 1.6;
        for (let k = 1; k <= 3; k++) {
          const wide = (rest * 2.2 + k * 0.5) % 1.5;
          ctx.globalAlpha = tookIt * Math.max(0, 1 - wide / 1.5) * 0.9;
          ctx.beginPath();
          ctx.arc(rx + tall * 0.04, ry - tall * 0.22, tall * (0.05 + wide * 0.14), -1.2, -0.1);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    caption(
      ctx,
      stripped < 1 ? "cada cosa que se quita es una función útil" : "ahora es de quien juega",
      w / 2,
      h - 14,
      14,
      stripped < 1 ? MUTED : ORANGE,
    );
  };
}

/* ---- 6. choose black boxes carefully: the same curve, from two different floors ---- */

/**
 * A dragon curve written twice, side by side, while both are being typed.
 *
 * On the left it is written in Logo, where the turtle, `repeat` and recursion are already there:
 * nine lines, and the curve draws itself. On the right the same curve in C++, where the floor is
 * a framebuffer — so before any geometry there is a canvas, a line routine, a state stack and a
 * matrix, and the interesting part has not been reached by the time the left-hand one is done.
 *
 * Neither is the better language. What differs is where the black boxes were put, and everything
 * below that line is a thing the person drawing a dragon curve never has to think about.
 */
function blackboxes(): Frame {
  const LOGO = [
    "to dragon :size :level :sign",
    "  if :level = 0 [fd :size stop]",
    "  rt 45 * :sign",
    "  dragon :size / 1.414 :level - 1 1",
    "  lt 90 * :sign",
    "  dragon :size / 1.414 :level - 1 -1",
    "  rt 45 * :sign",
    "end",
    "",
    "cs pu bk 60 pd",
    "dragon 300 12 1",
  ];
  const CPP = [
    "#include <cmath>",
    "#include <cstdint>",
    "#include <vector>",
    "#include <algorithm>",
    "",
    "namespace turtle {",
    "",
    "struct Vec2 { double x, y; };",
    "",
    "class Canvas {",
    " public:",
    "  Canvas(int w, int h)",
    "      : w_(w), h_(h), px_(size_t(w) * h, 0xffffffffu) {}",
    "",
    "  void line(Vec2 a, Vec2 b, uint32_t rgba) {",
    "    double dx = std::abs(b.x - a.x);",
    "    double dy = -std::abs(b.y - a.y);",
    "    double sx = a.x < b.x ? 1.0 : -1.0;",
    "    double sy = a.y < b.y ? 1.0 : -1.0;",
    "    double err = dx + dy;",
    "    for (;;) {",
    "      plot(int(a.x), int(a.y), rgba);",
    "      if (std::abs(a.x - b.x) < 0.5 &&",
    "          std::abs(a.y - b.y) < 0.5) break;",
    "      double e2 = 2 * err;",
    "      if (e2 >= dy) { err += dy; a.x += sx; }",
    "      if (e2 <= dx) { err += dx; a.y += sy; }",
    "    }",
    "  }",
    "",
    " private:",
    "  void plot(int x, int y, uint32_t rgba) {",
    "    if (x < 0 || y < 0 || x >= w_ || y >= h_) return;",
    "    px_[size_t(y) * w_ + x] = rgba;",
    "  }",
    "  int w_, h_;",
    "  std::vector<uint32_t> px_;",
    "};",
    "",
    "struct State {",
    "  Vec2 pos{0.0, 0.0};",
    "  double heading = -M_PI / 2;",
    "  bool pen = true;",
    "  uint32_t colour = 0xff1b1d22u;",
    "};",
    "",
    "class Turtle {",
    " public:",
    "  explicit Turtle(Canvas& c) : canvas_(c) {}",
    "",
    "  void forward(double d) {",
    "    Vec2 to{s_.pos.x + std::cos(s_.heading) * d,",
    "            s_.pos.y + std::sin(s_.heading) * d};",
    "    if (s_.pen) canvas_.line(s_.pos, to, s_.colour);",
    "    s_.pos = to;",
    "  }",
    "  void right(double deg) { s_.heading += deg * M_PI / 180.0; }",
    "  void left(double deg)  { s_.heading -= deg * M_PI / 180.0; }",
    "  void push() { stack_.push_back(s_); }",
    "  void pop()  { s_ = stack_.back(); stack_.pop_back(); }",
    "",
    " private:",
    "  Canvas& canvas_;",
    "  State s_;",
    "  std::vector<State> stack_;",
    "};",
    "",
    "void dragon(Turtle& t, double size, int level, int sign) {",
    "  if (level == 0) { t.forward(size); return; }",
    "  t.right(45.0 * sign);",
    "  dragon(t, size / std::sqrt(2.0), level - 1, +1);",
    "  t.left(90.0 * sign);",
    "  dragon(t, size / std::sqrt(2.0), level - 1, -1);",
    "  t.right(45.0 * sign);",
    "}",
    "",
    "}  // namespace turtle",
    "",
    "int main() {",
    "  turtle::Canvas canvas(1600, 1200);",
    "  turtle::Turtle t(canvas);",
    "  turtle::dragon(t, 300.0, 12, 1);",
    "  return write_png(\"dragon.png\", canvas);",
    "}",
  ];

  // The curve itself: at each step the turtle turns one way or the other, and which way is
  // decided by the folding — the same rule the recursion above works out for itself.
  const TURNS = 1 << 11;
  const PATH: [number, number][] = [[0, 0]];
  {
    let [x, y, heading] = [0, 0, 0];
    for (let n = 1; n <= TURNS; n++) {
      x += Math.cos(heading);
      y += Math.sin(heading);
      PATH.push([x, y]);
      heading += (((n & -n) << 1) & n) !== 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  }
  const xs = PATH.map((p) => p[0]);
  const ys = PATH.map((p) => p[1]);
  const BOX = { left: Math.min(...xs), right: Math.max(...xs), low: Math.min(...ys), high: Math.max(...ys) };

  const TYPE = 5.5, DRAW = 7, HOLD = 2.5;
  const period = TYPE + DRAW + HOLD;
  let clock = 0;

  return (ctx, w, h, dt) => {
    clock = (clock + dt) % period;
    ctx.fillStyle = PAGE;
    ctx.fillRect(0, 0, w, h);
    const half = w / 2 - 10;

    // ---- the Logo on the left, and the curve it draws
    const typed = clamp01(clock / TYPE);
    const size = Math.max(11, Math.min(15, h * 0.026));
    ctx.font = `${size}px ${MONO}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = INK;
    const letters = Math.round(typed * LOGO.join("\n").length);
    let spent = 0;
    LOGO.forEach((line, i) => {
      const show = Math.max(0, Math.min(line.length, letters - spent));
      spent += line.length + 1;
      if (show > 0) ctx.fillText(line.slice(0, show), 4, 20 + i * size * 1.45);
    });
    caption(ctx, "Logo", 4 + half * 0.5, h - 16, 14, ORANGE);

    const top = 24 + LOGO.length * size * 1.45;
    const room = Math.min(half, h - top - 34);
    if (clock > TYPE) {
      const along = clamp01((clock - TYPE) / DRAW);
      const reach = Math.max(BOX.right - BOX.left, BOX.high - BOX.low);
      const scale = (room * 0.94) / reach;
      const ox = 4 + (half - (BOX.right - BOX.left) * scale) / 2 - BOX.left * scale;
      const oy = top + (room - (BOX.high - BOX.low) * scale) / 2 - BOX.low * scale;
      const upto = Math.floor(along * (PATH.length - 1));
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.1;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(ox + PATH[0]![0] * scale, oy + PATH[0]![1] * scale);
      for (let k = 1; k <= upto; k++) ctx.lineTo(ox + PATH[k]![0] * scale, oy + PATH[k]![1] * scale);
      ctx.stroke();
      if (upto < PATH.length - 1) {
        ctx.fillStyle = ORANGE;
        ctx.beginPath();
        ctx.arc(ox + PATH[upto]![0] * scale, oy + PATH[upto]![1] * scale, 3.4, 0, TAU);
        ctx.fill();
      }
    }

    // ---- the C++ on the right, still being typed, and scrolling by
    const small = Math.max(8.5, size * 0.72);
    const step = small * 1.35;
    const fits = Math.floor((h - 40) / step);
    const wanted = Math.round(clamp01(clock / (period * 0.94)) * CPP.length);
    const from = Math.max(0, wanted - fits);
    ctx.font = `${small}px ${MONO}`;
    ctx.textAlign = "left";
    ctx.fillStyle = MUTED;
    for (let i = from; i < wanted; i++) {
      const line = CPP[i]!;
      const y = 20 + (i - from) * step;
      // The line being typed comes in letter by letter, like the Logo does.
      ctx.fillText(line, w / 2 + 14, y);
    }
    ctx.fillStyle = FAINT;
    ctx.fillRect(w / 2 + 6, 6, 1, h - 40);
    caption(ctx, "C++, desde el framebuffer", w / 2 + 14 + half * 0.5, h - 16, 14);
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

/* ---- 10. iterate: the numbers sandbox, four times over ---- */

/**
 * Four goes at the same sandbox, the last of which is the one in this talk.
 *
 * Nothing here was designed and then built: a box you typed numbers into became a grid, the grid
 * grew sets with colours of their own, and only then did the sliders and the other ways of laying
 * the numbers out appear. Each screen is the previous one with the thing that was missing.
 */
function iterate(): Frame {
  const SHOW = 2.9, FADE = 0.5;
  const SAYS = [
    "intento 1 · una lista de números",
    "intento 2 · una cuadrícula",
    "intento 3 · conjuntos con su color",
    "intento 4 · la que está en esta charla",
  ];
  let clock = 0;

  /** The window every version is drawn inside. */
  const frame = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = PAGE;
    ctx.strokeStyle = FAINT;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();
  };
  /** A row of number cells, some of them picked out. */
  const grid = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number, wide: number, cols: number, rows: number,
    lit: (n: number) => string | null,
  ) => {
    const cell = wide / cols;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const n = j * cols + i;
        const paint = lit(n);
        if (paint) {
          ctx.fillStyle = paint;
          ctx.fillRect(x + i * cell + 1, y + j * cell + 1, cell - 2, cell - 2);
        } else {
          ctx.strokeStyle = FAINT;
          ctx.lineWidth = 1;
          ctx.strokeRect(x + i * cell + 1, y + j * cell + 1, cell - 2, cell - 2);
        }
      }
    }
  };
  const prime = (n: number) => {
    if (n < 2) return false;
    for (let k = 2; k * k <= n; k++) if (n % k === 0) return false;
    return true;
  };

  return (ctx, w, h, dt) => {
    clock = (clock + dt) % (SAYS.length * SHOW);
    ctx.fillStyle = PAGE;
    ctx.fillRect(0, 0, w, h);
    const round = Math.floor(clock / SHOW);
    const into = clock - round * SHOW;
    const show = Math.min(1, into / FADE) * (1 - clamp01((into - (SHOW - FADE)) / FADE));

    const boxW = Math.min(w * 0.86, h * 1.15);
    const boxH = boxW * 0.66;
    const x = (w - boxW) / 2;
    const y = h * 0.16;
    ctx.save();
    ctx.globalAlpha = show;
    frame(ctx, x, y, boxW, boxH);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, boxW, boxH, 8);
    ctx.clip();

    if (round === 0) {
      // A box to type in, and everything it knows printed underneath it.
      ctx.strokeStyle = FAINT;
      ctx.lineWidth = 1.4;
      ctx.strokeRect(x + 16, y + 16, boxW - 32, 26);
      ctx.fillStyle = MUTED;
      ctx.font = `13px ${MONO}`;
      ctx.fillText("primes(1000)", x + 24, y + 34);
      ctx.fillStyle = "rgba(27,29,34,0.5)";
      ctx.font = `11px ${MONO}`;
      for (let row = 0; row < 12; row++) {
        const nums: number[] = [];
        for (let k = row * 13 + 2; nums.length < 13; k++) if (prime(k)) nums.push(k);
        ctx.fillText(nums.join("  "), x + 18, y + 64 + row * 15);
      }
    } else if (round === 1) {
      // The same numbers, put where they belong.
      grid(ctx, x + 18, y + 18, boxW - 36, 20, 11, (n) => (prime(n) ? ORANGE : null));
    } else if (round === 2) {
      // Sets of their own, each with a colour, and one number left loose on a slider.
      const side = boxW * 0.3;
      ctx.fillStyle = "rgba(27,29,34,0.03)";
      ctx.fillRect(x, y, side, boxH);
      ctx.strokeStyle = FAINT;
      ctx.beginPath();
      ctx.moveTo(x + side, y);
      ctx.lineTo(x + side, y + boxH);
      ctx.stroke();
      ctx.font = `12px ${MONO}`;
      [["P", ORANGE], ["k = 2", MUTED]].forEach(([text, paint], i) => {
        ctx.fillStyle = paint as string;
        ctx.beginPath();
        ctx.arc(x + 20, y + 26 + i * 34, 5, 0, TAU);
        ctx.fill();
        ctx.fillStyle = INK;
        ctx.fillText(text as string, x + 34, y + 30 + i * 34);
      });
      ctx.strokeStyle = FAINT;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 20, y + 100);
      ctx.lineTo(x + side - 20, y + 100);
      ctx.stroke();
      ctx.fillStyle = ORANGE;
      ctx.beginPath();
      ctx.arc(x + 20 + (side - 40) * 0.35, y + 100, 6, 0, TAU);
      ctx.fill();
      grid(ctx, x + side + 14, y + 18, boxW - side - 32, 14, 10, (n) => (prime(n) ? ORANGE : null));
    } else {
      // What it is now: sets with their colours, the ways of laying the numbers out, the sliders.
      const side = boxW * 0.3;
      ctx.fillStyle = "rgba(27,29,34,0.03)";
      ctx.fillRect(x, y, side, boxH);
      ctx.strokeStyle = FAINT;
      ctx.beginPath();
      ctx.moveTo(x + side, y);
      ctx.lineTo(x + side, y + boxH);
      ctx.stroke();
      ctx.font = `12px ${MONO}`;
      const lines: [string, string][] = [["P", ORANGE], ["k = 2", MUTED], ["P ∩ (P − k)", "#2f4fd8"]];
      lines.forEach(([text, paint], i) => {
        ctx.fillStyle = paint;
        ctx.beginPath();
        ctx.arc(x + 20, y + 26 + i * 30, 5, 0, TAU);
        ctx.fill();
        ctx.fillStyle = INK;
        ctx.fillText(text, x + 34, y + 30 + i * 30);
      });
      ctx.strokeStyle = FAINT;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 20, y + 132);
      ctx.lineTo(x + side - 20, y + 132);
      ctx.stroke();
      ctx.fillStyle = ORANGE;
      ctx.beginPath();
      ctx.arc(x + 20 + (side - 40) * 0.45, y + 132, 6, 0, TAU);
      ctx.fill();
      ctx.font = `12px ${SERIF}`;
      ["Grid", "Spiral", "Polar", "Count"].forEach((tab, i) => {
        ctx.fillStyle = i === 0 ? INK : MUTED;
        ctx.fillText(tab, x + side + 16 + i * 52, y + 24);
        if (i === 0) {
          ctx.fillStyle = ORANGE;
          ctx.fillRect(x + side + 14, y + 30, 30, 2);
        }
      });
      const twin = (n: number) => prime(n) && (prime(n + 2) || prime(n - 2));
      grid(ctx, x + side + 14, y + 40, boxW - side - 32, 14, 8, (n) =>
        twin(n) ? "#2f4fd8" : prime(n) ? ORANGE : null,
      );
    }
    ctx.restore();
    caption(ctx, SAYS[round]!, w / 2, y + boxH + 34, 15, round === SAYS.length - 1 ? ORANGE : MUTED);
    ctx.restore();

    // How far along the four we are.
    for (let k = 0; k < SAYS.length; k++) {
      ctx.fillStyle = k === round ? ORANGE : FAINT;
      ctx.beginPath();
      ctx.arc(w / 2 + (k - (SAYS.length - 1) / 2) * 18, h - 26, 4, 0, TAU);
      ctx.fill();
    }
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
