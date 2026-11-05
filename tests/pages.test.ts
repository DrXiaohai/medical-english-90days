// @vitest-environment node
import { describe, expect, it } from "vitest";
import { normalizeBasePath } from "../vite.config";

describe("GitHub Pages部署路径", () => {
  it("支持根站点与仓库子路径", () => {
    expect(normalizeBasePath()).toBe("/");
    expect(normalizeBasePath("/medical-english")).toBe("/medical-english/");
    expect(normalizeBasePath("/medical-english/")).toBe("/medical-english/");
  });
  it("拒绝外部地址、查询和不明确的路径", () => {
    for (const path of [
      "https://example.com/",
      "//example.com/",
      "/repo?x=1",
      "/repo#part",
      "/repo name/",
    ]) {
      expect(() => normalizeBasePath(path)).toThrow();
    }
  });
});
