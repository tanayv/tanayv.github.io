export type Frame = {
  src: string;
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

const expand = (prefix: string, ext: string) => (f: Frame): Frame => ({
  ...f,
  src: `${prefix}${f.src}${ext}`,
});

const baku: Frame[] = [
  { src: "25830001", description: "", location: "" },
  { src: "25830003", description: "", location: "" },
  { src: "25830005", description: "", location: "" },
  { src: "25830011", description: "", location: "" },
  { src: "25830012", description: "", location: "" },
  { src: "25830014", description: "", location: "" },
].map(expand("/35mm/baku/", ".JPG"));

const corbett: Frame[] = [
  { src: "37320005", description: "", location: "" },
  { src: "37320007", description: "", location: "" },
  { src: "37320014", description: "", location: "" },
  { src: "37320016", description: "", location: "" },
  { src: "37320032", description: "", location: "" },
  { src: "37320036", description: "", location: "" },
].map(expand("/35mm/corbett/", ".JPG"));

const newfoundland: Frame[] = [
  { src: "000042050008", description: "", location: "Gros Morne National Park, NL" },
  { src: "000042050027", description: "", location: "Gros Morne National Park, NL" },
  { src: "000042050028", description: "", location: "Rocky Harbour, NL" },
  { src: "000042050029", description: "", location: "Rocky Harbour, NL" },
  { src: "000042050032", description: "", location: "Bonavista, NL" },
  { src: "000042050038_1", description: "", location: "Gros Morne National Park, NL" },
  { src: "000165660016", description: "", location: "St. John's, NL" },
  { src: "000165660017", description: "", location: "St. John's, NL" },
  { src: "000165660021", description: "", location: "Gander, NL" },
  { src: "000165660022", description: "", location: "Gander, NL" },
  { src: "000165660025", description: "", location: "Rocky Harbour, NL" },
  { src: "000165660027", description: "", location: "Gros Morne National Park, NL" },
].map(expand("/35mm/newfoundland/", ".jpg"));

export const ROLLS: Roll[] = [
  {
    id: "newfoundland",
    name: "Newfoundland",
    film: "Kodak Portra 800",
    date: "2025",
    location: "St. John's, NL",
    flag: "🇨🇦",
    blurb:
      "",
    frames: newfoundland,
  },
  {
    id: "corbett",
    name: "Corbett",
    film: "Kodak Gold 200",
    date: "2024",
    location: "Jim Corbett National Park, IN",
    flag: "🇮🇳",
    blurb:
      "",
    frames: corbett,
  },
  {
    id: "baku",
    name: "Baku",
    film: "Kodak Portra 800",
    date: "2024",
    location: "Baku, AZ",
    flag: "🇦🇿",
    blurb:
      "",
    frames: baku,
  },
];
