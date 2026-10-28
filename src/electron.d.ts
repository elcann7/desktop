import type { LinerElectronApi } from "../electron/preload";

declare global {
  interface Window {
    linerElectron?: LinerElectronApi;
    __LINER_MCP__?: any;
  }
}

export {};
