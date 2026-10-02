import { useRef, useState } from "react";
import { Scratchcard, type ScratchcardHandle, type Coating } from "../scratchcard";
import "./examples.css";

/** The smallest useful card: one panel, everything default. */
export function FortuneExample() {
  const card = useRef<ScratchcardHandle>(null);
  const [done, setDone] = useState(false);
  return (
    <div className="ex">
      <div className="ex-fortune">
        <span className="ex-fortune__label">Today's fortune</span>
        <Scratchcard ref={card} className="ex-fortune__panel" onReveal={() => setDone(true)} seed={4}>
          <p className="ex-fortune__text">You will build something nobody asked for, and it will be great.</p>
        </Scratchcard>
      </div>
      <div className="ex-actions">
        <span className="muted">{done ? "Revealed." : "Scratch it."}</span>
        <button
          type="button"
          className="btn"
          onClick={() => {
            card.current?.reset();
            setDone(false);
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

/** Your own latex colours, and a fingernail instead of a coin. */
const BRICK: Coating = {
  base: "#b5543c",
  sheen: "#ffd6c4",
  metal: 0.25,
  holo: 0,
  ink: "#5a1e10",
  crumbs: ["#7a3424", "#c4705a", "#3a140b"],
};

export function CouponExample() {
  const card = useRef<ScratchcardHandle>(null);
  return (
    <div className="ex">
      <div className="ex-coupon">
        <div className="ex-coupon__left">
          <b>Mystery discount</b>
          <span>Valid on one (1) weird thing</span>
        </div>
        <Scratchcard ref={card} className="ex-coupon__panel" coating={BRICK} tool="nail" coin={false} print="?" brushSize={30} seed={9}>
          <div className="ex-coupon__off">
            <b>−40%</b>
          </div>
        </Scratchcard>
      </div>
      <div className="ex-actions">
        <button type="button" className="btn" onClick={() => card.current?.scratch()}>
          Scratch for me
        </button>
        <button type="button" className="btn" onClick={() => card.current?.reset()}>
          Reset
        </button>
      </div>
    </div>
  );
}

/** Intro page: the tagline itself is under latex. */
export function HeroStrip() {
  return (
    <Scratchcard className="hero-strip" coating="silver" print="Scratch me" seed={2} threshold={0.6} aria-label="Scratch to reveal the tagline. Press Enter to scratch.">
      <p className="hero-strip__text">Components nobody asked for. One a day, all October.</p>
    </Scratchcard>
  );
}
