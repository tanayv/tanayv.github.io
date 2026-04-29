import type { FC } from "react";

type Props = {
  label: string;
  progress: number;
  size?: "default" | "compact";
};

const Loader: FC<Props> = ({ label, progress, size = "default" }) => {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div className={`loader loader--${size}`} role="status" aria-live="polite">
      <div className="loader__head">
        <span className="loader__label">Requesting {label}…</span>
        <span className="loader__pct">{pct}%</span>
      </div>
      <div className="loader__bar" aria-hidden>
        <div className="loader__bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export default Loader;
