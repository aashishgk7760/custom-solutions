import boto3
import os
ecs_client = boto3.client('ecs')
elbv2_client = boto3.client('elbv2')
def lambda_handler(event, context):
    try:
        if event['RequestType'] == 'Create' or event['RequestType'] == 'Update':
            response = register_targets(event['ResourceProperties']['ServiceArn'])
        elif event['RequestType'] == 'Delete':
            response = deregister_targets(event['ResourceProperties']['ServiceArn'])
        else:
            return {'Status': 'FAILED', 'Data': 'Unknown RequestType'}
        
    except Exception as e:
        print(f'Error: {str(e)}')
def register_targets(service_arn):
    cluster_arn, service_name = service_arn.split('/')[-2:]
    target_group_arn = os.environ['TARGET_GROUP_ARN']
    # List the tasks in the specified service
    tasks = ecs_client.list_tasks(
        cluster=cluster_arn,
        serviceName=service_name
    ).get('taskArns')
    if not tasks:
        raise Exception('No tasks found for the ECS service')
    # Describe the tasks to get network interface details
    described_tasks = ecs_client.describe_tasks(
        cluster=cluster_arn,
        tasks=tasks
    ).get('tasks')
    # Extract the private IP for each task
    target_ips = []
    for task in described_tasks:
        for attachment in task['attachments']:
            for detail in attachment['details']:
                if detail['name'] == 'privateIPv4Address':
                    target_ips.append({'Id': detail['value']})
    # Register the targets with the NLB target group
    elbv2_client.register_targets(
        TargetGroupArn=target_group_arn,
        Targets=target_ips
    )
    print(f'Registered targets: {target_ips}')
    return {'Status': 'SUCCESS', 'Data': 'Registered targets'}
def deregister_targets(service_arn):
    cluster_arn, service_name = service_arn.split('/')[-2:]
    target_group_arn = os.environ['TARGET_GROUP_ARN']
    # List the tasks in the specified service
    tasks = ecs_client.list_tasks(
        cluster=cluster_arn,
        serviceName=service_name
    ).get('taskArns')
    if not tasks:
        return {'Status': 'SUCCESS', 'Data': 'No tasks to deregister'}
    # Describe the tasks to get network interface details
    described_tasks = ecs_client.describe_tasks(
        cluster=cluster_arn,
        tasks=tasks
    ).get('tasks')
    # Extract the private IP for each task
    target_ips = []
    for task in described_tasks:
        for attachment in task['attachments']:
            for detail in attachment['details']:
                if detail['name'] == 'privateIPv4Address':
                    target_ips.append({'Id': detail['value']})
    # Deregister the targets from the NLB target group
    elbv2_client.deregister_targets(
        TargetGroupArn=target_group_arn,
        Targets=target_ips
    )
    print(f'Deregistered targets: {target_ips}')
    return {'Status': 'SUCCESS', 'Data': 'Deregistered targets'}
