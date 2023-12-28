import boto3
import logging
import datetime  # Importing the datetime module
# Initialize CloudFormation client
cloudformation = boto3.client('cloudformation')
def handler(event, context):
    stack_name = event['params']['stackName']
    logging.info(stack_name)
    params = {
        'StackName': stack_name
    }
    try:
        data = cloudformation.describe_stacks(**params)
        # Convert the datetime object to its string representation
        last_updated_time = data['Stacks'][0].get('LastUpdatedTime', 'N/A')
        if isinstance(last_updated_time, datetime.datetime):
            last_updated_time = last_updated_time.isoformat()
        logging.info(last_updated_time)
        return {
            'requestId': event['requestId'],
            'status': 'success',
            'fragment': {'LastUpdatedTime': last_updated_time}
        }
    except Exception as error:
        logging.error(f"Error: {error}")
        return {
            'requestId': event['requestId'],
            'status': 'failed',
            'fragment': {'LastUpdatedTime': ''}
        }
# For logging
logging.basicConfig(level=logging.INFO)
