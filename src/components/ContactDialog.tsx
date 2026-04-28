import type { FC } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

const ContactDialog: FC<Props> = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div
      className="dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Contact"
      onClick={onClose}
    >
      <div className="window dialog" onClick={(e) => e.stopPropagation()}>
        <div className="window__titlebar">
          <div className="titlebar-btns">
            <button
              type="button"
              className="titlebar-btn"
              onClick={onClose}
              aria-label="Close dialog"
            >
              ×
            </button>
          </div>
          <div className="window__title">contact.txt</div>
          <div className="titlebar-btns" aria-hidden>
            <span
              className="titlebar-btn"
              style={{ pointerEvents: "none", opacity: 0.7 }}
            >
              ::
            </span>
          </div>
        </div>
        <div className="window__body">
          <p className="h-display" style={{ margin: "0 0 8px", color: "var(--cream)", fontSize: 22 }}>
            say hi.
          </p>
          <div className="dialog__row">
            <span style={{ color: "var(--lacquer-glow)" }}>email</span>
            <a href="mailto:tanayvardhan@gmail.com">tanayvardhan@gmail.com</a>
          </div>
          <div className="dialog__row">
            <span style={{ color: "var(--lacquer-glow)" }}>linkedin</span>
            <a href="https://linkedin.com/in/tanayv" target="_blank" rel="noreferrer">
              /in/tanayv
            </a>
          </div>
          <div className="dialog__row">
            <span style={{ color: "var(--lacquer-glow)" }}>github</span>
            <a href="https://github.com/tanayv" target="_blank" rel="noreferrer">
              @tanayv
            </a>
          </div>
          <div className="dialog__row">
            <span style={{ color: "var(--lacquer-glow)" }}>location</span>
            <span style={{ color: "var(--cream)" }}>San Francisco, CA</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactDialog;
