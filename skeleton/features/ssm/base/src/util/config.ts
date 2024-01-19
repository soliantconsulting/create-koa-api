import { SSM } from "@aws-sdk/client-ssm";
import { createSingletonConfigGetter } from "ssm-config-loader/lib/singleton-config-getter.js";
import { z } from "zod";

const configSchema = z.object({});

const getConfig = createSingletonConfigGetter(new SSM({}), configSchema, process.env.SSM_PREFIX);
const config = await getConfig();

export default config;
