/*
 * Copyright (c) 2025 Aarón Negrín
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

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
