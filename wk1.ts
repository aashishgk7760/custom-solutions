class MyAspect implements IAspect {
    public visit(node: IConstruct): void {
        // console.log('processing ' + node);
        if (node.node.id === 'CodePipelineActionRole') {
            const roleArn = (node as iam.Role).roleArn;
            const stack = Stack.of(node);
            const importedKey = kms.Alias.fromAliasName(stack, "MyCdkPipelineKey", "alias/cdk-pipeline-key");
            new iam.Policy(stack, 'CustomPolicy', {
                roles: [ iam.Role.fromRoleArn(stack, 'role', roleArn )],
                statements: [
                    new iam.PolicyStatement({
                        actions: ['kms:GenerateDataKey'],
                        resources: [importedKey.keyArn],
                    })
                ]
            })
        }
    }
}

const stack = new MyDummyPipeline(app, 'dummy-pipeline', { env });
Aspects.of(stack).add(new MyAspect());
