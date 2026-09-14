import {readFile, writeFile} from "node:fs/promises";

// Decimal prefixes are kept in reading order on every ring, orbit, and arm.
const constants = {
  pi: "3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679",
  e: "2.7182818284590452353602874713526624977572470936999595749669676277240766303535475945713821785251664274",
  phi: "1.6180339887498948482045868343656381177203091798057628621354486227052604628189024497072072041893911374",
  tau: "6.2831853071795864769252867665590057683943387987502116419498891846156328125724179972560696506842341359",
  i: "1 i -1 -i ".repeat(16),
} as const;

const digits: Record<string, readonly string[]> = {
  "0": ["111", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "111", "001", "111"],
  "4": ["101", "101", "111", "001", "001"],
  "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"],
  "7": ["111", "001", "010", "010", "010"],
  "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "111"],
  ".": ["000", "000", "000", "000", "010"],
  i: ["010", "000", "110", "010", "111"],
  "-": ["000", "000", "111", "000", "000"],
  " ": ["000", "000", "000", "000", "000"],
};

// Frozen bitmap outlines keep the swashed italic glyphs identical on every platform.
const glyphs = JSON.parse(await readFile(new URL("../packages/web/assets/constant-glyphs.json", import.meta.url), "utf8")) as Record<Constant, readonly string[]>;

const size = 256;
const center = size / 2;
const turn = Math.PI * 2;
const goldenGrowth = Math.log((1 + Math.sqrt(5)) / 2) / (Math.PI / 2);
type Constant = keyof typeof constants;
type ArtworkDetail = "detail" | "compact" | "orbital";
interface Point {
  x: number;
  y: number;
  angle: number;
  depth: number;
}

/** Converts a bitmap into square, grid-snapped pixels without any font dependency. */
function bitmapPath(bitmap: readonly string[], x: number, y: number, cell: number, angle = 0): string {
  const width = bitmap[0]!.length;
  const height = bitmap.length;
  const paths: string[] = [];
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      if (bitmap[row]![column] !== "1") continue;
      const dx = (column - (width - 1) / 2) * cell;
      const dy = (row - (height - 1) / 2) * cell;
      const px = Math.round((x + dx * Math.cos(angle) - dy * Math.sin(angle) - cell / 2) * 2) / 2;
      const py = Math.round((y + dx * Math.sin(angle) + dy * Math.cos(angle) - cell / 2) * 2) / 2;
      paths.push(`M${px} ${py}h${cell}v${cell}h-${cell}z`);
    }
  }
  return paths.join("");
}

/** Projects circular orbits and logarithmic arms into a shared, uncluttered silhouette. */
function pointOnCurve(constant: Constant, layer: number, t: number, detail: ArtworkDetail): Point {
  const compact = detail === "compact";
  const orbital = detail === "orbital";
  const start = -Math.PI / 2 + layer * 0.47;
  if (constant === "pi") {
    const radius = compact ? 99 : orbital ? 68 + layer * 16 : 60 + layer * 9;
    const theta = start + t * turn;
    return {x: center + radius * Math.cos(theta), y: center + radius * Math.sin(theta), angle: theta + Math.PI / 2, depth: 1};
  }
  if (constant === "tau") {
    const theta = -Math.PI / 2 + (layer * turn) / (compact ? 2 : orbital ? 4 : 5) + t * turn;
    const radius = 62 + t * 52;
    return {x: center + radius * Math.cos(theta), y: center + radius * Math.sin(theta), angle: theta + Math.PI / 2, depth: 1 - t * 0.8};
  }
  if (constant === "i") {
    const theta = -Math.PI / 2 + ((layer % 4) * Math.PI) / 2 + t * Math.PI * 0.43;
    const radius = compact ? 98 : 78 + Math.floor(layer / 4) * 27;
    return {x: center + radius * Math.cos(theta), y: center + radius * Math.sin(theta), angle: theta + Math.PI / 2, depth: 1 - t * 0.6};
  }
  if (constant === "e") {
    const theta = t * turn;
    const tilt = (layer * Math.PI) / (compact ? 3 : orbital ? 5 : 6);
    const radius = compact ? 103 : 101 + (layer % 2) * 8;
    const flatten = 0.58;
    const x = radius * Math.cos(theta);
    const y = radius * flatten * Math.sin(theta);
    const tangent = Math.atan2(flatten * Math.cos(theta), -Math.sin(theta)) + tilt;
    return {
      x: center + x * Math.cos(tilt) - y * Math.sin(tilt),
      y: center + x * Math.sin(tilt) + y * Math.cos(tilt),
      angle: tangent,
      depth: 0.6 + 0.4 * Math.sin(theta),
    };
  }
  const sweep = Math.log(118 / 58) / goldenGrowth;
  const theta = t * sweep;
  const radius = 58 * Math.exp(goldenGrowth * theta);
  const orientation = (layer * turn) / (compact ? 4 : orbital ? 6 : 8) + theta;
  return {
    x: center + radius * Math.cos(orientation),
    y: center + radius * Math.sin(orientation),
    angle: orientation + Math.atan2(1, goldenGrowth),
    depth: 1 - t * 0.8,
  };
}

/** Uses approximate arc length so digits remain separated on tilted and expanding curves. */
function digitLayers(constant: Constant, detail: ArtworkDetail) {
  const compact = detail === "compact";
  const orbital = detail === "orbital";
  const layers = [];
  const count = orbital
    ? {pi: 4, e: 5, phi: 6, tau: 4, i: 8}[constant]
    : {pi: compact ? 1 : 7, e: compact ? 3 : 6, phi: compact ? 4 : 8, tau: compact ? 2 : 5, i: compact ? 4 : 8}[constant];
  const cell = compact || orbital ? 2 : 1;
  for (let layer = 0; layer < count; layer++) {
    const radius = compact ? 99 : 60 + layer * 9;
    const pitch = Math.max(compact ? 15 : orbital ? 12 : 6, constant === "pi" ? (turn * radius) / (constants[constant].length - 2) : 0);
    const bands = ["", "", ""];
    let previous = pointOnCurve(constant, layer, 0, detail);
    let distance = pitch;
    let digitIndex = 0;
    // Dense sampling only happens in this offline generator, never in React.
    for (let sample = 0; sample < 1600; sample++) {
      const point = pointOnCurve(constant, layer, sample / 1600, detail);
      distance += Math.hypot(point.x - previous.x, point.y - previous.y);
      previous = point;
      if (distance < pitch || digitIndex >= constants[constant].length) continue;
      distance = 0;
      const digit = constants[constant][digitIndex++]!;
      const band = Math.min(2, Math.floor(point.depth * 3));
      bands[band] += bitmapPath(digits[digit]!, point.x, point.y, cell, point.angle);
    }
    const opacity = constant === "pi" ? 0.85 - (layer / count) * 0.68 : 0.76;
    layers.push({
      id: layer,
      phase: layer / count,
      bands: bands.map((path, index) => ({path, opacity: Number((opacity * (0.3 + index * 0.35)).toFixed(3))})),
    });
  }
  return layers;
}

const artwork = Object.fromEntries(
  (Object.keys(constants) as Constant[]).map((constant) => [
    constant,
    {
      size,
      sequence: constants[constant],
      glyphPath: bitmapPath(glyphs[constant], center, center, 3),
      compactGlyphPath: bitmapPath(glyphs[constant], center, center, 3.5),
      layers: digitLayers(constant, "detail"),
      compactLayers: digitLayers(constant, "compact"),
      orbitalLayers: digitLayers(constant, "orbital"),
    },
  ])
);

await writeFile(new URL("../packages/web/assets/constant-orbs.json", import.meta.url), `${JSON.stringify(artwork, null, 2)}\n`);
