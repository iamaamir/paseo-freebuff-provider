import type { PluginClientContext } from "@getpaseo/plugin/client";

export default function contribute(client: PluginClientContext) {
  client.addSlashCommand({
    name: "freebuff-terminal",
    description: "Launch Freebuff in a Paseo terminal",
    argumentHint: "[args]",
    context: "agent",
    async onSubmit({ args, agent }) {
      const workspaceId = agent.workspaceId;
      if (!workspaceId) {
        console.error("Freebuff terminal requires an agent workspace");
        return;
      }
      const commandArgs = args.trim() ? args.trim().split(/\s+/) : [];
      await client.paseo.terminals.create({
        workspaceId,
        command: "freebuff",
        args: commandArgs,
        name: "Freebuff",
      });
    },
  });
  return () => {};
}
