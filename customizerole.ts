import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';


export class CdkvscodebuggerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    const sd = new cr.AwsCustomResource(this, 'CustomResource', {
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({ resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE }),
      onCreate: {
        physicalResourceId: { id: 'CustomResourcePhysicalResourceId' },
        service: 'SQS',
        action: 'createQueue',
        parameters: { QueueName: 'MyQueue' },
      },

      
    });
    const nodes = sd.node.findAll()
    console.log(nodes)
    this.CustommizeRole()



    // The code that defines your stack goes here

    //new aws customresource



   
  }
  private CustommizeRole() {
    const found = this.node.children.filter(child => {
     return Construct.isConstruct(child) && ((child as Construct).node.defaultChild as cdk.CfnResource).cfnResourceType === 'AWS::Lambda::Function'
    })
    console.log("heello")
 
    const sourceLambdaRole = found[0].node.tryFindChild('ServiceRole') as Construct
 
    console.log("heello")
 
    const cfnisolationrole = sourceLambdaRole.node.defaultChild as iam.CfnRole;
 
    cfnisolationrole.addPropertyOverride('PermissionsBoundary','XXXXXXXXX')
 
}
}
