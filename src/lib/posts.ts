export type PostBlock =
  | { type: "p"; html: string }
  | { type: "img"; src: string; alt: string }
  | { type: "more"; href: string; label?: string };

export type PostMeta = {
  type: string;
  challenge: string;
  timeline: string;
  solution?: string;
  awards?: string[];
  links?: { label: string; href: string }[];
};

export type Post = {
  slug: string;
  title: string;
  date: string;
  num: string;
  tagline: string;
  cover: string;
  meta: PostMeta;
  body: PostBlock[];
};

export const POSTS: Post[] = [
  {
    slug: "turkbox",
    num: "01",
    title: "Turkbox",
    date: "Aug 2018",
    tagline: "A way to pay for news by training AI.",
    cover: "/blog/turkbox-cover.png",
    meta: {
      type: "Entrepreneurship · Technology · Journalism",
      challenge:
        "Online news is increasingly behind paywalls — readers lose access, publishers lose readers.",
      timeline: "Aug 2018 — Jun 2020",
      solution:
        "A platform where publishers embed CAPTCHA-style data annotation tasks. Readers complete tasks to unlock articles. Data buyers pay publishers per task.",
      awards: [
        "Winner — Google News Initiative APAC Innovation Challenge",
        "4th overall — Cozad New Venture Competition",
        "Meyer Capel Prize — Cozad",
        "Huawei Innovation Award — Cozad",
      ],
      links: [
        { label: "Website", href: "https://www.turkbox.io" },
        {
          label: "Google News blog",
          href: "https://www.blog.google/around-the-globe/google-asia/here-are-winners-gni-innovation-challenge-asia-pacific/",
        },
        {
          label: "Cozad results",
          href: "https://tec.illinois.edu/news/articles-from-tec/30694",
        },
      ],
    },
    body: [
      {
        type: "p",
        html: `We started working on Turkbox at the end of summer 2018, with a goal to make news and information on the internet free. As users of the internet, we're fundamentally frustrated with today's online news media landscape. Online news publications are increasingly adopting the paywall business model, where readers get a certain number of free articles after which they have to buy a subscription to continue reading. This is a problem for readers and the internet in general, as information is no longer free.`,
      },
      {
        type: "p",
        html: `Turkbox is a content monetization platform that allows publications to embed CAPTCHA-like data classification or annotation tasks, which readers complete to get access to articles. This gives readers a more "accessible" pay-as-you-go option, since even though articles remain behind a barrier of sorts, readers are more inclined to complete a straightforward data classification task than they are to buy a subscription to a news publication website they may or may not use in the future.`,
      },
      {
        type: "img",
        src: "/blog/turkbox-cozad.jpg",
        alt: "Winning prizes at the Cozad 2018 competition at UIUC",
      },
      {
        type: "p",
        html: `With funding from the Google News Initiative, we plan to run a pilot of our platform over the summer. For the pilot, we're going to be based out of New Delhi, with the aim of working with medium to small-sized publications across India.`,
      },
      {
        type: "more",
        href: "https://medium.com/@tanayvardhan/building-turkbox-a-way-to-pay-for-news-by-training-ai-ed19ef1bb02e",
        label: "Read full article on Medium",
      },
    ],
  },
  {
    slug: "charo",
    num: "02",
    title: "Charo",
    date: "Jun 2018",
    tagline: "Spotify + Genius + translation, for following along in another language.",
    cover: "/blog/charo-cover.jpg",
    meta: {
      type: "Side project",
      challenge: "Looking up and translating song lyrics is tedious.",
      timeline: "Jun 2018 — Aug 2018 · 3 months",
      solution:
        "A React app that picks up Spotify playback, looks up lyrics from Genius, and shows lyrics with translation side-by-side.",
      links: [
        { label: "Live demo", href: "https://charognard.herokuapp.com" },
        { label: "GitHub", href: "https://github.com/tanayv/charo" },
      ],
    },
    body: [
      {
        type: "p",
        html: `Last summer, I was interning at Amadeus, near Nice, France. I started listening to a lot of French rap and French music in general — from friends and the radio of the shuttle I took to work every day. I also discovered some cool playlists curated on Spotify, like Cloud Rap and Rap FR. Even in songs I had heard before, I could now understand words other than footballers' names thanks to my slightly improved French. I was looking up song lyrics more often on Genius and translating them with Google Translate. This usually turned out to be a pretty tedious process, especially on my phone.`,
      },
      {
        type: "p",
        html: `For a long time I had been meaning to use the Spotify Web API but I never really got around to it because I couldn't come up with a good idea. The flow I had in mind was simple: pull current track info from Spotify, find the same song on Genius for lyrics, run those through a translation API, and display everything in a small UI that lets me toggle between original and translation.`,
      },
      {
        type: "img",
        src: "/blog/charo-screenshot.png",
        alt: "Logging in with Spotify and opening translations for the song you're playing",
      },
      {
        type: "p",
        html: `In the future, I don't see this app as a direct replacement for Spotify, but it would be nice to add some playback control — pause, rewind, skip, switch playlists. The Spotify API allows all of that.`,
      },
      {
        type: "more",
        href: "https://medium.com/@tanayvardhan/scaling-the-language-barrier-in-french-rap-with-react-and-redux-a9b3a9348f77",
        label: "Read full article on Medium",
      },
    ],
  },
  {
    slug: "digital-asia",
    num: "03",
    title: "Digital Asia",
    date: "Jan 2017",
    tagline:
      "An Angular CMS so high-school teachers could integrate Asian-studies documentaries into their classes.",
    cover: "/blog/digital-asia-cover.png",
    meta: {
      type: "On-campus job",
      challenge:
        "How can we integrate documentaries on Asian culture and history into high-school curricula?",
      timeline: "Jan 2017 — Apr 2018",
      solution: "An Angular-powered CMS and website.",
      links: [
        { label: "Live site", href: "https://digitalasia.illinois.edu" },
      ],
    },
    body: [
      {
        type: "p",
        html: `I worked with the Center for East Asian and Pacific Studies (CEAPS) as a web developer on Digital Asia. The objective was to build a portal that students could use to watch annotated documentaries on Asia. The first solution I worked on was a static Angular application that could be deployed in the serverless environment we were initially working with.`,
      },
      {
        type: "p",
        html: `After the first iteration was complete, the static website was introduced to teachers from high schools around Urbana, Champaign, Tuscola, and Fisher in Illinois. Before launch, we held a "Digital Asia usability testing" session where we asked teachers how they anticipated students using the platform and what improvements we could make. We learned that teachers were also looking for help preparing assignments, and wanted a space on the site for content related to the documentaries.`,
      },
      {
        type: "img",
        src: "/blog/digital-asia-dashboard.png",
        alt: "A screenshot of the Digital Asia dashboard",
      },
      {
        type: "p",
        html: `With this new requirement, we began work on a dashboard for teachers. CEAPS staff onboard teachers using verified school email IDs. The dashboard contains supplemental presentations, video transcripts and curriculum guides. We extended its functionality with a section that lets CEAPS staff add and edit content — something that wasn't possible in our initial serverless environment.`,
      },
      {
        type: "p",
        html: `To support that, I developed a PHP backend hosted on the university's Apache hosting environment. The Angular frontend now queries the PHP backend for content and dashboard operations. I also implemented a client-side restriction so that, due to licensing, the documentaries on the site can only be viewed from North America.`,
      },
    ],
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}
