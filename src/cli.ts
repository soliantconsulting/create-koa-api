#!/usr/bin/env node

import {
    createAwsEnvTask,
    createBitbucketRepositoryTask,
    createDeployRoleTask,
    createGitTask,
    createPnpmVersionTask,
    createProjectTask,
    runPipeline,
} from "@soliantconsulting/starter-lib";
import { featuresTask } from "./tasks/features.js";
import { stagingDomainTask } from "./tasks/staging-domain.js";
import { synthTask } from "./tasks/synth.js";
import { zoomErrorNotificationsTask } from "./tasks/zoom-error-notifications.js";

await runPipeline({
    packageName: "@soliantconsulting/create-koa-api",
    tasks: [
        createPnpmVersionTask("10.7.0"),
        createAwsEnvTask(),
        createBitbucketRepositoryTask(),
        createDeployRoleTask(),
        stagingDomainTask,
        zoomErrorNotificationsTask,
        createProjectTask(),
        featuresTask,
        synthTask,
        createGitTask(),
    ],
});
