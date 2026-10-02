import { mulberry32, valueNoise } from "../lib/rng";

/**
 * The scratch-off film, one byte of state per device pixel.
 *
 * Latex doesn't thin out evenly under a coin — it holds, then lets go in
 * crumbs. So every pixel carries a fixed *toughness* (spatially noisy, so
 * edges tear raggedly) and an accumulated *wear*. The film is present while
 * wear < toughness and gone once wear passes it. A light pass leaves islands
 * and specks where the latex was tougher; a second pass scrubs them out.
 * The shader runs the same function, so what you see is what is counted.
 */

export const WEAR_SCALE = 128; // wear byte = wear × 128, so wear spans 0..~2
export const T_MIN = 0.2;
export const T_RANGE = 1.2; // toughness byte → T_MIN..T_MIN+T_RANGE
const SOFT = 0.05;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// thickness for every (toughness, wear) byte pair
const LUT = new Float32Array(256 * 256);
const THRESH = new Uint8Array(256);
for (let tb = 0; tb < 256; tb++) {
  const t = T_MIN + (tb / 255) * T_RANGE;
  THRESH[tb] = Math.min(255, Math.floor(t * WEAR_SCALE));
  for (let wb = 0; wb < 256; wb++) {
    LUT[(tb << 8) | wb] = 1 - smooth(t - SOFT, t + SOFT, wb / WEAR_SCALE);
  }
}

/** Distance to a rounded rectangle's edge, negative inside. */
export function roundedRectSDF(x: number, y: number, w: number, h: number, r: number) {
  const qx = Math.abs(x - w / 2) - w / 2 + r;
  const qy = Math.abs(y - h / 2) - h / 2 + r;
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}

export class Latex {
  readonly W: number;
  readonly H: number;
  readonly dpr: number;
  readonly wear: Uint8Array;
  readonly tough: Uint8Array;
  private readonly inside: Uint8Array;
  total = 0;
  cleared = 0;
  /** Rows touched since the last upload, inclusive. -1 when clean. */
  dirtyTop = -1;
  dirtyBottom = -1;
  private dither = 12345;

  constructor(
    readonly cssW: number,
    readonly cssH: number,
    dpr: number,
    readonly radius: number,
    seed: number,
  ) {
    this.dpr = dpr;
    this.W = Math.max(1, Math.round(cssW * dpr));
    this.H = Math.max(1, Math.round(cssH * dpr));
    const n = this.W * this.H;
    this.wear = new Uint8Array(n);
    this.tough = new Uint8Array(n);
    this.inside = new Uint8Array(n);

    const coarse = valueNoise(seed);
    const fine = valueNoise(seed + 7);
    const rand = mulberry32(seed + 13);
    let total = 0;
    for (let y = 0; y < this.H; y++) {
      const v = y / dpr;
      for (let x = 0; x < this.W; x++) {
        const u = x / dpr;
        const i = y * this.W + x;
        const t =
          0.7 +
          0.5 * (coarse(u / 6, v / 6) - 0.5) +
          0.34 * (fine(u / 1.6 + 31, v / 1.6 + 17) - 0.5) +
          0.2 * (rand() - 0.5);
        this.tough[i] = Math.max(0, Math.min(255, Math.round(((t - T_MIN) / T_RANGE) * 255)));
        // matches the shader's border: slightly wobbly, like a screen-printed edge
        const edge = roundedRectSDF(u + 0.5 / dpr, v + 0.5 / dpr, cssW, cssH, radius) + (this.tough[i] / 255 - 0.5) * 0.9;
        if (edge < -0.5) {
          this.inside[i] = 1;
          total++;
        }
      }
    }
    this.total = total;
  }

  get progress() {
    return this.total ? this.cleared / this.total : 0;
  }

  private touch(y0: number, y1: number) {
    if (this.dirtyTop < 0 || y0 < this.dirtyTop) this.dirtyTop = y0;
    if (y1 > this.dirtyBottom) this.dirtyBottom = y1;
  }

  /**
   * Drag one contact-edge footprint across the film.
   * (cx, cy) centre in css px; (ux, uy) unit vector along the edge;
   * hl/ht half-length and half-thickness in css px; `inc` wear at full contact;
   * `profile` the edge's nicks, sampled along its length.
   * Returns css px² of latex removed.
   */
  stamp(cx: number, cy: number, ux: number, uy: number, hl: number, ht: number, inc: number, profile: Float32Array) {
    const d = this.dpr;
    const W = this.W;
    cx *= d;
    cy *= d;
    hl *= d;
    ht *= d;
    const nx = -uy;
    const ny = ux;
    const ex = Math.abs(ux) * hl + Math.abs(nx) * ht + 1;
    const ey = Math.abs(uy) * hl + Math.abs(ny) * ht + 1;
    const x0 = Math.max(0, Math.floor(cx - ex));
    const x1 = Math.min(W - 1, Math.ceil(cx + ex));
    const y0 = Math.max(0, Math.floor(cy - ey));
    const y1 = Math.min(this.H - 1, Math.ceil(cy + ey));
    if (x0 > x1 || y0 > y1) return 0;

    const plast = profile.length - 1;
    const inv = plast / (2 * hl);
    const incB = inc * WEAR_SCALE;
    const { wear, tough, inside } = this;
    let removed = 0;
    let cleared = 0;
    let dither = this.dither;

    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy;
      let i = y * W + x0;
      for (let x = x0; x <= x1; x++, i++) {
        if (!inside[i]) continue;
        const dx = x + 0.5 - cx;
        const sv = dx * nx + dy * ny;
        const cv = ht + 0.5 - (sv < 0 ? -sv : sv);
        if (cv <= 0) continue;
        const su = dx * ux + dy * uy;
        const ce = hl + 0.5 - (su < 0 ? -su : su);
        if (ce <= 0) continue;
        let pi = ((su + hl) * inv) | 0;
        if (pi < 0) pi = 0;
        else if (pi > plast) pi = plast;
        const a = incB * (cv < 1 ? cv : 1) * (ce < 1 ? ce : 1) * profile[pi];
        dither = (dither * 1103515245 + 12345) & 0x7fffffff;
        const before = wear[i];
        let after = before + a + (dither & 255) / 256;
        after = after > 255 ? 255 : after | 0;
        if (after === before) continue;
        wear[i] = after;
        const tb = tough[i];
        removed += LUT[(tb << 8) | before] - LUT[(tb << 8) | after];
        const th = THRESH[tb];
        if (before <= th && after > th) cleared++;
      }
    }
    this.dither = dither;
    this.cleared += cleared;
    this.touch(y0, y1);
    return removed / (d * d);
  }

  /** Tear out an irregular chip of latex in one go. Returns css px² removed. */
  chip(cx: number, cy: number, r: number, seed: number) {
    const d = this.dpr;
    const rand = mulberry32(seed);
    const lobes = [rand(), rand(), rand(), rand()].map((v) => v * Math.PI * 2);
    const amp = [rand() * 0.35, rand() * 0.25, rand() * 0.2, rand() * 0.15];
    cx *= d;
    cy *= d;
    const R = r * d;
    const x0 = Math.max(0, Math.floor(cx - R * 1.6));
    const x1 = Math.min(this.W - 1, Math.ceil(cx + R * 1.6));
    const y0 = Math.max(0, Math.floor(cy - R * 1.6));
    const y1 = Math.min(this.H - 1, Math.ceil(cy + R * 1.6));
    if (x0 > x1 || y0 > y1) return 0;
    let removed = 0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * this.W + x;
        if (!this.inside[i]) continue;
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const ang = Math.atan2(dy, dx);
        let k = 1;
        for (let j = 0; j < 4; j++) k += amp[j] * Math.sin(ang * (j + 2) + lobes[j]);
        if (Math.hypot(dx, dy) > R * k) continue;
        const tb = this.tough[i];
        const before = this.wear[i];
        const after = Math.min(255, Math.max(before, THRESH[tb] + 40));
        if (after === before) continue;
        this.wear[i] = after;
        removed += LUT[(tb << 8) | before] - LUT[(tb << 8) | after];
        if (before <= THRESH[tb]) this.cleared++;
      }
    }
    this.touch(y0, y1);
    return removed / (d * d);
  }

  /** Coating left at a css point, 0..1 — used to decide if a stroke is biting. */
  thicknessAt(x: number, y: number) {
    const xi = Math.floor(x * this.dpr);
    const yi = Math.floor(y * this.dpr);
    if (xi < 0 || yi < 0 || xi >= this.W || yi >= this.H) return 0;
    const i = yi * this.W + xi;
    return this.inside[i] ? LUT[(this.tough[i] << 8) | this.wear[i]] : 0;
  }

  reset() {
    this.wear.fill(0);
    this.cleared = 0;
    this.touch(0, this.H - 1);
  }

  clearAll() {
    this.wear.fill(255);
    this.cleared = this.total;
    this.touch(0, this.H - 1);
  }
}

/**
 * The working edge of a coin is never clean: tiny nicks bite deeper and dents
 * skip, which is what draws the fine parallel streaks along each stroke.
 */
export function edgeProfile(seed: number, streak: number, samples = 72) {
  const rand = mulberry32(seed);
  const wobble = valueNoise(seed + 3);
  const p = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    let v = 0.78 + 0.32 * (wobble(i / 3.2, 0.5) - 0.5) * 2;
    p[i] = v;
  }
  // nicks and dents a couple of samples wide
  const marks = Math.round(samples * 0.12);
  for (let m = 0; m < marks; m++) {
    const at = Math.floor(rand() * samples);
    const w = 1 + Math.floor(rand() * 2);
    const deep = rand() < 0.45;
    for (let k = 0; k < w && at + k < samples; k++) p[at + k] = deep ? 1.25 : 0.12 + rand() * 0.2;
  }
  // the corners of the edge bite less
  for (let i = 0; i < samples; i++) {
    const e = Math.min(i, samples - 1 - i) / (samples * 0.12);
    const taper = Math.min(1, 0.35 + 0.65 * e);
    p[i] = (1 - streak + streak * p[i]) * taper;
  }
  return p;
}
