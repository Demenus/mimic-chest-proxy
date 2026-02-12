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

import type { Server } from 'net';

/**
 * Context type for http-mitm-proxy request/response hooks.
 * Single source of truth for proxy layer types.
 */
export interface MitmProxyContext {
  clientToProxyRequest: {
    url?: string;
    method?: string;
    headers: Record<string, string | string[] | undefined>;
  };
  proxyToServerRequestOptions: {
    host?: string;
    port?: number;
    protocol?: string;
    path?: string;
    rejectUnauthorized?: boolean;
  };
  proxyToClientResponse: {
    writeHead: (statusCode: number, statusMessage?: string, headers?: Record<string, string>) => void;
    write: (chunk: unknown) => void;
    end: (chunk?: unknown) => void;
    headersSent: boolean;
  };
  serverToProxyResponse?: {
    statusCode?: number;
    headers?: Record<string, string | string[] | undefined>;
  };
  onResponseHeaders?: (handler: (ctx: MitmProxyContext, callback: () => void) => void) => void;
  onResponseData: (handler: (ctx: MitmProxyContext, chunk: Buffer, callback: (err: Error | null, chunk: Buffer | null) => void) => void) => void;
  onResponseEnd: (handler: (ctx: MitmProxyContext, callback: () => void) => void) => void;
  isSSL?: boolean;
}

/**
 * Type for http-mitm-proxy Proxy instance (listen, onRequest, onResponse, etc.).
 */
export interface MitmProxyInstance {
  onError: (handler: (ctx: MitmProxyContext | null, err: Error, errorKind: string) => void) => void;
  use: (middleware: unknown) => void;
  onRequest: (handler: (ctx: MitmProxyContext, callback: () => void) => void) => void;
  onResponse: (handler: (ctx: MitmProxyContext, callback: () => void) => void) => void;
  listen: (options: { port: number; host: string; silent: boolean; sslCaDir: string }, callback: () => void) => void;
  httpsServer?: Server;
  httpServer?: Server;
}
