// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    VUE_ROUTER_MODE: 'hash' | 'history' | 'abstract' | undefined;
    VUE_ROUTER_BASE: string | undefined;
  }
}

declare global {
  interface Window {
    electronAPI?: {
      launchMimicChrome: () => Promise<{ success: boolean; error?: string }>;
      getMimicServerPort: () => Promise<number | null>;
    };
  }
}

export { };
