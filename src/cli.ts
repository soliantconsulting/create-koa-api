#!/usr/bin/env node

import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ACM, CertificateStatus } from "@aws-sdk/client-acm";
import { SecretsManager } from "@aws-sdk/client-secrets-manager";
import { STS } from "@aws-sdk/client-sts";
import type { GetCallerIdentityResponse } from "@aws-sdk/client-sts/dist-types/models/models_0.js";
import { ListrEnquirerPromptAdapter } from "@listr2/prompt-adapter-enquirer";
import { getAccessToken } from "@soliantconsulting/bitbucket-cloud-cli-auth";
import type { ExecaReturnValue } from "execa";
import { Listr, ListrLogLevels, ListrLogger } from "listr2";
import meow from "meow";
import semver from "semver/preload.js";
import "source-map-support/register.js";
import invariant from "tiny-invariant";
import { BitBucketClient } from "./bitbucket.js";
import { type Feature, synthProject } from "./synth.js";
import { execute } from "./util.js";

const logger = new ListrLogger();

const cli = meow(
    `
  Usage

    $ npm init @soliantconsulting/koa-api [api-name|-v|--version|-h|--help]
`,
    {
        booleanDefault: undefined,
        flags: {
            help: {
                type: "boolean",
                shortFlag: "h",
            },
            version: {
                type: "boolean",
                shortFlag: "v",
            },
        },
        importMeta: import.meta,
    },
);

const [apiName] = cli.input;

type Context = {
    accountId: string;
    workspace: string;
    repository: string;
    deployRoleArn: string;
    bitbucketAccessToken: string;
    apiName: string;
    region: string;
    features: Feature[];
    stagingCertificateArn: string;
    zoomWebhook?: {
        stagingSecretArn: string;
        productionSecretArn: string;
    };
    repositoryUuid: string;
    projectPath: string;
};

const tasks = new Listr<Context>(
    [
        {
            title: "Check pnpm version",
            task: async (_context, task): Promise<void> => {
                let result: ExecaReturnValue;

                try {
                    result = await execute(task.stdout(), "pnpm", ["--version"]);
                } catch {
                    throw new Error(
                        "pnpm not found, please install latest version: https://pnpm.io/installation",
                    );
                }

                const version = result.stdout.trim();

                if (!semver.gte(version, "8.14.0")) {
                    throw new Error(`pnpm version ${version} found, need at least 8.14.0`);
                }
            },
        },
        {
            title: "Retrieve AWS account ID",
            task: async (context, _task): Promise<void> => {
                const sts = new STS({ region: "us-east-1" });
                let identity: GetCallerIdentityResponse;

                try {
                    identity = await sts.getCallerIdentity({});
                } catch (error) {
                    throw new Error(
                        "Could not acquire account ID, have you set up AWS env variables?",
                    );
                }

                if (!identity.Account) {
                    throw new Error("Failed to acquire account ID from identity");
                }

                context.accountId = identity.Account;
            },
        },
        {
            title: "Gather project settings",
            task: async (context, task): Promise<void> => {
                const prompt = task.prompt(ListrEnquirerPromptAdapter);

                const repositoryClonePrompt = await prompt.run<string>({
                    type: "input",
                    message: "Repository clone prompt:",
                });

                const repositoryMatch = repositoryClonePrompt.match(
                    /@bitbucket\.org[:\/]([^\/]+)\/(.+)\.git/,
                );

                if (!repositoryMatch) {
                    throw new Error("Invalid repository clone prompt");
                }

                const [, workspace, repository] = repositoryMatch;
                context.workspace = workspace;
                context.repository = repository;

                context.apiName = await prompt.run<string>({
                    type: "input",
                    message: "API Name:",
                    initial: apiName,
                });

                context.projectPath = path.join(process.cwd(), context.apiName);
                let projectPathExists = false;

                try {
                    await stat(context.projectPath);
                    projectPathExists = true;
                } catch {
                    // Noop
                }

                if (projectPathExists) {
                    throw new Error(`Path ${context.projectPath} already exists`);
                }

                context.region = await prompt.run<string>({
                    type: "input",
                    message: "AWS region:",
                    initial: "us-east-1",
                });

                context.features = await prompt.run<Feature[]>({
                    type: "multiselect",
                    message: "Features:",
                    choices: [
                        {
                            message: "Zoom Error Log Notifications",
                            name: "zoom_error_log_notifications",
                        },
                        { message: "Aurora Postgres", name: "postgres" },
                        { message: "AppConfig", name: "appconfig" },
                    ],
                    // @ts-expect-error invalid typing
                    initial: ["zoom_error_log_notifications"],
                });
            },
        },
        {
            title: "Connect to BitBucket",
            task: async (context): Promise<void> => {
                context.bitbucketAccessToken = await getAccessToken("knXh7CKqDtCUHLrhVW", 31337);
            },
        },
        {
            title: "Retrieve repository UUID",
            task: async (context): Promise<void> => {
                const bitbucket = new BitBucketClient(
                    context.bitbucketAccessToken,
                    context.workspace,
                    context.repository,
                );
                context.repositoryUuid = await bitbucket.getRepositoryUuid();
            },
        },
        {
            title: "Configure pipeline environments",
            task: async (context): Promise<void> => {
                const bitbucket = new BitBucketClient(
                    context.bitbucketAccessToken,
                    context.workspace,
                    context.repository,
                );
                await bitbucket.enablePipeline();
            },
        },
        {
            title: "Select certificate",
            task: async (context, task): Promise<void> => {
                const acm = new ACM({ region: context.region });
                const result = await acm.listCertificates({
                    CertificateStatuses: [CertificateStatus.ISSUED],
                });

                if (!result.CertificateSummaryList || result.CertificateSummaryList.length === 0) {
                    throw new Error(`No issued certificates found in region ${context.region}`);
                }

                context.stagingCertificateArn = await task
                    .prompt(ListrEnquirerPromptAdapter)
                    .run<string>({
                        type: "select",
                        message: "Staging Certificate:",
                        choices: result.CertificateSummaryList.map((certificate) => ({
                            message: certificate.DomainName,
                            name: certificate.CertificateArn,
                        })),
                    });
            },
        },
        {
            title: "Setup Zoom Error Log Notifications",
            skip: (context) => !context.features.includes("zoom_error_log_notifications"),
            task: async (context, task): Promise<void> => {
                const prompt = task.prompt(ListrEnquirerPromptAdapter);

                const stagingEndpointPrompt = await prompt.run<string>({
                    type: "input",
                    message: "Staging endpoint:",
                });
                const stagingVerificationTokenPrompt = await prompt.run<string>({
                    type: "password",
                    message: "Staging verification token:",
                });
                const productionEndpointPrompt = await prompt.run<string>({
                    type: "input",
                    message: "Production endpoint:",
                });
                const productionVerificationTokenPrompt = await prompt.run<string>({
                    type: "password",
                    message: "Production verification token:",
                });

                const secretsManager = new SecretsManager({ region: context.region });

                const stagingSecret = await secretsManager.createSecret({
                    ForceOverwriteReplicaSecret: true,
                    Name: `${context.apiName}-staging-zoom-webhook`,
                    SecretString: JSON.stringify({
                        endpointUrl: stagingEndpointPrompt,
                        verificationToken: stagingVerificationTokenPrompt,
                    }),
                });
                invariant(stagingSecret.ARN);

                const productionSecret = await secretsManager.createSecret({
                    ForceOverwriteReplicaSecret: true,
                    Name: `${context.apiName}-production-zoom-webhook`,
                    SecretString: JSON.stringify({
                        endpointUrl: productionEndpointPrompt,
                        verificationToken: productionVerificationTokenPrompt,
                    }),
                });
                invariant(productionSecret.ARN);

                context.zoomWebhook = {
                    stagingSecretArn: stagingSecret.ARN,
                    productionSecretArn: productionSecret.ARN,
                };
            },
        },
        {
            title: "Bootstrap CDK",
            task: async (context, task): Promise<void> => {
                await execute(
                    task.stdout(),
                    "pnpm",
                    ["exec", "cdk", "bootstrap", `aws://${context.accountId}/${context.region}`],
                    {
                        cwd: fileURLToPath(new URL(".", import.meta.url)),
                        env: {
                            AWS_REGION: context.region,
                        },
                    },
                );
            },
        },
        {
            title: "Setup deployment role",
            task: async (context, task): Promise<void> => {
                await execute(
                    task.stdout(),
                    "pnpm",
                    [
                        "exec",
                        "bitbucket-openid-connect",
                        "deploy",
                        "bitbucket-openid-connect",
                        context.apiName,
                        context.repositoryUuid,
                    ],
                    {
                        cwd: fileURLToPath(new URL(".", import.meta.url)),
                        env: {
                            AWS_REGION: context.region,
                        },
                    },
                );

                const result = await execute(
                    task.stdout(),
                    "pnpm",
                    [
                        "exec",
                        "bitbucket-openid-connect",
                        "get-role-arn",
                        "bitbucket-openid-connect",
                        context.apiName,
                    ],
                    {
                        cwd: fileURLToPath(new URL(".", import.meta.url)),
                        env: {
                            AWS_REGION: context.region,
                        },
                    },
                );

                context.deployRoleArn = result.stdout;
            },
        },
        {
            title: "Synth project",
            task: async (context, task): Promise<void> => {
                await synthProject(context.projectPath, context, task.stdout());
            },
        },
        {
            title: "Git init",
            task: async (context, task): Promise<void> => {
                await execute(task.stdout(), "git", ["init"], { cwd: context.projectPath });
                await execute(task.stdout(), "git", ["add", "."], { cwd: context.projectPath });
                await execute(task.stdout(), "git", ["commit", "-m", '"feat: initial commit"'], {
                    cwd: context.apiName,
                });
                await execute(
                    task.stdout(),
                    "git",
                    [
                        "remote",
                        "add",
                        "origin",
                        `git@bitbucket.org:${context.workspace}/${context.repository}.git`,
                    ],
                    { cwd: context.apiName },
                );
                await execute(task.stdout(), "pnpm", ["exec", "lefthook", "install"], {
                    cwd: context.apiName,
                });

                let forcePush = false;

                try {
                    await execute(task.stdout(), "git", ["push", "-u", "origin", "main"], {
                        cwd: context.apiName,
                    });
                } catch {
                    forcePush = await task.prompt(ListrEnquirerPromptAdapter).run<boolean>({
                        type: "toggle",
                        message: "Push failed, try force push?",
                        initial: false,
                    });
                }

                if (forcePush) {
                    await execute(task.stdout(), "git", ["push", "-fu", "origin", "main"], {
                        cwd: context.apiName,
                    });
                }
            },
        },
    ],
    { concurrent: false },
);

try {
    await tasks.run();

    logger.log(ListrLogLevels.COMPLETED, "Project creation successful.");
    logger.log(ListrLogLevels.COMPLETED, "You can find additional code snippets here:");
    logger.log(ListrLogLevels.COMPLETED, "https://github.com/soliantconsulting/koa-api-recipes");
} catch (error) {
    logger.log(ListrLogLevels.FAILED, error as string);
}
