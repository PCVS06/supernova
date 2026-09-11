import {Schema} from "effect";
import {ChatHarnessContext, HarnessConfig, HarnessLibrary, HarnessProject, HarnessRun, HarnessRunSummary} from "@supernova/contracts/harnesses/schemas";
import {Session} from "@supernova/contracts/sessions/schemas";

export const GetHarnessLibraryPayload = Schema.Struct({});
export const GetHarnessLibraryResult = HarnessLibrary;
export const GetHarnessSkillsPayload = Schema.Struct({harnessId: Schema.String});
export const GetHarnessSkillsResult = Schema.Array(Schema.Struct({name: Schema.String, description: Schema.String}));
export const SaveHarnessPayload = Schema.Struct({harness: HarnessConfig, expectedRevision: Schema.Number});
export const SaveHarnessProjectPayload = Schema.Struct({project: HarnessProject, expectedRevision: Schema.Number});
export const UpdateHarnessViewPayload = Schema.Struct({projectId: Schema.String, beforeProjectId: Schema.String, expectedRevision: Schema.Number});
export const ImportScienceHarnessPayload = Schema.Struct({packagePath: Schema.String, rootPath: Schema.String, expectedRevision: Schema.Number});
export const CreateHarnessSessionPayload = Schema.Struct({projectId: Schema.String});
export const CreateHarnessSessionResult = Session;
export const ChatHarnessPayload = Schema.Struct({sessionId: Schema.String});
export const GetChatHarnessResult = ChatHarnessContext;
export const ListHarnessRunsResult = Schema.Array(HarnessRunSummary);
export const GetHarnessRunPayload = Schema.Struct({sessionId: Schema.String, runId: Schema.String});
export const GetHarnessRunResult = HarnessRun;
export class HarnessConfigurationError extends Schema.TaggedErrorClass<HarnessConfigurationError>()("HarnessConfigurationError", {message: Schema.String}) {}
