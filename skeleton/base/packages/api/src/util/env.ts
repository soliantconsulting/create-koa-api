import { config } from "dotenv";
import { LogLevel } from "logforth";
import { z } from "zod";

const logLevels = {
    trace: LogLevel.Trace,
    debug: LogLevel.Debug,
    info: LogLevel.Info,
    warn: LogLevel.Warn,
    error: LogLevel.Error,
    fatal: LogLevel.Fatal,
} as const;

type LogLevelName = keyof typeof logLevels;

const logLevelNames = Object.keys(logLevels) as [LogLevelName, ...LogLevelName[]];

const envSchema = z
    .object({
        LOGGER_MIN_LEVEL: z
            .enum(logLevelNames)
            .default("info")
            .transform((name) => logLevels[name]),
    })
    .transform((values) => ({
        logger: {
            minLevel: values.LOGGER_MIN_LEVEL,
        },
    }));

config();

export const env = envSchema.parse(process.env);
