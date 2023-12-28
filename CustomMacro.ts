
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda_ from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';
import * as cloudformation from 'aws-cdk-lib/aws-cloudformation';


export class customMacroStack extends cdk.Stack{
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const LambdaExecutionRole1 = new iam.Role(this,'LambdaExecutionRole',{
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
          });

        LambdaExecutionRole1.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCloudFormationFullAccess'));
        LambdaExecutionRole1.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchFullAccess'));

        const lambdaMacroFunction = new lambda_.Function(this,'customLambdaMacroFunction',{
            runtime: lambda_.Runtime.PYTHON_3_9,
            handler: 'index.handler',
            code: lambda_.Code.fromAsset(path.resolve(__dirname,'custommacroFunction')),
            logRetention: logs.RetentionDays.FIVE_DAYS,
            role: LambdaExecutionRole1,
            timeout: cdk.Duration.minutes(5)

        });

        const macro = new cloudformation.CfnMacro(this,'cloudFormationMacro',{
            functionName: lambdaMacroFunction.functionName,
            name: 'CustomMacroLogic'
        });

}
}
