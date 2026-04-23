import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: ".",
  outDir: ".output",
  extensionApi: "chrome",
  manifestVersion: 3,
  vite: () => ({
    resolve: {
      alias: {
        react: "preact/compat",
        "react-dom": "preact/compat",
        "react-dom/test-utils": "preact/test-utils",
      },
    },
    esbuild: {
      jsx: "automatic",
      jsxImportSource: "preact",
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "development"),
    },
  }),
  manifest: {
    name: "KickCrates",
    description:
      "Battle pass, crates, and XP progression for Kick.com. Earn cosmetics by watching streams.",
    version: "0.1.0",
    permissions: ["storage", "alarms", "tabs"],
    host_permissions: ["*://*.kick.com/*", "*://kick.com/*"],
    action: {
      default_title: "KickCrates",
      default_popup: "popup.html",
    },
    externally_connectable: {
      matches: [
        "https://*.convex.site/*",
        "https://*.convex.cloud/*",
      ],
    },
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; connect-src 'self' https://*.convex.cloud https://*.convex.site wss://*.convex.cloud;",
    },
  },
});
