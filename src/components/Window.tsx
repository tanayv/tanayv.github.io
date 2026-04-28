import type { FC, ReactElement, ReactNode } from "react";

type Props = {
  title: string;
  icon?: ReactElement;
  hidden?: boolean;
  children: ReactNode;
};

const Window: FC<Props> = ({ title, icon, hidden, children }) => {
  return (
    <section
      className={`window${hidden ? " window--hidden" : ""}`}
      aria-hidden={hidden ? "true" : undefined}
    >
      <div className="window__titlebar">
        <div className="titlebar-btns" aria-hidden>
          {icon ? (
            <span className="titlebar-btn titlebar-btn--icon" aria-hidden>
              {icon}
            </span>
          ) : null}
        </div>
        <div className="window__title">{title}</div>
        <div className="titlebar-btns titlebar-btns--spacer" aria-hidden />
      </div>
      <div className="window__body">{children}</div>
    </section>
  );
};

export default Window;
