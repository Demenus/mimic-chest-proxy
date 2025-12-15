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

// Import functions and utilities
import { startMimicServer } from './mimic/index.js';
import { startProxyServer } from './proxy/index.js';
import { logger } from './logger.js';
import { mimicMappingService } from './MimicMappingService.js';

// Export both servers for convenience
export { startMimicServer } from './mimic/index.js';
export { startProxyServer } from './proxy/index.js';

// Re-export common utilities and services
export { mimicMappingService } from './MimicMappingService.js';
export * from './types.js';
export * from './utils/index.js';
export { logger } from './logger.js';

/**
 * Server ports information
 */
export interface ServerPorts {
  mimicPort: number;
  proxyPort: number;
}

/**
 * Initialize both servers (mimic and proxy) and return their ports
 * This is the main entry point for starting the servers
 * @param userDataPath - Optional path to user data directory for persistence
 */
export async function startServers(userDataPath?: string): Promise<ServerPorts> {
  logger.info('Starting both servers...', { userDataPath });

  // Initialize storage if userDataPath is provided
  if (userDataPath) {
    await mimicMappingService.init(userDataPath);
    logger.info('MimicMappingService initialized with persistence', { userDataPath });
  }

  // Start both servers in parallel
  const [mimicPort, proxyPort] = await Promise.all([
    startMimicServer(),
    startProxyServer(),
  ]);

  logger.info('Both servers started successfully', {
    mimicPort,
    proxyPort,
  });

  return {
    mimicPort,
    proxyPort,
  };
}
