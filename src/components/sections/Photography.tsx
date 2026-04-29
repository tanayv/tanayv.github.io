import { useEffect, useMemo, useRef, useState, type FC } from "react";
import { ROLLS } from "../../lib/rolls";
import PhotoViewer from "../PhotoViewer";
import Loader from "../Loader";

type Props = {
  rollId?: string | undefined;
  onRollChange?: (id: string) => void;
};

const MIN_LOADER_MS = 700;

function useImageBatchLoader(key: string, srcs: string[]) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProgress(0);
    setReady(false);

    if (srcs.length === 0) {
      setProgress(100);
      setReady(true);
      return;
    }

    let cancelled = false;
    let loaded = 0;
    const start = Date.now();
    const total = srcs.length;

    const finish = () => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, MIN_LOADER_MS - elapsed);
      window.setTimeout(() => {
        if (!cancelled) setReady(true);
      }, remaining);
    };

    srcs.forEach((src) => {
      const img = new Image();
      const handle = () => {
        if (cancelled) return;
        loaded += 1;
        setProgress((loaded / total) * 100);
        if (loaded === total) finish();
      };
      img.onload = handle;
      img.onerror = handle;
      img.src = src;
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { progress, ready };
}

const Photography: FC<Props> = ({ rollId, onRollChange }) => {
  const resolvedRollId =
    (rollId && ROLLS.find((r) => r.id === rollId)?.id) ?? ROLLS[0]!.id;

  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [viewerOpen, setViewerOpen] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>("all");
  const trackRef = useRef<HTMLDivElement | null>(null);

  const years = useMemo(() => {
    const set = new Set(ROLLS.map((r) => r.date));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, []);

  const visibleRolls = useMemo(
    () => (filter === "all" ? ROLLS : ROLLS.filter((r) => r.date === filter)),
    [filter],
  );

  const roll = useMemo(
    () => ROLLS.find((r) => r.id === resolvedRollId) ?? ROLLS[0]!,
    [resolvedRollId],
  );

  const count = roll.frames.length;
  const activeFrame = roll.frames[activeIdx] ?? roll.frames[0]!;

  const reelLoader = useImageBatchLoader(roll.id, roll.frames);
  const explorerLoader = useImageBatchLoader(
    `explorer:${filter}`,
    visibleRolls.map((r) => r.frames[0]!),
  );
  const descLoader = useImageBatchLoader(`desc:${activeFrame}`, [activeFrame]);

  // Reset frame index when roll changes
  useEffect(() => {
    setActiveIdx(0);
  }, [resolvedRollId]);

  useEffect(() => {
    if (!reelLoader.ready) return;
    const el = trackRef.current?.querySelector<HTMLElement>(
      `[data-idx="${activeIdx}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeIdx, resolvedRollId, reelLoader.ready]);

  const select = (idx: number) => {
    setActiveIdx(Math.max(0, Math.min(count - 1, idx)));
  };

  const switchRoll = (id: string) => {
    onRollChange?.(id);
  };

  return (
    <div className="photography">
      {/* Top: reel */}
      <div className="reel">
        <div className="reel__header">
          <span className="reel__roll-name">{roll.name}</span>
          <span className="reel__counter">
            {String(activeIdx + 1).padStart(2, "0")} / {String(count).padStart(2, "0")} ·{" "}
            {roll.film}
          </span>
        </div>
        <div className="reel__track-wrap">
          {reelLoader.ready ? (
            <div className="reel__track" ref={trackRef}>
              {roll.frames.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  className={`reel__frame${i === activeIdx ? " reel__frame--active" : ""}`}
                  data-num={String(i + 1).padStart(2, "0")}
                  data-idx={i}
                  onClick={() => {
                    if (i === activeIdx) {
                      setViewerOpen(true);
                    } else {
                      select(i);
                    }
                  }}
                  aria-label={`Frame ${i + 1}`}
                >
                  <img src={src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          ) : (
            <Loader
              label={`${roll.id}.reel`}
              progress={reelLoader.progress}
            />
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="photo-bottom">
        {/* Explorer */}
        <div className="explorer">
          <div className="explorer__bar">
            <label className="explorer__filter-label" htmlFor="photo-filter">
              view
            </label>
            <div className="explorer__filter-wrap">
              <select
                id="photo-filter"
                className="explorer__filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Rolls</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <span className="explorer__filter-caret" aria-hidden>
                ▾
              </span>
            </div>
          </div>
          {explorerLoader.ready ? (
            <div className="explorer__list">
              {visibleRolls.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`roll-row${r.id === resolvedRollId ? " roll-row--active" : ""}`}
                  onClick={() => switchRoll(r.id)}
                >
                  <span className="roll-row__icon" aria-hidden>
                    <img src={r.frames[0]} alt="" loading="lazy" />
                  </span>
                  <span className="roll-row__text">
                    <span className="roll-row__name">{r.name}</span>
                    <span className="roll-row__sub">
                      {r.film} · {r.frames.length} frames · {r.date}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="explorer__list">
              <Loader label="archive.lst" progress={explorerLoader.progress} />
            </div>
          )}
        </div>

        {/* Controls + description */}
        <div className="controls">
          <div className="controls__transport" role="group" aria-label="Reel controls">
            <button
              type="button"
              className="transport-btn"
              onClick={() => select(activeIdx - 1)}
              aria-label="Previous frame"
              title="Prev"
            >
              ‹‹
            </button>
            <button
              type="button"
              className="transport-btn transport-btn--center"
              onClick={() => select(0)}
              aria-label="Rewind"
              title="Rewind"
            >
              ∞
            </button>
            <button
              type="button"
              className="transport-btn"
              onClick={() => select(activeIdx + 1)}
              aria-label="Next frame"
              title="Next"
            >
              ››
            </button>
            <button
              type="button"
              className="transport-btn transport-btn--full"
              onClick={() => setViewerOpen(true)}
              aria-label="View fullscreen"
              title="Fullscreen"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                <path
                  d="M1.5 5V1.5h3.5M9 1.5h3.5V5M12.5 9v3.5H9M5 12.5H1.5V9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="square"
                />
              </svg>
            </button>
          </div>

          {descLoader.ready ? (
            <div className="description">
              <div className="description__main">
                <h2 className="description__title">{roll.name}</h2>
                <dl className="description__meta">
                  <dt>film</dt>
                  <dd>{roll.film}</dd>
                  <dt>shot</dt>
                  <dd>{roll.flag} {roll.location} · {roll.date}</dd>
                </dl>
                <p className="description__body">{roll.blurb}</p>
              </div>
              <button
                type="button"
                className="description__thumb"
                aria-label="Open fullscreen"
                onClick={() => setViewerOpen(true)}
              >
                <img src={activeFrame} alt="" loading="lazy" />
              </button>
            </div>
          ) : (
            <div className="description">
              <Loader label={`${roll.id}.meta`} progress={descLoader.progress} />
            </div>
          )}
        </div>
      </div>

      {viewerOpen && (
        <PhotoViewer
          frames={roll.frames}
          index={activeIdx}
          rollName={roll.name}
          onChange={(i) => select(i)}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  );
};

export default Photography;
