# Chat math and composer controls

15 September 2026 · Radian 0.2.0

## Changes

- Formulas render automatically in existing and new assistant replies, submitted user messages and worker results. Inline `$…$` and `\(…\)`, display `$$…$$` and `\[…\]`, aligned equations, boxed results and `math` fences are supported.
- Pasted paragraphs and blank lines now survive message submission, keeping multi-line math intact.
- Formula styles and fonts are bundled locally. Code examples and currency amounts remain literal. Unsupported expressions stay readable instead of crashing the reply. Display equations can scroll horizontally within the message.
- The primary chat's title/project bar was removed. Sidebar and workspace ownership remain available; secondary split panes keep their close controls.
- **Reverse last turn** now lives inside the message composer. It opens the existing review of affected files and conversation changes; cancel leaves them unchanged. The button is disabled during work and disconnection.
- Clicking the effort dial opens the model's available levels. Choosing one preserves the draft and returns typing focus. Keyboard selection works; dragging and scrolling no longer adjust the level.

## Verification

- Repository tests: **989 passed** — 513 web, 115 runtime unit, 285 runtime integration, 9 server, 67 desktop. Unchanged suites used the repository cache.
- Root type checking, lint, formatting and whitespace checks: passed.
- Production browser acceptance: **35 scenarios passed across the full run and focused rerun**. The rerun verified the effort-focus correction and paragraph-preserving formula submission. All 513 web tests passed again after the final streaming text adjustment.
- Packaged and installed app: **verified at `/Applications/Radian.app`**. Signature verification passed, and all 418 web files match the build. The web bundle differs from the saved previous version. Native checks confirmed the removed chat bar, composer reverse control, restore preview, and clickable effort menu.

The formula tests include the velocity, aligned and boxed syntax from the reported example. Browser tests use an isolated local API and deterministic provider. The restore test performs the action in a disposable Git project and checks cancellation, refreshed review after manual edits, and preservation of unrelated files.

During native verification, the existing conversation showed four later messages rolled back. That state was preserved, so formula acceptance is based on the production browser tests and reload check above. The native menu was dismissed with Max unchanged.

The previous app is recoverable at `/var/folders/fc/5twr3n1s2_q7qg6qllx4vqdh0000gn/T/radian-before-math-controls-wsrphe7u/Radian.app`. Source and installation fingerprints are recorded in [build-evidence.json](build-evidence.json).

Math support follows the [remark math integration](https://github.com/remarkjs/remark-math) and [KaTeX rendering options](https://katex.org/docs/options). Rendering is enabled by default; it does not guess mathematical meaning from arbitrary unmarked prose.

## Screenshots

### Formulas and reverse button in a narrow chat

![Rendered formulas and composer controls](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-2026-09-15-math-controls/math-chat-narrow.png)

### Clickable effort choices

![Effort level menu](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-2026-09-15-math-controls/clickable-effort.png)

### Installed app

![Installed clickable effort menu and composer reverse control](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-2026-09-15-math-controls/installed-effort.png)
