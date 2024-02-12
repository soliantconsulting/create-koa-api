import { SecretsManager } from "@aws-sdk/client-secrets-manager";
import { LoadStrategy } from "@mikro-orm/core";
import { Migrator } from "@mikro-orm/migrations";
import { type Options, defineConfig } from "@mikro-orm/postgresql";

let generator = undefined;

if (process.env.NODE_ENV !== "production") {
    const { TSMigrationGenerator } = await import("@mikro-orm/migrations");
    const { format } = await import("sql-formatter");

    class CustomMigrationGenerator extends TSMigrationGenerator {
        public generateMigrationFile(
            className: string,
            diff: { up: string[]; down: string[] },
        ): string {
            let result = `import {Migration} from '@mikro-orm/migrations';\n\nexport class ${className} extends Migration {\n    public async up() : Promise<void> {\n${diff.up
                .map((sql) => this.createStatement(sql, 8))
                .join("\n")
                .replace(/(^\n+|\n+$)/g, "")}\n    }\n`;

            if (diff.down) {
                result += `\n    public async down() : Promise<void> {\n${diff.down
                    .map((sql) => this.createStatement(sql, 8))
                    .join("\n")
                    .replace(/(^\n+|\n+$)/g, "")}\n    }\n`;
            }

            result += "}\n";
            return result;
        }

        createStatement(sql: string, padLeft: number): string {
            if (sql) {
                const sqlLines = format(sql, {
                    language: "postgresql",
                    keywordCase: "upper",
                    tabWidth: 4,
                }).split("\n");

                if (sqlLines.length < 2) {
                    return super.createStatement(sqlLines.join(""), padLeft).trimEnd();
                }

                const formattedSql = sqlLines
                    .map((line) => `${" ".repeat(padLeft + 4)}${line}`)
                    .join("\n");

                return (
                    `${" ".repeat(padLeft)}` +
                    `this.addSql(\`\n${formattedSql.replace(/[`\\]/g, "\\`")}\n` +
                    `${" ".repeat(padLeft)}\`);`
                );
            }

            return "";
        }
    }

    generator = CustomMigrationGenerator;
}

type PostgresSecret = {
    username: string;
    password: string;
    dbname: string;
};

export default (async (): Promise<Options> => {
    let postgresConfig: Options;

    const secretId = process.env.POSTGRES_SECRET;
    const hostname = process.env.POSTGRES_HOSTNAME;
    const port = process.env.POSTGRES_PORT;

    if (secretId && hostname && port) {
        const secretsManager = new SecretsManager({});
        const secretValue = await secretsManager.getSecretValue({
            SecretId: secretId,
        });

        if (!secretValue.SecretString) {
            throw new Error("Postgres secret contains no secret string");
        }

        const secret = JSON.parse(secretValue.SecretString) as PostgresSecret;

        postgresConfig = {
            host: hostname,
            port: parseInt(port, 10),
            user: secret.username,
            password: secret.password,
            dbName: secret.dbname,
        };
    } else {
        postgresConfig = {
            host: "localhost",
            port: 3001,
            user: "dev",
            password: "dev",
            dbName: "dev",
        };
    }

    return defineConfig({
        entities: ["./entity/**/*.js"],
        entitiesTs: ["./src/entity/**/*.ts"],
        extensions: [Migrator],
        migrations: {
            path: "./migration",
            pathTs: "./src/migration",
            generator,
        },
        discovery: {
            warnWhenNoEntities: false,
        },
        loadStrategy: LoadStrategy.JOINED,
        ...postgresConfig,
    });
})();
