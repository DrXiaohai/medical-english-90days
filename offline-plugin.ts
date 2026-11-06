import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";

const digest = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");

export function writeOfflineWorker(
  directory: string,
  base: string,
  templatePath: string,
) {
  const files: string[] = [];
  function visit(folder: string) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const path = join(folder, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (
        !["sw.js", "offline-manifest.json"].includes(entry.name) &&
        !entry.name.endsWith(".map")
      )
        files.push(path);
    }
  }
  visit(directory);
  const resources = files.sort().map((path) => ({
    url: base + relative(directory, path).split("\\").join("/"),
    sha256: digest(readFileSync(path)),
  }));
  const template = readFileSync(templatePath, "utf8");
  const config = {
    base,
    prefix: `ime-offline-${digest(base).slice(0, 10)}-`,
    version: digest(template + JSON.stringify(resources)).slice(0, 20),
    resources,
  };
  writeFileSync(
    join(directory, "sw.js"),
    template.replace("__OFFLINE_CONFIG__", JSON.stringify(config)),
  );
  writeFileSync(
    join(directory, "offline-manifest.json"),
    JSON.stringify(config, null, 2),
  );
  return config;
}

export function offlineCache(): Plugin {
  let config: ResolvedConfig;
  return {
    name: "medical-english-offline-cache",
    apply: "build",
    configResolved(resolved) {
      config = resolved;
    },
    closeBundle() {
      writeOfflineWorker(
        resolve(config.root, config.build.outDir),
        config.base,
        resolve(config.root, "scripts/service-worker.template.js"),
      );
    },
  };
}
