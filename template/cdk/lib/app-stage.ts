import type {StageProps} from 'aws-cdk-lib';
import {Stage} from 'aws-cdk-lib';
import type {Construct} from 'constructs';
import {ServiceStack} from './service-stack';

type AppStageProps = StageProps & {
    certificateArn : string;
    ssmPrefix : string;
};

export class AppStage extends Stage {
    public constructor(scope : Construct, id : string, props : AppStageProps) {
        super(scope, id, props);

        new ServiceStack(this, 'service', {
            certificateArn: props.certificateArn,
            ssmPrefix: props.ssmPrefix,
        });
    }
}
