import { type QueryOrderMap, RequestContext } from "@mikro-orm/core";
import { MikroORM } from "@mikro-orm/postgresql";
import fnv1a from "@sindresorhus/fnv1a";
import { unflatten } from "flat";
import type { Next, ParameterizedContext } from "koa";
import type { Sort } from "koa-jsonapi-zod";

export const orm = await MikroORM.init();
export const em = orm.em;

const maxInt64 = 2n ** 63n;

export const lockId = (name: string): bigint => {
    const uint = fnv1a(name, { size: 64 });
    return uint < maxInt64 ? uint : maxInt64 - uint;
};

await em.transactional(async (em) => {
    em.execute(`SELECT pg_advisory_xact_lock(${lockId("migrate")})`);

    const migrator = orm.getMigrator();
    await migrator.up();
});

export const requestContextMiddleware = async (_context: ParameterizedContext, next: Next) =>
    RequestContext.create(em, next);

export const orderByFromJsonApiSort = <TSort extends string, TEntity>(
    sort: Sort<TSort> | undefined,
): QueryOrderMap<TEntity>[] | undefined => {
    if (!sort) {
        return undefined;
    }

    return sort.map((field) =>
        unflatten({
            [field.field]: field.order,
        }),
    );
};
