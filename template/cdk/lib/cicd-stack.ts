import type {StackProps} from 'aws-cdk-lib';
import {Stack} from 'aws-cdk-lib';
import {S3Trigger} from 'aws-cdk-lib/aws-codepipeline-actions';
import {Bucket} from 'aws-cdk-lib/aws-s3';
import {Secret} from 'aws-cdk-lib/aws-secretsmanager';
import {
    CodePipeline,
    CodePipelineSource,
    DockerCredential,
    DockerCredentialUsage,
    ManualApprovalStep,
    ShellStep,
} from 'aws-cdk-lib/pipelines';
import type {Construct} from 'constructs';
import {AppStage} from './app-stage';

export class CiCdStack extends Stack {
    public constructor(scope : Construct, id : string, props ?: StackProps) {
        super(scope, id, props);

        /**
         * @todo Install `bitbucket-code-pipeline-integration` and fill in the placeholder values here.
         * @see https://github.com/DASPRiD/bitbucket-code-pipeline-integration
         */
        const sourceBucket = Bucket.fromBucketName(
            this,
            'SourceBucket',
            '{{ source-bucket-name }}',
        );
        const sourceObjectKey = '{{ source-bucket-key }}';

        /**
         * @todo Create a DockerHub secret in the secrets manager with the properties "username" and "secret".
         */
        const dockerHubSecret = Secret.fromSecretCompleteArn(
            this,
            'DHSecret',
            '{{ docker-hub-secret-arn }}'
        );

        const pipeline = new CodePipeline(this, 'Pipeline', {
            dockerCredentials: [
                DockerCredential.dockerHub(dockerHubSecret, {usages: [DockerCredentialUsage.ASSET_PUBLISHING]}),
            ],
            synth: new ShellStep('Synth', {
                input: CodePipelineSource.s3(sourceBucket, sourceObjectKey, {trigger: S3Trigger.EVENTS}),
                commands: [
                    'cd cdk',
                    'npm ci',
                    'npm run build',
                    'npx cdk synth',
                ],
                primaryOutputDirectory: 'cdk/cdk.out',
            }),
            dockerEnabledForSynth: true,
        });

        /**
         * @todo Create certificates for both UAT and prod in the region you want to deploy in.
         */
        pipeline.addStage(new AppStage(this, '{{ name }}-uat', {
            env: {account: '{{ account-id }}', region: '{{ region }}'},
            certificateArn: '{{ uat-acm-certificate-arn }}',
/* block:start:ssm */            ssmPrefix: '/{{ name }}/uat',
/* block:end:ssm */        }));

        pipeline.addStage(new AppStage(this, '{{ name }}-prod', {
            env: {account: '{{ account-id }}', region: '{{ region }}'},
            certificateArn: '{{ prod-acm-certificate-arn }}',
/* block:start:ssm */            ssmPrefix: '/{{ name }}/prod',
/* block:end:ssm */        }), {
            pre: [
                new ManualApprovalStep('PromoteToProd'),
            ],
        });
    }
}
