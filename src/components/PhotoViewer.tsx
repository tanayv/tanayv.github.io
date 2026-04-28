import { useEffect, useState, type FC, type SyntheticEvent } from "react";

type Props = {
  frames: string[];
  index: number;
  rollName: string;
  onChange: (i: number) => void;
  onClose: () => void;
};

type Orientation = "landscape" | "portrait";

const PhotoViewer: FC<Props> = ({ frames, index, rollName, onChange, onClose }) => {
  const [orientation, setOrientation] = useState<Orientation>("landscape");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onChange(Math.min(frames.length - 1, index + 1));
      else if (e.key === "ArrowLeft") onChange(Math.max(0, index - 1));
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [frames, index, onChange, onClose]);

  const src = frames[index]!;

  const handleLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setOrientation(img.naturalWidth >= img.naturalHeight ? "landscape" : "portrait");
  };

  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label="Fullscreen photo">
      <div className="viewer__bar">
        <span className="viewer__title">
          {rollName} · {String(index + 1).padStart(2, "0")} / {String(frames.length).padStart(2, "0")}
        </span>
        <button
          type="button"
          className="viewer__close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="viewer__stage" onClick={onClose}>
        <div className={`viewer__frame viewer__frame--${orientation}`}>
          <img
            className="viewer__img"
            src={src}
            alt=""
            onLoad={handleLoad}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
      <div className="viewer__controls">
        <button
          type="button"
          className="viewer__btn"
          onClick={() => onChange(Math.max(0, index - 1))}
          disabled={index === 0}
          aria-label="Previous frame"
        >
          ‹‹ prev
        </button>
        <span className="viewer__counter">
          {String(index + 1).padStart(2, "0")} / {String(frames.length).padStart(2, "0")}
        </span>
        <button
          type="button"
          className="viewer__btn"
          onClick={() => onChange(Math.min(frames.length - 1, index + 1))}
          disabled={index === frames.length - 1}
          aria-label="Next frame"
        >
          next ››
        </button>
      </div>
    </div>
  );
};

export default PhotoViewer;
