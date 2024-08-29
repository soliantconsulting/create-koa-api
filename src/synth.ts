import { cp, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import merge from "deepmerge";
import { glob } from "glob";
import Handlebars from "handlebars";
import type { PackageJson, TSConfig } from "pkg-types";
import { execute } from "./util.js";

Handlebars.registerHelper("has", (selectedFeatures: Feature[], ...rest) => {
    const features = rest.slice(0, -1) as Feature[];
    return selectedFeatures.some((feature) => features.includes(feature));
});

export type Feature = "appconfig" | "postgres" | "zoom_error_log_notifications";

export type ProjectConfig = {
    accountId: string;
    region: string;
    deployRoleArn: string;
    apiName: string;
    features: Feature[];
    stagingCertificateArn: string;
    zoomWebhook?: {
        stagingSecretArn: string;
        productionSecretArn: string;
    };
};

type ProjectContext = {
    projectPath: string;
    skeletonPath: string;
    stdout: NodeJS.WritableStream;
};

const loadPackageJson = async (basePath: string): Promise<PackageJson> => {
    try {
        const json = await readFile(path.join(basePath, "package.json"), { encoding: "utf-8" });
        return JSON.parse(json) as PackageJson;
    } catch {
        return {};
    }
};

const loadTsConfig = async (basePath: string): Promise<TSConfig> => {
    try {
        const json = await readFile(path.join(basePath, "tsconfig.json"), { encoding: "utf-8" });
        return JSON.parse(json) as TSConfig;
    } catch {
        return {};
    }
};

const orderDeps = (deps: Record<string, string>): Record<string, string> => {
    return Object.keys(deps)
        .sort()
        .reduce(
            (sorted, key) => {
                sorted[key] = deps[key];
                return sorted;
            },
            {} as Record<string, string>,
        );
};

type EnableFeatureResult = Readonly<{
    apiPackageJson: PackageJson;
    apiTsConfig: TSConfig;
}>;

const enableFeature = async (
    context: ProjectContext,
    name: Feature,
): Promise<EnableFeatureResult> => {
    await cp(path.join(context.skeletonPath, `features/${name}/base`), context.projectPath, {
        recursive: true,
        force: true,
    });

    return {
        apiPackageJson: await loadPackageJson(
            path.join(context.skeletonPath, `features/${name}/base/packages/api`),
        ),
        apiTsConfig: await loadTsConfig(
            path.join(context.skeletonPath, `features/${name}/base/packages/api`),
        ),
    };
};

const copyTemplates = async (context: ProjectContext, config: ProjectConfig): Promise<void> => {
    const basePath = path.join(context.skeletonPath, "templates");
    const templatePaths = await glob("**/*.mustache", { cwd: basePath, dot: true });

    for (const templatePath of templatePaths) {
        const rawTemplate = await readFile(path.join(basePath, templatePath), {
            encoding: "utf-8",
        });
        const template = Handlebars.compile(rawTemplate);
        const targetPath = path.join(context.projectPath, templatePath.replace(/\.mustache$/, ""));
        await mkdir(path.dirname(targetPath), { recursive: true });
        await writeFile(targetPath, template(config));
    }
};

export const synthProject = async (
    projectPath: string,
    config: ProjectConfig,
    stdout: NodeJS.WritableStream,
    synthCdk = true,
): Promise<void> => {
    const context: ProjectContext = {
        projectPath,
        skeletonPath: fileURLToPath(new URL("../skeleton", import.meta.url)),
        stdout: stdout,
    };

    await cp(path.join(context.skeletonPath, "base"), projectPath, { recursive: true });
    await copyTemplates(context, config);
    let apiPackageJson = merge(
        { name: config.apiName } as PackageJson,
        await loadPackageJson(`${context.skeletonPath}/base/packages/api`),
    );
    let apiTsConfig = await loadTsConfig(`${context.skeletonPath}/base/packages/api`);

    for (const feature of config.features) {
        const enableFeatureResult = await enableFeature(context, feature);
        apiPackageJson = merge(apiPackageJson, enableFeatureResult.apiPackageJson);
        apiTsConfig = merge(apiTsConfig, enableFeatureResult.apiTsConfig);
    }

    if (apiPackageJson.dependencies) {
        apiPackageJson.dependencies = orderDeps(apiPackageJson.dependencies);
    }

    if (apiPackageJson.devDependencies) {
        apiPackageJson.devDependencies = orderDeps(apiPackageJson.devDependencies);
    }

    await writeFile(
        path.join(projectPath, "packages/api/package.json"),
        JSON.stringify(apiPackageJson, undefined, 4),
    );
    await writeFile(
        path.join(projectPath, "packages/api/tsconfig.json"),
        JSON.stringify(apiTsConfig, undefined, 4),
    );

    const rmExtPaths = await glob(path.join(projectPath, "**/*.rm-ext"), { dot: true });

    for (const rmExtPath of rmExtPaths) {
        const newPath = rmExtPath.replace(/\.rm-ext$/, "");
        await rename(rmExtPath, newPath);
    }

    const packageJsonPaths = await glob(path.join(projectPath, "**/package.json"));

    for (const packageJsonPath of packageJsonPaths) {
        const json = await readFile(packageJsonPath, { encoding: "utf-8" });
        const packageJson = JSON.parse(json) as PackageJson;
        packageJson.name = `@${config.apiName}/${packageJson.name}`;
        await writeFile(packageJsonPath, JSON.stringify(packageJson, undefined, 4));
    }

    await execute(context.stdout, "pnpm", ["install"], { cwd: projectPath });
    await execute(context.stdout, "pnpm", ["check"], { cwd: projectPath });

    if (config.features.includes("appconfig")) {
        await execute(
            context.stdout,
            "pnpm",
            ["add", `@${config.apiName}/app-config@workspace:*`],
            { cwd: path.join(projectPath, "packages/api") },
        );
    }

    await execute(context.stdout, "pnpm", ["run", "build"], {
        cwd: path.join(projectPath, "packages/cdk"),
    });

    if (synthCdk) {
        await execute(
            context.stdout,
            "pnpm",
            ["exec", "cdk", "synth", "--app", "dist/env-staging.js"],
            {
                cwd: path.join(projectPath, "cdk"),
            },
        );
    }
};
