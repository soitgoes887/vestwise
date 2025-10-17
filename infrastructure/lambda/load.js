const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const s3 = new S3Client({});

exports.handler = async (event) => {
    try {
        const uuid = event.queryStringParameters?.uuid;

        if (!uuid) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json'
                },
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
            headers: {
                'Content-Type': 'application/json'
            },
            body: body
        };
    } catch (error) {
        if (error.name === 'NoSuchKey') {
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'Config not found' })
            };
        }

        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};