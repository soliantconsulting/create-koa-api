import { z } from "zod";

export const appConfigSchema = z.object({});

export type AppConfig = z.output<typeof appConfigSchema>;
