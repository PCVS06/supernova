import type {AgentSession, ResourceLoader} from "@earendil-works/pi-coding-agent";
import type {HarnessRuntimeContext} from "@supernova/contracts/harnesses/schemas";

/** Records what the SDK actually loaded, not what the latest settings now say. */
export function captureHarnessContext(session: AgentSession, loader: ResourceLoader): HarnessRuntimeContext {
  return {
    capturedAt: new Date().toISOString(),
    systemPrompt: session.systemPrompt,
    tools: session.getActiveToolNames(),
    skills: loader.getSkills().skills.map((skill) => skill.name),
    contextFiles: loader.getAgentsFiles().agentsFiles.map((file) => file.path),
    model: session.model ? {id: session.model.id, providerId: session.model.provider, thinkingLevel: session.thinkingLevel} : undefined,
  };
}
