import { useEffect, useState, type FC } from "react";
import { WINDOWS, HomeIcon, type WindowId } from "../lib/windows";

type Props = {
  focused: WindowId;
  onFocus: (id: WindowId) => void;
};

const Taskbar: FC<Props> = ({ focused, onFocus }) => {
  const [time, setTime] = useState<string>(formatTime(new Date()));

  useEffect(() => {
    const t = setInterval(() => setTime(formatTime(new Date())), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <nav className="taskbar" aria-label="Open windows">
      <button
        type="button"
        className="taskbar__start"
        onClick={() => onFocus("about")}
        title="Home"
      >
        <HomeIcon size={14} />
        <span>tanay.io</span>
      </button>
      <div className="taskbar__group">
        {WINDOWS.map((w) => {
          const active = focused === w.id;
          const Icon = w.icon;
          return (
            <button
              key={w.id}
              type="button"
              className={`taskbar__btn${active ? " taskbar__btn--active" : ""}`}
              onClick={() => onFocus(w.id)}
              aria-pressed={active}
            >
              <span className="taskbar__icon" aria-hidden>
                <Icon />
              </span>
              {w.title}
            </button>
          );
        })}
      </div>
      <div className="taskbar__clock" title="Local time">
        {time}
      </div>
    </nav>
  );
};

function formatTime(d: Date): string {
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

export default Taskbar;
