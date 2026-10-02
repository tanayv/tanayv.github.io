export type CoatingName = "silver" | "gold" | "copper" | "graphite" | "holo";

export interface Coating {
  /** Body colour of the latex, sRGB hex. */
  base: string;
  /** Colour of the specular sheen. */
  sheen: string;
  /** 0 = matte rubber, 1 = metallic ink with flakes. */
  metal: number;
  /** Strength of a diffraction grating embossed into the coating. */
  holo: number;
  /** Ink used for the text printed on top of the latex. */
  ink: string;
  /** Shavings: [rolled-up underside, exposed top, deep shadow]. */
  crumbs: [string, string, string];
}

export const COATINGS: Record<CoatingName, Coating> = {
  silver: {
    base: "#a7abb0",
    sheen: "#f4f6fa",
    metal: 0.8,
    holo: 0,
    ink: "#55595f",
    crumbs: ["#6c7075", "#b7bbc0", "#33363a"],
  },
  gold: {
    base: "#b89752",
    sheen: "#fff1c4",
    metal: 0.85,
    holo: 0,
    ink: "#6d5524",
    crumbs: ["#7d6430", "#d2b46c", "#3c2e12"],
  },
  copper: {
    base: "#a8704a",
    sheen: "#ffd9bd",
    metal: 0.8,
    holo: 0,
    ink: "#5e3720",
    crumbs: ["#6f4529", "#c88f68", "#341d0f"],
  },
  graphite: {
    base: "#4a4c50",
    sheen: "#d6dae0",
    metal: 0.35,
    holo: 0,
    ink: "#2a2b2e",
    crumbs: ["#3a3c3f", "#5f6266", "#17181a"],
  },
  holo: {
    base: "#9da2a8",
    sheen: "#ffffff",
    metal: 0.9,
    holo: 0.8,
    ink: "#4b4f55",
    crumbs: ["#6a6e74", "#bfc3c9", "#2f3236"],
  },
};

export type ToolName = "coin" | "nail" | "key";

export interface Tool {
  /** Contact length as a fraction of `brushSize`. */
  length: number;
  /** Half-thickness of the contact edge, css px. */
  edge: number;
  /** Wear deposited by one perpendicular pass. Latex toughness averages ~0.7. */
  bite: number;
  /** 0 = clean even edge, 1 = badly nicked. */
  streak: number;
  /** Chance per css px travelled of tearing out a chip of latex. */
  chip: number;
}

export const TOOLS: Record<ToolName, Tool> = {
  coin: { length: 1, edge: 1.3, bite: 0.95, streak: 0.7, chip: 0.05 },
  nail: { length: 0.42, edge: 1.8, bite: 0.62, streak: 0.3, chip: 0.012 },
  key: { length: 0.2, edge: 0.9, bite: 1.7, streak: 0.15, chip: 0.06 },
};

export type CoinName = "quarter" | "penny" | "euro";

export interface Metal {
  hi: string;
  mid: string;
  lo: string;
  deep: string;
}

const SILVER: Metal = { hi: "#f7f9fb", mid: "#bcc1c7", lo: "#767c84", deep: "#3c4046" };
const COPPER: Metal = { hi: "#ffd8b8", mid: "#c07a4c", lo: "#7a3d1e", deep: "#3e1c0b" };
const BRASS: Metal = { hi: "#fff0b8", mid: "#cfa952", lo: "#86641f", deep: "#45320c" };

export interface Coin {
  label: string;
  /** Diameter relative to the brush size. */
  scale: number;
  /** Visible edge thickness relative to diameter. */
  thickness: number;
  reeded: boolean;
  outer: Metal;
  inner: Metal | null;
  legend: string;
  glyph: "eye" | "cent" | "two";
}

export const COINS: Record<CoinName, Coin> = {
  quarter: {
    label: "Quarter",
    scale: 3.1,
    thickness: 0.075,
    reeded: true,
    outer: SILVER,
    inner: null,
    legend: "IN WEIRD WE TRUST · MMXXVI ·",
    glyph: "eye",
  },
  penny: {
    label: "Penny",
    scale: 2.6,
    thickness: 0.07,
    reeded: false,
    outer: COPPER,
    inner: null,
    legend: "ONE CENT · OCTOBER · REVEAL ·",
    glyph: "cent",
  },
  euro: {
    label: "2 Euro",
    scale: 3.3,
    thickness: 0.085,
    reeded: true,
    outer: BRASS,
    inner: SILVER,
    legend: "★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★",
    glyph: "two",
  },
};
