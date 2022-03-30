# {{ description }}

## Setup

- `npm install`
- copy `ssm-config.json.dist` to `ssm-config.json`
- `npm start`
/* block:start:ssm */
## SSM parameters

This project comes with SSM preconfigured. You can set up your SSM keys with the following prefixes in AWS:

- `{{ name }}/uat/*`
- `{{ name }}/prod/*`

For local development, the file `ssm-config.json.dist` and `ssm-config.json` should reflect the same tree structure.
/* block:end:ssm *//* block:start:cdk */
## CDK Deployment

You have to finalize the configuration within the `cdk` folder. After that, proceed with the following steps to 
initialize the code pipelines:

- `cd cdk`
- `npx cdk bootstrap aws://ACCOUNT-ID/REGION` 
- `npx cdk deploy`

As region, choose the region your CICD stack will live in, should be `us-east-1` by default.
/* block:end:cdk */
