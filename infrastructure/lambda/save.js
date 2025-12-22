const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const s3 = new S3Client({});

exports.handler = async (event) => {
    // CORS headers for all responses
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    // Handle OPTIONS preflight request
    if (event.requestContext?.http?.method === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        const { uuid, config } = JSON.parse(event.body);

        if (!uuid || !config) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing uuid or config' })
            };
        }

        await s3.send(new PutObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: `configs/${uuid}.json`,
            Body: JSON.stringify(config),
            ContentType: 'application/json'
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, uuid })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};