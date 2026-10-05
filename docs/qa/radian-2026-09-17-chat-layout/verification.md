# Chat layout repair — 17 September 2026

Scope: clipped solar-system captions, composer positioning, and timeline movement during goal, steering, solar-system and viewport changes.

## Reproductions

- The empty expanded solar-system caption extended 12 px below the clipped canvas. The browser regression reproduced the exact screenshot symptom at 1280 px width.
- At 820 × 480, a long goal draft left only about 70 px for the transcript; the jump-to-latest button intercepted the solar-system return control.
- Goal and multiline steering-draft resizing left the latest response 15 px and 56 px away from its intended position in painted frames.
- Resizing immediately after sending also moved the newly anchored message. A first fix double-counted viewport changes; the final calculation handles resize before consuming temporary anchor space.

## Changes

- Empty solar systems center the symbol and caption as one intrinsically sized group. The existing 192 px canvas is retained; the caption now has 14 px bottom clearance.
- Oversized composer content scrolls above a persistent action bar. The composer keeps space for readable conversation and retains its bottom inset.
- Entering and leaving goal mode restores typing focus without asking the browser to scroll surrounding containers.
- Timeline resize handling runs before paint and reconciles temporary anchor space once, preserving the prior reading offset.

## Verification status

Focused failing browser cases were captured before fixes. The two long-draft composer cases and the two newly anchored-message cases have passed after their fixes. A final centralized production-browser run and repository checks are in progress.

The first concurrent repository run encountered test timeouts under memory pressure. Those results are not treated as completed verification; reruns are serialized. Test-only servers use isolated temporary data and no live model providers.

The checkout had extensive existing changes before this repair. They were preserved. Prior installed/candidate bundles matched before this task; installation of the new repair has not yet been performed.
