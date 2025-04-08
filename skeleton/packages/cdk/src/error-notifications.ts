import { fileURLToPath } from "node:url";
import { Duration, Stack } from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import {
    CfnQueryDefinition,
    FilterPattern,
    type ILogGroup,
    SubscriptionFilter,
} from "aws-cdk-lib/aws-logs";
import { LambdaDestination } from "aws-cdk-lib/aws-logs-destinations";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { undent } from "undent";

type ErrorHandlingProps = {
    logGroup: ILogGroup;
    zoomSecretArn: string;
};

export class ErrorNotifications extends Construct {
    public constructor(scope: Construct, id: string, props: ErrorHandlingProps) {
        super(scope, id);
        const stack = Stack.of(this);

        new CfnQueryDefinition(this, "ErrorsQueryDefinition", {
            name: `${stack.stackName}/Errors`,
            logGroupNames: [props.logGroup.logGroupName],
            queryString: undent(`
                fields @timestamp, @message
                | filter level = "error" or level = "fatal"
                | sort @timestamp desc
                | limit 10000
            `),
        });

        const zoomSecret = Secret.fromSecretCompleteArn(this, "ZoomSecret", props.zoomSecretArn);
        const zoomNotificationFunction = new NodejsFunction(this, "ZoomNotificationFunction", {
            runtime: Runtime.NODEJS_20_X,
            timeout: Duration.seconds(30),
            memorySize: 512,
            handler: "main",
            projectRoot: fileURLToPath(new URL("../../../", import.meta.url)),
            depsLockFilePath: fileURLToPath(new URL("../../../pnpm-lock.yaml", import.meta.url)),
            entry: fileURLToPath(
                new URL("../../zoom-log-error-notifications/src/handler.ts", import.meta.url),
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
            environment: {
                ZOOM_SECRET_ID: zoomSecret.secretArn,
                LOG_ACCOUNT_ID: props.logGroup.stack.account,
                LOG_REGION: props.logGroup.stack.region,
                LOG_GROUP: props.logGroup.logGroupName,
            },
            allowPublicSubnet: true,
        });
        zoomSecret.grantRead(zoomNotificationFunction);

        new SubscriptionFilter(this, "SubscriptionFilter", {
            logGroup: props.logGroup,
            filterPattern: FilterPattern.any(
                FilterPattern.stringValue("$.level", "=", "error"),
                FilterPattern.stringValue("$.level", "=", "fatal"),
            ),
            destination: new LambdaDestination(zoomNotificationFunction),
        });
    }
}
