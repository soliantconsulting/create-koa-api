import { ACM, CertificateStatus } from "@aws-sdk/client-acm";
import { ListrEnquirerPromptAdapter } from "@listr2/prompt-adapter-enquirer";
import { type AwsEnvContext, requireContext } from "@soliantconsulting/starter-lib";
import type { ListrTask } from "listr2";

export type StagingDomainContext = {
    stagingDomain: {
        certificateArn: string;
    } | null;
};

export const stagingDomainTask: ListrTask<Partial<AwsEnvContext & StagingDomainContext>> = {
    title: "Configure staging domain",
    task: async (context, task): Promise<void> => {
        const prompt = task.prompt(ListrEnquirerPromptAdapter);
        const awsEnvContext = requireContext(context, "awsEnv");

        if (awsEnvContext === null) {
            context.stagingDomain = null;
            task.skip("AWS environment disabled");
            return;
        }

        const acm = new ACM({ region: awsEnvContext.region });
        const result = await acm.listCertificates({
            CertificateStatuses: [CertificateStatus.ISSUED],
        });

        if (!result.CertificateSummaryList || result.CertificateSummaryList.length === 0) {
            throw new Error(`No issued certificates found in region ${awsEnvContext.region}`);
        }

        const certificateArn = await prompt.run<string>({
            type: "select",
            message: "Staging Certificate:",
            choices: result.CertificateSummaryList.map((certificate) => ({
                message: certificate.DomainName,
                name: certificate.CertificateArn,
            })),
        });

        context.stagingDomain = {
            certificateArn,
        };
    },
};
