import type { PluginClientContext } from "@getpaseo/plugin/client";

export default function contribute(client: PluginClientContext) {
  client.addSlashCommand({
    name: "freebuff-terminal",
    description: "Launch Freebuff in a Paseo terminal",
    argumentHint: "[initial prompt]",
    context: "agent",
    async onSubmit({ args, agent }) {
      const workspaceId = agent.workspaceId;
      if (!workspaceId) {
        console.error("Freebuff terminal requires an agent workspace");
        return;
      }
      const initialPrompt = args.trim();
      const handle = await client.paseo.terminals.create({
        workspaceId,
        command: "freebuff",
        args: [],
        name: "Freebuff",
      });
      if (!initialPrompt) return;

      for (let attempt = 0; attempt < 100; attempt += 1) {
        const capture = await handle.capture().catch(() => null);
        const screen = capture?.lines?.join("\n") ?? "";
        if (screen.includes("Enter a coding task or / for commands")) {
          handle.sendKeys([initialPrompt]);
          await new Promise((resolve) => setTimeout(resolve, 100));
          handle.sendKeys(["Enter"]);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    },
  });
  return () => {};
}
