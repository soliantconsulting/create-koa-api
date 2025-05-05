import { fileURLToPath } from "node:url";
import {
    type AwsEnvContext,
    type ProjectContext,
    createSynthTask,
} from "@soliantconsulting/starter-lib";
import type { FeaturesContext } from "./features.js";
import type { ZoomErrorNotificationsContext } from "./zoom-error-notifications.js";

export const synthTask = createSynthTask(
    fileURLToPath(new URL("../../skeleton", import.meta.url)),
    {
        ignoreList: (
            context: Partial<
                AwsEnvContext & ProjectContext & ZoomErrorNotificationsContext & FeaturesContext
            >,
        ) => {
            const list: string[] = [];

            if (!context.awsEnv) {
                list.push("cdk");
                list.push("bitbucket-pipelines.yml.liquid");
            }

            if (!context.features?.includes("postgres")) {
                list.push("docker-compose.yml");
                list.push("packages/api/src/mikro-orm.config.ts");
                list.push("packages/api/src/util/mikro-orm.ts");
            }

            if (!context.features?.includes("app-config")) {
                list.push("packages/app-config");
                list.push("packages/cdk/src/app-config.ts");
                list.push("dev-app-config.toml.dist");
            }

            return list;
        },
    },
);
