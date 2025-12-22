const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const s3 = new S3Client({});

exports.handler = async (event) => {
    // CORS headers for all responses
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
        const uuid = event.queryStringParameters?.uuid;

        if (!uuid) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing uuid' })
            };
        }

        const command = new GetObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: `configs/${uuid}.json`
        });

        const data = await s3.send(command);
        const body = await data.Body.transformToString();

        return {
            statusCode: 200,
            headers,
            body: body
        };
    } catch (error) {
        if (error.name === 'NoSuchKey') {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Config not found' })
            };
        }

        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};