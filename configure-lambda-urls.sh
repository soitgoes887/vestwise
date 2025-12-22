#!/bin/bash
# Helper script to configure Lambda URLs for Vestwise

echo "🔍 Getting Lambda URLs from Pulumi..."
cd infrastructure

# Try to get the outputs (requires Pulumi to be configured)
if command -v pulumi &> /dev/null; then
    echo ""
    echo "📋 Lambda Function URLs:"
    echo "========================"

    SAVE_URL=$(pulumi stack output saveUrl 2>/dev/null)
    LOAD_URL=$(pulumi stack output loadUrl 2>/dev/null)

    if [ ! -z "$SAVE_URL" ] && [ ! -z "$LOAD_URL" ]; then
        echo "Save URL: $SAVE_URL"
        echo "Load URL: $LOAD_URL"
        echo ""
        echo "✏️  Creating .env.local file..."
        cd ..
        cat > .env.local << EOF
REACT_APP_SAVE_CONFIG_URL=$SAVE_URL
REACT_APP_LOAD_CONFIG_URL=$LOAD_URL
EOF
        echo "✅ Created .env.local with Lambda URLs"
        echo ""
        echo "🔧 Next steps:"
        echo "   1. Run: npm run build"
        echo "   2. Run: npm run deploy"
        echo ""
        echo "💡 Or update the infrastructure first:"
        echo "   cd infrastructure && pulumi up"
    else
        echo "❌ Could not retrieve Lambda URLs from Pulumi"
        echo ""
        echo "📝 Manual steps:"
        echo "   1. Deploy/update infrastructure: cd infrastructure && pulumi up"
        echo "   2. Get URLs: pulumi stack output --json"
        echo "   3. Copy saveUrl and loadUrl values"
        echo "   4. Create .env.local with:"
        echo "      REACT_APP_SAVE_CONFIG_URL=<saveUrl>"
        echo "      REACT_APP_LOAD_CONFIG_URL=<loadUrl>"
        echo "   5. Rebuild: npm run build"
    fi
else
    echo "❌ Pulumi is not installed or not in PATH"
    echo ""
    echo "📝 Get Lambda URLs from AWS Console:"
    echo "   1. Go to AWS Lambda console"
    echo "   2. Find 'save-config' and 'load-config' functions"
    echo "   3. Go to Configuration > Function URL"
    echo "   4. Copy the Function URLs"
    echo "   5. Create .env.local file in project root with:"
    echo "      REACT_APP_SAVE_CONFIG_URL=<your-save-url>"
    echo "      REACT_APP_LOAD_CONFIG_URL=<your-load-url>"
fi
