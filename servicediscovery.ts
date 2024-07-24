import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as ser from 'aws-cdk-lib/aws-servicediscovery'


export class ServiceDisCoveryStack extends cdk.Stack{

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
            vpcId: ''
        });

        const namespace = new ser.PrivateDnsNamespace(this, 'MyNamespace', {
            name: 'namespace',
            vpc: vpc,
          });
          const cluster = new ecs.Cluster(this, 'Cluster', {
            vpc: vpc,
            clusterName: 'ServiceCluster',
          });
      
          const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
            memoryLimitMiB: 512,
            cpu: 256,
            runtimePlatform: {
              operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
              cpuArchitecture: ecs.CpuArchitecture.X86_64
            },
            taskRole: new cdk.aws_iam.Role(this, 'o-test-integ-test-ecs-task-role', {
              assumedBy: new cdk.aws_iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
              managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')
              ]
            }),
          });
      
          taskDefinition.addContainer('AppContainer', {
            image: ecs.ContainerImage.fromRegistry('nginx:latest'),
            memoryLimitMiB: 512,
            cpu: 256,
            logging: ecs.LogDriver.awsLogs({ streamPrefix: 'o-test-integ-test-ecs' }),
            portMappings: [
              { containerPort: 80, protocol: ecs.Protocol.TCP, name: 'app_svc_a' },
            ]
          });
          const taskDefinitionB= new ecs.FargateTaskDefinition(this, 'TaskDefinitionB', {
            memoryLimitMiB: 512,
            cpu: 256,
            runtimePlatform: {
              operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
              cpuArchitecture: ecs.CpuArchitecture.X86_64
            },
            taskRole: new cdk.aws_iam.Role(this, 'o-test-integ-test-ecs-task-rolse', {
              assumedBy: new cdk.aws_iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
              managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')
              ]
            }),
          });
      
          taskDefinitionB.addContainer('AppContainers', {
            image: ecs.ContainerImage.fromRegistry('nginx:latest'),
            memoryLimitMiB: 512,
            cpu: 256,
            logging: ecs.LogDriver.awsLogs({ streamPrefix: 'o-test-integ-test-ecs' }),
            portMappings: [
              { containerPort: 80, protocol: ecs.Protocol.TCP, name: 'app_svc_b' },
            ]
          });
      
          const sg = new ec2.SecurityGroup(this, 'SG', { vpc: vpc });
          sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
          sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.icmpPing());
      
          const serviceA = new ecs.FargateService(this, 'ECSServiceA', {
            cluster: cluster,
            serviceName: 'serviceA',
            taskDefinition: taskDefinition,
            securityGroups: [sg],
            vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
            assignPublicIp: true,
            desiredCount: 1,
            enableExecuteCommand: true,
            serviceConnectConfiguration: {
              logDriver: ecs.LogDrivers.awsLogs({ streamPrefix: 'ecs-svc-a' }),
              services: [{
                portMappingName: 'app_svc_a',
                dnsName: 'service-a',
                port: 80,
              }],
              namespace: namespace.namespaceName
            }
          });
      
          const serviceB = new ecs.FargateService(this, 'ECSServiceB', {
            cluster: cluster,
            serviceName: 'serviceB',
            taskDefinition: taskDefinitionB,
            securityGroups: [sg],
            enableExecuteCommand: true,
            vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
            assignPublicIp: true,
            desiredCount: 1,
            serviceConnectConfiguration: {
              logDriver: ecs.LogDrivers.awsLogs({ streamPrefix: 'ecs-svc-b' }),
              services: [{
                portMappingName: 'app_svc_b',
                dnsName: 'service-b',
                port: 80,
              }],
              namespace: namespace.namespaceName
            }
          });
    }
  
} 
