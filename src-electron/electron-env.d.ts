// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare namespace NodeJS {
  interface ProcessEnv {
    QUASAR_PUBLIC_FOLDER: string;
    QUASAR_ELECTRON_PRELOAD_FOLDER: string;
    QUASAR_ELECTRON_PRELOAD_EXTENSION: string;
    APP_URL: string;
  }
}

declare global {
  interface Window {
    electronAPI: {
      launchMimicChrome: () => Promise<{ success: boolean; error?: string }>;
      getMimicServerPort: () => Promise<number | null>;
    };
  }
}

export { };
