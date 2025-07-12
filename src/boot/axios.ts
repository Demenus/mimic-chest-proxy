import { defineBoot } from '#q-app/wrappers';
import axios, { type AxiosInstance } from 'axios';

declare module 'vue' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $api: AxiosInstance;
  }
}

// Be careful when using SSR for cross-request state pollution
// due to creating a Singleton instance here;
// If any client changes this (global) instance, it might be a
// good idea to move this instance creation inside of the
// "export default () => {}" function below (which runs individually
// for each client)

// Create API instance with dynamic baseURL
// The baseURL will be set when the mimic server port is available
const api = axios.create();

// Function to update baseURL when server port is known
export async function configureMimicApi(): Promise<void> {
  if (typeof window !== 'undefined' && window.electronAPI) {
    try {
      const port = await window.electronAPI.getMimicServerPort();
      if (port) {
        api.defaults.baseURL = `http://localhost:${port}`;
      }
    } catch (error) {
      console.error('Failed to get mimic server port:', error);
    }
  }
}

export default defineBoot(({ app }) => {
  // for use inside Vue files (Options API) through this.$axios and this.$api

  app.config.globalProperties.$axios = axios;
  // ^ ^ ^ this will allow you to use this.$axios (for Vue Options API form)
  //       so you won't necessarily have to import axios in each vue file

  app.config.globalProperties.$api = api;
  // ^ ^ ^ this will allow you to use this.$api (for Vue Options API form)
  //       so you can easily perform requests against your app's API

  // Configure API baseURL if running in Electron
  if (typeof window !== 'undefined' && window.electronAPI) {
    void configureMimicApi();
  }
});

export { api };
