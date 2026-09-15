import type {Page} from "@playwright/test";
import {createRpcClient} from "@/rpc/transport/client";

/** Seeds durable deferred messages through the real API, independently of the removed Queue button. */
export async function enqueueRuntimeMessages(page: Page, messages: readonly string[]): Promise<void> {
  const sessionId = new URL(page.url()).pathname.split("/")[2]!;
  const client = createRpcClient(`http://127.0.0.1:${process.env.PLAYWRIGHT_RUNTIME_PORT ?? 4318}`);
  try {
    const session = await client.run((rpc) => rpc.getSession({sessionId}));
    const modelReference = session.modelReference;
    if (!modelReference) throw new Error("The runtime fixture must select a model before queuing messages");
    for (const text of messages)
      await client.run((rpc) =>
        rpc.updateSessionControls({
          sessionId,
          action: {
            type: "enqueue",
            contentParts: [{type: "text", text}],
            modelReference,
            captureCheckpoints: false,
          },
        })
      );
  } finally {
    await client.dispose();
  }
}
