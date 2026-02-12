import events from "events";
import type { IContext } from "./types";

/** Proxy instance with internal methods used by this filter */
interface ProxyWithResponseInternals {
  _onResponseData(ctx: IContext, chunk: Buffer, callback: (err: Error | null | undefined, chunk?: Buffer) => void): void;
  _onError(kind: string, ctx: IContext, err: Error): void;
  _onResponseEnd(ctx: IContext, callback: (err: Error | null | undefined) => void): void;
}

/** Node ServerResponse has finished/writableEnded; avoid write/end after response was already closed (e.g. substitution). */
function isResponseFinished(res: IContext["proxyToClientResponse"]): boolean {
  const r = res as NodeJS.WritableStream & { finished?: boolean; writableEnded?: boolean };
  return Boolean(r.finished ?? r.writableEnded);
}

export class ProxyFinalResponseFilter extends events.EventEmitter {
  writable: boolean;
  write: (chunk: Buffer) => boolean;
  end: (chunk?: Buffer) => void;

  constructor(proxy: ProxyWithResponseInternals, ctx: IContext) {
    super();

    this.writable = true;

    this.write = function (chunk: Buffer) {
      proxy._onResponseData(ctx, chunk, function (err: Error | null | undefined, chunkOut?: Buffer) {
        if (err) {
          return proxy._onError("ON_RESPONSE_DATA_ERROR", ctx, err as Error);
        }
        if (chunkOut && !isResponseFinished(ctx.proxyToClientResponse)) {
          ctx.proxyToClientResponse.write(chunkOut);
        }
      });
      return true;
    };

    this.end = function (chunk?: Buffer) {
      if (chunk) {
        proxy._onResponseData(ctx, chunk, function (err: Error | null | undefined, chunkOut?: Buffer) {
          if (err) {
            return proxy._onError("ON_RESPONSE_DATA_ERROR", ctx, err as Error);
          }
          proxy._onResponseEnd(ctx, function (errEnd: Error | null | undefined) {
            if (errEnd) {
              return proxy._onError("ON_RESPONSE_END_ERROR", ctx, errEnd as Error);
            }
            if (!isResponseFinished(ctx.proxyToClientResponse)) {
              ctx.proxyToClientResponse.end(chunkOut);
            }
          });
        });
      } else {
        proxy._onResponseEnd(ctx, function (err: Error | null | undefined) {
          if (err) {
            return proxy._onError("ON_RESPONSE_END_ERROR", ctx, err as Error);
          }
          if (!isResponseFinished(ctx.proxyToClientResponse)) {
            ctx.proxyToClientResponse.end(chunk);
          }
        });
      }
    };

    return this;
  }
}
