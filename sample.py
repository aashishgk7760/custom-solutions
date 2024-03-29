from aws_cdk import (
    # Duration,
    Stack,

    aws_iam as iam,
    aws_lambda as _lambda,
    aws_lambda_event_sources as _event_sources,
    aws_stepfunctions as _stepfunctions,
    aws_stepfunctions_tasks as _tasks,
    aws_kinesisfirehose as firehose,
aws_apigateway as apigateway,
    aws_logs as logs,
    aws_ssm as ssm,
    aws_kinesisfirehose as firehose


    # aws_sqs as sqs,
)


from constructs import Construct
import os

import aws_cdk as cdk
class CdkPythonCxscenarioStack(Stack):

    def __init__(self, scope: Construct,construct_id: str, **kwargs,) -> None:
        super().__init__(scope, construct_id, **kwargs)

        delivery_stream_arn = ssm.StringParameter.value_from_lookup(self, 'test1')
        Format = ssm.StringParameter.value_from_lookup(self, 'test2')

        rest_api = apigateway.RestApi(self, "SampleRestApi")

        for child_node in self.node.find_all():
    
    # Try to find the AWS::ApiGateway::Stage resource
            if isinstance(child_node, apigateway.CfnStage):
                stage = child_node

        # If the child is an AWS::ApiGateway::Stage resource
                if stage:
                    
            # Override the AccessLogSetting property
                    stage.add_property_override(
                "AccessLogSetting",
                {
                    "DestinationArn": delivery_stream_arn,
                    "Format": Format
                }
            )

# Create a Root Resource
        root_resource = rest_api.root.add_resource("root")

# Add a GET method to the Root Resource
        method = root_resource.add_method(
    "GET",
    apigateway.MockIntegration(
        integration_responses=[
            apigateway.IntegrationResponse(
                status_code="200",
                response_parameters={
                    "method.response.header.Access-Control-Allow-Origin": "'*'"
                }
            )
        ],
        passthrough_behavior=apigateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
        request_templates={"application/json": '{"statusCode": 200}'}
    ),
    method_responses=[
        apigateway.MethodResponse(
            status_code="200",
            response_parameters={
                "method.response.header.Access-Control-Allow-Origin": True
            }
        )
    ]
)
    
        


