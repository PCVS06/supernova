# Radian audit repairs

16 September 2026

## Result

Implemented fixes for all six findings in the [systematic audit](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-systematic-audit-2026-09-15/report.md), plus the browser navigation finding and a related folder-picker defect. The six original reproduction cases now pass interactively against the current client and a real isolated API using the deterministic test provider.

The changes are in the working tree on `docs/graph-workflow-engineering`, based on `4b3da23ef0f39d04a374e29fe1fbacdf645905c5`. Existing harness-switching work was preserved. The updated `/Applications/Radian.app` was installed and launched successfully on 16 September after the process exhaustion was resolved.

## Installed delivery

- Built the web client, server and desktop shell from this checkout, then packaged the arm64 macOS app.
- Verified the staged and installed app with `codesign --verify --deep --strict`. This is a local ad-hoc signed build, not a notarized public release.
- Matched the installed app archive, server entry and web entry hashes against the packaged output; hashes are recorded in `evidence.json`.
- Preserved the previous app at `/Users/philippcarlvictorstrieder/Library/Application Support/Radian Backups/audit-repairs-20260916-05xuQs/Radian.app`.
- Launched the installed app, confirmed existing projects and an existing chat loaded, and observed the new harness selector in the composer.
- Stopped further native interaction when the user started using the app. Native browser interaction acceptance remains limited to the controller tests below.

## Fixes and observed results

| Finding                              | Change                                                                                                                                                                     | Verification                                                                                                                                                                                                                                    |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F01: duplicate projects              | Sidebar navigation uses the canonical project returned by the server and records its harness ownership.                                                                    | Opened a directory alias, saw one row, sent a message, pinned the chat and reloaded. One row and the pin remained.                                                                                                                              |
| F02: context-file newlines           | Editing preserves blank lines; saving trims paths and removes empty entries.                                                                                               | Typed the first path, pressed Enter, typed the second path, saved and reloaded. The two paths remained separate.                                                                                                                                |
| F03: local Markdown references       | Document links resolve relative to their file and open within the workspace. Images use a bounded server read confined to the project. Headings have local anchor targets. | SVG loaded at its expected 120 × 80 dimensions. Nested links, a return link, a heading anchor and a filename with spaces and Unicode opened without changing the chat URL. An escaping link was unavailable.                                    |
| F04: discarded schedules             | Schedule fields now belong to the shared settings draft, including incomplete input. Server validation still rejects invalid saved times.                                  | Daily and quiet-hour edits cleared immediately on Discard. An incomplete `2` showed a validation hint and could be discarded. A second client saved `09:00`; Load current settings replaced the first client's `20:00` draft and disabled Save. |
| F05: unnamed editor                  | The editable node exposes the name Message, textbox role, multiline state and disabled state.                                                                              | Inspected the DOM, typed through the named textbox and sent a successful test message.                                                                                                                                                          |
| F06: endless missing-harness loading | Loading, request failure and missing harness are distinct states, with retry or recovery actions.                                                                          | A missing harness displayed its missing state; its recovery link opened Settings → Harnesses.                                                                                                                                                   |
| Native browser navigation            | Showing/resizing preserves the current native page. Navigation events update the address and history controls.                                                             | Controller tests covered resize, hide/show, links, same-page navigation, Back/Forward, reload and renderer recovery. Packaged native UI acceptance remains pending.                                                                             |
| Folder-picker aliases                | Directory symlinks appear as folders; file and broken symlinks are excluded.                                                                                               | A filesystem integration test verified all three cases. This addresses the additional issue noticed when the picker offered to create an existing alias without a trailing slash.                                                               |

Image previews support PNG, JPEG, GIF, WebP, SVG and AVIF, up to 5 MiB per image. The server rejects paths that escape the selected project, including symlink escapes. Unsupported, unreadable or oversized local images display an unavailable state.

## Checks

- The full repository test run passed 1,025 tests: web 534, runtime unit 115, runtime integration 298, server 9 and desktop 69. All eight Turbo tasks passed without cache reuse. Runtime tests used one worker and the bundled `fd` binary on PATH.
- Restored two existing folder-picker tests alongside the added alias regression, then reran that file: all three tests passed. Runtime type, lint and formatting checks passed again after this test-only change.
- All package type, lint and formatting checks passed without cache reuse: 15 Turbo tasks, followed by all three root script checks.
- The desktop package run passed all four build/package tasks without cache reuse. The resulting bundle passed signature verification and contained no broken server-resource symlinks.
- Added five browser regression scenarios covering the six original findings. They type-check and lint; their interactions were exercised through the supported browser UI tools, rather than claiming an automated Playwright run.

Earlier attempts were blocked by `EAGAIN`: a process inventory showed 1,014 defunct children owned by Raycast Backend. After the user requested recovery, Raycast's current PID records were checked, its stuck backend was terminated, and Raycast was reopened. A fresh inventory then showed 573 processes and only two defunct entries, and normal command execution resumed. The passing aggregate runs above replaced the earlier incomplete results. Their logs are `/tmp/radian-ship-tests.log`, `/tmp/radian-ship-checks.log`, `/tmp/radian-ship-folder-regression.log` and `/tmp/radian-ship-package.log`.

## Evidence

The isolated app used UI port 5188 and API port 4388, with data and project files under `/tmp/radian-audit-repairs-20260916`. Test tabs and owned test servers were closed afterward. Structured observations are in [evidence.json](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-repairs-2026-09-16/evidence.json).

### Canonical project

![One project row for the alias](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-repairs-2026-09-16/01-canonical-project.jpg)

### Markdown image and local navigation

![Working project image and document links](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-repairs-2026-09-16/02-markdown-image.jpg)

### Saved multiline context files

![Two context paths after save and reload](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-repairs-2026-09-16/03-context-files-saved.jpg)

### Discarded schedule

![Empty schedule fields after Discard](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-repairs-2026-09-16/04-schedule-discarded.jpg)

### Missing harness recovery

![Missing harness state with a recovery link](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-repairs-2026-09-16/05-missing-harness.jpg)

## Remaining acceptance

Exercise the packaged desktop browser when the app is available for testing. VoiceOver announcements, disconnected-input semantics and multiple-chat accessibility still need native acceptance. The original audit's broader provider, update, dictation and checkpoint coverage limits remain unchanged.
