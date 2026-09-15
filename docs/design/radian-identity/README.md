# Radian identity

Radian connects the app to angular measure: a full turn is τ = 2π radians.

| Role              | Symbol | Surrounding pattern                    |
| ----------------- | ------ | -------------------------------------- |
| Harness / app     | π      | Concentric rings of pi digits          |
| Project           | φ      | Golden logarithmic spiral arms         |
| Subagent          | e      | Tilted circular orbits of Euler digits |
| Lead orchestrator | τ      | Full-turn sweeps of tau digits         |
| Curator           | i      | Quarter-turn arcs: 1 → i → −1 → −i     |

The golden ratio φ is the limiting ratio of successive Fibonacci numbers. The imaginary unit i uses its powers, since it has no real decimal expansion.

All marks use ornate italic serif bitmap silhouettes, white on black. Decimal prefixes are exact. Curves are computed offline, with CSS moving and fading digit layers outward; reduced-motion and still modes keep them stationary. Compact variants simplify the contours below 40 pixels.

The frozen glyph masks in `packages/web/assets/constant-glyphs.json` were rasterized from Georgia Bold Italic and snapped to a pixel grid. They render consistently without loading a font. Run `bun run generate:brand` from the repository root to regenerate the shared artwork and desktop PNG/SVG assets.

Open [the interactive production preview](../pixel-constant-identity.html) for all five marks at portrait and sidebar sizes. The older `radian-identity-concept.png` is an early exploration and is superseded by this implementation.
