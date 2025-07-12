// Import functions and utilities
import { startMimicServer } from './mimic/index.js';
import { startProxyServer } from './proxy/index.js';
import { logger } from './logger.js';

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
 */
export async function startServers(): Promise<ServerPorts> {
  logger.info('Starting both servers...');

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
