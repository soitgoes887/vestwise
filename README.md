# Vestwise - RSU & ESPP Calculator

A comprehensive calculator for UK tax residents with US company stock compensation (RSUs and ESPP). Includes save/load configuration functionality backed by AWS Lambda and S3.

## Project Structure

```
vestwise/
├── src/                    # React frontend
├── infrastructure/         # Pulumi AWS infrastructure
│   ├── index.ts           # Infrastructure definition
│   └── lambda/            # Lambda function code
├── .env                   # Environment variables (Lambda URLs)
└── package.json
```

## Quick Start

### Prerequisites

- Node.js 16+
- AWS CLI configured (`aws configure`)
- Pulumi CLI installed

### 1. Install Dependencies

```bash
# Frontend dependencies
npm install

# Infrastructure dependencies
cd infrastructure
npm install
cd ..
```

### 2. Deploy Infrastructure

```bash
cd infrastructure

# Login to S3 backend (or use --local for local state)
pulumi login s3://vestwise-pulumi-state

# Deploy infrastructure
pulumi up

# View outputs
pulumi stack output
```

Expected outputs:
```
Outputs:
    bucketName           : "vestwise-configs-abc123"
    loadUrl              : "https://xxxxx.lambda-url.eu-west-2.on.aws/"
    saveUrl              : "https://yyyyy.lambda-url.eu-west-2.on.aws/"
    billingAlertTopicArn : "arn:aws:sns:eu-west-2:..."
```

### 3. Configure Environment Variables

Update `.env` with your Lambda URLs from the outputs:

```bash
REACT_APP_SAVE_CONFIG_URL=https://xxxxx.lambda-url.eu-west-2.on.aws/
REACT_APP_LOAD_CONFIG_URL=https://yyyyy.lambda-url.eu-west-2.on.aws/
```

### 4. Start Frontend

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000)

## Common Commands

### Frontend Development

```bash
# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

### Infrastructure Management

```bash
cd infrastructure

# Login to S3 backend
pulumi login s3://vestwise-pulumi-state

# Login to local backend
pulumi login --local

# Deploy/update infrastructure
pulumi up

# Preview changes without deploying
pulumi preview

# View current stack info
pulumi stack

# Get outputs (Lambda URLs, bucket name)
pulumi stack output

# Get specific output
pulumi stack output saveUrl

# Destroy all infrastructure
pulumi destroy

# Export stack state (backup)
pulumi stack export --file backup.json

# Import stack state (restore)
pulumi stack import --file backup.json

# View stack history
pulumi stack history

# Cancel an in-progress update
pulumi cancel
```

## Migrating Pulumi State from Local to S3

If you started with local state and want to migrate to S3:

### Step 1: Create S3 Bucket for State

```bash
# Create bucket
aws s3api create-bucket \
  --bucket vestwise-pulumi-state \
  --region eu-west-2 \
  --create-bucket-configuration LocationConstraint=eu-west-2

# Block all public access (important!)
aws s3api put-public-access-block \
  --bucket vestwise-pulumi-state \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Enable versioning (important!)
aws s3api put-bucket-versioning \
  --bucket vestwise-pulumi-state \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket vestwise-pulumi-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Add bucket policy to restrict access to your AWS account only
aws s3api put-bucket-policy \
  --bucket vestwise-pulumi-state \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::vestwise-pulumi-state/*",
        "arn:aws:s3:::vestwise-pulumi-state"
      ],
      "Condition": {
        "StringNotEquals": {
          "aws:PrincipalAccount": "'$(aws sts get-caller-identity --query Account --output text)'"
        }
      }
    }]
  }'

# Optional: Enable access logging
aws s3api put-bucket-logging \
  --bucket vestwise-pulumi-state \
  --bucket-logging-status '{
    "LoggingEnabled": {
      "TargetBucket": "vestwise-pulumi-state",
      "TargetPrefix": "access-logs/"
    }
  }'
```

### Step 2: Migrate State

```bash
cd infrastructure

# Export from local state
pulumi login --local
pulumi stack export --file state.json

# Switch to S3
pulumi login s3://vestwise-pulumi-state

# Create stack on S3
pulumi stack init vestwise-dev

# Import state
pulumi stack import --file state.json

# Verify
pulumi stack

# Clean up
rm state.json
```

## AWS Billing Alerts

The infrastructure includes billing alerts configured to:
- Alert at 80% of $5/month budget ($4)
- Alert at 100% of $5/month budget ($5)
- Send emails to: `hello@vestwise.co.uk`

To update the email, edit `infrastructure/index.ts` line 34 and redeploy:

```bash
cd infrastructure
pulumi up
```

Check your email for SNS subscription confirmation after first deployment.

## Infrastructure Details

### Resources Created

- **S3 Bucket**: Stores user configurations
  - Lifecycle: Auto-delete after 365 days
  - Encryption: AES256
  - Private access only

- **Lambda Functions** (2):
  - `save-config`: Saves configurations
  - `load-config`: Loads configurations
  - Runtime: Node.js 20
  - Concurrency limit: 10 (rate limiting)

- **Lambda Function URLs**: Direct HTTPS endpoints (no API Gateway)
  - CORS enabled for browser access

- **SNS Topic**: Billing alert notifications

- **AWS Budget**: $5/month cost monitoring

### Security Features

- Memorable UUIDs: `adjective-noun-number` format
  - 64 adjectives × 64 nouns × 100,000 numbers = ~400M combinations
- S3 private bucket (Lambda-only access)
- HTTPS encryption in transit
- Server-side encryption at rest
- Rate limiting (10 concurrent Lambda executions)

## Configuration Save/Load

Users can save their RSU grants, ESPP config, and parameters to AWS S3:

1. Click "Save or Load Config" in the calculator
2. Click "Save Configuration" to generate a memorable ID (e.g., `cosmic-dragon-54321`)
3. Remember the ID to load configuration later
4. Enter the ID and click "Load Configuration" on any device

Configs are stored for 1 year before automatic deletion.

## Cost Estimate

### AWS Free Tier
- S3: 5GB storage, 20k GET, 2k PUT/month = **FREE**
- Lambda: 1M requests, 400k GB-seconds = **FREE**
- Lambda URLs: Included with Lambda = **FREE**

### After Free Tier
- Typical usage: **$0.10-0.50/month**
- Billing alerts prevent surprises

## Troubleshooting

### CORS Errors
If you see CORS errors in the browser:
1. Check Lambda functions don't have duplicate CORS headers
2. Redeploy: `cd infrastructure && pulumi up`

### Environment Variables Not Loading
After updating `.env`:
1. Restart dev server: `npm start`
2. Clear browser cache

### Pulumi State Issues
If you lose stack state:
1. Check S3 bucket: `aws s3 ls s3://vestwise-pulumi-state/`
2. Or reimport resources: `pulumi up` (it will detect existing resources)

### Lambda Function Updates
Lambda code is in `infrastructure/lambda/`. After changes:
```bash
cd infrastructure
pulumi up
```

## Learn More

- [Pulumi AWS Documentation](https://www.pulumi.com/docs/clouds/aws/)
- [React Documentation](https://reactjs.org/)
- [AWS Lambda Function URLs](https://docs.aws.amazon.com/lambda/latest/dg/lambda-urls.html)
