import { z } from "zod";

export const appConfigSchema = z.object({
    fileMaker: z.object({
        host: z.string(),
        username: z.string(),
        password: z.string(),
        database: z.string(),
        disableSsl: z.boolean().optional(),
    }),
    jwt: z.object({
        issuer: z.string(),
        audience: z.string(),
    }),
    stripe: z.object({
        secretKey: z.string(),
        endpointSecret: z.string(),
    }),
});

export type AppConfig = z.output<typeof appConfigSchema>;
