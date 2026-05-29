/// <reference types="vite/client" />
/// <reference types="vite-plugin-comlink/client" />

declare const __BUILD_DATE__: string
declare const __BUILD_DATE_LONG__: string
declare const __APP_ENV__: string

interface ImportMetaEnv {
  readonly VITE_VAPID_PUBLIC_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
