import { forwardRef, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { COINS, type CoinName, type Metal } from "./presets";

/**
 * A coin held edge-down against the card, seen from above: the face is a
 * foreshortened ellipse and the reeded edge shows as a band underneath it.
 * The bottom of that band is the contact point and sits exactly on the
 * pointer.
 *
 * The coin turns to keep its edge square to the stroke, but the lamp doesn't
 * turn with it: every gradient and the emboss light are counter-rotated.
 */

const TILT = 0.5; // face foreshortening (cos of the lean)
const LAMP_AZIMUTH = 235; // degrees, SVG convention (clockwise from +x)

export interface CoinHandle {
  move(x: number, y: number): void;
  turn(deg: number): void;
  press(down: boolean): void;
  show(visible: boolean): void;
}

interface Props {
  type: CoinName;
  /** contact edge length, css px */
  brushSize: number;
}

export const CoinCursor = forwardRef<CoinHandle, Props>(function CoinCursor({ type, brushSize }, ref) {
  const coin = COINS[type];
  const D = Math.round(brushSize * coin.scale);
  const rx = D / 2;
  const ry = rx * TILT;
  const band = Math.max(3, D * coin.thickness * 0.9);
  const pad = 3;
  const W = D + pad * 2;
  const H = ry * 2 + band + pad * 2;
  const id = useId().replace(/:/g, "");

  const root = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const contact = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const state = useRef({ x: -999, y: -999, deg: 0, down: false, visible: false });

  const apply = () => {
    const s = state.current;
    if (!root.current || !body.current || !shadow.current || !contact.current) return;
    root.current.style.transform = `translate3d(${s.x}px, ${s.y}px, 0)`;
    root.current.style.opacity = s.visible ? "1" : "0";
    const press = s.down ? 1 : 0;
    // pressing lowers the coin's lean a touch: shorter ellipse, tighter shadow
    body.current.style.transform = `rotate(${s.deg}deg) translateY(${press * 0.5}px) scaleY(${1 - press * 0.06})`;
    // the shadow falls away from the lamp in world space, so it isn't rotated with the offset
    const rad = (s.deg * Math.PI) / 180;
    const lift = s.down ? 0.6 : 1;
    const fx = Math.sin(rad) * (ry + band) * 0.6;
    const fy = -Math.cos(rad) * (ry + band) * 0.6;
    shadow.current.style.transform = `translate(${fx + D * 0.16 * lift}px, ${fy + D * 0.24 * lift}px) rotate(${s.deg}deg)`;
    shadow.current.style.opacity = String(s.down ? 0.42 : 0.3);
    contact.current.style.transform = `rotate(${s.deg}deg)`;
    contact.current.style.opacity = s.down ? "0.6" : "0";

    // counter-rotate the lighting
    const local = LAMP_AZIMUTH - s.deg;
    const el = svg.current;
    if (el) {
      el.querySelectorAll<SVGGradientElement>("[data-lit]").forEach((g) =>
        g.setAttribute("gradientTransform", `rotate(${-s.deg} 0.5 0.5)`),
      );
      el.querySelectorAll("feDistantLight").forEach((l) => l.setAttribute("azimuth", String(local)));
    }
  };

  useImperativeHandle(ref, () => ({
    move(x, y) {
      state.current.x = x;
      state.current.y = y;
      apply();
    },
    turn(deg) {
      state.current.deg = deg;
      apply();
    },
    press(down) {
      state.current.down = down;
      apply();
    },
    show(visible) {
      state.current.visible = visible;
      apply();
    },
  }));

  useLayoutEffect(apply);

  const face = useMemo(() => <CoinFace id={id} type={type} r={rx} />, [id, type, rx]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div ref={root} className="wui-coin" aria-hidden style={{ opacity: 0 }}>
      <div
        ref={shadow}
        className="wui-coin__shadow"
        style={{ width: D * 0.98, height: ry * 2 + band * 0.6, left: -D * 0.49, top: -(ry * 2 + band * 0.6) / 2 }}
      />
      <div
        ref={contact}
        className="wui-coin__contact"
        style={{ width: brushSize * 0.9, left: -brushSize * 0.45 }}
      />
      <div
        ref={body}
        className="wui-coin__body"
        style={{ width: W, height: H, left: -W / 2, top: -H + pad, transformOrigin: `50% ${H - pad}px` }}
      >
        <svg ref={svg} width={W} height={H} viewBox={`${-W / 2} ${-ry - pad} ${W} ${H}`}>
          <defs>
            <MetalGradients id={id} metal={coin.outer} suffix="o" />
            {coin.inner && <MetalGradients id={id} metal={coin.inner} suffix="i" />}
            <filter id={`${id}-emboss`} x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="0.55" result="b" />
              <feSpecularLighting in="b" surfaceScale="2.4" specularConstant="1.1" specularExponent="14" lightingColor="#ffffff" result="s">
                <feDistantLight azimuth={LAMP_AZIMUTH} elevation="38" />
              </feSpecularLighting>
              <feComposite in="s" in2="SourceAlpha" operator="in" result="s2" />
              <feDiffuseLighting in="b" surfaceScale="2.4" diffuseConstant="1" lightingColor="#ffffff" result="d">
                <feDistantLight azimuth={LAMP_AZIMUTH} elevation="38" />
              </feDiffuseLighting>
              <feComposite in="SourceGraphic" in2="d" operator="arithmetic" k1="1.05" k2="0" k3="0" k4="0" result="lit" />
              <feComposite in="lit" in2="s2" operator="arithmetic" k1="0" k2="1" k3="0.75" k4="0" />
            </filter>
          </defs>
          {/* edge band: the lower half of the face ellipse, extruded */}
          <path
            d={`M ${-rx} 0 L ${-rx} ${band} A ${rx} ${ry} 0 0 0 ${rx} ${band} L ${rx} 0 A ${rx} ${ry} 0 0 1 ${-rx} 0 Z`}
            fill={`url(#${id}-edge-o)`}
          />
          {coin.reeded && (
            <g stroke={coin.outer.deep} strokeWidth={0.55} opacity={0.55}>
              {Array.from({ length: 70 }, (_, i) => {
                const t = ((i + 0.5) / 70) * Math.PI;
                const x = -rx * Math.cos(t);
                const y = ry * Math.sin(t);
                return <line key={i} x1={x} y1={y + 0.4} x2={x} y2={y + band - 0.2} />;
              })}
            </g>
          )}
          {/* where the edge meets the card it's worn bright */}
          <path
            d={`M ${-rx * 0.5} ${band + ry * 0.866 - 0.2} A ${rx} ${ry} 0 0 0 ${rx * 0.5} ${band + ry * 0.866 - 0.2}`}
            stroke={coin.outer.hi}
            strokeWidth={0.9}
            fill="none"
            opacity={0.7}
          />
          <g transform={`scale(1 ${TILT})`}>{face}</g>
        </svg>
      </div>
    </div>,
    document.body,
  );
});

function MetalGradients({ id, metal, suffix }: { id: string; metal: Metal; suffix: string }) {
  return (
    <>
      <linearGradient id={`${id}-face-${suffix}`} data-lit x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={metal.hi} />
        <stop offset="0.38" stopColor={metal.mid} />
        <stop offset="0.7" stopColor={metal.lo} />
        <stop offset="1" stopColor={metal.mid} />
      </linearGradient>
      <linearGradient id={`${id}-rim-${suffix}`} data-lit x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={metal.hi} />
        <stop offset="0.5" stopColor={metal.lo} />
        <stop offset="1" stopColor={metal.deep} />
      </linearGradient>
      <linearGradient id={`${id}-rimin-${suffix}`} data-lit x1="1" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor={metal.hi} />
        <stop offset="0.55" stopColor={metal.mid} />
        <stop offset="1" stopColor={metal.deep} />
      </linearGradient>
      <linearGradient id={`${id}-edge-${suffix}`} data-lit x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={metal.lo} />
        <stop offset="0.28" stopColor={metal.hi} />
        <stop offset="0.6" stopColor={metal.mid} />
        <stop offset="1" stopColor={metal.deep} />
      </linearGradient>
    </>
  );
}

function CoinFace({ id, type, r }: { id: string; type: CoinName; r: number }) {
  const coin = COINS[type];
  const outer = "o";
  const inner = coin.inner ? "i" : "o";
  const field = r * 0.86;
  const ringPath = `M 0 ${r * 0.7} A ${r * 0.7} ${r * 0.7} 0 1 1 0 ${-r * 0.7} A ${r * 0.7} ${r * 0.7} 0 1 1 0 ${r * 0.7}`;
  const ink = coin.outer.lo;
  const fs = Math.max(4, r * 0.17);

  return (
    <g>
      {/* raised rim */}
      <circle r={r} fill={`url(#${id}-rim-${outer})`} />
      <circle r={field + 0.8} fill={`url(#${id}-rimin-${outer})`} />
      {/* field */}
      <circle r={field} fill={`url(#${id}-face-${outer})`} />
      {coin.inner && (
        <>
          <circle r={r * 0.6} fill={`url(#${id}-rimin-${inner})`} />
          <circle r={r * 0.58} fill={`url(#${id}-face-${inner})`} />
        </>
      )}
      <path id={`${id}-ring`} d={ringPath} fill="none" />
      <g filter={`url(#${id}-emboss)`} fill={ink} opacity={0.9}>
        <text fontSize={fs} fontFamily="Georgia, 'Times New Roman', serif" fontWeight={700} letterSpacing={fs * 0.12}>
          <textPath href={`#${id}-ring`} startOffset="2%">
            {coin.legend}
          </textPath>
        </text>
        {coin.glyph === "eye" && <Eye r={r} fill={COINS[type].outer.lo} />}
        {coin.glyph === "cent" && (
          <text
            fontSize={r * 0.62}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="Georgia, serif"
            fontWeight={700}
            fill={COINS[type].outer.lo}
          >
            1¢
          </text>
        )}
        {coin.glyph === "two" && (
          <text
            fontSize={r * 0.78}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="Georgia, serif"
            fontWeight={700}
            fill={coin.inner?.lo}
          >
            2
          </text>
        )}
      </g>
    </g>
  );
}

function Eye({ r, fill }: { r: number; fill: string }) {
  const w = r * 0.5;
  const h = r * 0.27;
  return (
    <g fill={fill}>
      <path
        d={`M ${-w} 0 Q 0 ${-h * 2} ${w} 0 Q 0 ${h * 2} ${-w} 0 Z M ${-w * 0.78} 0 Q 0 ${h * 1.45} ${w * 0.78} 0 Q 0 ${-h * 1.45} ${-w * 0.78} 0 Z`}
        fillRule="evenodd"
      />
      <circle r={h * 0.82} />
      {[...Array(9)].map((_, i) => {
        const a = (i / 9) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={Math.cos(a) * w * 1.18}
            y1={Math.sin(a) * w * 1.18}
            x2={Math.cos(a) * w * 1.4}
            y2={Math.sin(a) * w * 1.4}
            stroke={fill}
            strokeWidth={r * 0.05}
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
}
