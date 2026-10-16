import type { PluginServerContext } from "@getpaseo/plugin/server";
import { createFreebuffProvider } from "./server/freebuff-provider";

export default function contribute(server: PluginServerContext) {
  server.registerProvider(createFreebuffProvider());
  return () => {};
}
