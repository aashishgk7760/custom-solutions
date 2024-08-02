import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds'
 import * as cr from 'aws-cdk-lib/custom-resources';
import { CustomResource } from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs'
import { Bucket, BucketEncryption, BlockPublicAccess,  BucketPolicy, } from 'aws-cdk-lib/aws-s3';
import * as cr from 'aws-cdk-lib/aws-cloudformation';
import * as cur from 'aws-cdk-lib/aws-cur'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as eks from 'aws-cdk-lib/aws-eks'
import * as pricing from 'aws-cdk-lib/aws-pr ;


export class VpcPspoCDK extends cdk.Stack{
    public readonly vpc: ec2.Vpc;
    readonly cluster: rds.DatabaseCluster
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const cluster = new eks.Cluster(this, 'hello-eks', {
          version: eks.KubernetesVersion.V1_25,
       
        });
        cluster

        const bucket = new Bucket(this, 'MyBucket', {
          encryption: BucketEncryption.S3_MANAGED,
          blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
          removalPolicy: cdk.RemovalPolicy.DESTROY,  Delete the bucket when this stack is deleted
        });

        const policy1 = new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['s3:GetBucketAcl', 's3:GetBucketPolicy'],
          principals: [new iam.ServicePrincipal('billingreports.amazonaws.com')],
          resources: [bucket.bucketArn],
        });
        bucket.addToResourcePolicy(policy1);
        const policy2 = new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['s3:PutObject'],
          principals: [new iam.ServicePrincipal('billingreports.amazonaws.com')],
          resources: [bucket.arnForObjects('*')],
        });
        bucket.addToResourcePolicy(policy2);


      
  
        const cfnReportDefinition = new cur.CfnReportDefinition(this, 'MyCfnReportDefinition', {
          compression: 'GZIP',
          format: 'textORcsv',
          refreshClosedReports: false,
          reportName: 'Cloudability',
          reportVersioning: 'CREATE_NEW_REPORT',
          s3Bucket: bucket.bucketName,
          s3Prefix: 'test',
          s3Region: 'us-east-1',
          timeUnit: 'HOURLY',
          additionalSchemaElements: ['RESOURCES'],
        });

        cfnReportDefinition.node.addDependency(bucket)





       

         cfnReportDefinition.node.addDependency(bucketPolicy)

     
         const vpc = new ec2.Vpc(this, 'vpc', {
           maxAzs: 3,
         })
  
         const cluster = new ecs.Cluster(this, 'cluster', {
           vpc: vpc,
         })
  
         const taskDef = new ecs.FargateTaskDefinition(this,'sdnasdnasd');
  
         const cont = taskDef.addContainer('nginx', {
           image: ecs.ContainerImage.fromRegistry('nginx:latest'),
           memoryLimitMiB: 512,
         });
  
         cont.addPortMappings({
           containerPort: 80,
        
         });
         const service = new ecs.FargateService(this, 'service', {
           cluster: cluster,
           desiredCount: 1,
           taskDefinition: taskDef,
           assignPublicIp: true,
           vpcSubnets: {
             subnetType: ec2.SubnetType.PUBLIC
           }
         });





         this.vpc = new ec2.Vpc(this, 'vpc', {
             cidr: '10.0.0.0/16',
             maxAzs: 2,
         })

         const vpc = new ec2.Vpc(this, 'TheVPC', {
             ipAddresses: ec2.IpAddresses.cidr('10.0.120.0/16'),
           })
          
           const reader1 = rds.ClusterInstance.serverlessV2('reader1', { scaleWithWriter: true })
           const reader2 = rds.ClusterInstance.serverlessV2('reader2')
           const writer = rds.ClusterInstance.provisioned('writer', {
             instanceType: ec2.InstanceType.of(ec2.InstanceClass.R6G, ec2.InstanceSize.XLARGE4),
           })
           this.cluster = new rds.DatabaseCluster(this, 'Database', {
           engine: rds.DatabaseClusterEngine.auroraMysql({ version: rds.AuroraMysqlEngineVersion.VER_3_06_0 }),
           writer: writer,
           serverlessV2MinCapacity: 6.5,
           serverlessV2MaxCapacity: 64,
           readers: [
              will be put in promotion tier 1 and will scale with the writer
             reader1,
              will be put in promotion tier 2 and will not scale with the writer
             reader2
           ],
           vpc,
           removalPolicy: cdk.RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE
         });
      
         const removalpolicymap = {
           'AWS::RDS::DBInstance': cdk.RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
           'AWS::RDS::DBCluster': cdk.RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
           'AWS::SecretsManager::Secret': cdk.RemovalPolicy.DESTROY
         }

        
    }
     private customizeremovalPOlicy(resourcetypeRemovalPolicy: {[key:string]: cdk.RemovalPolicy}){
       

         this.node.findAll().forEach(node => {
             if(node instanceof cdk.CfnResource){
                const ResourceType = node.cfnResourceType
                const RemovalPolicy = resourcetypeRemovalPolicy[ResourceType];
                if(RemovalPolicy){
                 node.applyRemovalPolicy(RemovalPolicy)
                }
             }
         }
     )}

}
