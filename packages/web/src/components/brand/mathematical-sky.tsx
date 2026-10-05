import {useId, useState} from "react";
import type {CSSProperties} from "react";
import ConstantOrb from "@/components/brand/constant-orb";
import {constantIdentity} from "@/components/brand/constant-identity";
import type {MathematicalConstant} from "@/components/brand/constant-identity";
import "@/components/brand/mathematical-sky.css";

const FORMULA_COUNT = 18;
const FORMULA_PLACEMENT_ATTEMPTS = 32;
const METEOR_SIZE = 12;
const CONSTANTS = Object.keys(constantIdentity) as MathematicalConstant[];
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

interface FormulaStar {
  readonly formula: string;
  readonly x: number;
  readonly y: number;
  readonly style: CSSProperties;
}

/** A fresh sky is sampled once per mount, keeping typing and navigation from moving its marks. */
function createSky() {
  const stars = Array.from({length: 108}, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    radius: 0.35 + Math.random() * 0.65,
    opacity: 0.12 + Math.random() * 0.3,
  }));
  const formulas = [...FORMULAS];
  for (let index = formulas.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [formulas[index], formulas[target]] = [formulas[target]!, formulas[index]!];
  }

  const formulaStars: FormulaStar[] = [];
  for (const formula of formulas.slice(0, FORMULA_COUNT)) {
    let x = 0;
    let y = 0;
    // Keep free placement without crowding neighboring formulas or using a visible grid.
    for (let attempt = 0; attempt < FORMULA_PLACEMENT_ATTEMPTS; attempt += 1) {
      x = 8 + Math.random() * 84;
      y = 6 + Math.random() * 88;
      if (formulaStars.every((star) => ((x - star.x) / 12) ** 2 + ((y - star.y) / 9) ** 2 > 1)) break;
    }
    formulaStars.push({
      formula,
      x,
      y,
      style: {
        "--sky-drift-x": `${(Math.random() - 0.5) * 40}px`,
        "--sky-drift-y": `${(Math.random() - 0.5) * 30}px`,
        "--sky-cycle": `${76 + Math.random() * 110}s`,
        "--sky-phase": `${-Math.random() * 150}s`,
        fontSize: `${6 + Math.random() * 2}px`,
        opacity: 0.17 + Math.random() * 0.14,
      } as CSSProperties,
    });
  }

  const shootingStars = CONSTANTS.map((constant, index) => {
    const distance = 180 + Math.random() * 140;
    return {
      constant,
      x: `${8 + Math.random() * 54}%`,
      y: `${8 + Math.random() * 62}%`,
      style: {
        "--meteor-cycle": `${28 + Math.random() * 24}s`,
        "--meteor-delay": `${4 + index * 8 + Math.random() * 5}s`,
        "--meteor-x": `${distance}px`,
        "--meteor-y": `${distance / 2}px`,
      } as CSSProperties,
    };
  });
  return {stars, formulaStars, shootingStars};
}

/** One decorative, noninteractive sky across the app; native menus and dialogs remain above it. */
export default function MathematicalSky() {
  const tailId = useId();
  const [{stars, formulaStars, shootingStars}] = useState(createSky);
  return (
    <svg className="mathematical-sky" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={tailId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.75" />
        </linearGradient>
      </defs>
      <g fill="currentColor">
        {stars.map((star, index) => (
          <circle key={index} cx={`${star.x}%`} cy={`${star.y}%`} r={star.radius} opacity={star.opacity} />
        ))}
      </g>
      {formulaStars.map(({formula, x, y, style}) => (
        <text className="mathematical-sky-formula" key={formula} x={`${x}%`} y={`${y}%`} textAnchor="middle" style={style}>
          {formula}
        </text>
      ))}
      {shootingStars.map((star) => (
        <svg key={star.constant} x={star.x} y={star.y} overflow="visible">
          <g className="mathematical-sky-meteor" style={star.style}>
            <path d="M-36 -18 L-5 -2.5" stroke={`url(#${tailId})`} strokeWidth="0.65" strokeLinecap="round" />
            <foreignObject x={-METEOR_SIZE / 2} y={-METEOR_SIZE / 2} width={METEOR_SIZE} height={METEOR_SIZE} overflow="visible">
              <ConstantOrb constant={star.constant} className="mathematical-sky-meteor-orb" detail="compact" state="still" />
            </foreignObject>
          </g>
        </svg>
      ))}
    </svg>
  );
}
