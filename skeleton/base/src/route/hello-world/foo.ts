import type { Context } from "koa";
import type Router from "koa-tree-router";
import { z } from "zod";
import { parseBody, parseQuery } from "../../util/zod.js";

const getHelloWorld = (context: Context) => {
    context.body = {
        data: {
            message: "hello-world",
        },
    };
};

const listQuerySchema = z.object({
    foo: z.string().optional(),
});

const listHelloWorld = (context: Context) => {
    const query = parseQuery(listQuerySchema, context);

    context.body = { data: { foo: query.foo } };
};

const postSchema = z.object({
    foo: z.string(),
});

const postHelloWorld = (context: Context) => {
    const input = parseBody(postSchema, context);

    context.status = 201;
    context.body = { data: { foo: input.foo } };
};

export const registerFooRoutes = (router: Router): void => {
    const group = router.newGroup("/foo");
    group.get("/", getHelloWorld);
    group.get("/list", listHelloWorld);
    group.post("/list", postHelloWorld);
};
