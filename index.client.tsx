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
      if (initialPrompt) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        try {
          handle.sendKeys([initialPrompt, "Enter"]);
        } catch (error) {
          console.error("Freebuff initial prompt failed", error);
        }
      }
    },
  });
  return () => {};
}
