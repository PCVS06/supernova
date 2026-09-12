# Changelog

All notable changes to Supernova are documented in this file.

## [Unreleased]

### Breaking Changes

### Changed

- Changed the dark workspace to pure-black surfaces with hidden scrollbar chrome, a compact grouped Context inspector, and icon-only settings, theme and help controls.
- Simplified Goal and dictation feedback by removing pass-count terminology, redundant continuation copy and empty-speech errors.
- Changed the primary chat to a headerless workspace, with Split View beside the right-sidebar control and secondary panes retaining compact identity headers.
- Changed the right workspace access to one hide/show control and closeable browser-style tabs for Files, Browser, Terminal and Context, with a plus button for opening another tool. Its default width now matches the main sidebar.
- Changed project files to open in a wide reader beside a persistent project tree, with rendered Markdown, source view and a compact Add to chat action.
- Changed chat context into independently collapsible Harness, Project, Role, Context, Resources and Runtime sections with one continuous scroll area.
- Changed project files to use a compact resizable tree and horizontally scrollable source lines, with clearer scrollbars throughout the workspace.
- Changed sidebar rows to keep muted actions visible in fixed positions and removed chat timestamps and other secondary row metadata.
- Changed harness project rows to keep their colored π mark visible beside a separate disclosure chevron.
- Changed the active-turn composer so Enter steers immediately, while Queue remains an explicit secondary action for messages that should run later.
- Reworked the harness settings: every agent page has Settings, Instructions, Skills and Memory tabs; Resources is harness-wide only; the Projects tab is a per-project planning tool with Plan, Instructions and Setup; Workflows shows Workflows and Limits.
- Redesigned the sidebar: a search field, small-caps harness headers with hover-only actions, aligned project and chat rows whose actions no longer overlap the name, a Lead pill for the coordinating project, and a quiet footer.
- The project Plan tab is a full-height workspace: a documents column beside the open document, Save, Revert and Cmd+S, a starting structure for files that do not exist yet, and a document list that saves as soon as it changes.

### Added

- Added microphone dictation to the empty message composer, with live start and stop controls and recognized text inserted into the draft.
- Added `/goal` with a saved objective, bounded continuation and visible pause/resume controls beside the composer.
- Added a saved message queue with explicit steering and removal; Stop pauses pending work until the queue is resumed.
- Added observed worker conversations alongside activity and context, linked from their owning chat and navigation rows.
- Added the Curator, a background role per harness that keeps instructions, planning documents and the memory ledger correct and short from evidence only: run receipts, user steers and ledger records. It files minimal find/replace proposals into a new Inbox tab (approve, edit, reject, roll back), can supersede or retract memory records and append a dated plan log by itself when those switches are on, keeps a version history of every instruction piece, records steers, and runs a memory-only pass 15 minutes after a project's last run. Off until enabled under Agents → Curator; spend is capped per review and per day.
- Projects can be removed from a harness, from the project's Setup tab or the sidebar menu. The folder stays on disk, existing chats keep their settings, and a coordinating project cannot be removed while it still has labs.

### Fixed

- Fixed desktop Browser stability by replacing the embedded webview with an isolated native browser surface that survives workspace tab changes.
- Fixed late first-message acceptance from reopening its chat after the user had already navigated away, and aligned the Goal tray with the full composer width.
- Fixed workspace tabs so their focus treatment and hidden tab-strip scrollbar no longer distort or overlap the tab row.
- Fixed project and chat pinning so pinned items move to the top without moving the pin control on hover.
- Fixed chat context to include configured and conventional project documents such as `GOAL.md`, without revision or capture-time noise.
- Fixed workspace-tab close buttons so they remove their tab and close the panel when the final tab is removed; the title-bar control still hides and restores the whole panel.
- Fixed `/goal` cancellation so typed goal commands return to a normal message draft, and removed unavailable steering actions from paused queues.
- A project whose folder disappeared from disk no longer fails new chats with a generic "Please try again"; the sidebar and settings mark it as missing, the toast names the folder, and its plan and instructions stay editable.
- Projects removed from a harness no longer linger in the sidebar as unmanaged folders.

### Removed

- Removed workspace-view keyboard shortcuts and their shortcut badges.
- Removed the keyboard hint and `/goal` shortcut row beneath the composer; goals remain available by typing the command in the composer.
- The separate Specialist memory list and the project-scoped Context page, both replaced by the reworked settings above.

## [0.2.0]

### Added

- Added named workflows with typed handoffs: each step references an existing agent, reads only the outputs it declares, and returns output that is validated against its contract on every provider. Runs are saved and resume from the failed step without re-running completed work or repeating an external action; a run page beneath the chat shows every step's inputs, outputs, failures, spend and the exact resume instruction.
- Added a workspace panel with a project file tree, a file viewer that can add a file reference to the chat, and a browser view.
- Added split view: open up to three chats from any projects side by side, each with its own draft and live stream.
- Added steering: while a turn is running, Send becomes Steer and interrupts the current step with your message.
- Added project planning documents: Markdown files such as PLAN.md and GOALS.md kept in the project, edited in place, and included in every agent's instructions for that project so long-term plans survive across chats.
- Added chat-owned worker receipts with nested delegation, status, tasks, working folders, model/effort, instruction layers, runtime tools/skills and final results.
- Added bounded lab-view management for project leads: names, colors and ordering only, with revision and ownership checks.
- Added per-agent model, reasoning effort, skills and colored pi identities, with project overrides and shared defaults.
- Added a real Science Space head-to-lab delegation tool, pinned lab configurations and an explicit orchestration hierarchy.
- Added harness workspaces with configurable agents, shared and project prompts, context policy, bounded execution, and visual sequential handoff graphs. Science Pi can be imported from a local package without modifying the original lab files; new harness chats capture their configuration.
- Added a monochrome pixel pi orb for the animated logo and live chat activity, with a still reduced-motion appearance.

### Changed

- Moved harness configuration into Settings, with one header, one tab bar and one form vocabulary across Agents, Resources, Workflows and Projects. Memory now sits inside Agents, context rules and files inside Resources, and run limits inside Workflows.
- Replaced the handoff list with a workflow graph: node cards connected by labelled edges, inline insert and remove, and a side-panel inspector for the selected step.
- Every agent, lead and project mark now uses the particle ring in its role color; the three-dot specialist mark is gone.
- Reworked the chat surface: a header with the project mark, title and role badge; a compact context strip with the project's planning documents; collapsed tool events; a composer with labelled model and effort controls and an unmistakable primary action.
- Specialist workers now receive a wind-down message one turn before their turn cap and shortly before their timeout instead of stopping silently, and a configuration whose instructions cannot fit the model's window is refused before a session starts.
- Split harness configuration into Agents, Resources, Memory and Graph / Workflows. Chats remain in the sidebar. Resources exposes registered tools and scientific connectors with separate, app-wide encrypted credential storage. Memory reads actual scientific ledgers and explicitly identifies the missing specialist-private memory layer. The new visual graph editor remains on hold.
- Give Memory the same identity workbench as Agents, with consistent harness/project/specialist navigation, searchable records and evidence, and a separate scope/storage panel.

- Unified coordinator, project-lead and specialist editors with one portrait size, aligned headers and forms, matching tabs and identity controls, consistent list rows, and the same responsive picker and scrolling behavior.
- Labs now open to chats. Removed the permanent sidebar team and configuration-scope switcher; instructions are organized by shared manual, project brief and agent role, with advanced controls grouped separately.
- Chat pi marks and selected sidebar chats inherit their project's color. Specialists use a three-dot orbital pi identity, and separate agent tabs distinguish coordinators, project leads and specialists.
- Model and effort settings now use dark, keyboard-accessible menus instead of native select popups.
- Main orchestrator, Project leads and Specialists have separate agent tabs. Project leads have a lab-only searchable list, large colored pi portraits, coordination relationships, and Settings, Instructions and Skills panels.
- Moved instructions into their owning agent panels: shared manual with the main orchestrator, project briefs with project leads, and specialist roles with specialists, with separate scope labels and revision-safe saves.
- Made every harness directly visible in the sidebar; replaced the top switcher with expandable harness, head, lab and team navigation.
- Split agent editing into compact master/detail panes with independent scrolling and clearer shared, project and role prompt scopes.
- Kept harness settings focused on prompts, agents, context, workflows, run limits, and projects; extension entry points and package paths stay internal.
- Enlarged the animated pi mark in working chats, compaction, navigation, and the new-chat screen.
- Restyled pi+ with a black monochrome palette, modern typography and softly rounded controls, subtle monospace accents, and shared pixel-pi navigation branding. Existing installs adopt dark, opaque appearance once; appearance controls remain available.
- Changed the desktop, favicon, and new-session branding to a custom white π mark on a black background.

### Fixed

- Fixed packaged desktop builds failing to start with "Supernova API exited before readiness": the bundled server's runtime dependencies were dropped during packaging, so the API could not load them.
- An unsigned macOS copy of pi+ can never be replaced by the updater, and a downloaded update whose signature does not match is refused by macOS. Both cases now explain themselves and offer a download from the releases page instead of failing with a code-signature error.
- Fixed Science extension loading in the packaged desktop app by shipping the Pi SDK's runtime dependencies.
- Removed title generation from the first-answer critical path, bounded read-only checkpoint discovery and surfaced settled provider errors before after-turn checkpoint work.
- Unified the skill picker and managed runtime skill catalogue, applied model/effort defaults to new chats, and preserved custom tool names and delegation outputs in the timeline.
- Fixed the Pi logo's visible background box in chats and the macOS icon's rounded shape and spacing.

### Removed

- Removed repetitive explanations and status banners from harness settings, Memory, Resources and agent navigation.

## [0.1.1]

### Added

- Added automatic loading of shared instructions from `~/.agents/AGENTS.md` alongside project instructions.

### Changed

- Changed nightly desktop builds to use a distinct app icon across macOS, Windows, and Linux.
- Changed tool details inside collapsed work groups to render only when expanded, so opening or scrolling through long sessions with many file edits no longer stalls on hidden diffs.

### Fixed

- Fixed the update button remaining visible during sidebar collapse; it now disappears immediately when the sidebar is collapsed.
- Fixed restoring saved checkpoints after checkpoint capture was disabled or failed, with confirmation before discarding uncaptured workspace changes.
- Fixed checkpoint confirmation text flashing to a different warning during the closing animation.
- Fixed optimistic checkpoint navigation flashing back before confirmation; the timeline now stays in place unless navigation is canceled or fails.
- Fixed the timeline briefly dropping below the bottom when a response with several messages finishes while following.
- Fixed a sent message flashing at the top of the timeline, or the scroll that pins it there stuttering, when the response starts arriving during that scroll. The timeline also keeps following when a fast response outgrows the space below the pinned message.

## [0.1.0]

### Breaking Changes

- Changed packaged desktop storage to a stable app origin; browser-local preferences and project lists from earlier desktop builds are not carried over. Server-side sessions and credentials are unchanged.

### Added

- Added 24-hour message times beside copy actions, with user message actions ordered as time, copy, and revert.
- Added a matrix-style dot animation beside the Thinking label, respecting reduced-motion preferences.
- Added automatic desktop updates: Supernova checks for new releases in the background and shows an Update pill next to the navigation arrows to download the update, then confirms before restarting into it.
- Added a nightly release channel published every night at 3AM UTC as a separate Supernova (Nightly) app that installs alongside stable and updates independently.

### Changed

- Changed sidebar sessions to show the same actions menu as session headers, with inline renaming in the sidebar.
- Changed macOS and Linux desktop launches to inherit the full login-shell environment, with broader shell support and a fallback for interactive startup failures.

### Fixed

- Fixed the macOS About menu showing the package name instead of Supernova.
- Fixed local startup port conflicts by assigning available API ports and reporting occupied explicit ports clearly.

## [0.0.1-beta.11]

### Added

- Added dot on the sidebar to indicate sessions with unseen activity.
- Added drag-and-drop reordering of sidebar projects.

### Changed

- Changed the model picker to refresh Pi's remote model catalogs so newly supported models become available without updating Supernova.
- Redesigned the settings pages with flat, uncontained sections, larger section headers, a wider content column, and a breadcrumb header.
- Changed the theme setting from a dropdown to a card library that previews each theme's light and dark palettes.

### Fixed

- Fixed new lines being cut off at the bottom of a fully expanded composer instead of scrolling into view.

## [0.0.1-beta.10]

### Added

- Added native Windows translucency to the sidebar, matching the existing macOS appearance setting.

### Changed

- Changed Windows to use native window controls integrated into the app header instead of a separate title bar.
- Changed new user messages to be scrolled to the top when sent.
- Changed streamed timeline growth to animate while auto-following.
- Upgraded the Pi runtime dependency to 0.83.0 and expanded provider sign-in dialogs to support provider-defined authentication prompts.
- Changed session timelines to reopen at the latest message instead of restoring the previous scroll position.
- Refined the default theme's colors for a calmer, more consistent interface.
- Redesigned the composer menus, model picker, and dialog search fields for a more consistent look.
- Changed workspace checkpoints to use app-owned shadow repositories with multi-repository snapshots, conflict-checked restores, rollback, and archived-session cleanup.
- Refined work and compaction status rows with bordered and separator conversation markers, including a shimmer while compaction is in progress.
- Increased the timeline's bottom spacing to keep the latest message slightly above the composer.

### Fixed

- Fixed session titles overlapping the forward navigation button when the sidebar was closed on Windows and Linux.
- Fixed the Windows title-bar app icon appearing pixelated at small display sizes.
- Fixed opening uncached sessions repeatedly parsing every saved Pi session.
- Fixed failed session title generation persisting a placeholder instead of falling back to the first user message.
- Fixed OAuth-backed providers failing to send messages in packaged desktop builds.
- Fixed the scroll-to-latest button briefly appearing while opening a session.
- Fixed new session timelines failing to follow responses when they first grew beyond the viewport.
- Fixed rejected message commands leaving a session unable to accept another message.
- Fixed active user messages appearing twice after switching between streaming sessions.
- Fixed timeline and composer overlays allowing message text to show through their backgrounds.
- Fixed context usage staying stale during active turns, appearing as zero when unknown, and losing valid measurements after compaction, aborts, or checkpoint navigation.
- Fixed error notifications letting underlying message text show through their background.
- Fixed the scroll-to-latest button's outline letting timeline messages show through it.
- Fixed undoing or reverting a just-anchored message leaving blank space in the timeline instead of pinning the previous turn to the bottom.
- Fixed the open-project dialog not showing a message when no folders match.

## [0.0.1-beta.9]

### Added

- Added a new Appearance settings tab, with customizable themes and fonts.

### Changed

- Changed open-project browsing to cache directory entries, filter typed path segments locally, prefetch likely navigation destinations, and provide parent-directory navigation.
- Overhauled the default Supernova theme.

### Fixed

- Fixed the new-chat Supernova logo visibility in light mode and improved its edge rendering in both themes.
- Fixed long unbroken composer text wrapping instead of overflowing the input.
- Fixed composer suggestion menus reopening with the previously selected item instead of the first item.

### Removed

- Removed the placeholder General settings tab.

## [0.0.1-beta.8]

### Changed

- Upgraded the Pi runtime dependency to 0.80.6.
- Changed checkpoint undo, redo, revert, and restore actions to update the session timeline immediately while navigation completes.

### Fixed

- Fixed checkpoint navigation so undo, redo, and message restores keep the model and reasoning picker selection stable.
- Fixed the scroll-to-latest button staying visible after checkpoint navigation scrolls the timeline to the latest message.

## [0.0.1-beta.7]

### Added

- Added composer draft persistence when switching between new chats and existing sessions.

### Changed

- Changed Pi runtime dependency to 0.80.3.
- Changed the context window menu to use clearer text hierarchy with a bounded usage meter and visible percentage.
- Changed major scrollable areas to use shadcn/ui `scroll-fade` edge fades when more content is available.
- Changed streaming status shimmer effects to use shadcn/ui `shimmer`.
- Changed the scroll-to-latest button to animate when appearing and disappearing.
- Changed checkpoint restores to use repo-local incremental snapshots and batched Git restores for faster undo and redo in large projects.
- Changed checkpoint undo to work after carrying uncommitted changes onto a new Git branch.

### Fixed

- Fixed undoing a turn so manual file changes made between completed turns are preserved.

## [0.0.1-beta.6]

### Added

- Added a session context usage indicator next to the model selector.

### Changed

- Changed Pi runtime dependency to 0.79.7.
- Changed sidebar session age labels to show `now` for recent activity.
- Changed session timeline skill file reads to display as loaded skills instead of generic file reads.

### Fixed

- Improved new chat startup speed so the first sent message appears immediately.
- Fixed sidebar session age labels wrapping onto multiple lines.
- Fixed automatic threshold compaction showing the chat footer as Thinking instead of Compacting context while compaction is running.
- Fixed model and reasoning selectors being unavailable while a message is streaming.
- Fixed renamed chats briefly flashing their previous title after confirming a new name.
- Fixed the Supernova icon on the new session page appearing clipped at the edges.
- Fixed the scroll-to-latest button overlapping rolled-back messages.
- Fixed the open-project dialog briefly flashing an empty subfolder state while folder suggestions are loading.

## [0.0.1-beta.5]

### Changed

- Changed the session timeline scroll-to-bottom button to appear as soon as the user scrolls away from the latest message.
- Changed the session timeline to maintain scroll position when switching between sessions.

### Fixed

- Fixed rolled-back messages reappearing when returning to a streaming session after sending a replacement message.
- Fixed rolled-back messages drawer layering so timeline content no longer appears above it.
- Fixed prefilled composer text reserving its height before the editor finishes loading.
- Fixed the session timeline staying bottom-pinned when the composer grows while the user is at the latest message.
- Fixed streaming sessions continuing to auto-scroll after the user scrolled slightly away from the latest message.
- Fixed streaming sessions losing auto-follow after switching away and back while already at the latest message.
- Fixed the session timeline scrolling to the bottom when a detached streaming message finishes or is stopped.
- Fixed the session timeline drifting slightly upward when the first streamed output replaces the initial thinking state.
- Fixed the initial thinking status and inline streaming status using different bottom spacing.

## [0.0.1-beta.4]

### Added

- Added a web fetch tool so agents can retrieve HTTP and HTTPS page content as markdown, text, or HTML.

### Fixed

- Fixed long user messages so they stay within the chat timeline and wrap instead of overflowing.

## [0.0.1-beta.3]

### Added

- Added sidebar session search.

### Changed

- Changed the session timeline to use custom virtua handling so the live tail is virtualized and streamed messages scroll reliably.

### Fixed

- Fixed reasoning-only assistant turns to use the same timeline spacing as normal assistant messages.
- Fixed stopped messages duplicating after stopping before the assistant response starts.

## [0.0.1-beta.2]

### Added

- Added chat actions in the session header for pinning, renaming, and archiving the current chat.

### Changed

- Changed the session chat timeline back to Legend List scrolling behavior, which fixed a lot of small janky behaviors with auto-scroll.
- Changed the rolled-back messages drawer to overlay the session instead of resizing it.
- Set a minimum desktop app window size.

### Fixed

- Fixed pinned sidebar chats so they remain visible even when older chats are hidden behind the project preview limit.
- Fixed the compact-width layout so the session panel shows by default and the sidebar toggle switches between full-width panels. Also made the settings sidebar keep its normal split layout while the page shrinks. ([#1](https://github.com/mattiacerutti/supernova/issues/1))

## [0.0.1-beta.1]

### Added

- Added a confirmation dialog before creating missing folders from the open-project dialog.
- Added a skeleton loading state for the providers settings page.

### Changed

- Replaced the session chat timeline virtualizer with TanStack Virtual.
- Changed the session footer to hide the Thinking label while a tool call is in progress.

### Fixed

- Fixed the scroll-to-bottom chat button border being transparent.

## [0.0.1-alpha.6]

### Changed

- Added a fade-in animation for newly revealed live assistant message text.
- Improved session work duration labels to show hours, minutes, and seconds.

### Fixed

- Fixed checkpoint navigation leaking undone messages into the agent's provider context.
- Fixed composer and sent-message references adding unintended visual spacing around adjacent text.
- Fixed the desktop app resetting its window size and position after reopening.

## [0.0.1-alpha.5]

### Added

- Added spring interaction for session pin icons when sessions are pinned or unpinned.

### Changed

- Added the app icon above the new chat prompt and improved styling.
- Allowed interactive with the message composer while a session is streaming.
- Made checkpoint undo and redo restore only checkpoint-changed worktree files without moving Git history or resetting staged changes.

### Fixed

- Fixed read tool line range labels to display the ending line relative to the starting offset.
- Fixed the session UI getting stuck when reverting messages after stopping an in-progress response.
- Fixed duplicate user messages appearing after refocusing the app while an agent response is streaming.

## [0.0.1-alpha.4]

### Added

- Added a projects sidebar action for collapsing all expanded projects.

### Changed

- Reworked provider OAuth login into a streamed, step-based flow with support for device-code or browser login.

### Fixed

- Removed display of partial tool-call arguments during streaming.
- Fixed command execution in the packaged desktop app so agents can find tools installed in the user's shell environment.
- Fixed the packaged desktop app forgetting opened projects, model preferences, and other local UI settings after restarting.

## [0.0.1-alpha.3]

### Breaking Changes

- Separated Supernova dev and production runtime state under `~/.supernova/dev` and `~/.supernova/userdata`, including Pi sessions, auth, and settings.

### Changed

- Split desktop icon generation into dev and production source sets.

## [0.0.1-alpha.2]

### Breaking Changes

### Added

### Changed

### Fixed

- Fixed macOS desktop packaging so unsigned alpha builds can launch correctly.

### Removed

## [0.0.1-alpha.1]

### Breaking Changes

### Added

- Initial alpha release of the Supernova desktop agent UI.

### Changed

### Fixed

### Removed
