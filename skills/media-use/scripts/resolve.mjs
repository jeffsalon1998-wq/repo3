#!/usr/bin/env node
import "./lib/windows-exe-search.mjs";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveNpxInvocation } from "./lib/npx-sync.mjs";

// Modified for standalone skill bundles outside the HyperFrames monorepo: when no local
// packages/cli tree exists, delegate to the CLI handed over by plugin-cli.mjs just like a plugin install.
const root = join(fileURLToPath(new URL("../../../", import.meta.url)));
const dist = join(root, "packages/cli/dist/cli.js");
const src = join(root, "packages/cli/src/cli.ts");

// Installed plugins and standalone skill copies have no monorepo packages/ tree. The launcher hands
// itself over as the CLI, so this legacy shim runs the resolved CLI.
if (process.env.HYPERFRAMES_PLUGIN_VERSION || (!existsSync(dist) && !existsSync(src))) {
  try {
    const invocation = resolveNpxInvocation(
      ["hyperframes", "media-use", "resolve", ...process.argv.slice(2)],
      { stdio: "inherit" },
    );
    const result = spawnSync(invocation.cmd, invocation.args, invocation.opts);
    if (result.error) console.error(result.error.message);
    process.exit(result.status ?? 1);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
const result = existsSync(dist)
  ? spawnSync(process.execPath, [dist, "media-use", "resolve", ...process.argv.slice(2)], {
      stdio: "inherit",
    })
  : spawnSync("bun", [src, "media-use", "resolve", ...process.argv.slice(2)], {
      stdio: "inherit",
    });
process.exit(result.status ?? 1);
