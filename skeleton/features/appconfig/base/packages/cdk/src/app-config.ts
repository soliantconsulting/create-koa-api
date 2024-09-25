import { fileURLToPath } from "node:url";
import { Duration, Stack } from "aws-cdk-lib";
import {
    CfnApplication,
    CfnConfigurationProfile,
    CfnDeploymentStrategy,
    CfnEnvironment,
} from "aws-cdk-lib/aws-appconfig";
import { Grant, type IGrantable, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

type AppConfigProps = {
    name: string;
};

export class AppConfig extends Construct {
    public readonly applicationId: string;
    public readonly configurationProfileId: string;
    public readonly environmentId: string;
    public readonly environmentArn: string;

    public constructor(scope: Construct, id: string, props: AppConfigProps) {
        super(scope, id);
        const stack = Stack.of(this);

        const application = new CfnApplication(this, "Application", {
            name: props.name,
        });
        this.applicationId = application.ref;

        const validatorFunction = new NodejsFunction(this, "ValidatorFunction", {
            runtime: Runtime.NODEJS_20_X,
            timeout: Duration.seconds(5),
            memorySize: 512,
            handler: "main",
            projectRoot: fileURLToPath(new URL("../../../", import.meta.url)),
            depsLockFilePath: fileURLToPath(new URL("../../../pnpm-lock.yaml", import.meta.url)),
            entry: fileURLToPath(
                new URL("../../app-config/src/lambda-validator.ts", import.meta.url),
            ),
            bundling: {
                minify: true,
                sourceMap: true,
                sourcesContent: false,
                target: "es2022",
                format: OutputFormat.ESM,
                mainFields: ["module", "main"],
                environment: {
                    NODE_OPTIONS: "--enable-source-maps",
                },
            },
        });

        new CfnDeploymentStrategy(this, "DeploymentStrategy", {
            name: `${props.name}.Instant`,
            description: "Instant deployment to all nodes without bake time",
            deploymentDurationInMinutes: 0,
            growthFactor: 100,
            replicateTo: "NONE",
            finalBakeTimeInMinutes: 0,
        });

        validatorFunction.addPermission("appconfig", {
            action: "lambda:InvokeFunction",
            principal: new ServicePrincipal("appconfig.amazonaws.com"),
        });

        const configurationProfile = new CfnConfigurationProfile(this, "ConfigurationProfile", {
            name: "default",
            locationUri: "hosted",
            applicationId: application.ref,
            validators: [
                {
                    type: "LAMBDA",
                    content: validatorFunction.functionArn,
                },
            ],
        });
        this.configurationProfileId = configurationProfile.ref;

        const environment = new CfnEnvironment(this, "AppConfigEnvironment", {
            name: "api",
            applicationId: application.ref,
        });
        this.environmentId = environment.ref;
        this.environmentArn = stack.formatArn({
            service: "appconfig",
            resource: "application",
            resourceName: `${this.applicationId}/environment/${this.environmentId}`,
        });
    }

    public grantRead(grantee: IGrantable): Grant {
        return Grant.addToPrincipal({
            grantee,
            actions: ["appconfig:GetLatestConfiguration", "appconfig:StartConfigurationSession"],
            resourceArns: [`${this.environmentArn}/*`],
        });
    }
}
