import assert from "node:assert";
import { SecretsManager } from "@aws-sdk/client-secrets-manager";
import { ListrEnquirerPromptAdapter } from "@listr2/prompt-adapter-enquirer";
import {
    type AwsEnvContext,
    type ProjectContext,
    requireContext,
} from "@soliantconsulting/starter-lib";
import type { ListrTask } from "listr2";

export type ZoomErrorNotificationsContext = {
    zoomErrorNotifications: {
        stagingSecretArn: string;
        productionSecretArn: string;
    } | null;
};

export const zoomErrorNotificationsTask: ListrTask<
    Partial<ProjectContext & AwsEnvContext & ZoomErrorNotificationsContext>
> = {
    title: "Configure Zoom error notifications",
    task: async (context, task): Promise<void> => {
        const prompt = task.prompt(ListrEnquirerPromptAdapter);
        const projectContext = requireContext(context, "project");
        const awsEnvContext = requireContext(context, "awsEnv");

        if (awsEnvContext === null) {
            context.zoomErrorNotifications = null;
            task.skip("AWS environment disabled");
            return;
        }

        const configureNotifications = await task.prompt(ListrEnquirerPromptAdapter).run<boolean>({
            type: "toggle",
            message: "Use notifications?",
            initial: true,
        });

        if (!configureNotifications) {
            context.zoomErrorNotifications = null;
            task.skip("Zoom error notifications not configured");
            return;
        }

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

        const secretsManager = new SecretsManager({ region: awsEnvContext.region });

        const stagingSecret = await secretsManager.createSecret({
            ForceOverwriteReplicaSecret: true,
            Name: `${projectContext.name}-staging-zoom-webhook`,
            SecretString: JSON.stringify({
                endpointUrl: stagingEndpointPrompt,
                verificationToken: stagingVerificationTokenPrompt,
            }),
        });
        assert(stagingSecret.ARN);

        const productionSecret = await secretsManager.createSecret({
            ForceOverwriteReplicaSecret: true,
            Name: `${projectContext.name}-production-zoom-webhook`,
            SecretString: JSON.stringify({
                endpointUrl: productionEndpointPrompt,
                verificationToken: productionVerificationTokenPrompt,
            }),
        });
        assert(productionSecret.ARN);

        context.zoomErrorNotifications = {
            stagingSecretArn: stagingSecret.ARN,
            productionSecretArn: productionSecret.ARN,
        };
    },
};
