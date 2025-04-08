import { z } from "zod";

export const appConfigSchema = z.object({
    asdf: z.string().optional(),
});

export type AppConfig = z.output<typeof appConfigSchema>;
