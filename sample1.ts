
      const q = api.node.findAll()

      q.forEach((con) => {

        // cast child to CfnLambda function
        let current = con.node.defaultChild as apigateway.CfnStage
  
          // if child matches 'AWS::Lambda::Function'
          if (current?.cfnResourceType == "AWS::ApiGateway::Stage") {
  
            // override the runtime property
            current.addPropertyOverride("AccessLogSetting" ,{
              DestinationArn: logGroup.logGroupArn,
              Format: "$context.identity.sourceIp - - [$context.requestTime] \"$context.httpMethod $context.resourcePath $context.protocol\" $context.status $context.responseLength $context.requestId"
            });
          }
      });
