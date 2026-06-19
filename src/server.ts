import { resolve } from "node:path";
import { loadConfig } from "./config/loader.js";
import { buildGateway } from "./gateway/server.js";

async function main(): Promise<void> {
  const cfgPath = process.env["EROUTER_CONFIG"] ?? resolve(process.cwd(), "erouter.yaml");
  const config = await loadConfig(cfgPath);
  const { app } = buildGateway({ config, logger: true });
  const host = config.server.host;
  const port = config.server.port;
  await app.listen({ host, port });
  // eslint-disable-next-line no-console
  console.log(`ERouter listening on http://${host}:${port}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("ERouter failed to start:", err);
  process.exit(1);
});
