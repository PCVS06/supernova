import {useId} from "react";
import type {CSSProperties} from "react";
import "@/components/brand/mathematical-sky.css";

const FORMULAS = [
  "eⁱπ + 1 = 0",
  "a² + b² = c²",
  "φ² = φ + 1",
  "τ = 2π",
  "sin²x + cos²x = 1",
  "eⁱˣ = cos x + i sin x",
  "∑ₙ₌₁∞ 1/n² = π²/6",
  "Fₙ₊₁ / Fₙ → φ",
  "n! = Γ(n + 1)",
  "(eˣ)′ = eˣ",
  "∑ₖ₌₁ⁿ k = n(n + 1)/2",
  "sin 2x = 2 sin x cos x",
  "ln(ab) = ln a + ln b",
  "(a + b)² = a² + 2ab + b²",
  "∫ cos x dx = sin x + C",
  "V − E + F = 2",
  "∑ₙ₌₀∞ 1/n! = e",
  "Fₙ = Fₙ₋₁ + Fₙ₋₂",
  "∇ · B = 0",
  "E = mc²",
  "F = ma",
  "p = mv",
  "∫₀¹ xⁿ dx = 1/(n + 1)",
  "A = πr²",
  "ℏ = h/2π",
  "Δx Δp ≥ ℏ/2",
  "∇ × E = −∂B/∂t",
  "S = k ln Ω",
];

/** Stable pseudorandom samples keep the sky continuous through route changes and rerenders. */
function sample(index: number, channel: number): number {
  let value = Math.imul(index + 1, 374761393) + Math.imul(channel + 1, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

const STARS = Array.from({length: 108}, (_, index) => ({
  x: sample(index, 1) * 100,
  y: sample(index, 2) * 100,
  radius: 0.35 + sample(index, 3) * 0.65,
  opacity: 0.12 + sample(index, 4) * 0.3,
}));

const FORMULA_STARS = FORMULAS.map((formula, index) => ({
  formula,
  // Jittered cells distribute the small marks throughout the window without a visible grid.
  x: ((index % 7) + 0.2 + sample(index, 5) * 0.6) * (100 / 7),
  y: (Math.floor(index / 7) + 0.2 + sample(index, 6) * 0.6) * 25,
  style: {
    "--sky-drift-x": `${(sample(index, 7) - 0.5) * 130}px`,
    "--sky-drift-y": `${(sample(index, 8) - 0.5) * 90}px`,
    "--sky-cycle": `${76 + sample(index, 9) * 110}s`,
    "--sky-phase": `${-sample(index, 10) * 150}s`,
    fontSize: `${6 + sample(index, 11) * 2}px`,
    opacity: 0.17 + sample(index, 12) * 0.14,
  } as CSSProperties,
}));

const SHOOTING_STARS = [
  {x: "12%", y: "8%", duration: "23s", delay: "4s", dx: "360px", dy: "170px"},
  {x: "53%", y: "24%", duration: "31s", delay: "13s", dx: "290px", dy: "140px"},
  {x: "28%", y: "62%", duration: "41s", delay: "27s", dx: "330px", dy: "155px"},
];

/** One decorative, noninteractive sky across the app; native menus and dialogs remain above it. */
export default function MathematicalSky() {
  const tailId = useId();
  return (
    <svg className="mathematical-sky" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={tailId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.75" />
        </linearGradient>
      </defs>
      <g fill="currentColor">
        {STARS.map((star, index) => (
          <circle key={index} cx={`${star.x}%`} cy={`${star.y}%`} r={star.radius} opacity={star.opacity} />
        ))}
      </g>
      {FORMULA_STARS.map(({formula, x, y, style}) => (
        <text className="mathematical-sky-formula" key={formula} x={`${x}%`} y={`${y}%`} textAnchor="middle" style={style}>
          {formula}
        </text>
      ))}
      {SHOOTING_STARS.map((star, index) => (
        <svg key={index} x={star.x} y={star.y} overflow="visible">
          <g
            className="mathematical-sky-meteor"
            style={{"--meteor-cycle": star.duration, "--meteor-delay": star.delay, "--meteor-x": star.dx, "--meteor-y": star.dy} as CSSProperties}
          >
            <path d="M-90 -43 L0 0" stroke={`url(#${tailId})`} strokeWidth="1" strokeLinecap="round" />
            <circle r="1.1" fill="currentColor" />
          </g>
        </svg>
      ))}
    </svg>
  );
}
