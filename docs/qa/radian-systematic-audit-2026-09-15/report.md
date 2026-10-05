# Radian systematic defect audit

15 September 2026 · Radian 0.2.0

## Result

**Six defects reproduced: five P2 issues and one P3 issue.** The strongest failures concern project identity, entering context files, local Markdown previews, and discarded schedule edits. Basic chat delivery, error recovery, cancellation, queued-message editing, deferred harness switching, and reconnection worked in the tested scenarios.

This audit changed no product code. Findings include reproduction steps, screenshots, likely causes, and acceptance criteria for fixes.

**16 September follow-up:** fixes and their verification are recorded in the [repair report](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-repairs-2026-09-16/report.md). The original observations below describe the pre-fix app.

## Which app was tested

| Surface                  | Evidence and limits                                                                                                                                                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Installed desktop        | `/Applications/Radian.app`, bundle `dev.supernova.app`, version 0.2.0. Home, an existing chat, rendered math, and the split-chat empty state were inspected. The Mac then locked, preventing the remaining native tour.                       |
| Installed build identity | The installed `app.asar` SHA-256 matches the installation recorded in the earlier refinement audit: `355454984d3eb6c6ad19bc56791db82c3c08ad48486a29e3e9c30dc717997910`.                                                                       |
| Current source           | Branch `docs/graph-workflow-engineering`, HEAD `4b3da23ef0f39d04a374e29fe1fbacdf645905c5`, including the existing uncommitted harness-switching work. That work was preserved.                                                                |
| Isolated interactive app | Current React client connected to the real local API/runtime with the repository's deterministic test model. Separate data and project folders under `/tmp/radian-systematic-audit-20260915`. No paid model calls or real conversation edits. |

The installed copy does **not** contain the newly implemented composer harness picker. Its absence there is a build/installation difference, not an additional defect in the current implementation.

The primary source files for F01, F02, F04, F05 and F06 match the installed build's recorded source hashes. This makes those findings relevant to the installed version, but they were reproduced interactively in the isolated app. The current Markdown renderer has changed since that build, so F03 needs a separate native confirmation. Exact hashes and observations are in [evidence.json](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-systematic-audit-2026-09-15/evidence.json).

## Priorities

P2 means a normal interaction fails or presents misleading state. P3 means a narrower recovery or usability problem. No P0/P1 failure was established by this pass; that is not a claim that none exist.

| ID  | Priority | Defect                                                                    | Suggested order |
| --- | -------- | ------------------------------------------------------------------------- | --------------- |
| F01 | P2       | One folder appears as two projects when opened through a filesystem alias | 1               |
| F02 | P2       | Context-files input removes newlines while typing                         | 2               |
| F03 | P2       | Local Markdown links and images resolve to the app URL                    | 3               |
| F04 | P2       | Discard leaves an unsaved curator schedule visible as clean               | 4               |
| F05 | P2       | Chat editor has no accessible name or textbox role                        | 5               |
| F06 | P3       | A nonexistent harness displays “Loading harness…” indefinitely            | 6               |

## F01 — Opening an alias creates duplicate project entries

**Reproduction**

1. Create a directory under `/tmp`, which resolves through `/private/tmp` on this Mac.
2. In a fresh app profile, choose **New project in Coding** and open `/tmp/radian-systematic-audit-20260915/project`.
3. Expand Coding. Two project entries appear immediately: `/tmp/.../project` and `/private/tmp/.../project`.
4. Start a chat from the lowercase `project` row. Its saved chat appears under the other `Project` row; the original row still says **No chats yet**.

**Expected:** one project identity and one chat list for the same physical directory.

**Impact:** users see duplicate projects and can believe a new chat disappeared. The same mismatch can affect symlinked workspaces, not only temporary folders.

**Cause:** the server canonicalizes the path, but the success handler adds the original input path to local navigation. The project list merges server and local entries using literal path equality. See [sidebar.tsx:58](/Users/philippcarlvictorstrieder/Developer/supernova/packages/web/src/features/sidebar/components/sidebar.tsx:58) and [use-project-list.ts:10](/Users/philippcarlvictorstrieder/Developer/supernova/packages/web/src/features/projects/hooks/use-project-list.ts:10).

**Fix acceptance:** opening a canonical folder and any supported alias produces one row; chats and pins stay attached to that row after reload. Use the canonical project returned by the server for navigation.

![Two project rows for the same directory](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-systematic-audit-2026-09-15/03-duplicate-project-alias.jpg)

## F02 — Context-files input cannot add a second line normally

**Reproduction**

1. Open **Settings → Coding → Instructions → Context files**.
2. Enter `docs/details.md` and press Enter at its end.
3. The value remains `docs/details.md`; the newline disappears.
4. Type `README.md`. The resulting value is `docs/details.mdREADME.md`.

**Expected:** each Enter creates a new line, as the nearby “one per line” instruction promises.

**Impact:** normal keyboard entry produces an invalid filename instead of two context files. Pasting a complete multiline list is a workaround.

**Cause:** each keystroke splits, trims, removes empty lines, then joins the array back into the controlled textarea. That removes a newly entered trailing newline. See [instructions-page.tsx:61](/Users/philippcarlvictorstrieder/Developer/supernova/packages/web/src/features/harnesses/components/instructions-page.tsx:61).

**Fix acceptance:** preserve raw draft text while editing; normalize at the save boundary. Enter two paths using individual keystrokes, save, and confirm both paths survive reload separately.

![Context paths concatenated despite the one-per-line instruction](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-systematic-audit-2026-09-15/06-context-files-cannot-add-line.jpg)

## F03 — Markdown previews break local links and images

**Reproduction**

1. Put `[Details](docs/details.md)` and `![Audit chart](docs/chart.svg)` in the project's `README.md`, with both target files present.
2. Open **Files → README.md → Preview**.
3. The image is broken. The link resolves to `http://127.0.0.1:5187/session/docs/details.md`, and the image to `/session/docs/chart.svg`, instead of the project files.

The rendered image reported `complete: true` and `naturalWidth: 0`. The same preview rendered the test formula correctly. Source view showed the original Markdown correctly.

**Expected:** local references resolve relative to the displayed document. Document links open the corresponding workspace file; supported image formats display from that project.

**Impact:** normal READMEs and research documents lose their illustrations and internal navigation.

**Cause:** the file viewer uses the chat Markdown renderer without a document base path or a project asset resolver. The renderer emits ordinary anchors and image URLs. See [workspace-file-viewer.tsx](/Users/philippcarlvictorstrieder/Developer/supernova/packages/web/src/features/workspace/components/workspace-file-viewer.tsx) and [assistant-message-content.tsx:148](/Users/philippcarlvictorstrieder/Developer/supernova/packages/web/src/features/sessions/components/timeline/items/assistant/assistant-message-content.tsx:148).

**Fix acceptance:** cover root and nested documents, spaces/Unicode, local images, local anchors and external URLs. Resolve filesystem resources through the server, within the selected project.

![Broken local image in a Markdown file preview](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-systematic-audit-2026-09-15/04-local-markdown-assets-broken.jpg)

## F04 — Discarded curator time remains visible

**Reproduction**

1. Open **Settings → Coding → Curator** with an empty daily sweep time.
2. Enter `21:30`, then click **Discard**.
3. The footer changes to **No unsaved changes** and disables Save, but the time field still displays `21:30`.
4. Leave the page and return. The field is empty again, confirming that the displayed time was not saved.

This was reproduced twice. No schedule was saved or enabled.

**Expected:** Discard restores both the actual draft and every visible field to the saved value.

**Impact:** the interface presents a discarded schedule as current configuration. A user cannot trust what will run.

**Cause:** `CuratorSchedule` initializes local time strings from its props once. The parent resets its draft without resetting those local strings. The quiet-hours inputs use the same pattern but were not separately reproduced. See [curator-schedule.tsx:22](/Users/philippcarlvictorstrieder/Developer/supernova/packages/web/src/features/harnesses/components/curator-schedule.tsx:22).

**Fix acceptance:** daily time and quiet hours follow Discard and “Load current settings,” while incomplete typed values remain editable and visibly invalid.

![Discarded time remains displayed while the footer says No unsaved changes](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-systematic-audit-2026-09-15/05-discarded-schedule-stays-visible.jpg)

## F05 — The chat editor is unnamed in accessibility output

**Reproduction:** inspect the editable area in a new or existing chat. Both the native accessibility snapshot and the isolated browser expose a generic container rather than a named message textbox. DOM inspection of the actual editable element returns `role: null`, `aria-label: null`, and `aria-labelledby: null`.

**Expected:** a clearly named, multiline message input, distinguishable from the surrounding composer controls.

**Impact:** assistive navigation has no explicit message-input label or textbox role to target. Ordinary typing worked. An actual VoiceOver interaction was not completed, so this finding does not claim that typing is impossible with every assistive tool.

**Cause:** TipTap's editor attributes set CSS classes only. See [session-composer.tsx:291](/Users/philippcarlvictorstrieder/Developer/supernova/packages/web/src/features/sessions/components/composer/session-composer.tsx:291).

**Fix acceptance:** expose a named multiline textbox on the editable node; verify focus, announcements, disabled state and multiple chat panes with VoiceOver and the accessibility tree.

## F06 — Missing harnesses never leave the loading state

**Reproduction:** open `/settings/harness/audit-missing/overview`. After the harness library has loaded and Coding appears in the sidebar, the content still says **Loading harness…**. Returning later gives the same result.

**Expected:** a clear “Harness not found” state with a link to the harness library.

**Impact:** a stale or invalid link looks like a stalled connection instead of a missing resource.

**Cause:** the page combines “library has not loaded” and “library loaded without this harness” in the same branch. See [harness-config-page.tsx:247](/Users/philippcarlvictorstrieder/Developer/supernova/packages/web/src/features/harnesses/pages/harness-config-page.tsx:247).

**Fix acceptance:** distinguish loading, request failure and missing harness. Existing harness links must still load normally.

![Loaded sidebar with a nonexistent harness still shown as loading](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-systematic-audit-2026-09-15/07-missing-harness-loading-forever.jpg)

## Additional source finding — Native browser navigation needs verification

**High-confidence code finding, not a reproduced desktop result:** the workspace browser's resize observer captures the URL from the component's first mount. Submitting a new address updates the store and navigates the native view, but a subsequent resize calls `showWorkspaceBrowser` with the original URL. The native controller then loads that URL because it differs from its latest explicit load.

Likely reproduction: open page A, submit page B, resize the panel. The expected behavior is to keep B. Also verify that following links and using Back/Forward update the address field; there is no navigation-state subscription in this component.

See [workspace-browser-view.tsx:43](/Users/philippcarlvictorstrieder/Developer/supernova/packages/web/src/features/workspace/components/workspace-browser-view.tsx:43) and [workspace-browser.ts](/Users/philippcarlvictorstrieder/Developer/supernova/apps/desktop/src/workspace-browser.ts). Both match the installed build's source record. Native verification remained blocked by the locked Mac.

## Coverage and passing observations

| Area                                                            | This pass                                                                                                                         |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Installed home and existing chat                                | Opened; history and math rendered. Screenshots retained.                                                                          |
| Installed split-chat picker                                     | Empty state correctly said there was no other chat. Two-chat interaction was not exercised.                                       |
| Project opening and chat ownership                              | F01 reproduced. New-chat creation otherwise completed.                                                                            |
| Chat search                                                     | Missing query showed no results; title query found the chat; Enter opened it.                                                     |
| Model picker                                                    | Simulated model could be selected. Unsupported reasoning control was disabled.                                                    |
| Basic send                                                      | One request produced its expected response and saved conversation.                                                                |
| Provider failure                                                | Synthetic provider failure appeared visibly; the chat accepted another request.                                                   |
| Stop and recovery                                               | Held response stopped; a subsequent request completed.                                                                            |
| Queue                                                           | Added a follow-up, edited it, resumed the paused queue, and observed the edited message execute.                                  |
| Mid-response harness setup                                      | Solo continued for the active response; queued follow-up used Advisor, with the pending marker removed after application.         |
| Worker inspection                                               | Advisor completed 1/1; participant selection and worker conversation opened; saved result was visible.                            |
| Connection loss                                                 | Stopped only the isolated API. Draft remained visible and Send was disabled. Restart restored Send without losing the draft.      |
| File tree                                                       | Root listing, Markdown source/preview and Add to chat worked. Local Markdown assets failed as F03.                                |
| Context                                                         | Displayed captured configuration revision, capture time, recorded model and resource summary. Usage was explicitly estimated.     |
| Terminal                                                        | Clearly marked unavailable and explained the external-terminal alternative. This is a known feature gap, not an unexpected crash. |
| General, Appearance, Providers, About                           | Pages loaded. Provider search was exercised. No actual keys, account connections or appearance preferences were changed.          |
| Harness overview, instructions, agents, skills/tools, workflows | Pages loaded. The context-file input failed as F02. Workflow graph and step controls rendered.                                    |
| Project settings, Plan, Memory                                  | Pages and empty states loaded. No plan documents or memory records were changed.                                                  |
| Curator and Inbox                                               | Pages and empty states loaded; schedule draft/discard failed as F04. No review or proposal application was triggered.             |
| Invalid harness route                                           | F06 reproduced.                                                                                                                   |
| Accessibility                                                   | Missing message-input semantics reproduced as F05. Full assistive-technology coverage remains open.                               |

![Connection lost while the unsent draft remains available](/Users/philippcarlvictorstrieder/Developer/supernova/docs/qa/radian-systematic-audit-2026-09-15/08-disconnected-draft-preserved.jpg)

## Remaining acceptance work

- Finish native Browser, dictation permissions, OS file dialogs, update handling and window-layout testing after the Mac is unlocked.
- Exercise two simultaneous chats, goal progression, real provider authentication, and external provider failures.
- Exercise actual checkpoint restoration and concurrent file edits in a disposable Git repository. The earlier refinement report records coverage; it was not rerun in this audit.
- Exercise saved harness/project mutations, science import, curator review/application and conflicting edits from two clients. Draft-only form checks do not establish those flows.
- Test smaller window sizes separately. The browser viewport override did not produce the requested CSS viewport; no narrow-layout pass is claimed.

Repository-wide tests were not rerun: this turn added audit artifacts only. Previous passing checks were used as background, not substituted for these observations. The native lock and browser automation quirks were not counted as product defects.

## Fix sequence

1. Correct canonical project identity, then repair multiline draft handling and Discard resets.
2. Add project-aware Markdown link/image resolution and accessible composer semantics.
3. Add a missing-harness state and reproduce the native browser navigation issue.
4. Verify each fix with its acceptance case above, then run the repository gates and the unfinished native acceptance flows before packaging another app.
