/** Shared mathematical identity for artwork, activity captions, and reply reveals. */
export const constantIdentity = {
  pi: {symbol: "π", caption: "Tracing the arc", digits: "3.14159265358979323846264338327950288419716939937510"},
  phi: {symbol: "φ", caption: "Following the spiral", digits: "1.61803398874989484820458683436563811772030917980576"},
  e: {symbol: "e", caption: "Finding the phase", digits: "2.71828182845904523536028747135266249775724709369995"},
  tau: {symbol: "τ", caption: "Bringing the orbits together", digits: "6.28318530717958647692528676655900576839433879875021"},
  i: {symbol: "i", caption: "Turning the perspective", digits: "1 i −1 −i "},
} as const;

export type MathematicalConstant = keyof typeof constantIdentity;
