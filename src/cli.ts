import { fileURLToPath } from "url";
import { ACM, CertificateStatus } from "@aws-sdk/client-acm";
import { CloudFormation } from "@aws-sdk/client-cloudformation";
import { STS } from "@aws-sdk/client-sts";
import type { GetCallerIdentityResponse } from "@aws-sdk/client-sts/dist-types/models/models_0.js";
import { ListrEnquirerPromptAdapter } from "@listr2/prompt-adapter-enquirer";
import { Listr, ListrLogLevels, ListrLogger } from "listr2";
import meow from "meow";
import "source-map-support/register.js";
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
    apiName: string;
    region: string;
    features: Feature[];
    uatCertificateArn: string;
    repositoryUuid: string;
};

const tasks = new Listr<Context>(
    [
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
                const openIdConnectSettingsUrl = `https://bitbucket.org/${workspace}/${repository}/admin/pipelines/openid-connect`;
                context.workspace = workspace;
                context.repository = repository;

                context.repositoryUuid = await prompt.run<string>({
                    type: "input",
                    message: "Repository UUID:",
                    footer: `Copy from ${openIdConnectSettingsUrl}`,
                });

                context.apiName = await prompt.run<string>({
                    type: "input",
                    message: "API Name:",
                    initial: apiName,
                });

                context.region = await prompt.run<string>({
                    type: "input",
                    message: "AWS region:",
                    initial: "us-east-1",
                });

                context.features = await prompt.run<Feature[]>({
                    type: "multiselect",
                    message: "Features:",
                    choices: [
                        { message: "Aurora Postgres", name: "postgres" },
                        { message: "SSM Parameter Store", name: "ssm" },
                    ],
                });
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

                context.uatCertificateArn = await task
                    .prompt(ListrEnquirerPromptAdapter)
                    .run<string>({
                        type: "select",
                        message: "UAT Certificate:",
                        choices: result.CertificateSummaryList.map((certificate) => ({
                            message: certificate.DomainName,
                            name: certificate.CertificateArn,
                        })),
                    });
            },
        },
        {
            title: "Bootstrap CDK",
            task: async (context, task): Promise<void> => {
                await execute(
                    task.stdout(),
                    "npm",
                    [
                        "run",
                        "cdk",
                        "--",
                        "bootstrap",
                        `aws://${context.accountId}/${context.region}`,
                    ],
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
                    "npm",
                    [
                        "run",
                        "cdk",
                        "--",
                        "deploy",
                        "--app",
                        "node_modules/@soliantconsulting/bitbucket-openid-connect/index.js",
                        "-c",
                        `stackSuffix=${context.apiName}`,
                        "-c",
                        `repositoryUuid=${context.repositoryUuid}`,
                        "--require-approval",
                        "never",
                    ],
                    {
                        cwd: fileURLToPath(new URL(".", import.meta.url)),
                        env: {
                            AWS_REGION: context.region,
                        },
                    },
                );

                const cf = new CloudFormation({ region: context.region });
                const result = await cf.describeStacks({
                    StackName: `BitbucketOpenIDConnect-${context.apiName}`,
                });

                if (!result.Stacks?.[0]) {
                    throw new Error(
                        `Could not locate BitbucketOpenIDConnect-${context.apiName} stack`,
                    );
                }

                const stack = result.Stacks[0];
                const output = stack.Outputs?.find((output) => output.OutputKey === "RoleArn");

                if (!output?.OutputValue) {
                    throw new Error("Could not find RoleArn output");
                }

                context.deployRoleArn = output.OutputValue;
            },
        },
        {
            title: "Synth project",
            task: async (context, task): Promise<void> => {
                await synthProject(context.apiName, context, task.stdout());
            },
        },
        {
            title: "Git init",
            task: async (context, task): Promise<void> => {
                await execute(task.stdout(), "git", ["init"], { cwd: context.apiName });
                await execute(task.stdout(), "git", ["add", "."], { cwd: context.apiName });
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
                await execute(task.stdout(), "npx", ["lefthook", "install"], {
                    cwd: context.apiName,
                });
                await execute(task.stdout(), "git", ["push", "-fu", "origin", "main"], {
                    cwd: context.apiName,
                });
            },
        },
    ],
    { concurrent: false },
);

try {
    await tasks.run();

    logger.log(
        ListrLogLevels.COMPLETED,
        "Project creation successful, you must run the pipeline manually once.",
    );
    logger.log(ListrLogLevels.COMPLETED, "You can find additional code snippets here:");
    logger.log(ListrLogLevels.COMPLETED, "https://github.com/soliantconsulting/koa-api-recipes");
} catch (error) {
    logger.log(ListrLogLevels.FAILED, error as string);
}
