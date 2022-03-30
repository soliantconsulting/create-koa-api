import * as path from 'path';
import type {StackProps} from 'aws-cdk-lib';
import {Duration, Stack} from 'aws-cdk-lib';
import {Certificate} from 'aws-cdk-lib/aws-certificatemanager';
import {SubnetType, Vpc} from 'aws-cdk-lib/aws-ec2';
import {DockerImageAsset} from 'aws-cdk-lib/aws-ecr-assets';
import {Cluster, ContainerImage} from 'aws-cdk-lib/aws-ecs';
import {ApplicationLoadBalancedFargateService} from 'aws-cdk-lib/aws-ecs-patterns';
import {/* block:start:ssm */Effect, PolicyStatement, /* block:end:ssm */Role, ServicePrincipal} from 'aws-cdk-lib/aws-iam';
import type {Construct} from 'constructs';

type ServiceStackProps = StackProps & {
    certificateArn : string;
/* block:start:ssm */    ssmPrefix : string;
/* block:end:ssm */};

export class ServiceStack extends Stack {
    public constructor(scope : Construct, id : string, props : ServiceStackProps) {
        super(scope, id, props);

        const vpc = new Vpc(this, 'Vpc', {
            cidr: '172.10.0.0/16',
            subnetConfiguration: [
                {
                    name: 'Public',
                    subnetType: SubnetType.PUBLIC,
                },
            ],
            maxAzs: 2,
        });

        const cluster = new Cluster(this, 'Cluster', {
            vpc,
        });

        const asset = new DockerImageAsset(this, 'App', {
            directory: path.join(__dirname, '../../'),
            exclude: ['cdk'],
        });

        const certificate = Certificate.fromCertificateArn(this, 'Certificate', props.certificateArn);

        const taskRole = new Role(this, 'TaskRole', {
            assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
        });
/* block:start:ssm */
        taskRole.addToPolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'ssm:GetParametersByPath',
            ],
            resources: [
                `arn:aws:ssm:${this.region}:${this.account}:parameter${props.ssmPrefix}`,
            ],
        }));
/* block:end:ssm */
        const albService = new ApplicationLoadBalancedFargateService(this, 'Service', {
            cluster,
            cpu: 512,
            memoryLimitMiB: 1024,
            taskImageOptions: {
                containerName: 'app',
                containerPort: 80,
                image: ContainerImage.fromDockerImageAsset(asset),
                environment: {
                    PORT: '80',
/* block:start:ssm */                    SSM_PREFIX: props.ssmPrefix,
/* block:end:ssm */                },
                taskRole,
            },
            certificate: certificate,
            assignPublicIp: true,
            publicLoadBalancer: true,
            healthCheckGracePeriod: Duration.seconds(10),
        });

        const serviceScaling = albService.service.autoScaleTaskCount({maxCapacity: 10});
        serviceScaling.scaleOnCpuUtilization('ScalingCpu', {
            targetUtilizationPercent: 60,
        });

        albService.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '30');

        albService.targetGroup.configureHealthCheck({
            enabled: true,
            path: '/health',
        });
    }
}
