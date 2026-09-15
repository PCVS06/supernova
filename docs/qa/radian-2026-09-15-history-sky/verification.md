# Direct chat history and mathematical night sky

15 September 2026 · Radian 0.2.0

## Changes

- The composer bar's history control unfolds backward and forward arrows with the current turn position. Ordinary steps restore the saved conversation and captured file changes directly. An unsent draft stays in place while stepping.
- Saved-turn details are available on demand. Manual file conflicts use a compact inline notice; cancel preserves the conversation and files. Per-message restoration still offers the detailed review.
- The mathematical sky spans chat, sidebar, workspace and settings. Small formulas drift independently among scattered stars, with occasional shooting stars.
- Decorative elements do not receive clicks, focus or screen-reader attention. Hidden windows and tabs pause the sky; reduced-motion and motion-off settings keep the scene still.

## Verification

- Repository tests: **989 passed**. The first parallel run hit a timeout in an unchanged field-ownership test; the complete sequential rerun passed.
- Root type checking, lint and formatting: **passed**.
- Production browser acceptance: **6 scenarios passed across the initial run and focused rerun**. The rerun corrected an early file assertion to await completed restoration and checked saved-history reload separately from the memory-only draft store.
- Packaging and installed-app verification: **passed**. `/Applications/Radian.app` was replaced from the verified build. All 418 web files match it, and the signature checks passed. The previous app was saved for recovery.

Draft preservation is tested during history navigation. Saved history is also tested across reload; the existing draft store itself remains in memory.

## Installed app

The existing chat **Understanding How This Works** opened with the full-window sky and compact arrows showing **1/5**. Both directions were available, the saved-message list remained closed, and no dialog appeared. Native inspection opened only the controls; it left the saved conversation and empty draft unchanged. Actual file restoration was exercised in the isolated browser tests.

The backup is at `/var/folders/fc/5twr3n1s2_q7qg6qllx4vqdh0000gn/T/radian-before-history-sky-99_137do/Radian.app`. Source and installed bundle fingerprints are recorded in [build-evidence.json](build-evidence.json).

![Installed app with the history controls open](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-2026-09-15-history-sky/installed-history-sky.png)

## Screenshots

### Chat and composer controls

![Mathematical sky across the chat and bar controls](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-2026-09-15-history-sky/mathematical-sky.png)

### Settings

![The same mathematical sky across settings](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-2026-09-15-history-sky/mathematical-sky-settings.png)

### Backward and forward in a narrow chat

![Direct history arrows in a narrow chat](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-2026-09-15-history-sky/history-arrows.png)
