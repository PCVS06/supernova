import type {CollaborationMode} from "@supernova/contracts/harnesses/schemas";

export const collaborationModes: readonly {readonly id: CollaborationMode; readonly name: string}[] = [
  {id: "solo", name: "Solo"},
  {id: "advisor", name: "Advisor"},
  {id: "compare", name: "Compare"},
  {id: "fuse", name: "Fuse"},
];
