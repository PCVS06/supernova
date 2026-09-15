# Radian feedback fixes — 14 September 2026

## Delivered behavior

- **Goal:** expand the goal to edit its objective inside the composer. The normal send button updates and runs the revision. The header has only expand/collapse and delete; normal Stop remains authoritative. Ordinary message drafts survive editing. Results from the superseded objective cannot complete the revised goal.
- **Steer and queue:** accepted corrections remain visible until the current turn settles. A correction arriving at the end of a turn is preserved once for the next safe boundary, ahead of ordinary queued messages. FIFO order, removal, reload persistence and explicit Stop are preserved. Acceptance does not claim that a provider has already processed the correction.
- **Layout and motion:** nested composer animations no longer restart one another. Opening worker details releases automatic scrolling so the reader is not pulled to the bottom. The chat symbol remains anchored through goal entry and interrupted orbital transitions.
- **Sidebar and controls:** removed leftover guide lines and mouse-only focus rectangles while retaining keyboard focus. Numeric contours continue rotating. The effort dial is simpler; deliberate dragging, wheel or keyboard input changes effort, while an incidental click does not.
- **Planetary view:** removed solid selection outlines and floating options/close chrome. Peer agents share an orbit. Numeric contours keep rotating during inspection. Participant search is compact, summary headers carry the matching identity, and conversation bodies omit repeated decorative identity marks. Mathematical star formulas stay within short and tall views.

## Verification

The bug-diagnosis checklist guided the final acceptance pass: assertions cover observable behavior, not just component mounting or successful compilation.

| Check                                                               | Result                                                  |
| ------------------------------------------------------------------- | ------------------------------------------------------- |
| Focused browser motion, layout, scrolling and control regressions   | 18 passed                                               |
| Goal editing and steering/queue flows against the local test server | 5 passed, including a final rerun                       |
| Web unit tests                                                      | 491 passed                                              |
| Runtime unit tests                                                  | 115 passed                                              |
| Runtime integration tests                                           | 281 passed, 1 failed; see limitation below              |
| Server tests                                                        | 9 passed                                                |
| Desktop tests                                                       | 67 passed                                               |
| Type checking, lint and formatting                                  | Passed                                                  |
| Desktop packaging                                                   | Passed; local ad-hoc signature, not a notarized release |

The installed app was inspected through background computer use: existing chats loaded, goal drafting remained editable, the simpler dial rendered, and the planetary view opened without the old floating chrome. The final native screenshot also showed all four mathematical formulas inside the short planetary view. The end-to-end tests use a deterministic test provider; they do not establish identical behavior for every external provider.

### Goal editor evidence

This screenshot is from the local-server regression fixture after deliberately pressing Stop, then editing the objective. The aborted-operation message above the editor belongs to that stopped test turn.

![Expanded goal editor with a revised objective](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-2026-09-14/goal-editor.png)

## Remaining limits

- The original artwork request still needs identification. The older committed version found used π across roles; the newer identity family uses φ for projects. No unconfirmed replacement has been made.
- The broader runtime suite failed `checkpoint-store.test.ts:238`: restoring a tracked file larger than 2 MiB left its later contents in place. The same test **passed in isolation** on the final rerun, so this remains an intermittent verification issue, not a confirmed fix. This checkpoint source/test was not changed by these feedback fixes. There is **no entirely green full-suite run**; the issue is not covered by the goal/steering acceptance claim.
- Six initial file-suggestion failures were due to `fd` being absent from the test shell. They passed when the app's bundled tool directory was supplied. An earlier checkpoint-navigation timeout also passed on the bounded rerun.
- These changes remain uncommitted alongside the pre-existing worktree changes. No user chats, settings or project files were removed.

The original installed app is retained at `/var/tmp/radian-before-fixes.fBUomG/Radian.app` for recovery.

## Evening follow-up: moving formulas and visible teams

- Replaced the four large background formulas with 18 smaller formulas, each drifting slowly with staggered timing. Reduced motion disables drift; collapsed, offscreen and background views pause it.
- Increased the compact layout from three to six primary bodies and the balanced layout from six to eight. Ordinary project teams remain individual planets with their agents around them instead of losing all satellites once more than three projects are present. Larger histories retain searchable overflow groups.
- Kept enough vertical space for the expanded system in short windows instead of squeezing project teams together.

Verification: 495 web unit tests passed, including four new cases for larger project teams and selected agents. Type checking, lint, formatting and desktop packaging passed. The final focused browser suite passed 20 of 21 checks; the opening-position check timed out once, then passed three consecutive isolated reruns without a source change. Both full-revolution clearance checks passed. This is not a claim of an entirely green single browser-suite run.

The bulk-participant fixture no longer retains unrelated workflow records after replacing its participants. The hover regression now checks that numeric coronas continue rotating while orbital movement pauses, matching the intended interaction.

![Smaller formulas and five individually visible participants in the browser fixture](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-2026-09-14/individual-participants.png)

The updated `/Applications/Radian.app` was installed and passed signature verification. Its renderer entry matched the source build. Background computer use verified the real “Starting a New Coding Session” view: five project planets and fifteen agent moons were visible individually, without an “Earlier work” group. The native screenshot showed the smaller formulas distributed throughout the background. Drift, reduced motion and pause behavior were verified by the browser regression test.

The pre-follow-up installed app is retained at `/var/tmp/radian-before-starmap.51AReZ/Radian.app` for recovery. No chats, goals, queues or project contents were changed during this acceptance pass.
