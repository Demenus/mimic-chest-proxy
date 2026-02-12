import events from "events";
import type { IContext } from "./types";

/** Proxy instance with internal methods used by this filter */
interface ProxyWithRequestInternals {
  _onRequestData(ctx: IContext, chunk: Buffer, callback: (err: Error | null | undefined, chunk?: Buffer) => void): void;
  _onError(kind: string, ctx: IContext, err: Error): void;
  _onRequestEnd(ctx: IContext, callback: (err: Error | null | undefined) => void): void;
}

export class ProxyFinalRequestFilter extends events.EventEmitter {
  writable: boolean;
  write: (chunk: Buffer) => boolean;
  end: (chunk?: Buffer) => void;

  constructor(proxy: ProxyWithRequestInternals, ctx: IContext) {
    super();
    this.writable = true;
    this.write = (chunk: Buffer) => {
      proxy._onRequestData(ctx, chunk, (err: Error | null | undefined, chunkOut?: Buffer) => {
        if (err) {
          return proxy._onError("ON_REQUEST_DATA_ERROR", ctx, err as Error);
        }
        if (chunkOut && ctx.proxyToServerRequest) {
          return ctx.proxyToServerRequest.write(chunkOut);
        }
      });
      return true;
    };

    this.end = (chunk?: Buffer) => {
      if (chunk) {
        return proxy._onRequestData(ctx, chunk, (err: Error | null | undefined, chunkOut?: Buffer) => {
          if (err) {
            return proxy._onError("ON_REQUEST_DATA_ERROR", ctx, err as Error);
          }

          return proxy._onRequestEnd(ctx, (errEnd: Error | null | undefined) => {
            if (errEnd) {
              return proxy._onError("ON_REQUEST_END_ERROR", ctx, errEnd as Error);
            }
            return ctx.proxyToServerRequest!.end(chunkOut);
          });
        });
      } else {
        return proxy._onRequestEnd(ctx, (err: Error | null | undefined) => {
          if (err) {
            return proxy._onError("ON_REQUEST_END_ERROR", ctx, err as Error);
          }
          return ctx.proxyToServerRequest!.end(chunk);
        });
      }
    };
  }
}
