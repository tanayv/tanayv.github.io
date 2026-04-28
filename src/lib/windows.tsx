import type { ReactElement } from "react";
import { IconUser, IconCamera, IconBook, IconHome } from "../components/Icon";

export type WindowId = "about" | "photography" | "writing";

export type WindowMeta = {
  id: WindowId;
  title: string;
  icon: () => ReactElement;
};

export const WINDOWS: WindowMeta[] = [
  { id: "about", title: "About", icon: () => <IconUser size={14} /> },
  { id: "photography", title: "Photography", icon: () => <IconCamera size={14} /> },
  { id: "writing", title: "Writing", icon: () => <IconBook size={14} /> },
];

export const HomeIcon = IconHome;

export const DEFAULT_FOCUS: WindowId = "about";
