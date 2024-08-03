import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { KubectlV30Layer } from '@aws-cdk/lambda-layer-kubectl-v30';
import { App, CfnOutput, Duration } from 'aws-cdk-lib';
import { Karpenter, AMIFamily, ArchType, CapacityType } from "cdk-karpenter";
import { InstanceClass, InstanceSize, InstanceType} from 'aws-cdk-lib/aws-ec2';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { IBucket } from 'aws-cdk-lib/aws-s3';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as config from '../config.json'

interface ClusterStackProps extends cdk.StackProps {  // stack objects that you'll consume is added  with interfaces
  playgroundTable: ITable,                            // such as dynamodb table and S3 bucket here
  playgroundBucket: IBucket,
}

export class CdkEksStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: ClusterStackProps) {
    super(scope, id, props);
    
    const masterRole = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.ArnPrincipal(`arn:aws:iam::${cdk.Aws.ACCOUNT_ID}:user/${config.cdk_pipeline.iam_user}`)
    });

     // Create the EKS cluster role
     const clusterRole = new iam.Role(this, 'EksClusterRole', {
      assumedBy: new iam.ServicePrincipal('eks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSClusterPolicy'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSVPCResourceController'),
      ],
    });
   
    const noderole = new iam.Role(this, 'EksNodeRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSWorkerNodePolicy'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKS_CNI_Policy'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    const vpc = new ec2.Vpc(this, 'VPC');

    const cluster  = new eks.Cluster(this, 'Cluster', {
      vpc: vpc,
      role: clusterRole,
      mastersRole: masterRole,
      kubectlLayer: new KubectlV30Layer(this, 'KubectlLayer'),
      defaultCapacity: 1,
      version: eks.KubernetesVersion.V1_30,
      clusterLogging: [
        eks.ClusterLoggingTypes.API,
        eks.ClusterLoggingTypes.AUTHENTICATOR,
        eks.ClusterLoggingTypes.AUDIT,
      ],
    });
    cluster.addNodegroupCapacity('custom-node-groups', {
      nodegroupName: "custom-node-groups",
      instanceTypes: [new ec2.InstanceType('m5.large')],
      minSize: 2,
      nodeRole: noderole,
      desiredSize: 2,
      maxSize: 3,
      diskSize: 100,
      amiType: eks.NodegroupAmiType.AL2_X86_64,
      capacityType: eks.CapacityType.ON_DEMAND, 
    });

    const serviceAccountEFS = cluster.addServiceAccount('EFSSA', {
      name: 'efs-sa',
      namespace: 'kube-system',
      annotations: {
        'eks.amazonaws.com/sts-regional-endpoints': 'false',
      },
      labels: {
        'test-label': 'test-value',
      },
    });

    serviceAccountEFS.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEFSCSIDriverPolicy'));

    const cfnAddon = new eks.CfnAddon(this, 'aws-efs-csi-driver', {
      addonName: 'aws-efs-csi-driver',
      clusterName: cluster.clusterName,
      serviceAccountRoleArn: serviceAccountEFS.role.roleArn,
      tags: [{
        key: 'key1',
        value: 'value1',
      }],
    });

    const serviceAccountS3 = cluster.addServiceAccount('S3BucketSA', {
      name: 's3bucket-sa',
      namespace: 'default',
      annotations: {
        'eks.amazonaws.com/sts-regional-endpoints': 'false',
      },
      labels: {
        'test-label': 'test-value',
      },
    });

    const serviceAccountDynamoDB = cluster.addServiceAccount('DynamoDBSA', {
      name: 'dynamodb-sa',
      namespace: 'default',
      annotations: {
        'eks.amazonaws.com/sts-regional-endpoints': 'false',
      },
      labels: {
        'test-label': 'test-value',
      },
    });
    
    new CfnOutput(this, 'EFSServiceAccountIamRole', { value: serviceAccountEFS.role.roleArn });
    new CfnOutput(this, 'S3ServiceAccountIamRole', { value: serviceAccountS3.role.roleArn });
    new CfnOutput(this, 'DynamoDBServiceAccountIamRole', { value: serviceAccountDynamoDB.role.roleArn });

    props?.playgroundBucket.grantReadWrite(serviceAccountS3);
    props?.playgroundTable.grantReadWriteData(serviceAccountDynamoDB);

    // const karpenter = new Karpenter(this, 'karpenter', {
    //   cluster: cluster,
    //   vpc: vpc,
    // });

    // // custom provisoner for spot instances
    // karpenter.addProvisioner('customSpot', {
    //   requirements: {
    //     archTypes: [ArchType.AMD64],
    //     instanceTypes: [
    //       InstanceType.of(InstanceClass.M5, InstanceSize.LARGE),
    //       InstanceType.of(InstanceClass.M5A, InstanceSize.LARGE),
    //       InstanceType.of(InstanceClass.M6G, InstanceSize.LARGE),
    //     ],
    //     restrictInstanceTypes: [
    //       InstanceType.of(InstanceClass.G5, InstanceSize.LARGE),
    //     ],
    //     capacityTypes: [CapacityType.SPOT]
    //   },
    //   ttlSecondsAfterEmpty: Duration.minutes(1),
    //   ttlSecondsUntilExpired: Duration.days(90),
    //   labels: {
    //     capacityType: 'spot',
    //   },
    //   limits: {
    //     cpu: '10',
    //     mem: '1000Gi',
    //   },
    //   consolidation: false,
    //   provider: {
    //     amiFamily: AMIFamily.AL2,
    //     tags: {
    //       Foo: 'Bar',
    //     },
    //   }
    // }),

    // // custom provisoner for ondemand instances
    // karpenter.addProvisioner('customOnDemand', {
    //   requirements: {
    //     archTypes: [ArchType.AMD64],
    //     instanceTypes: [
    //       InstanceType.of(InstanceClass.M5, InstanceSize.LARGE),
    //       InstanceType.of(InstanceClass.M5A, InstanceSize.LARGE),
    //       InstanceType.of(InstanceClass.M6G, InstanceSize.LARGE),
    //     ],
    //     restrictInstanceTypes: [
    //       InstanceType.of(InstanceClass.G5, InstanceSize.LARGE),
    //     ],
    //     capacityTypes: [CapacityType.ON_DEMAND]
    //   },
    //   ttlSecondsAfterEmpty: Duration.minutes(1),
    //   ttlSecondsUntilExpired: Duration.days(90),
    //   labels: {
    //     capacityType: 'ondemand',
    //   },
    //   limits: {
    //     cpu: '5',
    //     mem: '500Gi',
    //   },
    //   consolidation: false,
    //   provider: {
    //     amiFamily: AMIFamily.AL2,
    //     tags: {
    //       Foo: 'Bar',
    //     },
    //   }
    // });

   
  }
}
