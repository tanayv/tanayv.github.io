# Adding a photography roll

The site never serves the original camera scans. For every frame we ship two
WebP variants:

| variant       | width   | quality | used for                              |
| ------------- | ------- | ------- | ------------------------------------- |
| `-1600.webp`  | 1600 px | 82      | reel frames, fullscreen viewer        |
| `-400.webp`   | 400 px  | 78      | explorer thumbnails, description card |

The originals are intentionally **not committed** — they exist locally only
long enough to generate the WebPs.

## Prerequisites

```sh
brew install webp   # provides cwebp
```

## 1. Drop the scans in

Create a folder for the roll and copy the originals in. The folder name is the
roll's URL slug (`/photography/<roll>`).

```sh
mkdir -p public/35mm/<roll>
cp ~/scans/<roll>/*.{jpg,JPG} public/35mm/<roll>/
```

The base filenames don't matter — keep whatever the lab gave you. Just stay
consistent within a roll (all `.jpg` or all `.JPG`).

## 2. Generate the WebPs

Run from the project root:

```sh
ROLL=<roll>
cd public/35mm/$ROLL
for f in *.JPG *.jpg; do
  [ -f "$f" ] || continue
  base="${f%.*}"
  cwebp -q 82 -resize 1600 0 -m 4 -mt -metadata none "$f" -o "${base}-1600.webp"
  cwebp -q 78 -resize 400  0 -m 4 -mt -metadata none "$f" -o "${base}-400.webp"
done
cd -
```

Expect ~250–400 KB per `-1600.webp` and ~10–20 KB per `-400.webp`. If a
`-1600.webp` comes out >700 KB, the source was probably already JPEG — drop
quality to `-q 78` for that frame.

## 3. Delete the originals

```sh
rm public/35mm/$ROLL/*.JPG public/35mm/$ROLL/*.jpg
```

Don't commit the originals. `du -sh public/35mm/$ROLL` should show only the
WebPs (a few MB total per roll).

## 4. Wire it into `src/lib/rolls.ts`

Add a frame array and a roll entry. The `src` field holds the **base** filename
(no extension, no `-1600` suffix) — the `expand()` helper appends the variants:

```ts
const myroll: Frame[] = [
  { src: "IMG_0001", location: "Reykjavík, IS" },
  { src: "IMG_0002" },
  // …
].map(expand("/35mm/myroll/"));

export const ROLLS: Roll[] = [
  {
    id: "myroll",
    name: "Reykjavík",
    film: "Cinestill 800T",
    date: "2026",
    location: "Reykjavík, IS",
    flag: "🇮🇸",
    blurb: "",
    frames: myroll,
  },
  // … existing rolls
];
```

Per-frame `description` and `location` override the roll-level fallbacks in the
description pane and fullscreen viewer.

## 5. Verify

```sh
pnpm build
pnpm dev
```

Open `/photography/<roll>` and check the reel scrolls smoothly, the explorer
thumbnail loads, and the fullscreen viewer is sharp. The reel's first three
frames load eagerly; the rest are lazy.

## Tuning

- **Sharper reel**: bump `-1600.webp` to `-q 88` (≈1.5× the byte size).
- **Smaller deploy**: lower `-1600.webp` to `-q 75` if a roll is mostly soft / low-detail.
- **Different aspect**: the reel locks frames at 3:2 (`.reel__frame` in `sections.css`). Portrait orientation works in the fullscreen viewer (auto-detected) but looks cropped in the reel — keep horizontals on the reel where possible.
