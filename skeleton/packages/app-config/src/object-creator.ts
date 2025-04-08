import memize from "memize";
import { getAppConfig } from "./handler.js";
import type { AppConfig } from "./schema.js";

type PathExtractor<T> = (appConfig: AppConfig) => T;
type ObjectCreator<T, U> = (config: T) => U;

/**
 * Create a getter for configured objects based on AppConfig
 *
 * @example
 * const getFileMakerClient = createConfiguredObjectGetter(
 *     (appConfig) => appConfig.fileMaker,
 *     (config) => new FileMakerClient(config),
 * );
 *
 * const fileMakerClient = getFileMakerClient();
 *
 * @param extractor - extract a sub node from the config for memorization
 * @param creator - create a new object based on extracted config
 */
export const createConfiguredObjectGetter = <T, U>(
    extractor: PathExtractor<T>,
    creator: ObjectCreator<T, U>,
) => {
    const memoizedCreator = memize(creator);
    return () => memoizedCreator(extractor(getAppConfig()));
};
