# [2.6.0](https://github.com/soliantconsulting/create-koa-api/compare/v2.5.1...v2.6.0) (2024-02-28)


### Features

* use BitBucket API for repository UUID retrieval ([d8a0f5b](https://github.com/soliantconsulting/create-koa-api/commit/d8a0f5b9a958f1346a1c2a167959e4c5928c9c5b))

## [2.5.1](https://github.com/soliantconsulting/create-koa-api/compare/v2.5.0...v2.5.1) (2024-02-16)


### Bug Fixes

* **synth:** run cdk-synth with env-staging.js ([7a61936](https://github.com/soliantconsulting/create-koa-api/commit/7a6193698df4d6517c3ac91609529aad2aa1fc75))

# [2.5.0](https://github.com/soliantconsulting/create-koa-api/compare/v2.4.0...v2.5.0) (2024-02-16)


### Features

* rename UAT to staging ([78e9895](https://github.com/soliantconsulting/create-koa-api/commit/78e9895cec0593730fa054f617ebe73d824ee73d))

# [2.4.0](https://github.com/soliantconsulting/create-koa-api/compare/v2.3.1...v2.4.0) (2024-02-12)


### Features

* add koa-jsonapi-zod and remove unneccessary boilerplate code ([ea3238c](https://github.com/soliantconsulting/create-koa-api/commit/ea3238c14f034fadd1c2c52ef3d40fc7b97d7726))

## [2.3.1](https://github.com/soliantconsulting/create-koa-api/compare/v2.3.0...v2.3.1) (2024-01-30)


### Bug Fixes

* **synth:** fix various synth errors ([828ffd8](https://github.com/soliantconsulting/create-koa-api/commit/828ffd82733e75c66141b4bf8a63b1a449d9b33c))

# [2.3.0](https://github.com/soliantconsulting/create-koa-api/compare/v2.2.0...v2.3.0) (2024-01-29)


### Bug Fixes

* apply various fixes to postgres feature and VPC ([b274d11](https://github.com/soliantconsulting/create-koa-api/commit/b274d11f7723e7afdf555f99196516bfc36587e3))


### Features

* add IPv6 and move database to isolated subnet ([974a311](https://github.com/soliantconsulting/create-koa-api/commit/974a311d61c1c09215fb705a3955c0eec9e7cc48))
* replace parameter store with appconfig ([3b9f16f](https://github.com/soliantconsulting/create-koa-api/commit/3b9f16ff3be03c9ae64b546d43f79e050c723adc))
* update hello-world route to JSON:API format ([da50fb9](https://github.com/soliantconsulting/create-koa-api/commit/da50fb96b7ccc0f16f384d8be405343882b45cab))

# [2.2.0](https://github.com/soliantconsulting/create-koa-api/compare/v2.1.0...v2.2.0) (2024-01-22)


### Features

* do not force push by default ([fc2174f](https://github.com/soliantconsulting/create-koa-api/commit/fc2174f5a778d5d10159f3b573157e6b1b882602))
* replace npm with pnpm ([121b337](https://github.com/soliantconsulting/create-koa-api/commit/121b33742f32f3df6600b0dfb77e3d261f5e9346))

# [2.1.0](https://github.com/soliantconsulting/create-koa-api/compare/v2.0.1...v2.1.0) (2024-01-19)


### Features

* **skeleton:** add JSON:API hint to README.md ([24bf738](https://github.com/soliantconsulting/create-koa-api/commit/24bf738420c4bddd627b2fd88a5cc85b9115c660))

## [2.0.1](https://github.com/soliantconsulting/create-koa-api/compare/v2.0.0...v2.0.1) (2024-01-19)


### Bug Fixes

* **cli:** add node shebang ([54eccd6](https://github.com/soliantconsulting/create-koa-api/commit/54eccd67690a25cd54509a3525e2602e3a25087e))

# [2.0.0](https://github.com/soliantconsulting/create-koa-api/compare/v1.4.1...v2.0.0) (2024-01-19)


### Bug Fixes

* **cli:** use npx to run lefthook install ([a3cf5b9](https://github.com/soliantconsulting/create-koa-api/commit/a3cf5b94ed3465edc84251749418b0078394d06d))


### Features

* refactor project to utilize Bitbucket Pipelines ([bbe845b](https://github.com/soliantconsulting/create-koa-api/commit/bbe845be3a90b2191c55011d59da06797d542415))


### BREAKING CHANGES

* This requires Git hosting on Bitbucket Cloud.

## [1.4.1](https://versions.soliantconsulting.com/swr/create-koa-api/compare/v1.4.0...v1.4.1) (2023-03-23)


### Bug Fixes

* correct lint errors ([01796d3](https://versions.soliantconsulting.com/swr/create-koa-api/commit/01796d3a57256868663bab923838fe44d0872aa8))

# [1.4.0](https://versions.soliantconsulting.com/swr/create-koa-api/compare/v1.3.2...v1.4.0) (2023-03-23)


### Features

* update all dependencies ([5547425](https://versions.soliantconsulting.com/swr/create-koa-api/commit/5547425bfd895ed0b1d46a07c47d194bd3a7c991))

## [1.3.2](https://versions.soliantconsulting.com/swr/create-koa-api/compare/v1.3.1...v1.3.2) (2022-07-26)


### Bug Fixes

* quote commit message ([e367fd1](https://versions.soliantconsulting.com/swr/create-koa-api/commit/e367fd16eab359545e2c24b73aecac6b46ea7f6e))

## [1.3.1](https://versions.soliantconsulting.com/swr/create-koa-api/compare/v1.3.0...v1.3.1) (2022-07-26)


### Bug Fixes

* enable shell for child processes, fixes windows compatibility ([26c64ba](https://versions.soliantconsulting.com/swr/create-koa-api/commit/26c64ba48c8adaf15f8f8b55da1374ad558b48aa))
* **template:** use file protocol URLs for composite router ([b73ef18](https://versions.soliantconsulting.com/swr/create-koa-api/commit/b73ef18d832d3b44da858f2a7370e49efd967a61))

# [1.3.0](https://versions.soliantconsulting.com/swr/create-koa-api/compare/v1.2.0...v1.3.0) (2022-07-25)


### Features

* **template:** add ESM support ([86bfd10](https://versions.soliantconsulting.com/swr/create-koa-api/commit/86bfd10d0cc7d100da75fd03b8a78fc2d873f53e))

# [1.2.0](https://versions.soliantconsulting.com/swr/create-koa-api/compare/v1.1.2...v1.2.0) (2022-06-28)


### Features

* **template:** update cdk dependencies to latest versions ([807640b](https://versions.soliantconsulting.com/swr/create-koa-api/commit/807640b78b1f7dadd48897963a5edf6f88c8d96a))

## [1.1.2](https://versions.soliantconsulting.com/swr/create-koa-api/compare/v1.1.1...v1.1.2) (2022-05-13)


### Bug Fixes

* **template:** return after setting exposed error on body ([908453e](https://versions.soliantconsulting.com/swr/create-koa-api/commit/908453e0b441fe1fe428e5fc9e6da1dabba69eef))

## [1.1.1](https://versions.soliantconsulting.com/swr/create-koa-api/compare/v1.1.0...v1.1.1) (2022-03-31)


### Bug Fixes

* **init:** remove SSM client package when not using SSM ([567ea63](https://versions.soliantconsulting.com/swr/create-koa-api/commit/567ea63780a0c71707089f7625d8f507273a1a70))

# [1.1.0](https://versions.soliantconsulting.com/swr/create-koa-api/compare/v1.0.4...v1.1.0) (2022-03-31)


### Features

* **cdk:** use more descriptive placeholders for sourceObjectKey ([850829a](https://versions.soliantconsulting.com/swr/create-koa-api/commit/850829aa4f37dc1f69b040d014113a720bc135c6))

## [1.0.4](https://versions.soliantconsulting.com/swr/create-koa-api/compare/v1.0.3...v1.0.4) (2022-03-31)


### Bug Fixes

* **init:** update usage text ([c473601](https://versions.soliantconsulting.com/swr/create-koa-api/commit/c4736012b2bd2f791e2912b8b576b64ce66625fd))

## [1.0.3](https://versions.soliantconsulting.com/swr/create-koa-api/compare/v1.0.2...v1.0.3) (2022-03-31)


### Bug Fixes

* **template:** update README.md instructions for CDK deployment ([0d8d336](https://versions.soliantconsulting.com/swr/create-koa-api/commit/0d8d3365227cb07a38a724811e8ae71d399ac85f))

## [1.0.2](https://versions.soliantconsulting.com/swr/create-koa-api/compare/v1.0.1...v1.0.2) (2022-03-30)


### Bug Fixes

* **init:** rename gitignore files after init ([e1196e7](https://versions.soliantconsulting.com/swr/create-koa-api/commit/e1196e7dd490e196b66844328bc2593a44959d0c))

## [1.0.1](https://versions.soliantconsulting.com/swr/create-koa-api/compare/v1.0.0...v1.0.1) (2022-03-30)


### Bug Fixes

* **init:** use dist .npmignore file to avoid exclusion during package publishing ([9dc3db2](https://versions.soliantconsulting.com/swr/create-koa-api/commit/9dc3db2646fd7130e629d6ee936f212a088cdbfc))

# 1.0.0 (2022-03-30)


### Bug Fixes

* **build:** allow public release of scoped package ([409cad2](https://versions.soliantconsulting.com/swr/create-koa-api/commit/409cad24246e8d3f0a311bda75328839b74e11ae))
* **build:** disable husky during release ([e7d70ec](https://versions.soliantconsulting.com/swr/create-koa-api/commit/e7d70ec150567e791104d05392d8eaf64bd50a2d))
* **build:** install missing changelog module ([003a021](https://versions.soliantconsulting.com/swr/create-koa-api/commit/003a02159ba4afbaad98c1a2abbfae0261725ee0))
* **build:** install missing git module ([8e1fb12](https://versions.soliantconsulting.com/swr/create-koa-api/commit/8e1fb122fe80ebe476ef373c3e9f0f051c12d9cb))
* **build:** run semantic-release in no-ci mode ([ef3da0b](https://versions.soliantconsulting.com/swr/create-koa-api/commit/ef3da0b6dfddfe4ac1b270f080abf79f24dd6e95))
* **build:** use correct repository ([f87b6b9](https://versions.soliantconsulting.com/swr/create-koa-api/commit/f87b6b95f2468ea5af9ccc6b88eeb30275799433))


### Features

* initial commit ([06aacd0](https://versions.soliantconsulting.com/swr/create-koa-api/commit/06aacd04a4afd94fcf5b6e4c377622fc5fe06299))
