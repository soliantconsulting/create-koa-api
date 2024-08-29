import type { Middleware } from "koa";
import { Logger, NdJsonTransport, PrettyTransport } from "logforth";
import { customAlphabet } from "nanoid";
import { env } from "./env.js";

export const logger = new Logger({
    transport:
        process.env.NODE_ENV === "production" ? new NdJsonTransport() : new PrettyTransport(),
    minLevel: env.logger.minLevel,
});

const requestIdNanoId = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 6);

export const requestLoggerMiddleware: Middleware = async (context, next) => {
    const requestId = context.get("X-Request-Id") || requestIdNanoId();
    context.set("X-Request-Id", requestId);

    return logger.withContext({ requestId }, next);
};
