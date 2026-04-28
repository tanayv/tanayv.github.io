import type { FC, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 16): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "square",
  strokeLinejoin: "miter",
  "aria-hidden": true,
});

export const IconUser: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...base(size)} {...rest}>
    <circle cx="8" cy="5.2" r="2.4" />
    <path d="M2.5 13.5c.7-2.4 2.9-3.6 5.5-3.6s4.8 1.2 5.5 3.6" />
  </svg>
);

export const IconCamera: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...base(size)} {...rest}>
    <path d="M2 5h2.4l1-1.4h5.2l1 1.4H14v7H2z" />
    <circle cx="8" cy="9" r="2.4" />
    <circle cx="8" cy="9" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

export const IconBook: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...base(size)} {...rest}>
    <path d="M2.5 3h4.5c.8 0 1.4.6 1.4 1.4V13c-.4-.7-1-.9-1.6-.9H2.5z" />
    <path d="M13.5 3H9c-.8 0-1.4.6-1.4 1.4V13c.4-.7 1-.9 1.6-.9h4.3z" />
  </svg>
);

export const IconHome: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...base(size)} {...rest}>
    <path d="M2 8 L8 2.5 L14 8" />
    <path d="M3.5 7v6.5h9V7" />
    <rect x="6.8" y="9.5" width="2.4" height="4" />
  </svg>
);

export const IconReel: FC<IconProps & { active?: boolean }> = ({
  size = 24,
  active,
  ...rest
}) => {
  const fg = active ? "#f4ead2" : "#214a3c";
  const bg = active ? "#143028" : "#e9dcb8";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...rest}>
      <rect
        x="0.75"
        y="0.75"
        width="22.5"
        height="22.5"
        fill={bg}
        stroke={fg}
        strokeWidth="1.4"
      />
      <circle cx="12" cy="12" r="6.5" fill="none" stroke={fg} strokeWidth="1.2" />
      <circle cx="12" cy="12" r="2" fill={fg} />
      <circle cx="12" cy="4.5" r="1.2" fill={fg} />
      <circle cx="12" cy="19.5" r="1.2" fill={fg} />
      <circle cx="4.5" cy="12" r="1.2" fill={fg} />
      <circle cx="19.5" cy="12" r="1.2" fill={fg} />
    </svg>
  );
};

export const IconMail: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...base(size)} {...rest}>
    <rect x="2" y="3.5" width="12" height="9" />
    <path d="M2 4 L8 9 L14 4" />
  </svg>
);
