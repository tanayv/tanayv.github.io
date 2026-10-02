import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { CoinCursor, type CoinHandle } from "./Coin";
import { Debris, Kind } from "./debris";
import { edgeProfile } from "./latex";
import { COATINGS, TOOLS, type Coating, type CoinName, type ToolName } from "./presets";
import { ScratchSound } from "./sound";

/** What a surface needs from each scratch panel inside it. */
export interface PanelApi {
  el: HTMLElement;
  coating: Coating;
  /** cache the panel's screen rect for the length of a stroke */
  measure(): void;
  /** scrape from a to b (client px); push torn-out chips to `chips`; returns css px² removed */
  bite(ax: number, ay: number, bx: number, by: number, ux: number, uy: number, tool: ResolvedTool, chips: Chip[]): number;
  /** stroke finished */
  settle(): void;
  reset(): void;
  reveal(): void;
}

export interface ResolvedTool {
  hl: number;
  ht: number;
  bite: number;
  chip: number;
  profile: Float32Array;
}

export interface Chip {
  x: number;
  y: number;
  r: number;
}

interface SurfaceApi {
  register(panel: PanelApi): () => void;
  autoScrub(panel?: PanelApi): void;
  reset(): void;
}

const SurfaceContext = createContext<SurfaceApi | null>(null);
export const useScratchSurface = () => useContext(SurfaceContext);

export interface ScratchSurfaceProps {
  /** Coin that follows the pointer and does the scratching. `false` keeps the system cursor. */
  coin?: CoinName | false;
  /** What's doing the scratching. Changes the width, bite and streakiness of each stroke. */
  tool?: ToolName;
  /** Length of the contact edge in css px. The coin is drawn to match. */
  brushSize?: number;
  /** Shavings multiplier. 0 turns debris off; 2 is a mess. */
  shavings?: number;
  /** Synthesised scratching noise. Off by default. */
  sound?: boolean;
  /** How far (css px) shavings may be drawn past the surface's edge as they fall off. */
  bleed?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export interface ScratchSurfaceHandle {
  /** Re-coat every panel and sweep the card clean. */
  reset(): void;
  /** Blow across the card. Shavings scatter and fall off the edges. */
  blow(dirX?: number, dirY?: number): void;
  /** Scrub every panel automatically, coin and all. */
  autoScrub(): void;
}

// css px² of latex per shaving at shavings = 1
const LATEX_PER_SHAVING = 11;

/**
 * The card being held down: owns the coin, the shavings and the stroke.
 * Every <Scratchcard> inside shares them, so one stroke can cross several
 * panels and push the debris from one onto another.
 */
export const ScratchSurface = forwardRef<ScratchSurfaceHandle, ScratchSurfaceProps>(function ScratchSurface(
  { coin = "quarter", tool = "coin", brushSize = 26, shavings = 1, sound = false, bleed = 0, className, style, children },
  ref,
) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const coinRef = useRef<CoinHandle>(null);
  const panels = useRef(new Set<PanelApi>());
  const debris = useRef<Debris | null>(null);
  const audio = useRef<ScratchSound | null>(null);
  const loop = useRef<{ raf: number; last: number }>({ raf: 0, last: 0 });
  const auto = useRef<{ raf: number } | null>(null);

  const resolved = useMemo<ResolvedTool>(() => {
    const t = TOOLS[tool];
    return {
      hl: (brushSize * t.length) / 2,
      ht: t.edge,
      bite: t.bite,
      chip: t.chip,
      profile: edgeProfile(Math.round(brushSize) * 31 + t.streak * 1000, t.streak),
    };
  }, [tool, brushSize]);

  const cfg = useRef({ resolved, shavings, sound, coin });
  cfg.current = { resolved, shavings, sound, coin };

  // --- shavings loop --------------------------------------------------------
  const kick = useCallback(() => {
    const l = loop.current;
    if (l.raf) return;
    l.last = performance.now();
    const frame = (now: number) => {
      const d = debris.current;
      const dt = Math.min(0.05, (now - l.last) / 1000);
      l.last = now;
      const active = d ? d.step(dt) : false;
      d?.draw();
      l.raf = active ? requestAnimationFrame(frame) : 0;
    };
    l.raf = requestAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const el = root.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    const first = panels.current.values().next().value as PanelApi | undefined;
    const d = new Debris(cv, (first?.coating ?? COATINGS.silver).crumbs);
    debris.current = d;
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      d.resize(el.offsetWidth, el.offsetHeight, bleed, dpr);
      cv.style.left = cv.style.top = `${-bleed}px`;
      cv.style.width = `${el.offsetWidth + bleed * 2}px`;
      cv.style.height = `${el.offsetHeight + bleed * 2}px`;
      d.draw();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(loop.current.raf);
      loop.current.raf = 0;
      debris.current = null;
    };
  }, [bleed]);

  // --- the stroke -----------------------------------------------------------
  const stroke = useRef({
    down: false,
    x: 0,
    y: 0,
    t: 0,
    // contact-edge orientation as a doubled-angle vector, so back-and-forth
    // scrubbing (which flips direction 180°) doesn't spin the coin
    c2: 1,
    s2: 0,
    deg: 0,
    rect: { left: 0, top: 0 },
    spawnDebt: 0,
  });

  const begin = useCallback((x: number, y: number, t: number) => {
    const s = stroke.current;
    s.down = true;
    s.x = x;
    s.y = y;
    s.t = t;
    const r = root.current!.getBoundingClientRect();
    s.rect = { left: r.left, top: r.top };
    panels.current.forEach((p) => p.measure());
    coinRef.current?.move(x, y);
    coinRef.current?.press(true);
    coinRef.current?.show(true);
    if (cfg.current.sound) {
      audio.current ??= new ScratchSound();
      audio.current.start();
    }
  }, []);

  const moveTo = useCallback(
    (x: number, y: number, t: number) => {
      const s = stroke.current;
      const dx = x - s.x;
      const dy = y - s.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.25) return;
      const dt = Math.max(1, t - s.t);
      const { resolved: tool, shavings: amount, sound: soundOn } = cfg.current;

      // turn the edge square to the motion, with inertia
      const px = -dy / dist;
      const py = dx / dist;
      const k = 1 - Math.exp(-dist / 38);
      s.c2 += (px * px - py * py - s.c2) * k;
      s.s2 += (2 * px * py - s.s2) * k;
      const ang = Math.atan2(s.s2, s.c2) / 2;
      const ux = Math.cos(ang);
      const uy = Math.sin(ang);

      const chips: Chip[] = [];
      let removed = 0;
      panels.current.forEach((p) => {
        removed += p.bite(s.x, s.y, x, y, ux, uy, tool, chips);
      });

      const d = debris.current;
      if (d) {
        const ax = s.x - s.rect.left;
        const ay = s.y - s.rect.top;
        const bx = x - s.rect.left;
        const by = y - s.rect.top;
        const vx = (dx / dt) * 1000;
        const vy = (dy / dt) * 1000;
        d.sweep(ax, ay, bx, by, ux, uy, tool.hl, tool.ht, vx, vy);

        if (amount > 0) {
          const nx = -uy;
          const ny = ux;
          const across = (dx * nx + dy * ny) / dist;
          const fwd = across >= 0 ? 1 : -1;
          s.spawnDebt += (removed * amount) / LATEX_PER_SHAVING;
          while (s.spawnDebt >= 1) {
            s.spawnDebt -= 1;
            const along = (Math.random() * 2 - 1) * tool.hl * 0.92;
            const out = tool.ht + 0.4 + Math.random() * 1.6;
            let sx: number;
            let sy: number;
            if (Math.abs(across) < 0.3) {
              const lead = (dx * ux + dy * uy >= 0 ? 1 : -1) * (tool.hl + 0.6);
              sx = bx + ux * lead + nx * (Math.random() - 0.5) * 3;
              sy = by + uy * lead + ny * (Math.random() - 0.5) * 3;
            } else {
              sx = bx + ux * along + nx * fwd * out;
              sy = by + uy * along + ny * fwd * out;
            }
            const keep = 0.12 + Math.random() * 0.35;
            d.spawn(sx, sy, vx * keep + (Math.random() - 0.5) * 40, vy * keep + (Math.random() - 0.5) * 40, ang, Math.random());
          }
          for (const c of chips) {
            if (Math.random() > amount) continue;
            d.spawn(c.x - s.rect.left, c.y - s.rect.top, vx * 0.2, vy * 0.2, Math.random() * 6.28, Math.min(1, c.r / 2.4), Kind.Flake);
          }
        }
        kick();
      }

      // the visible coin: pick whichever of θ / θ±180 is nearer the last pose
      let deg = (ang * 180) / Math.PI;
      while (deg - s.deg > 90) deg -= 180;
      while (deg - s.deg < -90) deg += 180;
      if (deg > 140) deg -= 180;
      if (deg < -140) deg += 180;
      s.deg = deg;
      coinRef.current?.turn(deg);
      coinRef.current?.move(x, y);

      if (soundOn) audio.current?.feed(dist / dt, removed > 0.05);

      s.x = x;
      s.y = y;
      s.t = t;
    },
    [kick],
  );

  const end = useCallback(() => {
    const s = stroke.current;
    if (!s.down) return;
    s.down = false;
    coinRef.current?.press(false);
    panels.current.forEach((p) => p.settle());
    audio.current?.stop();
  }, []);

  const cancelAuto = useCallback(() => {
    if (!auto.current) return;
    cancelAnimationFrame(auto.current.raf);
    auto.current = null;
    end();
  }, [end]);

  // pointer wiring
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let hovering = false;
    const onMove = (e: PointerEvent) => {
      if (!stroke.current.down) return;
      const list = e.getCoalescedEvents?.() ?? [];
      if (list.length) for (const c of list) moveTo(c.clientX, c.clientY, c.timeStamp);
      else moveTo(e.clientX, e.clientY, e.timeStamp);
    };
    const onUp = (e: PointerEvent) => {
      end();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (e.pointerType !== "mouse" || !hovering) coinRef.current?.show(false);
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest("button, a, input, select, textarea, label, [data-scratch-ignore]")) return;
      cancelAuto();
      e.preventDefault();
      (document.activeElement as HTMLElement | null)?.blur?.();
      begin(e.clientX, e.clientY, e.timeStamp);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    };
    const onHover = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || stroke.current.down) return;
      coinRef.current?.move(e.clientX, e.clientY);
    };
    const onEnter = (e: PointerEvent) => {
      hovering = true;
      if (e.pointerType !== "mouse") return;
      coinRef.current?.move(e.clientX, e.clientY);
      coinRef.current?.show(true);
    };
    const onLeave = () => {
      hovering = false;
      if (!stroke.current.down) coinRef.current?.show(false);
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onHover);
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onHover);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [begin, moveTo, end, cancelAuto]);

  useEffect(() => () => audio.current?.dispose(), []);

  // --- auto scrub (keyboard, demos) -----------------------------------------
  const autoScrub = useCallback(
    (only?: PanelApi) => {
      cancelAuto();
      const targets = only ? [only] : [...panels.current];
      if (!targets.length) return;
      const { resolved: tool } = cfg.current;
      // a believable scrub: tight vertical zigzags marching across each panel, then a second pass
      const pts: { x: number; y: number }[] = [];
      for (const p of targets) {
        const r = p.el.getBoundingClientRect();
        const step = tool.hl * 1.15;
        for (let pass = 0; pass < 2; pass++) {
          const off = pass * step * 0.5;
          let down = true;
          for (let x = r.left + tool.hl * 0.6 + off; x <= r.right - tool.hl * 0.3; x += step) {
            const jitter = () => (Math.random() - 0.5) * 6;
            pts.push({ x: x + jitter(), y: (down ? r.top + 4 : r.bottom - 4) + jitter() });
            pts.push({ x: x + step * 0.5 + jitter(), y: (down ? r.bottom - 4 : r.top + 4) + jitter() });
            down = !down;
          }
        }
      }
      let i = 0;
      let cx = pts[0].x;
      let cy = pts[0].y;
      let last = performance.now();
      begin(cx, cy, last);
      const state = { raf: 0 };
      auto.current = state;
      const tick = (now: number) => {
        let budget = Math.min(64, now - last) * 1.6; // px per ms
        last = now;
        while (budget > 0 && i < pts.length) {
          const tx = pts[i].x;
          const ty = pts[i].y;
          const d = Math.hypot(tx - cx, ty - cy);
          const stepLen = Math.min(budget, d, 6);
          if (d < 0.5) {
            i++;
            continue;
          }
          cx += ((tx - cx) / d) * stepLen;
          cy += ((ty - cy) / d) * stepLen;
          budget -= stepLen;
          moveTo(cx, cy, now - budget / 1.6);
        }
        if (i >= pts.length) {
          auto.current = null;
          end();
          coinRef.current?.show(false);
          return;
        }
        state.raf = requestAnimationFrame(tick);
      };
      state.raf = requestAnimationFrame(tick);
    },
    [begin, moveTo, end, cancelAuto],
  );

  const reset = useCallback(() => {
    cancelAuto();
    panels.current.forEach((p) => p.reset());
    debris.current?.clear();
    debris.current?.draw();
  }, [cancelAuto]);

  const api = useMemo<SurfaceApi>(
    () => ({
      register(panel) {
        panels.current.add(panel);
        debris.current?.setPalette(panel.coating.crumbs);
        return () => panels.current.delete(panel);
      },
      autoScrub,
      reset,
    }),
    [autoScrub, reset],
  );

  useImperativeHandle(
    ref,
    () => ({
      reset,
      blow(dirX = 0.35, dirY = 1) {
        debris.current?.blow(dirX, dirY);
        kick();
      },
      autoScrub: () => autoScrub(),
    }),
    [reset, autoScrub, kick],
  );

  return (
    <SurfaceContext.Provider value={api}>
      <div
        ref={root}
        className={["wui-surface", coin ? "wui-surface--coin" : "", className].filter(Boolean).join(" ")}
        style={style}
      >
        {children}
        <canvas ref={canvas} className="wui-debris" aria-hidden />
      </div>
      {coin && <CoinCursor ref={coinRef} type={coin} brushSize={brushSize} />}
    </SurfaceContext.Provider>
  );
});
