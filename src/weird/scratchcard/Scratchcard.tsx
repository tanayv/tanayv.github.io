import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { camera, readLamp } from "../lib/light";
import { mulberry32 } from "../lib/rng";
import { CoatingRenderer, printCanvas } from "./coatingRenderer";
import { Latex } from "./latex";
import "./scratchcard.css";
import { COATINGS, type Coating, type CoatingName } from "./presets";
import {
  ScratchSurface,
  useScratchSurface,
  type Chip,
  type PanelApi,
  type ResolvedTool,
  type ScratchSurfaceHandle,
  type ScratchSurfaceProps,
} from "./ScratchSurface";

export interface ScratchcardProps extends Omit<ScratchSurfaceProps, "children" | "className" | "style" | "bleed"> {
  /** What's printed underneath. */
  children?: ReactNode;
  /** A preset name, or your own colours. */
  coating?: CoatingName | Coating;
  /** Repeated legend printed on the latex. `null` for a blank coating. */
  print?: string | null;
  /** Fraction of latex (0–1) that has to come off before `onReveal` fires. */
  threshold?: number;
  /** Once revealed, let the remaining latex crumble away by itself. */
  clearOnReveal?: boolean;
  /** Corner radius of the coating, css px. */
  radius?: number;
  /** Seeds the latex's toughness, so two cards don't wear identically. */
  seed?: number;
  /** Only used on a standalone card: how far shavings may spill past it, css px. */
  bleed?: number;
  disabled?: boolean;
  onProgress?: (progress: number) => void;
  onReveal?: () => void;
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
}

export interface ScratchcardHandle {
  /** Fresh latex. */
  reset(): void;
  /** Take all the latex off at once. */
  reveal(): void;
  /** Let the coin scrub this panel by itself. */
  scratch(): void;
  /** Blow the shavings away (standalone cards only). */
  blow(): void;
  readonly progress: number;
}

/**
 * A scratch-off panel. Wraps whatever it hides. Inside a <ScratchSurface> it
 * shares that surface's coin and shavings; on its own it brings its own.
 */
export const Scratchcard = forwardRef<ScratchcardHandle, ScratchcardProps>(function Scratchcard(props, ref) {
  const surface = useScratchSurface();
  if (surface) return <Panel {...props} handle={ref} />;
  const { coin, tool, brushSize, shavings, sound, bleed = 36, ...panel } = props;
  return <Standalone {...{ coin, tool, brushSize, shavings, sound, bleed }} panel={panel} handle={ref} />;
});

function Standalone({
  panel,
  handle,
  ...surface
}: Omit<ScratchSurfaceProps, "children"> & {
  panel: ScratchcardProps;
  handle: React.ForwardedRef<ScratchcardHandle>;
}) {
  const surfaceRef = useRef<ScratchSurfaceHandle>(null);
  const inner = useRef<ScratchcardHandle>(null);
  useImperativeHandle(handle, () => ({
    reset: () => surfaceRef.current?.reset(),
    reveal: () => inner.current?.reveal(),
    scratch: () => inner.current?.scratch(),
    blow: () => surfaceRef.current?.blow(),
    get progress() {
      return inner.current?.progress ?? 0;
    },
  }));
  return (
    <ScratchSurface ref={surfaceRef} {...surface} className={panel.className} style={panel.style}>
      <Panel {...panel} className={undefined} style={{ width: "100%", height: "100%" }} handle={inner} />
    </ScratchSurface>
  );
}

function Panel({
  children,
  coating: coatingProp = "silver",
  print = "Scratch here",
  threshold = 0.7,
  clearOnReveal = false,
  radius = 3,
  seed = 1,
  disabled = false,
  onProgress,
  onReveal,
  className,
  style,
  "aria-label": ariaLabel = "Scratch-off panel. Press Enter to scratch.",
  handle,
}: ScratchcardProps & { handle: React.ForwardedRef<ScratchcardHandle> }) {
  const surface = useScratchSurface()!;
  const coating = typeof coatingProp === "string" ? COATINGS[coatingProp] : coatingProp;
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const latex = useRef<Latex | null>(null);
  const renderer = useRef<CoatingRenderer | null>(null);
  const rect = useRef({ left: 0, top: 0, width: 0, height: 0 });
  const rand = useRef(mulberry32(seed * 977));
  const [revealed, setRevealed] = useState(false);
  const [failed, setFailed] = useState(false);
  const live = useRef({ onProgress, onReveal, threshold, clearOnReveal, disabled, revealed: false, lastReported: -1 });
  live.current = { ...live.current, onProgress, onReveal, threshold, clearOnReveal, disabled };
  const kickRender = useRef<() => void>(() => {});
  const dissolve = useRef<{ start: number } | null>(null);
  const panelApi = useRef<PanelApi | null>(null);

  const report = () => {
    const l = latex.current;
    const s = live.current;
    if (!l) return;
    const p = l.progress;
    if (Math.abs(p - s.lastReported) >= 0.004 || (p >= 1 && s.lastReported < 1)) {
      s.lastReported = p;
      s.onProgress?.(p);
    }
    if (!s.revealed && p >= s.threshold) {
      s.revealed = true;
      setRevealed(true);
      s.onReveal?.();
      if (s.clearOnReveal) {
        dissolve.current = { start: performance.now() };
        kickRender.current();
      }
    }
  };

  // a new canvas (and GL context) whenever the latex itself changes
  const buildKey = `${JSON.stringify(coating)}|${print}|${radius}|${seed}`;

  // build latex + GL once the panel is near the viewport; rebuild on resize
  useEffect(() => {
    const el = root.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    let raf = 0;
    let visible = false;
    let lastVersion = -1;
    let lastX = NaN;
    let lastY = NaN;
    let built = false;

    const build = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (!w || !h) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      renderer.current?.dispose();
      const l = new Latex(w, h, dpr, radius, seed);
      latex.current = l;
      cv.width = l.W;
      cv.height = l.H;
      const printed = print ? printCanvas(l, print, coating.ink) : null;
      try {
        renderer.current = CoatingRenderer.create(cv, l, coating, printed);
        if (!renderer.current) setFailed(true);
      } catch (err) {
        console.error(err);
        setFailed(true);
      }
      live.current.revealed = false;
      live.current.lastReported = -1;
      setRevealed(false);
      dissolve.current = null;
      lastVersion = -1;
      built = true;
      report();
    };

    const frame = (now: number) => {
      raf = 0;
      const r = renderer.current;
      const l = latex.current;
      if (!r || !l || !visible) return;
      const { lamp, version } = readLamp(now);
      const box = el.getBoundingClientRect();
      let fresh = r.upload();
      if (dissolve.current) {
        r.dissolve = Math.min(1, (now - dissolve.current.start) / 1400);
        fresh = true;
        if (r.dissolve >= 1) dissolve.current = null;
      }
      if (fresh || version !== lastVersion || box.left !== lastX || box.top !== lastY) {
        r.render({ x: box.left, y: box.top }, lamp, camera());
        lastVersion = version;
        lastX = box.left;
        lastY = box.top;
      }
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (!raf && visible) raf = requestAnimationFrame(frame);
    };
    kickRender.current = start;

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !built) build();
        start();
      },
      { rootMargin: "200px" },
    );
    io.observe(el);

    let lastW = el.offsetWidth;
    let lastH = el.offsetHeight;
    const ro = new ResizeObserver(() => {
      if (el.offsetWidth === lastW && el.offsetHeight === lastH) return;
      lastW = el.offsetWidth;
      lastH = el.offsetHeight;
      if (built) build();
      start();
    });
    ro.observe(el);

    // fonts change the printed legend
    void document.fonts?.ready.then(() => {
      if (built && latex.current && latex.current.cleared === 0) build();
    });

    return () => {
      io.disconnect();
      ro.disconnect();
      cancelAnimationFrame(raf);
      renderer.current?.dispose(true);
      renderer.current = null;
      latex.current = null;
    };
    // coating is an object when custom; compare by value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildKey]);

  // join the surface
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const api: PanelApi = {
      el,
      coating,
      measure() {
        const r = el.getBoundingClientRect();
        rect.current = { left: r.left, top: r.top, width: r.width, height: r.height };
      },
      bite(ax, ay, bx, by, ux, uy, tool: ResolvedTool, chips: Chip[]) {
        const l = latex.current;
        if (!l || live.current.disabled) return 0;
        const r = rect.current;
        // the box may be scaled by a parent transform; map into layout px
        const sx = l.cssW / (r.width || l.cssW);
        const sy = l.cssH / (r.height || l.cssH);
        const pad = tool.hl + tool.ht + 2;
        if (Math.max(ax, bx) < r.left - pad || Math.min(ax, bx) > r.left + r.width + pad) return 0;
        if (Math.max(ay, by) < r.top - pad || Math.min(ay, by) > r.top + r.height + pad) return 0;
        const x0 = (ax - r.left) * sx;
        const y0 = (ay - r.top) * sy;
        const x1 = (bx - r.left) * sx;
        const y1 = (by - r.top) * sy;
        const dist = Math.hypot(x1 - x0, y1 - y0);
        const n = Math.max(1, Math.ceil(dist / 0.6));
        const seg = dist / n;
        // wear per stamp so one square-on pass deposits `bite`
        const inc = (tool.bite * seg) / (2 * tool.ht);
        const nx = -uy;
        const ny = ux;
        const fwd = ((x1 - x0) * nx + (y1 - y0) * ny) >= 0 ? 1 : -1;
        const rnd = rand.current;
        let removed = 0;
        for (let k = 1; k <= n; k++) {
          const cx = x0 + ((x1 - x0) * k) / n;
          const cy = y0 + ((y1 - y0) * k) / n;
          const got = l.stamp(cx, cy, ux, uy, tool.hl, tool.ht, inc * (0.8 + rnd() * 0.4), tool.profile);
          removed += got;
          if (got > 0.02 && rnd() < tool.chip * seg) {
            // a chip tears out along the leading edge, usually near a corner
            const along = (rnd() < 0.6 ? Math.sign(rnd() - 0.5) * (0.6 + rnd() * 0.4) : rnd() * 2 - 1) * tool.hl;
            const px = cx + ux * along + nx * fwd * (tool.ht + 0.5);
            const py = cy + uy * along + ny * fwd * (tool.ht + 0.5);
            const cr = 0.8 + rnd() * 1.8;
            const torn = l.chip(px, py, cr, (rnd() * 1e9) | 0);
            removed += torn;
            if (torn > 1.2) chips.push({ x: r.left + px / sx, y: r.top + py / sy, r: cr });
          }
        }
        if (removed > 0) {
          report();
          kickRender.current();
        }
        return removed;
      },
      settle() {
        report();
      },
      reset() {
        latex.current?.reset();
        if (renderer.current) renderer.current.dissolve = 0;
        dissolve.current = null;
        live.current.revealed = false;
        live.current.lastReported = -1;
        setRevealed(false);
        report();
        kickRender.current();
      },
      reveal() {
        latex.current?.clearAll();
        report();
        kickRender.current();
      },
    };
    panelApi.current = api;
    return surface.register(api);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surface, JSON.stringify(coating)]);

  useImperativeHandle(handle, () => ({
    reset: () => panelApi.current?.reset(),
    reveal: () => panelApi.current?.reveal(),
    scratch: () => panelApi.current && surface.autoScrub(panelApi.current),
    blow: () => {},
    get progress() {
      return latex.current?.progress ?? 0;
    },
  }));

  return (
    <div
      ref={root}
      className={["wui-scratch", revealed ? "is-revealed" : "", className].filter(Boolean).join(" ")}
      style={style}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={revealed ? undefined : ariaLabel}
      aria-disabled={disabled || undefined}
      onKeyDown={(e) => {
        if (disabled || (e.key !== "Enter" && e.key !== " ")) return;
        e.preventDefault();
        if (panelApi.current) surface.autoScrub(panelApi.current);
      }}
    >
      <div className="wui-scratch__under" aria-hidden={!revealed} aria-live="polite">
        {children}
      </div>
      <canvas
        key={buildKey}
        ref={canvas}
        className="wui-scratch__latex"
        aria-hidden
        style={failed ? { background: coating.base } : undefined}
      />
    </div>
  );
}
