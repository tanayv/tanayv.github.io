import { createProgram, createTexture, FULLSCREEN_VS, getGL, linearRGB, OPTICS } from "../lib/gl";
import type { Vec3 } from "../lib/light";
import type { Coating } from "./presets";
import type { Latex } from "./latex";

const FS = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uWear;
uniform sampler2D uTough;
uniform sampler2D uPrint;
uniform vec2 uTexel;
uniform vec2 uSize;
uniform vec2 uOrigin;
uniform vec3 uLight;
uniform vec3 uCam;
uniform vec3 uBase;
uniform vec3 uSheen;
uniform float uMetal;
uniform float uHolo;
uniform float uRadius;
uniform float uDissolve;
uniform float uDpr;

${OPTICS}

float rrect(vec2 p, vec2 size, float r) {
  vec2 q = abs(p - size * 0.5) - size * 0.5 + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// same function as Latex: present while wear < toughness
vec2 film(vec2 uv) {
  float w = texture2D(uWear, uv).r * (255.0 / 128.0) + uDissolve * 2.6;
  float t = 0.2 + texture2D(uTough, uv).r * 1.2;
  float edge = rrect(uv * uSize, uSize, uRadius) + (texture2D(uTough, uv).r - 0.5) * 0.9;
  float border = 1.0 - smoothstep(-1.0, 0.0, edge);
  float h = (1.0 - smoothstep(t - 0.05, t + 0.05, w)) * border;
  // a thin grey smear stays behind where the coin only just broke through
  float smear = smoothstep(t - 0.05, t + 0.05, w) * (1.0 - smoothstep(t, t + 0.75, w)) * border;
  return vec2(h, smear);
}

void main() {
  vec2 uv = vUv;
  vec2 p = uv * uSize;
  vec2 dx = vec2(uTexel.x, 0.0);
  vec2 dy = vec2(0.0, uTexel.y);

  vec2 here = film(uv);
  float h = here.x;
  float hl = film(uv - dx).x;
  float hr = film(uv + dx).x;
  float hu = film(uv - dy).x;
  float hd = film(uv + dy).x;

  vec3 wp = vec3(uOrigin + p, 0.0);
  vec3 L = normalize(uLight - wp);
  vec3 V = normalize(uCam - wp);
  vec3 H = normalize(L + V);

  // the film is a couple of microns proud of the card; exaggerate so the cut
  // edge catches light on one side and goes dark on the other
  vec3 N = normalize(vec3((hl - hr) * 1.7, (hu - hd) * 1.7, 1.0));

  float tough = texture2D(uTough, uv).r;
  vec2 cell = floor(p * uDpr / 1.5);
  vec2 jit = hash22(cell) - 0.5;
  vec3 Nf = normalize(N + vec3(jit * 1.1, 0.0));          // metallic flakes
  float mott = (hash12(floor(p * uDpr)) - 0.5) * 0.07 + (tough - 0.5) * 0.08;

  float diff = max(dot(N, L), 0.0);
  float nh = max(dot(N, H), 0.0);
  float spec = pow(nh, mix(5.0, 26.0, uMetal));
  float glint = pow(max(dot(Nf, H), 0.0), 260.0) * uMetal;

  vec3 base = uBase * (1.0 + mott);
  vec3 col = base * (0.34 + 0.8 * diff)
           + uSheen * (spec * 0.5 * uMetal + pow(nh, 2.5) * 0.1)
           + vec3(glint) * 1.1;

  if (uHolo > 0.0) {
    vec2 g = normalize(p - uSize * vec2(0.5, 0.35) + 0.001);
    col += grating(L.xy + V.xy, g, 820.0, 0.08) * 0.5 * uHolo;
    vec3 v = voronoi(p / 4.0);
    float a = hash12(v.xy) * 6.2831;
    col += grating(L.xy + V.xy, vec2(cos(a), sin(a)), 900.0, 0.12) * 0.3 * uHolo;
  }

  // ink printed on the latex comes off with it
  vec4 ink = texture2D(uPrint, uv);
  col = mix(col, col * ink.rgb, ink.a);

  // crumbled, darker latex right at a torn edge
  float slope = clamp(abs(hl - hr) + abs(hu - hd), 0.0, 1.0);
  col *= 1.0 - slope * 0.22 * (1.0 - diff);

  // the film's own wall throws a hairline shadow onto the exposed card
  vec2 toL = L.xy / max(L.z, 0.25);
  float occ = 0.0;
  for (int i = 1; i <= 4; i++) {
    float fi = float(i);
    vec2 o = toL * fi * 0.42 * uDpr * uTexel;
    occ = max(occ, film(uv + o).x * (1.0 - fi / 5.5));
  }
  float ao = (hl + hr + hu + hd) * 0.25;

  float a = h;
  float exposed = 1.0 - a;
  float sh = clamp(occ * 0.42 + ao * 0.18, 0.0, 0.6) * exposed;
  float sm = here.y * 0.24 * exposed;

  vec3 c = vec3(0.0);
  float A = sh;
  vec3 smearCol = toSRGB(uBase * 0.9);
  c = smearCol * sm + c * (1.0 - sm);
  A = sm + A * (1.0 - sm);
  c = toSRGB(col) * a + c * (1.0 - a);
  A = a + A * (1.0 - a);
  gl_FragColor = vec4(c, A);
}
`;

/** Draws the latex: lit film, printed ink, torn edges and their shadows. */
export class CoatingRenderer {
  private gl: WebGLRenderingContext;
  private prog: ReturnType<typeof createProgram>;
  private wearTex: WebGLTexture;
  private toughTex: WebGLTexture;
  private printTex: WebGLTexture;
  dissolve = 0;

  static create(canvas: HTMLCanvasElement, latex: Latex, coating: Coating, print: HTMLCanvasElement | null) {
    const gl = getGL(canvas);
    if (!gl) return null;
    return new CoatingRenderer(gl, latex, coating, print);
  }

  private constructor(
    gl: WebGLRenderingContext,
    private latex: Latex,
    private coating: Coating,
    print: HTMLCanvasElement | null,
  ) {
    this.gl = gl;
    this.prog = createProgram(gl, FULLSCREEN_VS, FS);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    this.toughTex = createTexture(gl, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, latex.W, latex.H, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, latex.tough);

    this.wearTex = createTexture(gl, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, latex.W, latex.H, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, latex.wear);
    latex.dirtyTop = -1;

    this.printTex = createTexture(gl, gl.LINEAR);
    if (print) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, print);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    }
  }

  /** Push the rows the coin has touched since last frame. */
  upload() {
    const { latex, gl } = this;
    if (latex.dirtyTop < 0) return false;
    const y0 = latex.dirtyTop;
    const y1 = latex.dirtyBottom;
    gl.bindTexture(gl.TEXTURE_2D, this.wearTex);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      y0,
      latex.W,
      y1 - y0 + 1,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      latex.wear.subarray(y0 * latex.W, (y1 + 1) * latex.W),
    );
    latex.dirtyTop = latex.dirtyBottom = -1;
    return true;
  }

  render(origin: { x: number; y: number }, lamp: Vec3, cam: Vec3) {
    const { gl, latex, coating } = this;
    const { loc } = this.prog;
    gl.viewport(0, 0, latex.W, latex.H);
    gl.useProgram(this.prog.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.wearTex);
    gl.uniform1i(loc("uWear"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.toughTex);
    gl.uniform1i(loc("uTough"), 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.printTex);
    gl.uniform1i(loc("uPrint"), 2);

    gl.uniform2f(loc("uTexel"), 1 / latex.W, 1 / latex.H);
    gl.uniform2f(loc("uSize"), latex.cssW, latex.cssH);
    gl.uniform2f(loc("uOrigin"), origin.x, origin.y);
    gl.uniform3f(loc("uLight"), lamp.x, lamp.y, lamp.z);
    gl.uniform3f(loc("uCam"), cam.x, cam.y, cam.z);
    gl.uniform3f(loc("uBase"), ...linearRGB(coating.base));
    gl.uniform3f(loc("uSheen"), ...linearRGB(coating.sheen));
    gl.uniform1f(loc("uMetal"), coating.metal);
    gl.uniform1f(loc("uHolo"), coating.holo);
    gl.uniform1f(loc("uRadius"), latex.radius);
    gl.uniform1f(loc("uDissolve"), this.dissolve);
    gl.uniform1f(loc("uDpr"), latex.dpr);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** Free GPU objects. `lose` also drops the context — only when the canvas is going away. */
  dispose(lose = false) {
    const { gl } = this;
    gl.deleteTexture(this.wearTex);
    gl.deleteTexture(this.toughTex);
    gl.deleteTexture(this.printTex);
    gl.deleteProgram(this.prog.program);
    if (lose) gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

/**
 * Text printed on the latex in a darker ink: offset rows of the legend, the
 * way instant tickets repeat their logo across the scratch area.
 */
export function printCanvas(latex: Latex, text: string, ink: string) {
  const c = document.createElement("canvas");
  c.width = latex.W;
  c.height = latex.H;
  const ctx = c.getContext("2d")!;
  const d = latex.dpr;
  ctx.scale(d, d);
  // RGB is the multiply colour, A is coverage; keep the ink a little transparent
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.3;
  const size = Math.max(8, Math.min(13, latex.cssH / 8));
  ctx.font = `400 ${size}px "Anton", "Arial Narrow", sans-serif`;
  ctx.textBaseline = "middle";
  if ("letterSpacing" in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${size * 0.08}px`;
  const unit = `${text.toUpperCase()}     `;
  const w = ctx.measureText(unit).width || 40;
  const lineH = size * 2.1;
  let row = 0;
  for (let y = lineH * 0.6; y < latex.cssH + lineH; y += lineH, row++) {
    const shift = (row % 2) * (w / 2) - w;
    for (let x = shift; x < latex.cssW + w; x += w) ctx.fillText(unit, x, y);
  }
  return c;
}
