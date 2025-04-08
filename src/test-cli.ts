#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import {
    type AwsEnvContext,
    type DeployRoleContext,
    type ProjectContext,
    runPipeline,
} from "@soliantconsulting/starter-lib";
import type { FeaturesContext } from "./tasks/features.js";
import type { StagingDomainContext } from "./tasks/staging-domain.js";
import { synthTask } from "./tasks/synth.js";
import type { ZoomErrorNotificationsContext } from "./tasks/zoom-error-notifications.js";

type BaseContext = ProjectContext &
    AwsEnvContext &
    DeployRoleContext &
    FeaturesContext &
    StagingDomainContext &
    ZoomErrorNotificationsContext;

await runPipeline({
    packageName: "@soliantconsulting/create-koa-api",
    tasks: [synthTask],
    baseContext: {
        project: {
            name: "test-synth",
            title: "Test Synth",
            path: fileURLToPath(new URL("../test-synth", import.meta.url)),
        },
        awsEnv: {
            accountId: "123456789",
            region: "us-east-1",
        },
        deployRole: {
            arn: "arn://unknown",
        },
        stagingDomain: {
            certificateArn: "arn://example",
        },
        features: ["postgres", "app-config"],
        zoomErrorNotifications: {
            stagingSecretArn: "arn://unknown/staging",
            productionSecretArn: "arn://unknown/production",
        },
    } satisfies BaseContext,
});
