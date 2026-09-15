# Radian orbit and performance audit

Date: 2026-09-13

## User-visible changes

Planet and moon orbits use dotted lines. Numeric identity artwork remains unchanged; the trailing numeric aftereffect and its drawing loop are removed. The compact chat symbol still opens the solar system, and selecting participants still opens their work. Orbit animation pauses for inspection, reduced motion, hidden views, and stale activity. Empty systems do not schedule animation frames.

## Repository audit

The audit covered the import graph across both apps, all three packages, and build scripts, followed by manual inspection of suspected dead modules and performance-sensitive paths. The initial inventory after removing the numeric trail contained 638 code files, including 474 production modules. The final inventory contains 623 code files, including 459 production modules; newly added generator and regression-test files are included.

Import analysis included static imports, re-exports, literal dynamic imports, package exports, application entry points, scripts, and test-only reachability. Nonliteral imports were inspected separately. This is a repository-wide reachability audit and targeted implementation review, not proof that every conditional branch is reachable or that every remaining hot path has been measured.

Removed unreachable code included:

- The superseded standalone workspace map, its layout/context helpers, preferences, styles, and obsolete stored settings.
- Legacy delegated-work lists, graph components, and unused status/preview components superseded by the chat solar system.
- An unused matrix loader, streaming interpolation module, and stale mirrored-project helper.
- An unused abort-session operation; the live runtime abort path remains in use.
- The obsolete Electron webview declaration, numeric trail drawing modules, and their generated digit asset.

Tests exclusively exercising deleted modules were removed. Live identity, instruction, sidebar, workflow, and activity-count behavior retains coverage. The empty projects schema barrel was retained because the contracts package explicitly requires that public boundary. It is the sole remaining production module flagged by the final import audit.

## Measured improvements

### Offline icons and bundle size

The UI imported ten complete icon collections to render 63 selected icons. A build-time generator now extracts exactly those icons, preserving SVG bodies, dimensions, aliases, and transformations. All 63 generated records are tested against their originals. Rendering remains offline.

| Built JavaScript, uncompressed | Before | After |
| --- | ---: | ---: |
| Entire renderer, including lazy chunks | 44,002,347 bytes | 12,403,046 bytes |
| Largest previously shared worker chunk | 32,878,292 bytes | 1,283,366 bytes |

Total renderer JavaScript decreased by 71.8%. The selected icon JSON contains 21,654 bytes. These are artifact sizes, not a claim that all chunks load at startup or that startup time fell by the same percentage.

### Workspace and workflow computation

Workspace construction now indexes projects, harnesses, chats, and curators once instead of repeatedly scanning them for each item. Output consumer counts are shared and computed once per workflow. Workflow layering traverses prerequisite/dependent edges instead of rescanning every step for every layer; definition order and existing validation errors are preserved. Step summaries also use a definition index.

Paired local benchmarks used three warm-up pairs and nine alternating before/after samples in the same process. The table reports median milliseconds. Fixtures include up to 200 projects and 10,000 chats; the workflow case is a reversed dependency chain. Before/after outputs were identical for every fixture and for 100 additional randomized dependency graphs.

| Agents / workflow steps | Workspace before | Workspace after | Workflow layers before | Workflow layers after |
| --- | ---: | ---: | ---: | ---: |
| 100 | 2.86 ms | 2.47 ms | 0.54 ms | 0.061 ms |
| 1,000 | 32.07 ms | 5.05 ms | 49.87 ms | 0.336 ms |
| 5,000 | 410.55 ms | 16.10 ms | 1,383.87 ms | 1.919 ms |

These measurements isolate pure computation. They do not measure provider response time, cold filesystem scans, overall interaction latency, or animation frame rate.

The retained benchmark can be run from the repository root:

```sh
bun --tsconfig-override packages/web/tsconfig.app.json packages/web/tests/performance/workspace.bench.ts
```

This command measures the current implementation. The paired comparison additionally used pre-change snapshots retained in `/tmp/radian-workspace-before.ts` and `/tmp/radian-graph-before.ts`; its results are in `/tmp/radian-audit-performance.json`. Temporary files are local evidence and are not durable repository fixtures.

## Verification

- All 870 unit/integration tests passed: 452 web, 342 agent-runtime, 9 server, and 67 desktop.
- All 15 targeted browser tests passed, covering orbital transitions, nested systems, moon tracks, original numeric artwork, motion controls, historical work, a thousand participants, narrow layouts, streaming, sidebar controls, pinning, settings persistence, and the curator inbox.
- Root typecheck, lint, formatting verification, and production build passed.
- Exact generated icon comparison passed for all 63 icons; graph tests include a 10,000-step reversed chain and malformed dependencies.

The runtime suite requires `fd` on PATH; verification used the app-bundled copy. An initial parallel run encountered missing `fd` and a large-file timeout under process pressure. After the user-approved Raycast restart, the affected tests and the complete serialized suite passed. No unrelated runtime behavior was changed to accommodate those environment failures.

```sh
bun run typecheck
bun run lint
bun run prettier
PATH="$PWD/apps/server/dist/tools:$PATH" VITEST_MAX_WORKERS=1 bun run test --concurrency=1 --env-mode=loose
bun run build --concurrency=1 --env-mode=loose
```

## Installed application

Updated `/Applications/Radian.app` at 21:11 CEST. Both the renderer (359 files) and runtime (33,418 files/links) matched the build artifacts before installation. The installed renderer entry point and runtime CLI hashes were rechecked, and macOS deep/strict signature verification passed. The previous app is recoverable at `~/Library/Application Support/Radian Backups/orbits-performance-20260913-211116/Radian.app`.

The installed app loaded the saved Science Space chat. Native screenshots confirmed the compact numeric chat symbol and the expanded dotted orbital system with four visible completed agents and a group of 19 earlier participants. No numeric trail or corona was present.

Further native click automation was inconsistent, returning stale-window and `noWindowsAvailable` errors despite the app remaining running. Consequently, the complete agent-result interaction is verified by the 15 browser tests, not claimed as an independently completed native click-through. The native check confirms installed assets and appearance; the chat was left in its compact state.
