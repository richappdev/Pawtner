import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    server: {
      deps: {
        inline: ["next-intl"],
      },
    },
  },
  resolve: {
    alias: {
      "@/i18n/navigation": path.resolve(__dirname, "./src/test/i18n-navigation.tsx"),
      "@": path.resolve(__dirname, "./src"),
      "next/navigation": path.resolve(__dirname, "./node_modules/next/navigation.js"),
      "next/link": path.resolve(__dirname, "./node_modules/next/link.js"),
    },
  },
});
