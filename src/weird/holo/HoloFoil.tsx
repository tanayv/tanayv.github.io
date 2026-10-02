import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import { createProgram, FULLSCREEN_VS, getGL, linearRGB, OPTICS } from "../lib/gl";
import { camera, readLamp } from "../lib/light";

export type FoilPattern = "sunburst" | "cracked-ice" | "waves" | "glitter" | "plain";
const PATTERNS: Record<FoilPattern, number> = { sunburst: 0, "cracked-ice": 1, waves: 2, glitter: 3, plain: 4 };

export interface Tilt {
  /** degrees, as in CSS rotateX / rotateY */
  rx: number;
  ry: number;
}

const FS = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uSize;
uniform vec2 uOrigin;
uniform vec3 uLight;
uniform vec3 uCam;
uniform mat3 uToLocal;
uniform int uPattern;
uniform float uStrength;
uniform float uDpr;
uniform vec3 uBase;
uniform vec2 uCenter;

${OPTICS}

void main() {
  vec2 p = vUv * uSize;
  vec3 wp = vec3(uOrigin + p, 0.0);
  vec3 L = uToLocal * normalize(uLight - wp);
  vec3 V = uToLocal * normalize(uCam - wp);
  vec2 T = L.xy + V.xy;
  vec3 H = normalize(L + V);
  float nh = max(H.z, 0.0);

  // metallised board: a dull mirror with faint rolling marks
  float row = floor(p.y * uDpr);
  float along = p.x / 60.0;
  float brush = mix(hash12(vec2(row, floor(along))), hash12(vec2(row, floor(along) + 1.0)), fract(along));
  vec3 base = uBase * (0.62 + 0.4 * max(L.z, 0.0));
  base += vec3(1.0) * (pow(nh, 70.0) * 0.85 + pow(nh, 8.0) * 0.12);
  base *= 0.93 + brush * 0.14;

  vec2 g = vec2(1.0, 0.0);
  float d = 0.0;
  float spread = 1.0;
  float crack = 1.0;
  if (uPattern == 0) {
    vec2 c = uCenter * uSize;
    vec2 r = p - c;
    g = normalize(r + 0.0001);
    float ang = atan(r.y, r.x);
    d = 820.0 * (1.0 + 0.05 * sin(ang * 96.0));
    spread = 0.075;
  } else if (uPattern == 1) {
    vec3 v = voronoi(p / 15.0);
    float a = hash12(v.xy) * 3.14159;
    g = vec2(cos(a), sin(a));
    d = 650.0 + hash12(v.xy + 7.0) * 550.0;
    spread = 0.24;
    crack = smoothstep(0.0, 0.06, v.z);
  } else if (uPattern == 2) {
    float a = 0.55 * sin(p.y * 0.017 + sin(p.x * 0.012) * 1.6);
    g = vec2(cos(a), sin(a));
    d = 860.0;
    spread = 0.16;
  } else if (uPattern == 3) {
    vec2 cell = floor(p / 3.0);
    float a = hash12(cell) * 6.2831;
    g = vec2(cos(a), sin(a));
    d = 600.0 + hash12(cell + 3.1) * 700.0;
    spread = 0.3;
  }
  vec3 dif = d > 0.0 ? grating(T, g, d, spread) : vec3(0.0);

  // every foil has a little stray glitter in it
  vec2 gc = floor(p * uDpr / 2.0);
  float ga = hash12(gc) * 6.2831;
  vec3 sparkle = grating(T, vec2(cos(ga), sin(ga)), 650.0 + hash12(gc + 1.7) * 650.0, 0.07) * step(0.8, hash12(gc + 9.0));

  vec3 col = base + (dif * 1.1 + sparkle * 0.8) * uStrength;
  col *= 0.2 + 0.8 * crack;
  gl_FragColor = vec4(toSRGB(col), 1.0);
}
`;

interface Props {
  pattern?: FoilPattern;
  /** 0 = plain silver board, 1 = full rainbow */
  strength?: number;
  /** base metal colour */
  base?: string;
  /** centre of the sunburst, as a fraction of the box */
  center?: [number, number];
  tilt?: RefObject<Tilt>;
  className?: string;
  style?: CSSProperties;
}

/**
 * Holographic foil board. A physically-flavoured diffraction grating: each
 * point has a groove direction and pitch, and the colour you see is whichever
 * wavelength that geometry sends from the lamp to your eye.
 */
export function HoloFoil({ pattern = "sunburst", strength = 1, base = "#9ca2aa", center = [0.5, 0.36], tilt, className, style }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ pattern, strength, base, center, tilt });
  live.current = { pattern, strength, base, center, tilt };
  const dirty = useRef(true);
  dirty.current = true;

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const gl = getGL(cv);
    if (!gl) {
      cv.style.background = "linear-gradient(135deg,#c9ced6,#8a919b 45%,#d7dbe1 60%,#9aa1aa)";
      return;
    }
    const { program, loc } = createProgram(gl, FULLSCREEN_VS, FS);
    let raf = 0;
    let visible = false;
    let last = "";
    const toLocal = new Float32Array(9);

    const frame = (now: number) => {
      raf = 0;
      if (!visible) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = cv.offsetWidth;
      const h = cv.offsetHeight;
      const W = Math.round(w * dpr);
      const H = Math.round(h * dpr);
      if (cv.width !== W || cv.height !== H) {
        cv.width = W;
        cv.height = H;
        dirty.current = true;
      }
      const { lamp, version } = readLamp(now);
      const box = cv.getBoundingClientRect();
      // the box is the tilted card's footprint; recover its untilted origin
      const ox = box.left + box.width / 2 - w / 2;
      const oy = box.top + box.height / 2 - h / 2;
      const t = live.current.tilt?.current ?? { rx: 0, ry: 0 };
      const key = `${version}|${ox.toFixed(1)}|${oy.toFixed(1)}|${t.rx.toFixed(3)}|${t.ry.toFixed(3)}`;
      if (key !== last || dirty.current) {
        last = key;
        dirty.current = false;
        // world-from-local = Rx · Ry (CSS order); we need its transpose
        const ax = (t.rx * Math.PI) / 180;
        const ay = (t.ry * Math.PI) / 180;
        const cx = Math.cos(ax);
        const sx = Math.sin(ax);
        const cy = Math.cos(ay);
        const sy = Math.sin(ay);
        // rows of world-from-local
        const m = [
          [cy, 0, sy],
          [sx * sy, cx, -sx * cy],
          [-cx * sy, sx, cx * cy],
        ];
        // local-from-world = mᵀ; GL wants column-major, so columns of mᵀ = rows of m
        for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) toLocal[c * 3 + r] = m[c][r];

        const L = live.current;
        gl.viewport(0, 0, W, H);
        gl.useProgram(program);
        gl.uniform2f(loc("uSize"), w, h);
        gl.uniform2f(loc("uOrigin"), ox, oy);
        gl.uniform3f(loc("uLight"), lamp.x, lamp.y, lamp.z);
        const cam = camera();
        gl.uniform3f(loc("uCam"), cam.x, cam.y, cam.z);
        gl.uniformMatrix3fv(loc("uToLocal"), false, toLocal);
        gl.uniform1i(loc("uPattern"), PATTERNS[L.pattern]);
        gl.uniform1f(loc("uStrength"), L.strength);
        gl.uniform1f(loc("uDpr"), dpr);
        gl.uniform3f(loc("uBase"), ...linearRGB(L.base));
        gl.uniform2f(loc("uCenter"), L.center[0], L.center[1]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(frame);
    });
    io.observe(cv);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <canvas ref={canvas} className={className} style={{ display: "block", width: "100%", height: "100%", ...style }} aria-hidden />;
}
