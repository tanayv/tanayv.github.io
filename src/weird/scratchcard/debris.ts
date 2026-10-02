import { mulberry32 } from "../lib/rng";

/**
 * Shavings. Scraped latex doesn't vanish — it balls up in front of the coin,
 * rolls into little worms parallel to the edge, and gets dumped wherever the
 * stroke turns round. It sits on top of whatever you uncovered until you
 * sweep it off the card.
 *
 * Coordinates are css px relative to the surface's top-left corner.
 */

export enum Kind {
  Speck = 0,
  Crumb = 1,
  Curl = 2,
  Flake = 3,
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number;
  vz: number;
  /** cross-section radius, css px */
  s: number;
  /** half-length for curls (in units of s) */
  len: number;
  kind: Kind;
  variant: number;
  angle: number;
  moving: boolean;
  carried: number;
  /** 1 = on the card, falls to 0 once it's gone over the edge */
  life: number;
}

const ROT = 16;
const VARIANTS = 6;
const U = 8; // atlas px per sprite unit
const CELL = 72; // atlas cell, px (±4.5 units)
const MAX = 1600;

// world light for the baked sprites: up and to the left, 50° up
const LIGHT = (() => {
  const a = Math.atan2(-0.82, -0.57);
  return { a, elev: (50 * Math.PI) / 180 };
})();

type Palette = [string, string, string];

function hexRGB(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixRGB(a: number[], b: number[], t: number) {
  return a.map((v, i) => v + (b[i] - v) * t);
}
function rgbStr(c: number[], k = 1, add = 0) {
  return `rgb(${c.map((v) => Math.max(0, Math.min(255, Math.round(v * k + add)))).join(",")})`;
}

/**
 * Pre-lit sprites. Each shape is drawn at 16 rotations with the light held
 * fixed in the world — rotating one baked sprite would drag its highlight
 * around with it.
 */
function buildAtlas(palette: Palette, seed: number) {
  const rows = 4 * VARIANTS;
  const canvas = document.createElement("canvas");
  canvas.width = CELL * ROT;
  canvas.height = CELL * rows;
  const ctx = canvas.getContext("2d")!;
  const under = hexRGB(palette[0]);
  const top = hexRGB(palette[1]);
  const deep = hexRGB(palette[2]);
  const rand = mulberry32(seed);

  for (let kind = 0; kind < 4; kind++) {
    for (let v = 0; v < VARIANTS; v++) {
      const shape = makeShape(kind as Kind, rand);
      for (let r = 0; r < ROT; r++) {
        const theta = (r / ROT) * Math.PI * 2;
        const cx = r * CELL + CELL / 2;
        const cy = (kind * VARIANTS + v) * CELL + CELL / 2;
        ctx.save();
        ctx.translate(cx, cy);
        // light direction expressed in the sprite's own frame
        const la = LIGHT.a - theta;
        const lx = Math.cos(la);
        const ly = Math.sin(la);
        drawShape(ctx, kind as Kind, shape, theta, lx, ly, under, top, deep, rand);
        ctx.restore();
      }
    }
  }
  return canvas;
}

type Shape = { pts: [number, number][]; len: number; bend: number; tone: number };

function makeShape(kind: Kind, rand: () => number): Shape {
  const pts: [number, number][] = [];
  const tone = rand();
  if (kind === Kind.Curl) {
    return { pts, len: 1.3 + rand() * 1.3, bend: (rand() - 0.5) * 0.22, tone };
  }
  const n = kind === Kind.Flake ? 5 + Math.floor(rand() * 3) : 8 + Math.floor(rand() * 4);
  const off = rand() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = off + (i / n) * Math.PI * 2 + (rand() - 0.5) * (kind === Kind.Flake ? 0.9 : 0.4);
    const r = kind === Kind.Flake ? 0.55 + rand() * 0.6 : 0.78 + rand() * 0.3;
    pts.push([Math.cos(a) * r, Math.sin(a) * r * (kind === Kind.Crumb ? 0.85 : 1)]);
  }
  return { pts, len: 0, bend: 0, tone };
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  kind: Kind,
  shape: Shape,
  theta: number,
  lx: number,
  ly: number,
  under: number[],
  top: number[],
  deep: number[],
  rand: () => number,
) {
  const cosE = Math.cos(LIGHT.elev);
  const sinE = Math.sin(LIGHT.elev);
  // shadow offset is set in device space, so it stays world-fixed
  ctx.shadowColor = "rgba(0,0,0,0.42)";
  ctx.shadowBlur = U * 0.55;
  ctx.shadowOffsetX = U * 0.42;
  ctx.shadowOffsetY = U * 0.62;
  ctx.rotate(theta);
  ctx.scale(U, U);

  if (kind === Kind.Curl) {
    // a rolled-up worm of latex: overlapping beads along a slightly bent axis
    const L = shape.len;
    const body = mixRGB(under, top, 0.1 + shape.tone * 0.25);
    // cylinder shading across the axis: normal sweeps from -y through +z to +y
    const g = ctx.createLinearGradient(0, -1, 0, 1);
    for (let k = 0; k <= 6; k++) {
      const v = -1 + (k / 6) * 2;
      const nz = Math.sqrt(Math.max(0, 1 - v * v));
      const diff = Math.max(0, v * ly * cosE + nz * sinE);
      const hz = Math.max(0, (v * ly * cosE + nz * (sinE + 1)) / Math.hypot(ly * cosE, sinE + 1));
      const spec = Math.pow(hz, 10) * 0.35;
      const shade = 0.5 + diff * 0.6;
      g.addColorStop(k / 6, rgbStr(body, shade, spec * 120));
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let t = -L; t <= L + 0.001; t += 0.45) {
      const taper = 0.72 + 0.28 * Math.cos((t / L) * Math.PI * 0.5);
      const r = taper * (0.78 + rand() * 0.4);
      const y = shape.bend * t * t;
      ctx.moveTo(t + r, y);
      ctx.arc(t, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.shadowColor = "transparent";
    const worm = new Path2D();
    for (let t = -L; t <= L + 0.001; t += 0.45) worm.arc(t, shape.bend * t * t, 0.85, 0, Math.PI * 2);
    mottle(ctx, worm, under, top, deep, rand);
    // spiral creases where the film folded over itself
    ctx.strokeStyle = rgbStr(deep, 1, 0);
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 0.14;
    for (let t = -L + 0.6; t < L - 0.3; t += 0.7 + rand() * 0.5) {
      ctx.beginPath();
      ctx.moveTo(t - 0.25, -0.85 + shape.bend * t * t);
      ctx.quadraticCurveTo(t + 0.15, shape.bend * t * t, t - 0.1, 0.85 + shape.bend * t * t);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return;
  }

  const path = new Path2D();
  shape.pts.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
  path.closePath();

  if (kind === Kind.Flake) {
    // a flat chip of the film, metallic side up
    const lit = 0.62 + shape.tone * 0.25;
    ctx.fillStyle = rgbStr(mixRGB(under, top, 0.6), lit);
    ctx.fill(path);
    ctx.shadowColor = "transparent";
    // edges facing the lamp catch it, the rest go dark
    ctx.lineWidth = 0.13;
    const pts = shape.pts;
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      const nx = by - ay;
      const ny = -(bx - ax);
      const f = (nx * lx + ny * ly) / (Math.hypot(nx, ny) || 1);
      ctx.strokeStyle = f > 0 ? `rgba(255,255,255,${0.35 * f})` : rgbStr(deep, 1, 0);
      ctx.globalAlpha = f > 0 ? 1 : Math.min(1, -f * 0.9);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return;
  }

  // crumbs and specks: a lumpy ball lit from the lamp side
  const body = mixRGB(under, top, kind === Kind.Speck ? 0.05 : 0.1 + shape.tone * 0.3);
  const g = ctx.createRadialGradient(lx * 0.45, ly * 0.45, 0.05, lx * 0.15, ly * 0.15, 1.2);
  g.addColorStop(0, rgbStr(body, 1.3, 12));
  g.addColorStop(0.4, rgbStr(body, 1.0));
  g.addColorStop(0.85, rgbStr(body, 0.66));
  g.addColorStop(1, rgbStr(deep, 1));
  ctx.fillStyle = g;
  ctx.fill(path);
  mottle(ctx, path, under, top, deep, rand);
}

/** Latex crumbs are a mix of grey underside and bits of metallic skin. */
function mottle(ctx: CanvasRenderingContext2D, path: Path2D, under: number[], top: number[], deep: number[], rand: () => number) {
  ctx.save();
  ctx.shadowColor = "transparent";
  ctx.clip(path);
  for (let i = 0; i < 7; i++) {
    const x = (rand() - 0.5) * 1.8;
    const y = (rand() - 0.5) * 1.8;
    const r = 0.12 + rand() * 0.3;
    const t = rand();
    ctx.fillStyle = t < 0.4 ? rgbStr(deep, 1) : t < 0.75 ? rgbStr(top, 0.95) : rgbStr(under, 0.85);
    ctx.globalAlpha = 0.35 + rand() * 0.3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export class Debris {
  private particles: Particle[] = [];
  private atlas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rand = mulberry32(99);
  private frame = 0;
  private wind: { x: number; y: number; t: number } | null = null;
  dirty = true;
  /** css px of canvas beyond the surface on every side */
  bleed = 0;
  /** surface size, css px — leaving it means falling off the card */
  w = 0;
  h = 0;
  dpr = 1;

  constructor(
    private canvas: HTMLCanvasElement,
    palette: Palette,
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.atlas = buildAtlas(palette, 7);
  }

  setPalette(palette: Palette) {
    this.atlas = buildAtlas(palette, 7);
    this.dirty = true;
  }

  resize(w: number, h: number, bleed: number, dpr: number) {
    this.w = w;
    this.h = h;
    this.bleed = bleed;
    this.dpr = dpr;
    this.canvas.width = Math.round((w + bleed * 2) * dpr);
    this.canvas.height = Math.round((h + bleed * 2) * dpr);
    this.dirty = true;
  }

  get count() {
    return this.particles.length;
  }

  clear() {
    this.particles.length = 0;
    this.dirty = true;
  }

  /** New shaving. `size` 0..1 picks from specks up to fat crumbs. */
  spawn(x: number, y: number, vx: number, vy: number, angle: number, size: number, kind?: Kind) {
    const r = this.rand;
    let k: Kind;
    if (kind !== undefined) k = kind;
    else if (size < 0.58) k = Kind.Speck;
    else if (size < 0.86) k = Kind.Crumb;
    else k = Kind.Curl;
    const s =
      k === Kind.Speck ? 0.42 + r() * 0.45 : k === Kind.Crumb ? 0.85 + r() * 0.75 : k === Kind.Curl ? 0.8 + r() * 0.5 : 1.2 + size * 2.2;
    if (this.particles.length >= MAX) this.compact();
    this.particles.push({
      x,
      y,
      vx,
      vy,
      z: 0,
      vz: 0,
      s,
      len: k === Kind.Curl ? 1 : 0,
      kind: k,
      variant: Math.floor(r() * VARIANTS),
      angle: k === Kind.Curl ? angle + (r() - 0.5) * 0.5 : r() * Math.PI * 2,
      moving: true,
      carried: -1,
      life: 1,
    });
    this.dirty = true;
  }

  /** Too many bits: quietly drop the smallest specks first. */
  private compact() {
    let removed = 0;
    this.particles = this.particles.filter((p) => {
      if (removed < 200 && p.kind === Kind.Speck && p.s < 0.6) {
        removed++;
        return false;
      }
      return true;
    });
    if (this.particles.length >= MAX) this.particles.splice(0, 200);
  }

  /**
   * Bulldoze shavings with the coin's edge as it moves from a to b.
   * (ux, uy) runs along the edge; hl/ht are its half-length/thickness;
   * (vx, vy) is the hand's velocity in px/s.
   */
  sweep(ax: number, ay: number, bx: number, by: number, ux: number, uy: number, hl: number, ht: number, vx: number, vy: number) {
    const ps = this.particles;
    if (!ps.length) return;
    const dist = Math.hypot(bx - ax, by - ay);
    if (dist < 0.01) return;
    const mx = (bx - ax) / dist;
    const my = (by - ay) / dist;
    const nx = -uy;
    const ny = ux;
    const across = mx * nx + my * ny; // how square-on the edge is moving
    const along = mx * ux + my * uy;
    const fwd = across >= 0 ? 1 : -1;
    const pad = hl + ht + 6;
    const minX = Math.min(ax, bx) - pad;
    const maxX = Math.max(ax, bx) + pad;
    const minY = Math.min(ay, by) - pad;
    const maxY = Math.max(ay, by) + pad;
    const cand: Particle[] = [];
    for (const p of ps) {
      if (p.life < 1 || p.z > 2.5) continue;
      if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) continue;
      cand.push(p);
    }
    if (!cand.length) return;

    const speed = Math.hypot(vx, vy);
    const flick = speed > 1500;
    const frame = ++this.frame;
    const r = this.rand;
    const steps = Math.max(1, Math.ceil(dist / 1.2));
    const carried: Particle[] = [];

    for (let k = 1; k <= steps; k++) {
      const cx = ax + (bx - ax) * (k / steps);
      const cy = ay + (by - ay) * (k / steps);
      for (const p of cand) {
        const dx = p.x - cx;
        const dy = p.y - cy;
        let su = dx * ux + dy * uy;
        let sv = dx * nx + dy * ny;
        const reach = p.kind === Kind.Curl ? p.s * 0.8 : p.s * 0.7;
        if (Math.abs(su) > hl + reach || Math.abs(sv) > ht + reach) continue;

        if (Math.abs(across) < 0.3) {
          // edge sliding along itself: shove ahead off the leading corner
          su = (along >= 0 ? 1 : -1) * (hl + reach + 0.3);
        } else {
          sv = fwd * (ht + reach + 0.25 + r() * 0.4);
          // stuff near the corners spills round the ends
          if (Math.abs(su) > hl * 0.8 && r() < 0.25) su += Math.sign(su) * (1 + r() * 2.5);
        }
        p.x = cx + ux * su + nx * sv;
        p.y = cy + uy * su + ny * sv;
        const keep = 0.55 + r() * 0.4;
        p.vx = vx * keep + (r() - 0.5) * 30;
        p.vy = vy * keep + (r() - 0.5) * 30;
        if (flick) {
          const kick = 1.1 + r() * 0.8;
          p.vx = vx * kick + (r() - 0.5) * speed * 0.5;
          p.vy = vy * kick + (r() - 0.5) * speed * 0.5;
          p.vz = 40 + r() * 90;
        }
        p.moving = true;
        if (p.kind === Kind.Curl) {
          // worms roll with their axis along the edge
          let d = Math.atan2(uy, ux) - p.angle;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          if (d > Math.PI / 2) d -= Math.PI;
          if (d < -Math.PI / 2) d += Math.PI;
          p.angle += d * 0.35 + (r() - 0.5) * 0.3;
        } else {
          p.angle += (r() - 0.5) * 1.2; // tumbling
        }
        if (p.carried !== frame) {
          p.carried = frame;
          carried.push(p);
        }
      }
    }
    if (carried.length > 1) this.rollUp(carried, Math.atan2(uy, ux));
    this.dirty = true;
  }

  /** Bits jammed together in front of the coin roll into bigger worms. */
  private rollUp(group: Particle[], edgeAngle: number) {
    const r = this.rand;
    for (let i = 0; i < group.length; i++) {
      const a = group[i];
      if (a.life <= 0) continue;
      for (let j = i + 1; j < group.length; j++) {
        const b = group[j];
        if (b.life <= 0) continue;
        const reach = (a.s + b.s) * (a.kind === Kind.Curl ? a.len + 0.6 : 0.75);
        if (Math.abs(a.x - b.x) > reach || Math.abs(a.y - b.y) > reach) continue;
        if (r() > 0.22) continue;
        const volA = a.s * a.s * (a.kind === Kind.Curl ? a.len * 2 + 1 : 1);
        const volB = b.s * b.s * (b.kind === Kind.Curl ? b.len * 2 + 1 : 1);
        const vol = volA + volB;
        if (vol < 1.4 && a.kind !== Kind.Curl) {
          a.s = Math.sqrt(vol);
          a.kind = Kind.Crumb;
        } else {
          const s = Math.min(1.25, Math.max(a.s, 0.7 + vol * 0.04));
          const len = Math.min(4.2, vol / (s * s) / 2);
          if (len < 0.6) continue;
          a.s = s;
          a.len = Math.max(1, len);
          if (a.kind !== Kind.Curl) a.angle = edgeAngle;
          a.kind = Kind.Curl;
        }
        a.x = (a.x * volA + b.x * volB) / vol;
        a.y = (a.y * volA + b.y * volB) / vol;
        b.life = 0; // swallowed
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  /** A breath across the card. */
  blow(dirX: number, dirY: number) {
    const l = Math.hypot(dirX, dirY) || 1;
    this.wind = { x: dirX / l, y: dirY / l, t: 0 };
    for (const p of this.particles) {
      p.moving = true;
      p.vz = 20 + this.rand() * 60 / (p.s + 0.3);
    }
    this.dirty = true;
  }

  /** Advance the physics. Returns true while anything is still moving. */
  step(dt: number) {
    const ps = this.particles;
    const r = this.rand;
    let active = false;
    let wind = 0;
    if (this.wind) {
      this.wind.t += dt;
      wind = Math.max(0, 1 - this.wind.t / 0.9);
      if (wind <= 0) this.wind = null;
    }
    let anyDead = false;
    for (const p of ps) {
      if (wind > 0 && this.wind) {
        const gust = (2600 * wind * (0.5 + r())) / (p.s * (p.kind === Kind.Curl ? 1 + p.len * 0.4 : 1) + 0.25);
        const wob = (r() - 0.5) * 0.9;
        p.vx += (this.wind.x - this.wind.y * wob) * gust * dt;
        p.vy += (this.wind.y + this.wind.x * wob) * gust * dt;
        p.moving = true;
      }
      if (!p.moving && p.life >= 1) continue;
      active = true;

      if (p.z > 0 || p.vz !== 0) {
        p.vz -= 900 * dt;
        p.z += p.vz * dt;
        if (p.z <= 0) {
          p.z = 0;
          p.vz = Math.abs(p.vz) > 30 ? -p.vz * 0.25 : 0;
        }
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // latex on paper is grippy; curls roll a little further
      const grip = p.z > 0 ? 0.6 : p.kind === Kind.Curl ? 7 : p.kind === Kind.Flake ? 14 : 10;
      const f = Math.exp(-grip * dt);
      p.vx *= f;
      p.vy *= f;

      const off = p.x < 0 || p.y < 0 || p.x > this.w || p.y > this.h;
      if (off && p.life >= 1) p.life = 0.999;
      if (p.life < 1) {
        // over the edge: it drops away
        p.life -= dt * 3.2;
        if (p.life <= 0) anyDead = true;
      } else if (Math.abs(p.vx) + Math.abs(p.vy) < 2 && p.z === 0 && p.vz === 0) {
        p.vx = p.vy = 0;
        p.moving = false;
      }
    }
    if (anyDead) this.particles = ps.filter((p) => p.life > 0);
    if (active) this.dirty = true;
    return active || this.wind !== null;
  }

  draw() {
    if (!this.dirty) return;
    this.dirty = false;
    const { ctx, dpr, bleed } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, bleed * dpr, bleed * dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const span = CELL / U; // sprite units per cell
    for (const p of this.particles) {
      const row = p.kind * VARIANTS + p.variant;
      let rot = Math.round((p.angle / (Math.PI * 2)) * ROT) % ROT;
      if (rot < 0) rot += ROT;
      // curls are drawn at their atlas length; scale by thickness, stretch is baked
      const unit = p.kind === Kind.Curl ? p.s * (0.85 + p.len * 0.15) : p.s;
      const lift = 1 + p.z * 0.012;
      const size = span * unit * lift * (p.life < 1 ? 0.75 + 0.25 * p.life : 1);
      ctx.globalAlpha = p.life < 1 ? Math.max(0, p.life) : 1;
      ctx.drawImage(this.atlas, rot * CELL, row * CELL, CELL, CELL, p.x - size / 2, p.y - size / 2 - p.z * 0.25, size, size);
    }
    ctx.globalAlpha = 1;
  }
}
