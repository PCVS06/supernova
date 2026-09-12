import {AgentRpcGroup} from "@supernova/contracts";
import {Effect} from "effect";
import {FoldersService} from "@supernova/agent-runtime/services/folders-service";
import {ProvidersService} from "@supernova/agent-runtime/services/providers-service";
import {ProjectsService} from "@supernova/agent-runtime/services/projects-service";
import {SessionRuntimeService} from "@supernova/agent-runtime/services/session-runtime-service";
import {SessionsService} from "@supernova/agent-runtime/services/sessions-service";
import {harnessStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-store";
import {harnessRunStore} from "@supernova/agent-runtime/layers/harnesses/internal/harness-run-store";
import {PiSdkService} from "@supernova/agent-runtime/layers/pi-sdk";
import {curatorStore} from "@supernova/agent-runtime/layers/curator/curator-store";
import {decideCuration, rollbackCuration} from "@supernova/agent-runtime/layers/curator/curator-decisions";
import {runCuratorReview} from "@supernova/agent-runtime/layers/curator/curator-run";
import {harnessPromptLayers} from "@supernova/agent-runtime/layers/harnesses/lib/harness-prompts";
import {getHarnessResources, getHarnessMemory} from "@supernova/agent-runtime/layers/harnesses/internal/harness-resources";
import {toolCredentials} from "@supernova/agent-runtime/layers/harnesses/internal/tool-credentials";
import {HarnessConfigurationError} from "@supernova/contracts/harnesses/procedures";
import {CreateSessionError} from "@supernova/contracts/sessions/procedures";

function configurationEffect<T>(run: () => Promise<T>) {
  return Effect.tryPromise({try: run, catch: (error) => new HarnessConfigurationError({message: error instanceof Error ? error.message : "Harness configuration failed."})});
}

export const AgentRpcLive = AgentRpcGroup.toLayer(
  Effect.gen(function* () {
    const folders = yield* FoldersService;
    const providers = yield* ProvidersService;
    const projects = yield* ProjectsService;
    const sessionRuntime = yield* SessionRuntimeService;
    const sessions = yield* SessionsService;
    const piSdk = yield* PiSdkService;

    return {
      getHarnessResources: ({harnessId, projectId}) => configurationEffect(() => getHarnessResources(harnessId, projectId)),
      getHarnessMemory: ({harnessId, projectId}) => configurationEffect(() => getHarnessMemory(harnessId, projectId)),
      getToolCredentials: () => configurationEffect(() => toolCredentials.status()),
      saveToolCredential: ({name, value}) => configurationEffect(() => toolCredentials.save(name, value)),
      getHarnessLibrary: () => configurationEffect(() => harnessStore.describe()),
      updateHarnessView: ({projectId, beforeProjectId, expectedRevision}) =>
        configurationEffect(async () =>
          harnessStore.withFolderStatus(await harnessStore.updateView(await harnessStore.resolveProject(projectId), {projectId, beforeProjectId}, expectedRevision))
        ),
      getChatHarness: ({sessionId}) =>
        configurationEffect(async () => {
          const session = await Effect.runPromise(sessions.get(sessionId));
          const snapshot = await harnessStore.forSession(sessionId, session.projectPath);
          return {
            snapshot,
            captured: await harnessStore.hasSnapshot(sessionId),
            instructions: snapshot ? harnessPromptLayers(snapshot) : [],
            runtime: await harnessRunStore.context(sessionId),
          };
        }),
      listHarnessRuns: ({sessionId}) =>
        configurationEffect(async () => {
          await Effect.runPromise(sessions.get(sessionId));
          return harnessRunStore.list(sessionId);
        }),
      getHarnessRun: ({sessionId, runId}) =>
        configurationEffect(async () => {
          await Effect.runPromise(sessions.get(sessionId));
          return harnessRunStore.get(sessionId, runId);
        }),
      listWorkflowRuns: ({sessionId}) =>
        configurationEffect(async () => {
          await Effect.runPromise(sessions.get(sessionId));
          return harnessRunStore.listWorkflowRuns(sessionId);
        }),
      getWorkflowRun: ({sessionId, runId}) =>
        configurationEffect(async () => {
          await Effect.runPromise(sessions.get(sessionId));
          return harnessRunStore.getWorkflowRun(sessionId, runId);
        }),
      getHarnessSkills: ({harnessId}) => configurationEffect(async () => (await harnessStore.listSkills(harnessId)).map(({name, description}) => ({name, description}))),
      saveHarness: ({harness, expectedRevision}) => configurationEffect(async () => harnessStore.withFolderStatus(await harnessStore.save(harness, expectedRevision))),
      removeHarnessProject: ({projectId, expectedRevision}) =>
        configurationEffect(async () => harnessStore.withFolderStatus(await harnessStore.removeProject(projectId, expectedRevision))),
      saveHarnessProject: ({project, expectedRevision}) =>
        configurationEffect(async () => harnessStore.withFolderStatus(await harnessStore.saveProject(project, expectedRevision))),
      importScienceHarness: ({packagePath, rootPath, expectedRevision}) =>
        configurationEffect(async () => harnessStore.withFolderStatus(await harnessStore.importScience(packagePath, rootPath, expectedRevision))),
      listCuration: ({harnessId}) =>
        configurationEffect(async () => ({proposals: await curatorStore.listProposals(harnessId), reviews: await curatorStore.listReviews(harnessId)})),
      decideCuration: ({proposalId, decision, replace, reason, expectedRevision}) =>
        configurationEffect(() => decideCuration({proposalId, decision, replace, reason, expectedRevision})),
      rollbackCuration: ({proposalId, expectedRevision}) => configurationEffect(() => rollbackCuration({proposalId, expectedRevision})),
      // One review is one model session, so this call takes as long as the review does.
      runCuratorReview: ({harnessId, projectId}) => configurationEffect(() => runCuratorReview({harnessId, projectId, trigger: "manual", scope: "full", piSdk})),
      listInstructionVersions: ({target}) => configurationEffect(async () => ({versions: await harnessStore.listVersions(target)})),
      readInstructionVersion: ({target, revision}) => configurationEffect(async () => ({content: await harnessStore.readVersion(target, revision)})),
      createHarnessSession: ({projectId}) =>
        configurationEffect(async () => {
          const snapshot = await harnessStore.resolveProject(projectId);
          const session = await Effect.runPromise(sessions.create(snapshot.project.path));
          await harnessStore.bindSession(session.id, snapshot);
          return session;
        }),
      abortSession: ({sessionId}) => sessionRuntime.abortSession(sessionId),
      getSessionControls: ({sessionId}) => sessionRuntime.getSessionControls(sessionId),
      updateSessionControls: (input) => sessionRuntime.updateSessionControls(input),
      archiveProjectSession: ({projectPath, sessionId}) =>
        Effect.gen(function* () {
          yield* sessionRuntime.releaseSession(sessionId);
          const archived = yield* projects.archiveSession(projectPath, sessionId);
          yield* sessionRuntime.deleteSessionCheckpoints(projectPath, sessionId);
          return archived;
        }),
      cancelProviderLogin: ({loginSessionId}) => providers.cancelLogin(loginSessionId),
      compactSession: (input) => sessionRuntime.compactSession(input),
      createFolder: ({path}) => folders.create(path),
      createSession: ({projectPath}) =>
        configurationEffect(async () => {
          const snapshot = await harnessStore.resolveNewSession(projectPath);
          const session = await Effect.runPromise(sessions.create(snapshot.project.path));
          await harnessStore.bindSession(session.id, snapshot);
          return session;
        }).pipe(Effect.mapError((error) => new CreateSessionError({message: error.message}))),
      getSession: ({sessionId}) =>
        Effect.flatMap(sessionRuntime.getCommittedSession(sessionId), (committedSession) => (committedSession ? Effect.succeed(committedSession) : sessions.get(sessionId))),
      listFolderFiles: ({projectPath, query}) => folders.listFiles(projectPath, query),
      listFolderEntries: ({projectPath, path}) => folders.listEntries(projectPath, path),
      readFolderFile: ({projectPath, path}) => folders.readFile(projectPath, path),
      writeFolderFile: ({projectPath, path, content, expectedModifiedAt}) => folders.writeFile(projectPath, path, content, expectedModifiedAt),
      listFolderSuggestions: ({query}) => folders.listSuggestions(query),
      listProviders: () => providers.list(),
      listProjectSessions: (input) => projects.listSessions(input),
      listComposerSuggestions: ({kind, projectPath, query}) => sessions.listComposerSuggestions(projectPath, kind, query),
      listModels: () => sessions.listModels(),
      logoutProvider: ({providerId}) => providers.logout(providerId),
      redoCheckpoint: (input) => sessionRuntime.redoCheckpoint(input),
      renameSession: (input) => sessions.rename(input),
      revertToMessage: (input) => sessionRuntime.revertToMessage(input),
      sendMessage: (input) => sessionRuntime.sendMessage(input),
      steerSession: (input) => sessionRuntime.steerSession(input),
      startProviderLogin: ({authType, providerId}) => providers.startLogin(providerId, authType),
      submitProviderLoginInput: ({input, loginSessionId}) => providers.submitLoginInput(loginSessionId, input),
      watchProviderLoginSession: ({loginSessionId}) => providers.watchLoginSession(loginSessionId),
      undoCheckpoint: (input) => sessionRuntime.undoCheckpoint(input),
      watchEvents: () => sessionRuntime.watchEvents(),
    };
  })
);
