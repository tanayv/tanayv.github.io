import { useRef, useState } from "react";
import { INKS, Ticket, type InkName } from "../demos/Ticket";
import type { FoilPattern } from "../holo/HoloFoil";
import { COATINGS, COINS, type CoatingName, type CoinName, type ToolName } from "../scratchcard/presets";
import type { ScratchSurfaceHandle } from "../scratchcard/ScratchSurface";
import { CodeBlock } from "./CodeBlock";

const FOILS: { value: FoilPattern; label: string }[] = [
  { value: "sunburst", label: "Sunburst" },
  { value: "cracked-ice", label: "Cracked ice" },
  { value: "waves", label: "Waves" },
  { value: "glitter", label: "Glitter" },
  { value: "plain", label: "Plain silver" },
];

const COATING_SWATCH: Record<CoatingName, string> = {
  silver: "linear-gradient(135deg,#e1e4e8,#9aa0a7 55%,#cdd1d6)",
  gold: "linear-gradient(135deg,#f3dc9a,#b48c3e 55%,#e6c675)",
  copper: "linear-gradient(135deg,#f0b48c,#9a5a33 55%,#d99068)",
  graphite: "linear-gradient(135deg,#76797e,#2f3134 55%,#5b5e63)",
  holo: "conic-gradient(from 200deg,#c9ccd2,#ffb3c7,#b3f0ff,#d6c2ff,#fff3b0,#c9ccd2)",
};

interface Config {
  coating: CoatingName;
  print: string;
  foil: FoilPattern;
  ink: InkName;
  coin: CoinName | "none";
  tool: ToolName;
  brushSize: number;
  shavings: number;
  threshold: number;
  sound: boolean;
}

const DEFAULTS: Config = {
  coating: "silver",
  print: "Reveal ✶",
  foil: "sunburst",
  ink: "emerald",
  coin: "quarter",
  tool: "coin",
  brushSize: 26,
  shavings: 1,
  threshold: 0.7,
  sound: false,
};

function snippet(c: Config) {
  const props: string[] = [];
  if (c.coating !== "silver") props.push(`coating="${c.coating}"`);
  if (c.print !== "Scratch here") props.push(c.print ? `print="${c.print}"` : "print={null}");
  if (c.coin === "none") props.push("coin={false}");
  else if (c.coin !== "quarter") props.push(`coin="${c.coin}"`);
  if (c.tool !== "coin") props.push(`tool="${c.tool}"`);
  if (c.brushSize !== 26) props.push(`brushSize={${c.brushSize}}`);
  if (c.shavings !== 1) props.push(`shavings={${c.shavings}}`);
  if (c.threshold !== 0.7) props.push(`threshold={${c.threshold}}`);
  if (c.sound) props.push("sound");
  props.push("onReveal={() => claim()}");
  const attrs = props.map((p) => `\n  ${p}`).join("");
  return `import { Scratchcard } from "@/weird/scratchcard";

<Scratchcard${attrs}
>
  <PrizeGrid />
</Scratchcard>`;
}

export default function Playground() {
  const [c, setC] = useState<Config>(DEFAULTS);
  const [progress, setProgress] = useState(0);
  const [won, setWon] = useState(false);
  const [round, setRound] = useState(0);
  const surface = useRef<ScratchSurfaceHandle>(null);
  const set = <K extends keyof Config>(k: K, v: Config[K]) => setC((o) => ({ ...o, [k]: v }));

  const pct = Math.round(progress * 100);

  return (
    <div className="frame">
      <div className="frame__bar">
        <span className="frame__title">Playground</span>
        <span className="frame__spacer" />
        <span className={`meter ${won ? "meter--done" : ""}`} aria-live="polite">
          <span className="meter__bar" aria-hidden>
            <span className="meter__fill" style={{ width: `${pct}%`, display: "block" }} />
          </span>
          {won ? `revealed · ${pct}%` : `${pct}% scratched`}
        </span>
        <button type="button" className="btn" onClick={() => surface.current?.autoScrub()}>
          Auto-scratch
        </button>
        <button type="button" className="btn" onClick={() => surface.current?.blow()} title="Blow the shavings off the card">
          Blow
        </button>
        <button
          type="button"
          className="btn btn--dark"
          onClick={() => {
            surface.current?.reset();
            setProgress(0);
            setWon(false);
            setRound((r) => r + 1);
          }}
        >
          New ticket
        </button>
      </div>

      <div className="play">
        <div className="play__stage">
          <Ticket
            key={round}
            surfaceRef={surface}
            coating={c.coating}
            print={c.print || null}
            foil={c.foil}
            ink={c.ink}
            coin={c.coin === "none" ? false : c.coin}
            tool={c.tool}
            brushSize={c.brushSize}
            shavings={c.shavings}
            threshold={c.threshold}
            sound={c.sound}
            onProgress={setProgress}
            onReveal={() => setWon(true)}
          />
        </div>

        <div className="controls">
          <h5>Latex</h5>
          <div className="field">
            <span className="field__label">
              Coating <code>{c.coating}</code>
            </span>
            <div className="swatches" role="group" aria-label="Coating">
              {(Object.keys(COATINGS) as CoatingName[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  className="swatch"
                  style={{ background: COATING_SWATCH[k] }}
                  aria-pressed={c.coating === k}
                  aria-label={k}
                  title={k}
                  onClick={() => set("coating", k)}
                />
              ))}
            </div>
          </div>
          <label className="field">
            <span className="field__label">Printed legend</span>
            <input type="text" value={c.print} maxLength={24} placeholder="(blank)" onChange={(e) => set("print", e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">
              Reveal at <output>{Math.round(c.threshold * 100)}%</output>
            </span>
            <input type="range" min={0.2} max={0.98} step={0.02} value={c.threshold} onChange={(e) => set("threshold", +e.target.value)} />
          </label>

          <h5>Hand</h5>
          <div className="field">
            <span className="field__label">Coin</span>
            <div className="seg" role="group" aria-label="Coin">
              {([...Object.keys(COINS), "none"] as (CoinName | "none")[]).map((k) => (
                <button key={k} type="button" aria-pressed={c.coin === k} onClick={() => set("coin", k)}>
                  {k === "none" ? "None" : COINS[k].label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="field__label">Tool</span>
            <div className="seg" role="group" aria-label="Tool">
              {(["coin", "nail", "key"] as ToolName[]).map((k) => (
                <button key={k} type="button" aria-pressed={c.tool === k} onClick={() => set("tool", k)}>
                  {k === "nail" ? "Fingernail" : k[0].toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span className="field__label">
              Brush size <output>{c.brushSize}px</output>
            </span>
            <input type="range" min={14} max={44} step={1} value={c.brushSize} onChange={(e) => set("brushSize", +e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">
              Shavings <output>{c.shavings === 0 ? "off" : `×${c.shavings}`}</output>
            </span>
            <input type="range" min={0} max={2.5} step={0.25} value={c.shavings} onChange={(e) => set("shavings", +e.target.value)} />
          </label>
          <label className="switch">
            Scratch sound
            <input type="checkbox" checked={c.sound} onChange={(e) => set("sound", e.target.checked)} />
          </label>

          <h5>Ticket</h5>
          <label className="field">
            <span className="field__label">Foil</span>
            <select value={c.foil} onChange={(e) => set("foil", e.target.value as FoilPattern)}>
              {FOILS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <div className="field">
            <span className="field__label">
              Ink <code>{c.ink}</code>
            </span>
            <div className="swatches" role="group" aria-label="Ink">
              {(Object.keys(INKS) as InkName[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  className="swatch"
                  style={{ background: INKS[k].ink }}
                  aria-pressed={c.ink === k}
                  aria-label={INKS[k].label}
                  title={INKS[k].label}
                  onClick={() => set("ink", k)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="play__code">
        <CodeBlock code={snippet(c)} />
      </div>
    </div>
  );
}
