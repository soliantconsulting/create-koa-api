import { type ExecaReturnValue, type Options, execa } from "execa";

export const execute = async (
    stdout: NodeJS.WritableStream,
    file: string,
    args: readonly string[],
    options?: Options,
): Promise<ExecaReturnValue> => {
    const execute = execa(file, args, options);

    execute.stdout?.pipe(stdout);
    execute.stderr?.pipe(stdout);

    return execute;
};
