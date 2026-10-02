import { useEffect, useId, useRef, type Ref } from "react";
import { HoloFoil, type FoilPattern, type Tilt } from "../holo/HoloFoil";
import { readLamp } from "../lib/light";
import { Scratchcard } from "../scratchcard/Scratchcard";
import { ScratchSurface, type ScratchSurfaceHandle } from "../scratchcard/ScratchSurface";
import type { CoatingName, CoinName, ToolName } from "../scratchcard/presets";
import "./ticket.css";

export type InkName = "emerald" | "violet" | "tangerine" | "midnight" | "rose";

export const INKS: Record<InkName, { ink: string; deep: string; label: string }> = {
  emerald: { ink: "#22b455", deep: "#0a4a22", label: "Emerald" },
  violet: { ink: "#8d5cff", deep: "#2a1068", label: "Violet" },
  tangerine: { ink: "#ff8a2a", deep: "#702400", label: "Tangerine" },
  midnight: { ink: "#3f74ff", deep: "#0a1b57", label: "Midnight" },
  rose: { ink: "#ff4f98", deep: "#650733", label: "Rose" },
};

export interface TicketProps {
  coating?: CoatingName;
  print?: string | null;
  foil?: FoilPattern;
  ink?: InkName;
  coin?: CoinName | false;
  tool?: ToolName;
  brushSize?: number;
  shavings?: number;
  sound?: boolean;
  threshold?: number;
  surfaceRef?: Ref<ScratchSurfaceHandle>;
  onProgress?: (p: number) => void;
  onReveal?: () => void;
}

const W = 344;
const H = 548;

const PRIZES: [string, string][] = [
  ["$5", "FIVE"],
  ["$1M", "ONE MIL"],
  ["$20", "TWENTY"],
  ["$1M", "ONE MIL"],
  ["$2", "TWO"],
  ["$5", "FIVE"],
  ["$50", "FIFTY"],
  ["$1", "ONE"],
  ["$1M", "ONE MIL"],
];

/** Panels, in ticket coordinates. */
const MAIN = { x: 25, y: 186, w: 294, h: 194 };
const BONUS = { x: 25, y: 420, w: 146, h: 50 };
const VOID = { x: 214, y: 500, w: 106, h: 22 };

export function Ticket({
  coating = "silver",
  print = "Reveal ✶",
  foil = "sunburst",
  ink = "emerald",
  coin = "quarter",
  tool = "coin",
  brushSize = 26,
  shavings = 1,
  sound = false,
  threshold = 0.7,
  surfaceRef,
  onProgress,
  onReveal,
}: TicketProps) {
  const id = useId().replace(/:/g, "");
  const tilt = useRef<Tilt>({ rx: 0, ry: 0 });
  const stage = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const gloss = useRef<HTMLDivElement>(null);
  const colors = INKS[ink];

  // tilt toward the pointer, flatten while the coin is down; slide the
  // shadow and the varnish highlight with the lamp
  useEffect(() => {
    const st = stage.current;
    const el = card.current;
    if (!st || !el) return;
    let raf = 0;
    let target = { rx: 0, ry: 0 };
    let pressed = false;
    const onMove = (e: PointerEvent) => {
      const r = st.getBoundingClientRect();
      const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      target = { rx: Math.max(-1, Math.min(1, ny)) * -4, ry: Math.max(-1, Math.min(1, nx)) * 5 };
    };
    const onDown = (e: PointerEvent) => {
      if (el.contains(e.target as Node)) pressed = true;
    };
    const onUp = () => (pressed = false);
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("pointerdown", onDown, { passive: true });
    addEventListener("pointerup", onUp, { passive: true });
    addEventListener("pointercancel", onUp, { passive: true });

    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const goal = pressed ? { rx: 0, ry: 0 } : target;
      const k = 1 - Math.exp(-dt / (pressed ? 45 : 220));
      const t = tilt.current;
      t.rx += (goal.rx - t.rx) * k;
      t.ry += (goal.ry - t.ry) * k;
      el.style.transform = `perspective(1600px) rotateX(${t.rx.toFixed(3)}deg) rotateY(${t.ry.toFixed(3)}deg)`;

      const { lamp } = readLamp(now);
      const r = st.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      // shadow falls away from the lamp; lower lamp, longer shadow
      const dx = (cx - lamp.x) / lamp.z;
      const dy = (cy - lamp.y) / lamp.z;
      if (shadow.current) shadow.current.style.transform = `translate(${(dx * 16).toFixed(1)}px, ${(dy * 16 + 4).toFixed(1)}px)`;
      if (gloss.current) {
        const gr = el.getBoundingClientRect();
        // the varnish reflects the lamp at its mirror point between lamp and eye
        const gx = ((lamp.x + innerWidth / 2) / 2 - gr.left) / gr.width;
        const gy = ((lamp.y + innerHeight / 2) / 2 - gr.top) / gr.height;
        gloss.current.style.setProperty("--gx", `${(gx * 100).toFixed(1)}%`);
        gloss.current.style.setProperty("--gy", `${(gy * 100).toFixed(1)}%`);
      }
      st.style.setProperty("--lx", `${(((lamp.x + 150) - r.left) / r.width * 100).toFixed(1)}%`);
      st.style.setProperty("--ly", `${(((lamp.y + 210) - r.top) / r.height * 100).toFixed(1)}%`);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerdown", onDown);
      removeEventListener("pointerup", onUp);
      removeEventListener("pointercancel", onUp);
    };
  }, []);

  const knock = (b: { x: number; y: number; w: number; h: number }, pad: number, r: number) => (
    <rect x={b.x - pad} y={b.y - pad} width={b.w + pad * 2} height={b.h + pad * 2} rx={r} fill="#000" />
  );

  return (
    <div ref={stage} className="tk-stage">
      <div className="tk-hold">
        <div ref={shadow} className="tk-shadow" aria-hidden />
        <div ref={card} className="tk-tilt">
          <ScratchSurface
            ref={surfaceRef}
            className="tk"
            coin={coin}
            tool={tool}
            brushSize={brushSize}
            shavings={shavings}
            sound={sound}
            bleed={44}
          >
            <div
              className="tk-card"
              style={{ "--ink": colors.ink, "--deep": colors.deep } as React.CSSProperties}
            >
              <HoloFoil className="tk-foil" pattern={foil} tilt={tilt} center={[0.5, 0.17]} />

              {/* process inks, overprinted on the foil */}
              <svg className="tk-ink" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden>
                <defs>
                  <pattern id={`${id}-motif`} width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
                    <path d="M11 5 L12.4 9.6 L17 11 L12.4 12.4 L11 17 L9.6 12.4 L5 11 L9.6 9.6 Z" fill={colors.deep} opacity="0.5" />
                    <circle cx="0" cy="0" r="1.1" fill={colors.deep} opacity="0.45" />
                    <circle cx="22" cy="22" r="1.1" fill={colors.deep} opacity="0.45" />
                  </pattern>
                  <radialGradient id={`${id}-glow`} cx="0.5" cy="0.16" r="0.75">
                    <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
                    <stop offset="0.45" stopColor="#fff" stopOpacity="0.15" />
                    <stop offset="1" stopColor="#fff" stopOpacity="0" />
                  </radialGradient>
                  <mask id={`${id}-hole`}>
                    <rect width={W} height={H} fill="#fff" />
                    <text x={W / 2} y="112" textAnchor="middle" className="tk-title-mask">
                      REVEAL
                    </text>
                  </mask>
                  <mask id={`${id}-knock`}>
                    <rect width={W} height={H} fill="#fff" />
                    {/* title letters stay bare foil */}
                    <text x={W / 2} y="112" textAnchor="middle" className="tk-title-mask">
                      REVEAL
                    </text>
                    {knock(MAIN, 7, 10)}
                    {knock(BONUS, 5, 7)}
                    <rect x="0" y="488" width={W} height={H - 488} fill="#000" />
                  </mask>
                </defs>
                <g mask={`url(#${id}-knock)`}>
                  <rect width={W} height={H} fill={colors.ink} />
                  <rect width={W} height={H} fill={`url(#${id}-glow)`} />
                  <rect width={W} height={H} fill={`url(#${id}-motif)`} />
                  <rect x="0" y="0" width={W} height="10" fill={colors.deep} opacity="0.6" />
                  {/* sunburst rays printed behind the title */}
                  <g opacity="0.22" fill={colors.deep}>
                    {Array.from({ length: 28 }, (_, i) => {
                      const a0 = (i / 28) * Math.PI * 2;
                      const a1 = a0 + Math.PI / 28;
                      const cx = W / 2;
                      const cy = 92;
                      const R = 400;
                      return (
                        <path
                          key={i}
                          d={`M${cx} ${cy} L${cx + Math.cos(a0) * R} ${cy + Math.sin(a0) * R} L${cx + Math.cos(a1) * R} ${cy + Math.sin(a1) * R} Z`}
                        />
                      );
                    })}
                  </g>
                </g>
                {/* title drop, in the deep ink */}
                <text
                  x={W / 2 + 2.5}
                  y="115"
                  textAnchor="middle"
                  className="tk-title"
                  fill={colors.deep}
                  opacity="0.85"
                  mask={`url(#${id}-hole)`}
                >
                  REVEAL
                </text>
              </svg>

              {/* opaque white ink */}
              <svg className="tk-white" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden>
                <text x={W / 2} y="112" textAnchor="middle" className="tk-title tk-title--outline">
                  REVEAL
                </text>
                <rect x={MAIN.x - 7} y={MAIN.y - 7} width={MAIN.w + 14} height={MAIN.h + 14} rx="10" fill="none" stroke="#fbfaf6" strokeWidth="5" />
                <rect x={BONUS.x - 5} y={BONUS.y - 5} width={BONUS.w + 10} height={BONUS.h + 10} rx="7" fill="none" stroke="#fbfaf6" strokeWidth="3.5" />
                <rect x="0" y="488" width={W} height={H - 488} fill="#fbfaf6" />
                <circle cx="300" cy="40" r="22" fill="#fbfaf6" />
              </svg>

              <div className="tk-type" aria-hidden>
                <div className="tk-brand">
                  weird/ui <span>Instant</span>
                </div>
                <div className="tk-price">
                  <small>$</small>1
                </div>
                <div className="tk-sub">Weird Web October · Game 01</div>
                <div className="tk-rule">Match 3 like amounts, win that amount.</div>
                <div className="tk-bonus-label">
                  Bonus<small>Reveal a free component</small>
                </div>
                <div className="tk-top">
                  <small>Top prize</small>
                  $1,000,000
                </div>
                <Barcode />
                <div className="tk-serial">0101 26 REVEAL 004217 · 1 of 1</div>
                <div className="tk-fine">
                  Odds of a reveal: 1 in 1. Not a real lottery. Prizes paid in imaginary currency. Void where weird.
                </div>
                <div className="tk-void-label">Validation</div>
              </div>

              <Scratchcard
                className="tk-panel"
                style={{ left: MAIN.x, top: MAIN.y, width: MAIN.w, height: MAIN.h }}
                coating={coating}
                print={print}
                radius={5}
                seed={11}
                threshold={threshold}
                onProgress={onProgress}
                onReveal={onReveal}
                aria-label="Main play area. Press Enter to scratch."
              >
                <div className="tk-under tk-under--gold">
                  <div className="tk-prizes">
                    {PRIZES.map(([amt, cap], i) => (
                      <div key={i} className="tk-prize">
                        <b>{amt}</b>
                        <span>{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Scratchcard>

              <Scratchcard
                className="tk-panel"
                style={{ left: BONUS.x, top: BONUS.y, width: BONUS.w, height: BONUS.h }}
                coating={coating}
                print={print ? "Bonus" : null}
                radius={4}
                seed={23}
                aria-label="Bonus box. Press Enter to scratch."
              >
                <div className="tk-under tk-under--gold tk-bonus">
                  <small>You won</small>
                  <code>&lt;Scratchcard /&gt;</code>
                </div>
              </Scratchcard>

              <Scratchcard
                className="tk-panel"
                style={{ left: VOID.x, top: VOID.y, width: VOID.w, height: VOID.h }}
                coating={coating}
                print={print ? "Void if removed" : null}
                radius={2}
                seed={37}
                aria-label="Validation code. Press Enter to scratch."
              >
                <div className="tk-under tk-void">7F3A·0101·R</div>
              </Scratchcard>

              <div ref={gloss} className="tk-gloss" aria-hidden />
            </div>
          </ScratchSurface>
        </div>
      </div>
    </div>
  );
}

function Barcode() {
  // deterministic bars, Code-128-ish rhythm
  const bars: [number, number][] = [];
  let x = 0;
  let seed = 7;
  while (x < 122) {
    seed = (seed * 16807) % 2147483647;
    const w = 1 + (seed % 3) * 0.75;
    bars.push([x, w]);
    x += w + 1 + ((seed >> 4) % 3) * 0.8;
  }
  return (
    <svg className="tk-barcode" viewBox="0 0 124 26" width="124" height="26" aria-hidden>
      {bars.map(([bx, bw], i) => (
        <rect key={i} x={bx} y="0" width={bw} height="26" fill="#111" />
      ))}
    </svg>
  );
}
