# Compact chat settings and stable composer

17 September 2026 · Radian 0.2.0

## Changes

- Replaced separate harness, model and effort triggers with one Chat settings menu. Harness, Team, Model and Effort have short selection pages in the same menu. Model search, favorites, keyboard navigation, pending harness changes and cancellation remain available.
- Sampled 18 formulas from a pool of 28 at random positions when the sky mounts. The arrangement stays stable during typing and replies. Shooting stars use complete 12px identity components for π, φ, e, τ and i.
- Docked the new-chat composer at the same bottom position as an active conversation. Chat entry fades without translating the composer. A container-width layout reserves consistent space for running-answer controls in narrow panes.
- Preserved typing focus after the first accepted message and after setting changes.

## Reproduced composer defects

The browser regression samples composer geometry on every rendered frame through first send, streamed output, reasoning, typing a correction during the answer, and completion.

Before the changes:

- First send from a new chat moved the bottom edge from 564.70px to 776px in one frame: **211.30px**.
- The chat entrance introduced a further **4px** vertical drift.
- At an 820px viewport, showing Queue/Steer controls while typing during a reply moved the composer top by **44px**.

Focused regression verification passed for new and existing chats at 1280px and 820px. Every sampled top/bottom position stayed within a **2px** tolerance, and typing focus was retained. Menu focus transfer is covered by model and effort keyboard scenarios; the production rerun status is recorded below.

## Validation environment

The runtime file-listing tests require `fd` on PATH. The first full run lacked that tool in its environment and failed six file-listing cases. The existing binary at `~/.pi/agent/bin/fd` passed all six cases when its directory was included in PATH; no runtime source change was required.

The final full test command used the existing tool directory and loose environment forwarding so Vitest's worker limit reached the package scripts:

```sh
PATH="$HOME/.pi/agent/bin:$PATH" VITEST_MAX_WORKERS=1 bun run test --concurrency=1 --env-mode=loose
```

## Complete repository checks

The final full test run passed **1,027 tests**, with no failures:

| Suite                     |    Passed |
| ------------------------- | --------: |
| Web                       |       534 |
| Agent runtime unit        |       115 |
| Agent runtime integration |       300 |
| Server                    |         9 |
| Desktop                   |        69 |
| **Total**                 | **1,027** |

All **15 of 15** package typecheck, lint and Prettier tasks passed. The separate root script typecheck, lint and formatting checks also passed.

Local validation logs: [full tests](/tmp/radian-20260917-tests-final.log), [package checks](/tmp/radian-20260917-checks-final.log), [script checks](/tmp/radian-20260917-script-checks.log). These logs are temporary local files.

## Production browser verification

All **22 unique production browser scenarios** now pass across the integrated run and the focused rerun. The initial integrated run passed **21 of 22** cases. One model keyboard test failed because it assumed a caret position after filling the editor.

The test-only correction explicitly presses End to establish the caret position, then asserts that position is retained after returning with Back, reentering a section and selecting an option. Production code was unchanged. The focused production rerun passed **2 of 2** keyboard cases: the corrected model case and a repeat of the effort case. See the temporary local [keyboard rerun log](/tmp/radian-20260917-keyboard-final.log).

Web typecheck and lint were rerun after the final test edit and passed. Formatting for the final test and QA artifacts also passed, as did `git diff --check`.

## Desktop package and installed acceptance

The macOS **arm64** package completed successfully at `apps/desktop/dist/mac-arm64/Radian.app`. The bundle received an **ad-hoc signature**; notarization was not performed. All four packaging tasks passed. See the temporary local [package log](/tmp/radian-20260917-package.log).

The installed `/Applications/Radian.app` was updated and reopened. Both built and installed bundles passed `codesign --verify --deep --strict`; all **34,116 regular bundle files** matched by SHA-256. The previous app is preserved at `/Users/philippcarlvictorstrieder/Library/Application Support/Radian Backups/chat-settings-20260917-FaINGi/Radian.app`. [Build evidence](build-evidence.json) records the checkout, bundle paths and manifest fingerprint.

Native acceptance confirmed the restored existing conversation, one Chat settings trigger, its Harness/Team/Model/Effort overview, the short Effort and Team selection pages, Back navigation and Escape dismissal. The mathematical sky rendered behind the conversation and the composer remained bottom-docked. No chat configuration was changed during these checks. The user resumed interacting with Radian, so native automation stopped without navigating away or sending a test message. Send/stream geometry is covered by the four instrumented production browser cases above; it was not instrumented inside the native app.

## Screenshots

- [Combined chat settings](chat-settings.png)
- [Combined settings in a narrow pane](chat-settings-narrow.png)
- [Effort choices](effort-options.png)
- [Randomized mathematical sky](mathematical-sky.png)
- [Mathematical sky on the settings page](mathematical-sky-settings.png)
