import { ProxyServer } from './ProxyServer.js';

let proxyServerInstance: ProxyServer | null = null;

/**
 * Start the proxy server
 * @returns Promise that resolves with the port number
 */
export async function startProxyServer(): Promise<number> {
  if (proxyServerInstance) {
    throw new Error('Proxy server is already running');
  }

  proxyServerInstance = new ProxyServer();
  return await proxyServerInstance.start();
}

/**
 * Stop the proxy server
 */
export function stopProxyServer(): void {
  if (proxyServerInstance) {
    proxyServerInstance.stop();
    proxyServerInstance = null;
  }
}

/**
 * Check if the proxy server is running
 */
export function isProxyServerRunning(): boolean {
  return proxyServerInstance?.isRunning() ?? false;
}
