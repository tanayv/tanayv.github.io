export type Frame = {
  src: string;
  thumb: string;
  description?: string;
  location?: string;
};

export type Roll = {
  id: string;
  name: string;
  film: string;
  date: string;
  location: string;
  flag: string;
  blurb: string;
  frames: Frame[];
};

type RawFrame = {
  src: string;
  description?: string;
  location?: string;
};

const expand = (prefix: string) => (f: RawFrame): Frame => ({
  ...f,
  src: `${prefix}${f.src}-1600.webp`,
  thumb: `${prefix}${f.src}-400.webp`,
});

const baku: Frame[] = [
  { src: "25830001" },
  { src: "25830003" },
  { src: "25830005" },
  { src: "25830011" },
  { src: "25830012" },
  { src: "25830014" },
].map(expand("/35mm/baku/"));

const corbett: Frame[] = [
  { src: "37320005" },
  { src: "37320007" },
  { src: "37320014" },
  { src: "37320016" },
  { src: "37320032" },
  { src: "37320036" },
].map(expand("/35mm/corbett/"));

const newfoundland: Frame[] = [
  { src: "000042050008", location: "Gros Morne National Park, NL" },
  { src: "000042050027", location: "Gros Morne National Park, NL" },
  { src: "000042050028", location: "Rocky Harbour, NL" },
  { src: "000042050029", location: "Rocky Harbour, NL" },
  { src: "000042050032", location: "Bonavista, NL" },
  { src: "000042050038_1", location: "Gros Morne National Park, NL" },
  { src: "000165660016", location: "St. John's, NL" },
  { src: "000165660017", location: "St. John's, NL" },
  { src: "000165660021", location: "Gander, NL" },
  { src: "000165660022", location: "Gander, NL" },
  { src: "000165660025", location: "Rocky Harbour, NL" },
  { src: "000165660027", location: "Gros Morne National Park, NL" },
].map(expand("/35mm/newfoundland/"));

export const ROLLS: Roll[] = [
  {
    id: "newfoundland",
    name: "Newfoundland",
    film: "Kodak Portra 800",
    date: "2025",
    location: "St. John's, NL",
    flag: "🇨🇦",
    blurb: "",
    frames: newfoundland,
  },
  {
    id: "corbett",
    name: "Corbett",
    film: "Kodak Gold 200",
    date: "2024",
    location: "Jim Corbett National Park, IN",
    flag: "🇮🇳",
    blurb: "",
    frames: corbett,
  },
  {
    id: "baku",
    name: "Baku",
    film: "Kodak Portra 800",
    date: "2024",
    location: "Baku, AZ",
    flag: "🇦🇿",
    blurb: "",
    frames: baku,
  },
];
