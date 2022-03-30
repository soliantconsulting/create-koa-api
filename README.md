# Create Koa API

This is an init project for creating Koa API projects with an optional CDK deployment pipeline.

To create a new project, run the following command:

```npm init @soliantconsulting/koa-api```

The init script will ask a few questions:

- `API name`: will be used as the package name as well as name of the deployment pipeline. Should be something like
  `my-foo-api`.
- `Description`: will be used as the package description as well as the title for the `README.md`.
- `Use CDK`: toggles whether the project should be initialized with a CDK pipeline.
- `Use SSM`: toggles whether the project uses SSM for configuration.

The script will place the project in a directory with the given API name under the current working directory.

After initialization, check the output and the generated `README.md` for further instructions.
