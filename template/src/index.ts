import * as zlib from 'zlib';
import cors from '@koa/cors';
import {isHttpError} from 'http-errors';
import gracefulShutdown from 'http-graceful-shutdown';
import {getReasonPhrase} from 'http-status-codes';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cacheControl from 'koa-cache-control';
import compress from 'koa-compress';
import compositeRouter from './route';
import {logger} from './util/winston';

const app = new Koa();

app.use(cacheControl({noStore: true}));

app.use(async (context, next) => {
    try {
        await next();

        if (context.status === 404 || context.status === 405) {
            context.throw(context.status);
        }
    } catch (error) {
        if (isHttpError(error) && error.expose) {
            context.status = error.status;
            context.body = {
                status: error.status,
                message: getReasonPhrase(error.status),
                hint: error.message,
                errors: Array.isArray(error.errors) ? error.errors : undefined,
            };
            return;
        }

        context.status = 500;
        context.body = {
            status: 500,
            message: 'Internal Server Error',
        };
        logger.error(error instanceof Error ? error.stack : error);
    }
});

app.use(bodyParser());
app.use(cors({maxAge: 86400}));
app.use(compress({
    br: {
        params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: 1,
        },
    },
}));

app.use((context, next) => {
    if (context.url === '/health') {
        context.body = {status: 'alive'};
        return;
    }

    return next();
});

app.use(compositeRouter.routes());
app.use(compositeRouter.allowedMethods());

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const server = app.listen(port, process.env.HOST);

gracefulShutdown(server);
logger.info(`Server started on port ${port}`);
