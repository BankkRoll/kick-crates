/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONVEX_URL?: string;
  readonly VITE_CONVEX_SITE_URL?: string;
  readonly VITE_EXT_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
