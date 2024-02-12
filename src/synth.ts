import path from "path";
import { fileURLToPath } from "url";
import merge from "deepmerge";
import { cp, mkdir, readFile, rename, writeFile } from "fs/promises";
import { glob } from "glob";
import Handlebars from "handlebars";
import type { PackageJson, TSConfig } from "pkg-types";
import { execute } from "./util.js";

Handlebars.registerHelper("has", (selectedFeatures: Feature[], ...rest) => {
    const features = rest.slice(0, -1) as Feature[];
    return selectedFeatures.some((feature) => features.includes(feature));
});

export type Feature = "appconfig" | "postgres";

export type ProjectConfig = {
    accountId: string;
    region: string;
    deployRoleArn: string;
    apiName: string;
    features: Feature[];
    uatCertificateArn: string;
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
    packageJson: PackageJson;
    tsConfig: TSConfig;
}>;

const enableFeature = async (
    context: ProjectContext,
    name: string,
): Promise<EnableFeatureResult> => {
    await cp(path.join(context.skeletonPath, `features/${name}/base`), context.projectPath, {
        recursive: true,
        force: true,
    });

    return {
        packageJson: await loadPackageJson(path.join(context.skeletonPath, `features/${name}`)),
        tsConfig: await loadTsConfig(path.join(context.skeletonPath, `features/${name}`)),
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
    let packageJson = merge(
        { name: config.apiName } as PackageJson,
        await loadPackageJson(context.skeletonPath),
    );
    let tsConfig = await loadTsConfig(context.skeletonPath);

    for (const feature of config.features) {
        const enableFeatureResult = await enableFeature(context, feature);
        packageJson = merge(packageJson, enableFeatureResult.packageJson);
        tsConfig = merge(tsConfig, enableFeatureResult.tsConfig);
    }

    if (packageJson.dependencies) {
        packageJson.dependencies = orderDeps(packageJson.dependencies);
    }

    if (packageJson.devDependencies) {
        packageJson.devDependencies = orderDeps(packageJson.devDependencies);
    }

    await writeFile(
        path.join(projectPath, "package.json"),
        JSON.stringify(packageJson, undefined, 4),
    );
    await writeFile(
        path.join(projectPath, "tsconfig.json"),
        JSON.stringify(tsConfig, undefined, 4),
    );

    const rmExtPaths = await glob(path.join(projectPath, "**/*.rm-ext"), { dot: true });

    for (const rmExtPath of rmExtPaths) {
        const newPath = rmExtPath.replace(/\.rm-ext$/, "");
        await rename(rmExtPath, newPath);
    }

    await execute(context.stdout, "pnpm", ["install"], { cwd: projectPath });
    await execute(context.stdout, "pnpm", ["exec", "biome", "check", ".", "--apply"], {
        cwd: projectPath,
    });
    await execute(context.stdout, "pnpm", ["install"], { cwd: path.join(projectPath, "cdk") });
    await execute(context.stdout, "pnpm", ["run", "build"], { cwd: path.join(projectPath, "cdk") });

    if (synthCdk) {
        await execute(
            context.stdout,
            "pnpm",
            ["exec", "cdk", "synth", "--app", "dist/env-uat.js"],
            {
                cwd: path.join(projectPath, "cdk"),
            },
        );
    }
};
