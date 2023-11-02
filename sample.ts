
const serviceArn = '[Your Service ARN]'
const fargateService = ecs.FargateService.fromFargateServiceArn(this, 'ExistingFargateService', serviceArn);


      
      // Define a Target Group
      const targetGroup = new elbv2.NetworkTargetGroup(this, 'MyTargetGroup', {
        vpc,
        protocol: elbv2.Protocol.TCP,
        port: 80,
        targetType: elbv2.TargetType.IP, // Fargate services use IP as the target type
      });

      const nlb = new elbv2.NetworkLoadBalancer(this, 'MyNlb', {
        vpc,
        internetFacing: true,
    
      });

      const listener = nlb.addListener('MyListener', {
        port: 80,
        protocol: elbv2.Protocol.TCP,
        defaultTargetGroups: [targetGroup],
      });
      // Lambda function that registers ECS service tasks with the target group
      const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      });
      lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));
      lambdaRole.addToPolicy(new iam.PolicyStatement({
        resources: ['*'],
        actions: [
          'ecs:DescribeServices',
          'ecs:ListTasks',
          'ecs:DescribeTasks',
          'elasticloadbalancing:RegisterTargets',
          'elasticloadbalancing:DeregisterTargets',
        ],
      }));
      const registerTargetsFunction = new lambda_.Function(this, 'RegisterTargetsFunction', {
        code:lambda_.Code.fromAsset(path.resolve(__dirname,'lambda')), // Your lambda code directory
        handler: 'index.lambda_handler', // Your handler
        runtime: lambda_.Runtime.PYTHON_3_10,
        role: lambdaRole,
        timeout: cdk.Duration.minutes(5),
        environment: {
          TARGET_GROUP_ARN: targetGroup.targetGroupArn,
          ECS_SERVICE_ARN: serviceArn,
        },
      });
      // Custom Resource to invoke Lambda function
      const provider = new cr.Provider(this, 'Provider', {
        onEventHandler: registerTargetsFunction,
        logRetention: logs.RetentionDays.FIVE_DAYS,
      });
      new CustomResource(this, 'CustomResource', {
        serviceToken: provider.serviceToken,
        properties: {
          ServiceArn: serviceArn, // Trigger the Lambda with the ARN of the ECS service
        },
      });
