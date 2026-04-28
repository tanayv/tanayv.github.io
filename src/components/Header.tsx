import type { FC } from "react";
import { IconMail } from "./Icon";

type Props = {
  onContact: () => void;
};

const Header: FC<Props> = ({ onContact }) => {
  return (
    <header className="header" role="banner">
      <div className="header__brand">
        <span className="header__avatar" aria-hidden>
          <img src="/tanay.jpeg" alt="" />
        </span>
        <span className="header__brand-text">TANAY VARDHAN</span>
      </div>
      <button
        type="button"
        className="header__action"
        onClick={onContact}
        aria-label="Open contact info"
        title="Contact"
      >
        <IconMail size={14} />
      </button>
    </header>
  );
};

export default Header;
