export class DummyStack extends Stack {
  readonly cluster: rds.DatabaseCluster;
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);


    const vpc = new ec2.Vpc(this, 'TheVPC', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.120.0/16'),
    })
    
    const reader1 = rds.ClusterInstance.serverlessV2('reader1', { scaleWithWriter: true })
    const reader2 = rds.ClusterInstance.serverlessV2('reader2')
    const writer = rds.ClusterInstance.provisioned('writer', {
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.R6G, ec2.InstanceSize.XLARGE4),
    })
    this.cluster = new rds.DatabaseCluster(this, 'Database', {
      engine: rds.DatabaseClusterEngine.auroraMysql({ version: rds.AuroraMysqlEngineVersion.VER_3_01_0 }),
      writer: writer,
      serverlessV2MinCapacity: 6.5,
      serverlessV2MaxCapacity: 64,
      readers: [
        // will be put in promotion tier 1 and will scale with the writer
        reader1,
        // will be put in promotion tier 2 and will not scale with the writer
        reader2
      ],
      vpc,
      removalPolicy: RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE
    });

    this.update_instance_removal_policy(RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE)

  }
  private update_instance_removal_policy(policy: RemovalPolicy) {
    const appliedInstanceIds = ['writer', 'reader1', 'reader2'];
    appliedInstanceIds.forEach(id => {
      const dbinstance = this.cluster.node.tryFindChild(id) as rds.DatabaseInstance
      const cfndbinstance = dbinstance.node.defaultChild as rds.CfnDBInstance;
      cfndbinstance.applyRemovalPolicy(policy);
    })
  }
} 
