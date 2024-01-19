import type { Context } from "koa";
import { z } from "zod";
import type { JsonApiError } from "./json-api.js";

export class ZodValidationError extends Error {
    public readonly status: number;
    public readonly errors: z.ZodIssue[];

    public constructor(message: string, status: number, errors: z.ZodIssue[]) {
        super(message);
        this.status = status;
        this.errors = errors;
    }

    public toJsonApiErrors(): JsonApiError[] {
        return this.errors.map((error): JsonApiError => {
            let source: JsonApiError["source"];
            const { code, message, path, fatal, ...rest } = error;

            if (this.status === 400) {
                if (path.length !== 1 || typeof path[0] !== "string") {
                    throw new Error("Query parameters paths must be a single string");
                }

                source = {
                    parameter: path[0],
                };
            } else {
                source = {
                    pointer: `/${path.join("/")}`,
                };
            }

            return {
                status: this.status.toString(),
                code,
                title: message,
                source,
                meta: Object.keys(rest).length > 0 ? rest : undefined,
            };
        });
    }
}

export const parseBody = <T extends z.ZodType<unknown>>(
    schema: T,
    context: Context,
): z.infer<T> => {
    const result = z.object({ data: schema }).safeParse(context.request.body);

    if (!result.success) {
        throw new ZodValidationError("Validation of body failed", 422, result.error.errors);
    }

    return result.data;
};

export const parseQuery = <T extends z.ZodType<unknown>>(
    schema: T,
    context: Context,
): z.infer<T> => {
    const result = schema.safeParse(context.request.query);

    if (!result.success) {
        throw new ZodValidationError("Validation of query failed", 400, result.error.errors);
    }

    return result.data;
};
