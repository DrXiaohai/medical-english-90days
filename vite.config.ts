import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Pages项目站点使用/repository/，用户站点或自定义域名使用/。
export function normalizeBasePath(value = "/") {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[?#\\\s]/.test(value)
  ) {
    throw new Error("VITE_BASE_PATH必须为以/开头的站内路径");
  }
  return value.endsWith("/") ? value : `${value}/`;
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, ".", "VITE_");
  return {
    base: normalizeBasePath(environment.VITE_BASE_PATH || "/"),
    plugins: [react()],
    test: {
      include: ["tests/**/*.{test,spec}.{ts,tsx}"],
      environment: "jsdom",
      setupFiles: ["./tests/setup.ts"],
    },
  };
});
