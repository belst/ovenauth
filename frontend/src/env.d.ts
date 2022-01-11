/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_BASEURL: string;
    readonly VITE_PROTOCOL: string;
    readonly VITE_APIPATH: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}