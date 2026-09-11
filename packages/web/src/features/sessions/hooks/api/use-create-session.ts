import {useMutation} from "@tanstack/react-query";
import {Effect} from "effect";
import {eq} from "@/rpc/effect-query";
import {RpcProtocolClientService} from "@/rpc/transport/client";

interface CreateSessionMutationInput {
  projectPath: string;
  harnessProjectId?: string;
}

export function useCreateSession() {
  return useMutation(
    eq.mutationOptions({
      mutationFn: (input: CreateSessionMutationInput) =>
        Effect.gen(function* () {
          const rpc = yield* RpcProtocolClientService;
          if (input.harnessProjectId) return yield* rpc.createHarnessSession({projectId: input.harnessProjectId});
          return yield* rpc.createSession({projectPath: input.projectPath});
        }),
    })
  );
}
