// @vitest-environment node
import { createHash, webcrypto } from "node:crypto";
import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { writeOfflineWorker } from "../offline-plugin";

const template = readFileSync("scripts/service-worker.template.js", "utf8");
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
function workerHarness(active = false) {
  const contents: Record<string, string> = {
    "https://example.test/study/index.html": "<html>release A</html>",
    "https://example.test/study/assets/app.js": "course data A",
  };
  const config = {
    base: "/study/",
    prefix: "ime-test-",
    version: "A",
    resources: Object.entries(contents).map(([url, value]) => ({
      url: new URL(url).pathname,
      sha256: hash(value),
    })),
  };
  const stored = new Map<string, Map<string, Response>>();
  const handlers: Record<string, (event: any) => void> = {};
  const self = {
    location: { origin: "https://example.test" },
    registration: {
      scope: "https://example.test/study/",
      active: active ? {} : null,
    },
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
    addEventListener: (name: string, handler: any) => {
      handlers[name] = handler;
    },
  };
  const cacheStorage = {
    keys: async () => [...stored.keys()],
    delete: async (name: string) => stored.delete(name),
    open: async (name: string) => {
      if (!stored.has(name)) stored.set(name, new Map());
      return {
        match: async (url: string) => stored.get(name)!.get(url)?.clone(),
        put: async (url: string, response: Response) => {
          stored.get(name)!.set(url, response.clone());
        },
      };
    },
  };
  const fetch = vi.fn(async (request: Request) => {
    const value = contents[request.url];
    if (value === undefined) throw new Error("offline or missing");
    return new Response(value);
  });
  vm.runInNewContext(
    template.replace("__OFFLINE_CONFIG__", JSON.stringify(config)),
    {
      self,
      caches: cacheStorage,
      fetch,
      Request,
      URL,
      crypto: webcrypto,
      Uint8Array,
    },
  );
  async function lifecycle(name: string) {
    let task: Promise<unknown> | undefined;
    handlers[name]({
      waitUntil(value: Promise<unknown>) {
        task = value;
      },
    });
    await task;
  }
  async function request(url: string, mode = "navigate", method = "GET") {
    let task: Promise<Response> | undefined;
    handlers.fetch({
      request: { url, mode, method },
      respondWith(value: Promise<Response>) {
        task = value;
      },
    });
    return task ? await task : undefined;
  }
  return { stored, contents, fetch, self, lifecycle, request };
}

describe("离线缓存生命周期", () => {
  it("完整缓存后断网可读取入口与打包课程", async () => {
    const h = workerHarness();
    await h.lifecycle("install");
    h.fetch.mockRejectedValue(new Error("offline"));
    expect(
      await (await h.request("https://example.test/study/"))!.text(),
    ).toContain("release A");
    expect(
      await (await h.request(
        "https://example.test/study/assets/app.js",
        "cors",
      ))!.text(),
    ).toBe("course data A");
    expect(h.self.skipWaiting).toHaveBeenCalledOnce();
  });
  it("下载版本不一致时拒绝新缓存并保留已有缓存", async () => {
    const h = workerHarness(true);
    h.stored.set("ime-test-old", new Map());
    h.contents["https://example.test/study/index.html"] =
      "<html>unexpected CDN revision</html>";
    await expect(h.lifecycle("install")).rejects.toThrow("版本尚未同步");
    expect(h.stored.has("ime-test-A")).toBe(false);
    expect(h.stored.has("ime-test-old")).toBe(true);
  });
  it("有学习窗口时更新保持等待，激活只清理本项目旧缓存", async () => {
    const h = workerHarness(true);
    h.stored.set("ime-test-old", new Map());
    h.stored.set("another-app", new Map());
    await h.lifecycle("install");
    expect(h.self.skipWaiting).not.toHaveBeenCalled();
    expect(h.stored.has("ime-test-old")).toBe(true);
    await h.lifecycle("activate");
    expect(h.stored.has("ime-test-old")).toBe(false);
    expect(h.stored.has("another-app")).toBe(true);
  });
  it("不拦截外部网站、其他项目和写入请求", async () => {
    const h = workerHarness();
    await h.lifecycle("install");
    expect(await h.request("https://outside.test/study/")).toBeUndefined();
    expect(await h.request("https://example.test/other/")).toBeUndefined();
    expect(
      await h.request("https://example.test/study/", "navigate", "POST"),
    ).toBeUndefined();
  });
});

describe("离线构建清单", () => {
  it("重复构建稳定，资源更改产生新版本，根路径和仓库路径各有作用域", () => {
    const directory = mkdtempSync(join(tmpdir(), "ime-offline-"));
    try {
      mkdirSync(join(directory, "assets"));
      writeFileSync(join(directory, "index.html"), "<html>A</html>");
      writeFileSync(join(directory, "assets/app.js"), "A");
      const first = writeOfflineWorker(
        directory,
        "/study/",
        "scripts/service-worker.template.js",
      );
      const again = writeOfflineWorker(
        directory,
        "/study/",
        "scripts/service-worker.template.js",
      );
      expect(again.version).toBe(first.version);
      expect(again.resources).toHaveLength(2);
      writeFileSync(join(directory, "assets/app.js"), "B");
      const changed = writeOfflineWorker(
        directory,
        "/study/",
        "scripts/service-worker.template.js",
      );
      expect(changed.version).not.toBe(first.version);
      const root = writeOfflineWorker(
        directory,
        "/",
        "scripts/service-worker.template.js",
      );
      expect(root.prefix).not.toBe(changed.prefix);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
