import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Get AWS account ID for budget alerts
const accountId = pulumi.output(aws.getCallerIdentity({})).accountId;

// S3 bucket for config storage (free tier: 5GB storage, 20k GET, 2k PUT/month)
const configBucket = new aws.s3.Bucket("vestwise-configs", {
    acl: "private",
    tags: {
        site: "vestwise",
    },
    serverSideEncryptionConfiguration: {
        rule: {
            applyServerSideEncryptionByDefault: {
                sseAlgorithm: "AES256",
            },
        },
    },
    lifecycleRules: [{
        enabled: true,
        expiration: {
            days: 365, // Auto-delete old configs after 1 year
        },
    }],
});

// SNS topic for billing alerts
const billingAlertTopic = new aws.sns.Topic("vestwise-billing-alerts", {
    displayName: "Vestwise Billing Alerts",
    tags: {
        site: "vestwise",
    },
});

// SNS topic subscription (replace with your email)
const billingAlertSubscription = new aws.sns.TopicSubscription("vestwise-billing-alert-email", {
    topic: billingAlertTopic.arn,
    protocol: "email",
    endpoint: "hello@vestwise.co.uk",
});

// Budget alert for AWS costs
const monthlyBudget = new aws.budgets.Budget("vestwise-monthly-budget", {
    budgetType: "COST",
    limitAmount: "5.00", // Alert if monthly costs exceed $5
    limitUnit: "USD",
    timeUnit: "MONTHLY",
    notifications: [{
        comparisonOperator: "GREATER_THAN",
        threshold: 80, // Alert at 80% of budget ($4)
        thresholdType: "PERCENTAGE",
        notificationType: "ACTUAL",
        subscriberSnsTopicArns: [billingAlertTopic.arn],
    }, {
        comparisonOperator: "GREATER_THAN",
        threshold: 100, // Alert at 100% of budget ($5)
        thresholdType: "PERCENTAGE",
        notificationType: "ACTUAL",
        subscriberSnsTopicArns: [billingAlertTopic.arn],
    }],
});

// IAM role for Lambda
const lambdaRole = new aws.iam.Role("vestwise-lambda-role", {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Action: "sts:AssumeRole",
            Principal: { Service: "lambda.amazonaws.com" },
            Effect: "Allow",
        }],
    }),
    tags: {
        site: "vestwise",
    },
});

// Attach basic execution policy
new aws.iam.RolePolicyAttachment("lambda-basic", {
    role: lambdaRole,
    policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
});

// S3 access policy
new aws.iam.RolePolicy("lambda-s3-policy", {
    role: lambdaRole,
    policy: pulumi.all([configBucket.arn]).apply(([bucketArn]) => JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Effect: "Allow",
            Action: ["s3:GetObject", "s3:PutObject"],
            Resource: `${bucketArn}/*`,
        }],
    })),
});

// Save config Lambda
const saveConfigLambda = new aws.lambda.Function("save-config", {
    runtime: "nodejs20.x",
    role: lambdaRole.arn,
    handler: "index.handler",
    code: new pulumi.asset.AssetArchive({
        "index.js": new pulumi.asset.FileAsset("./lambda/save.js"),
    }),
    environment: {
        variables: {
            BUCKET_NAME: configBucket.bucket,
        },
    },
    reservedConcurrentExecutions: 10, // Limit to prevent abuse
    tags: {
        site: "vestwise",
    },
});

// Load config Lambda
const loadConfigLambda = new aws.lambda.Function("load-config", {
    runtime: "nodejs20.x",
    role: lambdaRole.arn,
    handler: "index.handler",
    code: new pulumi.asset.AssetArchive({
        "index.js": new pulumi.asset.FileAsset("./lambda/load.js"),
    }),
    environment: {
        variables: {
            BUCKET_NAME: configBucket.bucket,
        },
    },
    reservedConcurrentExecutions: 10, // Limit to prevent abuse
    tags: {
        site: "vestwise",
    },
});

// Lambda Function URLs (free, no API Gateway needed)
const saveFunctionUrl = new aws.lambda.FunctionUrl("save-url", {
    functionName: saveConfigLambda.name,
    authorizationType: "NONE",
    cors: {
        allowOrigins: ["*"],
        allowMethods: ["POST"],
        allowHeaders: ["content-type"],
        maxAge: 86400, // Cache preflight for 24 hours
    },
});

const loadFunctionUrl = new aws.lambda.FunctionUrl("load-url", {
    functionName: loadConfigLambda.name,
    authorizationType: "NONE",
    cors: {
        allowOrigins: ["*"],
        allowMethods: ["GET"],
        allowHeaders: ["content-type"],
        maxAge: 86400, // Cache preflight for 24 hours
    },
});

// Outputs
export const bucketName = configBucket.bucket;
export const saveUrl = saveFunctionUrl.functionUrl;
export const loadUrl = loadFunctionUrl.functionUrl;
export const billingAlertTopicArn = billingAlertTopic.arn;