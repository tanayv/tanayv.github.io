export type Roll = {
  id: string;
  name: string;
  film: string;
  date: string;
  location: string;
  flag: string;
  blurb: string;
  frames: string[];
};

const baku = [
  "25830001",
  "25830003",
  "25830005",
  "25830011",
  "25830012",
  "25830014",
].map((n) => `/35mm/baku/${n}.JPG`);

const corbett = [
  "37320005",
  "37320007",
  "37320014",
  "37320016",
  "37320032",
  "37320036",
].map((n) => `/35mm/corbett/${n}.JPG`);

const newfoundland = [
  "000042050008",
  "000042050027",
  "000042050028",
  "000042050029",
  "000042050032",
  "000042050038_1",
  "000165660016",
  "000165660017",
  "000165660021",
  "000165660022",
  "000165660025",
  "000165660027",
].map((n) => `/35mm/newfoundland/${n}.jpg`);

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
