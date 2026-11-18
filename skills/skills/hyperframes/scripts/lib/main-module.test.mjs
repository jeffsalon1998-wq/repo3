import { strict as assert } from "node:assert";
import { test } from "node:test";
// Modified for standalone skill bundles: skip monorepo-only packages/cli scan when absent.
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const SKILLS = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const CLI_MEDIA_USE = resolve(SKILLS, "../packages/cli/src/media-use");

// Agents install skills by symlinking the skills dir, so each script must still run its CLI.
test("skill CLIs run when invoked through a symlinked skills dir", () => {
  const dir = mkdtempSync(join(tmpdir(), "skills-link-"));
  try {
    symlinkSync(SKILLS, join(dir, "skills"), "dir");
    for (const script of ["media-use/audio/scripts/heygen-voice.mjs"]) {
      const run = spawnSync(process.execPath, [join(dir, "skills", script), "not-a-command"], {
        encoding: "utf8",
      });
      assert.notEqual(run.status, 0, `${script} exited ${run.status} without running its CLI`);
      assert.match(run.stderr, /usage/, script);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function skillScripts(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : skillScripts(path);
    return /\.(mjs|js)$/.test(entry.name) && !/\.test\.mjs$/.test(entry.name) ? [path] : [];
  });
}

const HYPERFRAMES_SKILLS = [
  "figma",
  "hyperframes",
  "hyperframes-cli",
  "hyperframes-registry",
  "media-use",
  "remotion-to-hyperframes",
  "reverse-any-video",
  "slideshow",
  "style-sampling",
];

test("skill scripts detect their CLI entry through lib/main-module.mjs only", () => {
  const handRolled = [
    ...HYPERFRAMES_SKILLS.flatMap((name) => {
      const dir = join(SKILLS, name);
      return existsSync(dir) ? skillScripts(dir) : [];
    }),
    ...(existsSync(CLI_MEDIA_USE) ? skillScripts(CLI_MEDIA_USE) : []),
  ].filter(
    (path) =>
      !path.endsWith("main-module.mjs") && readFileSync(path, "utf8").includes("process.argv[1]"),
  );
  assert.deepEqual(
    handRolled.map((path) => relative(SKILLS, path)),
    [],
  );
});
