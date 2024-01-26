import { parse } from "smol-toml";
import { appConfigSchema } from "./schema.js";

type AppConfigEvent = {
    content: string;
    uri: string;
};

export const main = async (event: AppConfigEvent) => {
    const toml = Buffer.from(event.content, "base64").toString("utf-8");
    const result = appConfigSchema.safeParse(parse(toml));

    if (!result.success) {
        console.error(result.error);
        throw new Error("Schema validation failed");
    }
};
