# Radian: settings restructure plan

Status: proposal, 13 September 2026. Based on the `settings` and `harnesses` features in `packages/web`, the harness schema in `packages/contracts`, the persisted client stores, and the running Radian 0.2.0 desktop app inspected through its own API (library revision 27: harnesses Coding and Science Pi, 13 specialists, 1 workflow, 33 registered tools).

## Summary

Settings currently hold two different products behind one four-item sidebar. The first is a thin set of app preferences (General, Appearance, Providers). The second is the whole harness configuration workspace (agents, prompts, resources, workflows, projects, curator, inbox), navigated entirely inside the content area. On an agent page up to seven navigation layers stack above the first control. Several schema fields can be edited from two or more places, some pages save on click while others wait for "Save changes", app-wide tool credentials live inside one harness, and activity surfaces (Inbox, memory ledger, review history) live inside configuration.

The proposal:

1. The settings sidebar becomes the navigation tree: App pages plus one expandable node per harness. The content area shows one page with at most one tab row.
2. Every configuration field gets exactly one home. Other places link to it.
3. One save model per surface. Harness pages share one draft for the harness and all its projects; pages that act immediately say so and have no Save button.
4. Activity surfaces leave Settings: the Inbox becomes a workspace page, memory becomes a read-only tab of the project it belongs to.

Five phases, each shippable on its own, each with the tests it must keep green.

## 1. What exists today

### 1.1 Routes and pages

| Route                                                    | Content                                                                                                                                               | Data owner                                                                                 |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `/settings` → `/settings/general`                        | Git checkpoints: two switches                                                                                                                         | Browser `localStorage` (`supernova-general-settings`); sent with every send-message call   |
| `/settings/appearance`                                   | Theme (one palette), color mode, light and motion with a live reply preview, chat systems and navigation, typography, translucent sidebar (light only) | `localStorage` (`supernova-appearance`, `radian-workspace-map`)                            |
| `/settings/providers`                                    | Pi providers: connected and available, OAuth and API-key dialog                                                                                       | Server (Pi auth store)                                                                     |
| `/settings/harnesses`                                    | Harness cards, create a harness, import Science Pi                                                                                                    | Server (`~/.config/pi-plus/harnesses.json`, revision-checked)                              |
| `/settings/harness/$id?section=&projectId=&agentName=`   | Harness configuration workspace (1.2)                                                                                                                 | Server, revision-checked; draft in the page                                                |

### 1.2 Harness configuration workspace

One header (identity, Save changes, Discard), one tab bar, then per tab:

| Tab       | Sub-navigation                                                                | Panels                                                                                                                                     |
| --------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Agents    | Main orchestrator · Project leads · Specialists · Curator                     | The first three open an agent workbench: list column, hero, then Settings · Instructions · Skills · Memory. Curator: status, model, auto-apply, spend, reviews |
| Resources | Skills · Tools · Connectors · Context                                         | Skill switches; read-only tool catalogue and extensions; app-wide tool credentials; context rules, files and budget                        |
| Workflows | Workflows · Limits                                                            | Workflow picker, fields, graph, step inspector; max turns and timeout                                                                       |
| Projects  | Project list                                                                  | Plan (documents, saves at once) · Instructions (project prompt, history, specialist overrides) · Setup (name, folder, color, remove)        |
| Inbox     | Pending · Applied · Rejected · All                                            | Curator proposals with approve, edit, reject, roll back                                                                                     |

Measured on the live app at 1280×820, the Main orchestrator page stacks: settings sidebar, five-crumb breadcrumb, harness header, five harness tabs, four role tabs, agent hero, four editor tabs. The first editable control (Model) sits about 500 px from the top: roughly 60% of the viewport is navigation before content. The Specialists page adds a list column.

### 1.3 Entry points into Settings

- Sidebar footer gear → `/settings` (General)
- Harness header sliders icon → harness configuration (Agents)
- Project row menu "Project settings" and the Context panel gear → Projects tab of that project
- Footer inbox icon, workspace map, attention list, curator page → Inbox tab
- Legacy `/harnesses` and `/harness/$id` redirect in (`settings-harness-routes.test.ts` pins them)

### 1.4 Preferences that live outside Settings

| Store                                | Keeps                                                                | Also editable in                       |
| ------------------------------------ | -------------------------------------------------------------------- | -------------------------------------- |
| `supernova-sidebar-sections`         | Sidebar width, expanded projects, collapsed groups                    | Sidebar itself                         |
| `supernova-workspace-panel-v3`       | Panel visibility, open tabs, width, browser URL                       | Workspace panel                        |
| `radian-workspace-map`               | Map view, scope, time; orbit motion, orbit detail, sidebar detail     | Map options popover; Appearance page   |
| `supernova-model-picker`             | Favorite and recent models, last thinking level                       | Composer                               |
| `supernova-session-model-selection`  | Model per chat                                                        | Composer                               |
| `pi-plus-harness-navigation`         | Active harness and project (defaults to the hard-coded id `science`)  | Set by navigation                      |
| Desktop (`electron-window-state`)    | Window bounds; native theme; update state                             | Update button in the home header only  |

## 2. Findings

**F1 · Navigation depth.** Up to seven stacked navigation layers. The 288 px settings sidebar spends its space on four links while the real tree (harness → tab → role → agent → editor tab) is rendered as content.

**F2 · Two products under one label.** App preferences are flat, few, apply instantly, and are browser-local or Pi-owned. Harness configuration is a server-owned, revision-checked editing workspace with drafts, list-detail editors, a graph editor and a document editor. The "Harnesses" section is a card list that hides a second application.

**F3 · Fields with more than one home.**

| Field                                             | Edited in                                                                                                                              |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `project.systemPrompt`                            | Agents → orchestrator or lead → Instructions ("Central brief" / "Project brief"); Projects → Instructions ("Project instructions")     |
| `project.color`                                   | Agents → lead → Settings → Identity; Projects → Setup → Role color                                                                      |
| `harness.enabledSkills`                           | Resources → Skills; Agents → orchestrator without project scope → Skills                                                              |
| `harness.execution`                               | Agents → Project leads with no lab selected ("Project lead defaults")                                                                   |
| `project.execution`, `project.enabledSkills`      | Agents → lead → Settings and Skills, while the same project's name and folder are under Projects → Setup                             |
| Memory ledger (one per project)                   | Memory tab of the orchestrator, every lead and all 13 specialists: fifteen places for the same data                                     |

**F4 · Mixed save semantics in one surface.** Draft plus "Save changes" plus a navigation blocker for most fields. Immediate save for planning documents, tool credentials, project removal, harness creation and import, "Review now", and inbox decisions. Changing the project scope remounts the draft and asks with `window.confirm`.

**F5 · Wrong homes.** Tool credentials are app-wide (the panel says "app-wide credentials · encrypted local storage") but sit under one harness's Resources → Connectors. Tools is a read-only catalogue inside an editor. Orbit motion, orbit detail and sidebar detail are behaviour preferences listed under Appearance. Translucent sidebar only appears in light mode. Inbox (approve or reject work) and the curator review history are activity surfaces inside configuration.

**F6 · Implicit scope.** `?section=` decides whether a project scope applies (a hand-kept list in `harness-config-page.tsx`) and which project is chosen by default: the coordinator for the orchestrator, the first lab for leads, the first project for Projects. The header line ("Harness-wide settings" or "Project of Science Pi") is the only signal.

**F7 · Missing places.** No page shows the version, update channel, a check for updates, the data folder or the server endpoint; the update control is a header button. General has only the two checkpoint switches.

**F8 · Development leftovers in the interface.** Import defaults `~/Developer/pi-scientific-tools` and `~/Developer/Science-Space` are in the component; the navigation store starts on harness `science`; project rows fall back to harness `coding`.

## 3. Target structure

```text
Settings
├─ App
│  ├─ General            checkpoints · confirmations · workspace behaviour (sidebar detail, orbit motion, orbit detail, map defaults)
│  ├─ Appearance         theme and mode · typography · light and motion (preview folded away) · translucent sidebar (always listed)
│  ├─ Providers & keys   Pi providers · tool credentials (from harness Connectors)
│  └─ About              version · channel · updates · data folder · server endpoint
└─ Harnesses             library: cards · create · import (empty path fields)
   └─ Science Pi         one expandable node per harness
      ├─ Overview        name · description · default model and effort · run limits · coordinating project
      ├─ Instructions    shared manual · coordination role · context rules · context files · budget · history
      ├─ Agents          one list: τ main orchestrator, e specialists → Settings · Instructions · Skills
      ├─ Skills & tools  skills on and off · registered tools (read-only) · extensions
      ├─ Workflows       list → fields, graph, step inspector
      ├─ Projects        list → Setup · Lead · Instructions · Plan · Memory
      └─ Curator         enabled · model · auto-apply · spend

Outside Settings
   Inbox                 /inbox/$harnessId in the home layout: proposals and review history
```

Rules the structure follows:

1. **Sidebar is the tree, content is one page.** At most one tab row inside a page: the detail tabs of a list-detail page (Agents, Projects, Workflows). No breadcrumb; the page header names the harness and the page.
2. **One field, one home** (section 4). A project lead is a facet of its project, so its role prompt, model, skills and overrides live on the project's Lead tab. The main orchestrator is the harness's coordinating role and stays under Agents. The Project leads sub-tab and the "Project lead defaults" view disappear.
3. **One save model per surface.** All harness pages share one draft that covers the harness and all its projects, with one Save and Discard in a sticky bar at the bottom of the content. Changing a list selection never touches the draft. Pages that act immediately (Plan documents, credentials, Inbox) say so in their header and have no Save button.
4. **Scope is explicit in the URL.** `/settings/harness/$id/agents?agent=`, `/projects?project=`, `/workflows?workflow=`. `?section=` disappears; the existing legacy map redirects every old value.
5. **Read-only is labelled.** Registered tools, extensions and the memory ledger say "read-only" in their header and use the list treatment, not the form treatment.

## 4. Field ownership map

| Schema field                                                                         | Only home                     |
| ------------------------------------------------------------------------------------ | ----------------------------- |
| `harness.name`, `description`, `execution`, `loop`, `coordinatorProjectId`           | Harness › Overview            |
| `harness.systemPrompt`, `orchestratorPrompt`, `context.*`                            | Harness › Instructions        |
| `harness.agents[]` (name, description, systemPrompt, tools, execution, skillNames, color) | Harness › Agents › specialist |
| `harness.enabledSkills`                                                              | Harness › Skills & tools      |
| `harness.workflows`, `graph`                                                         | Harness › Workflows           |
| `harness.curator.*`                                                                  | Harness › Curator             |
| `project.name`, `path`, `color`, `parentProjectId`, `order`                          | Projects › Setup              |
| `project.orchestratorPrompt`, `execution`, `enabledSkills`, `agents[]` (overrides)   | Projects › Lead               |
| `project.systemPrompt`, `contextInstructions`                                        | Projects › Instructions       |
| `project.planningDocuments`                                                          | Projects › Plan (saves at once) |
| Memory ledger of a project                                                           | Projects › Memory (read-only) |
| Pi providers, tool credentials                                                       | App › Providers & keys        |
| `supernova-general-settings`, `radian-workspace-map` behaviour keys                  | App › General                 |
| `supernova-appearance`                                                               | App › Appearance              |
| Version, channel, update state                                                       | App › About                   |

The coordinating project has no Lead tab; its Projects page links to Harness › Agents › Main orchestrator for the coordination role.

## 5. Phases

Each phase ends green on `bun run test`, `bun run typecheck`, `bun run lint`, `bun run prettier`, and `bun run test:e2e`, and adds its user-facing entry under `## [Unreleased]` › `### Changed` in `CHANGELOG.md`.

### Phase 1 · Navigation tree and routes

Files: `features/settings/data/settings-sections.ts` becomes `settings-tree.ts` (App pages, harness nodes, harness pages); `settings-sidebar.tsx` renders the tree with the active harness expanded; `settings-shell.tsx` drops the breadcrumb for a page header; `app/router.ts` and `app/routes.tsx` gain `/settings/harness/$harnessId/$page`; `features/harnesses/lib/harness-sections.ts` maps every old `?section=` value and tab to a new page; `harness-config-page.tsx` mounts the existing panels under the new pages without moving content yet.

Tests: extend `tests/unit/features/settings/settings-harness-routes.test.ts` with the new URLs and every legacy value; keep the redirect cases.

Acceptance: every old URL lands on the equivalent page; the Main orchestrator page shows its first control within 250 px of the top at 1280×820; no more than three navigation layers on any settings page.

### Phase 2 · One draft, one save bar

Files: `harness-config-page.tsx` (`WorkspaceEditor` draft becomes `{harness, projects[]}`), `lib/save-workspace-draft.ts` (save every changed owner, keep the revision handling), `harness-config-header.tsx` becomes a sticky save bar, the `window.confirm` calls become the app `Dialog`.

Tests: unit test for `save-workspace-draft` with a harness and two changed projects; `project-config-editor.test.tsx` and `leads-editor.test.tsx` updated for selection changes that keep edits.

Acceptance: switching agent, project or workflow keeps unsaved edits; the blocker only fires when leaving the harness; a page that acts immediately shows no Save bar.

### Phase 3 · One field, one home

Files: new `overview-page.tsx` and `instructions-page.tsx`; `agents-editor.tsx` lists orchestrator plus specialists and loses the Memory tab; `leads-editor.tsx` becomes the project Lead tab inside `project-config-editor.tsx`; `agent-memory-panel.tsx` becomes the project Memory tab; `resources-editor.tsx` splits into Skills & tools and the Instructions context groups; `run-limits-editor.tsx` folds into Overview; `agent-role-map.tsx` and the Memory entries in `agent-workbench.tsx` are removed.

Tests: `leads-editor.test.tsx`, `curator-editor.test.tsx`, `agent-memory-panel.test.tsx`, `project-config-editor.test.tsx`, `context-inspection.test.tsx` follow the moves; a new test asserts that each field in section 4 renders one editor.

Acceptance: the six rows of F3 each have one editing place; the other places show a link.

### Phase 4 · App pages

Files: `providers-section.tsx` gains the credentials group (`tool-credentials-editor.tsx` moves to `features/settings`); `general-section.tsx` gains the workspace behaviour group from `workspace-appearance.tsx`; `appearance-section.tsx` folds the preview into a disclosure and always lists the translucent sidebar row (disabled with a note in dark mode); new `about-section.tsx` reads `desktopApi.appVersion`, `nightly` and the update state, and shows the server endpoint and data folder; the browser build shows version and endpoint only.

Tests: the e2e case "saves orbital and sidebar choices in Appearance" moves to General; a unit test for the About page in browser and desktop environments.

Acceptance: credentials are reachable without opening a harness; Appearance fits in two screens at 1280×820.

### Phase 5 · Inbox out of Settings, leftovers out of the code

Files: `curation-inbox.tsx` mounts on a new `/inbox/$harnessId` route under the home layout with the main sidebar; the curator review list moves with it; `sidebar-inbox.tsx`, `workspace-map.tsx`, `workspace-attention-list.tsx` and `curator-editor.tsx` link there; `harnesses-page.tsx` import fields start empty with placeholders; `harness-navigation-store.ts` starts on the first harness of the library; `project-list-item.tsx` stops falling back to `coding`.

Tests: `radian-regressions.spec.ts` inbox assertion follows the URL; `curation-inbox.test.tsx` unchanged apart from the mount.

Acceptance: an approval takes one click from the footer without entering Settings; a fresh profile opens the right harness.

## 6. Open decisions

1. **Inbox outside Settings** (recommended) or kept as a harness node with a count badge.
2. **Leads under Projects** (recommended) or kept as an Agents sub-tab; the duplication in F3 goes away either way, the difference is where a lead's role is found.
3. **Memory under Projects** (recommended) or only in the chat Context panel.
4. **About page in the browser build**: version and endpoint only, or hidden.
5. **Color palette library** with a single palette: keep the card, or show only the mode picker until a second palette exists.

## 7. Acceptance checks for the whole plan

- No settings page has more than three navigation layers: sidebar, page header, one tab row.
- Every field in section 4 is set by exactly one component.
- A page has a Save bar or states that it acts immediately, never both.
- Every URL in the redirect test resolves; the footer gear, harness sliders, "Project settings", Context gear and inbox icon land on the right page.
- Unit and end-to-end suites stay green through every phase.

## Out of scope

- New preferences such as a default model for new chats or keyboard shortcuts.
- Moving browser-local preferences to the server. General and Appearance are per browser today, which will matter once remote access lands; noted as a follow-up.
- Restyling `SettingsRow`, `ConfigChoice` or the agent identity picker beyond what the moves need.
