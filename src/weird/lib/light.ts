/**
 * One lamp for the whole page.
 *
 * Everything that catches light — holographic foil, scratch-off latex, the
 * coin — reads it from here, so highlights on separate canvases move in
 * unison, the way they would under a single desk lamp. The lamp hangs up and
 * to the left of the pointer; when the pointer goes quiet it drifts on its own
 * so foil never looks dead.
 *
 * Coordinates are viewport pixels, z towards the viewer.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

const OFFSET_X = -150;
const OFFSET_Y = -210;
const HEIGHT = 440;
const IDLE_AFTER = 3200;

const target = { x: 0, y: 0 };
const lamp: Vec3 = { x: 0, y: 0, z: HEIGHT };
let version = 0;
let lastFrame = -1;
let lastInput = -Infinity;
let idleSince = 0;
let installed = false;

function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  lamp.x = target.x = innerWidth * 0.5 + OFFSET_X;
  lamp.y = target.y = innerHeight * 0.45 + OFFSET_Y;

  const onPointer = (e: PointerEvent) => {
    target.x = e.clientX + OFFSET_X;
    target.y = e.clientY + OFFSET_Y;
    lastInput = performance.now();
  };
  addEventListener("pointermove", onPointer, { passive: true });
  addEventListener("pointerdown", onPointer, { passive: true });

  // Phones: tilting the handset swings the lamp instead.
  addEventListener(
    "deviceorientation",
    (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      target.x = innerWidth * 0.5 + OFFSET_X + e.gamma * 14;
      target.y = innerHeight * 0.45 + OFFSET_Y + (e.beta - 40) * 10;
      lastInput = performance.now();
    },
    { passive: true },
  );
}

/**
 * Advance the lamp to `now` (a rAF timestamp) and return it. Safe to call from
 * any number of render loops in the same frame; the first caller does the work.
 */
export function readLamp(now: number): { lamp: Vec3; version: number } {
  install();
  if (now !== lastFrame) {
    const dt = lastFrame < 0 ? 16 : Math.min(64, Math.max(0, now - lastFrame));
    lastFrame = now;

    let tx = target.x;
    let ty = target.y;
    const quiet = now - lastInput;
    if (quiet > IDLE_AFTER) {
      if (idleSince === 0) idleSince = now;
      // ease into the drift so the hand-off from the pointer isn't a jump
      const k = Math.min(1, (now - idleSince) / 2400);
      const t = now / 1000;
      tx += Math.sin(t * 0.61) * 150 * k + Math.sin(t * 1.7) * 18 * k;
      ty += Math.cos(t * 0.47) * 95 * k;
    } else {
      idleSince = 0;
    }

    const a = 1 - Math.exp(-dt / 75);
    const nx = lamp.x + (tx - lamp.x) * a;
    const ny = lamp.y + (ty - lamp.y) * a;
    if (Math.abs(nx - lamp.x) + Math.abs(ny - lamp.y) > 0.02) version++;
    lamp.x = nx;
    lamp.y = ny;
  }
  return { lamp, version };
}

/** The eye: centred over the viewport, a long way back. */
export function camera(): Vec3 {
  return { x: innerWidth / 2, y: innerHeight / 2, z: 1500 };
}
