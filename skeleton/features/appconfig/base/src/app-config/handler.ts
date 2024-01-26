import { AppConfigData } from "@aws-sdk/client-appconfigdata";
import { type ConfigStore, type Outcome, Poller } from "aws-appconfig-poller";
import { readFile } from "fs/promises";
import { parse } from "smol-toml";
import { type AppConfig, appConfigSchema } from "./schema.js";

const applicationIdentifier = process.env.APPCONFIG_APPLICATION_IDENTIFIER;
const environmentIdentifier = process.env.APPCONFIG_ENVIRONMENT_IDENTIFIER;
const configurationProfileIdentifier = process.env.APPCONFIG_CONFIGURATION_PROFILE_IDENTIFIER;

const useAppConfigPoller =
    applicationIdentifier !== undefined &&
    environmentIdentifier !== undefined &&
    configurationProfileIdentifier !== undefined;

type AppConfigHandler = {
    start(): Promise<Outcome>;
    stop(): void;
    getConfigurationObject(): ConfigStore<AppConfig>;
};

const pollIntervalInSeconds = 15;

const getAppConfigHandler = (): AppConfigHandler => {
    if (useAppConfigPoller) {
        return new Poller({
            dataClient: new AppConfigData(),
            sessionConfig: {
                ApplicationIdentifier: applicationIdentifier,
                EnvironmentIdentifier: environmentIdentifier,
                ConfigurationProfileIdentifier: configurationProfileIdentifier,
                RequiredMinimumPollIntervalInSeconds: pollIntervalInSeconds,
            },
            pollIntervalSeconds: pollIntervalInSeconds,
            configParser: (toml) => appConfigSchema.parse(parse(toml)),
        });
    }

    class DevAppConfigHandler implements AppConfigHandler {
        private config: AppConfig | undefined;

        public async start(): Promise<Outcome> {
            this.config = appConfigSchema.parse(
                parse(await readFile("dev-app-config.toml", { encoding: "utf-8" })),
            );

            return Promise.resolve({ isInitiallySuccessful: true });
        }

        public stop(): void {
            // No-op
        }

        public getConfigurationObject(): ConfigStore<AppConfig> {
            return { latestValue: this.config };
        }
    }

    return new DevAppConfigHandler();
};

export const appConfigHandler = getAppConfigHandler();

export const getAppConfig = (): AppConfig => {
    const store = appConfigHandler.getConfigurationObject();

    if (!store.latestValue) {
        throw new Error("AppConfig has not been initially polled");
    }

    return store.latestValue;
};
