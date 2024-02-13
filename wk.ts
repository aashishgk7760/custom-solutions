//find all stack children
    const stackChildren = this.node.findAll();

    //iterate through stack children
    stackChildren.forEach((con) => {

      // cast child to CfnLambda function
      let current = con.node.defaultChild as lambda.CfnFunction

        // if child matches 'AWS::Lambda::Function'
        if (current?.cfnResourceType == "AWS::Lambda::Function") {

          // override the runtime property
          current.addPropertyOverride("Runtime", "nodejs18.x");
        }
    });
