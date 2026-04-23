import { defineConfig } from "wxt";

/**
 * WXT build configuration for the KickCrates MV3 extension.
 *
 * Aliases React → `preact/compat` so any dependency that imports from
 * React at runtime resolves to our Preact tree (we bundle Preact, not
 * React, to keep the content script small). esbuild is configured for
 * the automatic JSX runtime with `preact` as the import source.
 *
 * Manifest highlights:
 *  - `host_permissions` covers both apex and subdomains of kick.com.
 *  - `externally_connectable` whitelists `*.convex.site` / `*.convex.cloud`
 *    so only the Convex-hosted OAuth callback page can message this
 *    extension id — anyone else is rejected by the background script's
 *    origin check (see `registerExternalAuthListener`).
 *  - `content_security_policy` allows `wasm-unsafe-eval` for the
 *    Convex client and limits `connect-src` to our Convex tenant.
 */
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
      "process.env.NODE_ENV": JSON.stringify(
        process.env.NODE_ENV ?? "development",
      ),
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
      matches: ["https://*.convex.site/*", "https://*.convex.cloud/*"],
    },
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; connect-src 'self' https://*.convex.cloud https://*.convex.site wss://*.convex.cloud;",
    },
  },
});
