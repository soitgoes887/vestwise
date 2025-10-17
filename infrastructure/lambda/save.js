const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const s3 = new S3Client({});

exports.handler = async (event) => {
    try {
        const { uuid, config } = JSON.parse(event.body);

        if (!uuid || !config) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json'
                },
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
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ success: true, uuid })
        };
    } catch (error) {
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