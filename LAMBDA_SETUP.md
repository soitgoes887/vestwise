# Configuring Lambda URLs for Save/Load Functionality

The save/load feature requires Lambda Function URLs to be configured. Here's how to set them up:

## Quick Method (Automatic)

Run the configuration script:
```bash
./configure-lambda-urls.sh
```

This will attempt to automatically retrieve the Lambda URLs from your Pulumi stack and create the `.env.local` file.

## Manual Method

### Step 1: Get Lambda URLs

**Option A: Using Pulumi**
```bash
cd infrastructure
pulumi stack output --json
```

Look for `saveUrl` and `loadUrl` in the output.

**Option B: From AWS Console**
1. Go to AWS Lambda Console
2. Find functions: `save-config` and `load-config`
3. Go to Configuration → Function URL
4. Copy the Function URLs

### Step 2: Create .env.local File

Create a file named `.env.local` in the project root with:
```env
REACT_APP_SAVE_CONFIG_URL=https://xxxxx.lambda-url.region.on.aws/
REACT_APP_LOAD_CONFIG_URL=https://yyyyy.lambda-url.region.on.aws/
```

Replace the URLs with your actual Lambda Function URLs.

### Step 3: Rebuild and Deploy

```bash
npm run build
npm run deploy
```

## Deploying Lambda Updates

If you've updated the Lambda functions (e.g., to fix CORS issues), redeploy:
```bash
cd infrastructure
pulumi up
```

## Troubleshooting

### Error: "HTTP error! status: 404"
- Lambda URLs are not configured
- Follow the steps above to configure them

### Error: "HTTP error! status: 405"
- Lambda CORS configuration needs updating
- Redeploy infrastructure: `cd infrastructure && pulumi up`

### Error: "Unexpected token '<', "<!DOCTYPE"..."
- Lambda URLs point to wrong endpoint
- Verify URLs in `.env.local` match Pulumi output
- Rebuild after updating: `npm run build`

## Security Note

The `.env.local` file is git-ignored and won't be committed. The Lambda URLs are public but protected by rate limiting and CORS policies.
