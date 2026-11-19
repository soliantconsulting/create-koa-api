import { ListrEnquirerPromptAdapter } from "@listr2/prompt-adapter-enquirer";
import { type AwsEnvContext, requireContext } from "@soliantconsulting/starter-lib";
import type { ListrTask } from "listr2";

type AudienceFormat = "single-string" | "string-array" | "space-separated-values";

export type JwtValidationContext = {
    jwtValidation: {
        issuer: string;
        jwksEndpoint: string;
        audienceClaim: string;
        audienceFormat: AudienceFormat;
        audiences: string[];
    } | null;
};

const reservedClaims = ["iss", "exp", "nbf", "iat"];

const validateHttpsUrl = (input: string): true | string => {
    const value = input.trim();

    if (!value.startsWith("https://")) {
        return "Must start with https://";
    }

    if (value.length > 256) {
        return "Must be 256 characters or fewer";
    }

    try {
        new URL(value);
    } catch {
        return "Must be a valid URL";
    }

    return true;
};

const parseList = (value: string): string[] =>
    value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");

export const jwtValidationTask: ListrTask<Partial<AwsEnvContext & JwtValidationContext>> = {
    title: "Configure ALB JWT validation",
    task: async (context, task): Promise<void> => {
        const prompt = task.prompt(ListrEnquirerPromptAdapter);
        const awsEnvContext = requireContext(context, "awsEnv");

        if (awsEnvContext === null) {
            context.jwtValidation = null;
            task.skip("AWS environment disabled");
            return;
        }

        const issuer = (
            await prompt.run<string>({
                type: "input",
                message:
                    "Staging JWT issuer (Auth0: https://<tenant>.auth0.com/, Cognito: https://cognito-idp.<region>.amazonaws.com/<pool-id>):",
                validate: validateHttpsUrl,
            })
        ).trim();

        const jwksEndpoint = (
            await prompt.run<string>({
                type: "input",
                message: "Staging JWKS endpoint:",
                initial: `${issuer.replace(/\/+$/, "")}/.well-known/jwks.json`,
                validate: validateHttpsUrl,
            })
        ).trim();

        const audienceClaim = await prompt.run<string>({
            type: "input",
            message: "Audience claim name (Cognito access tokens use client_id):",
            initial: "aud",
            validate: (value: string) => {
                const name = value.trim();

                if (name === "") {
                    return "Claim name is required";
                }

                if (reservedClaims.includes(name)) {
                    return `${name} is always validated and cannot be an additional claim`;
                }

                return true;
            },
        });

        const audienceFormat = await prompt.run<AudienceFormat>({
            type: "select",
            message: "Audience claim format:",
            choices: [
                { message: "Single string (Cognito client_id)", name: "single-string" },
                {
                    message: "String array (Auth0 aud, which is an array with the openid scope)",
                    name: "string-array",
                },
                {
                    message: "Space separated values (e.g. scope claims)",
                    name: "space-separated-values",
                },
            ],
        });

        const audiences = parseList(
            await prompt.run<string>({
                type: "input",
                message: "Staging audience values (comma separated):",
                validate: (value: string) => {
                    const list = parseList(value);

                    if (list.length === 0) {
                        return "At least one value is required";
                    }

                    if (list.length > 10) {
                        return "At most 10 values are allowed";
                    }

                    if (list.some((item) => item.length > 256)) {
                        return "Each value must be 256 characters or fewer";
                    }

                    if (
                        audienceFormat === "space-separated-values" &&
                        list.some((item) => /\s/.test(item))
                    ) {
                        return "Values can't contain spaces, separate them with commas";
                    }

                    return true;
                },
            }),
        );

        context.jwtValidation = {
            issuer,
            jwksEndpoint,
            audienceClaim: audienceClaim.trim(),
            audienceFormat,
            audiences,
        };
    },
};
