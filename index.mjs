import AWS from 'aws-sdk';

// Set up bucket credentials
const s3 = new AWS.S3();
const bucketName = process.env.BUCKET_NAME;

export const handler = async (event) => {
    try {
        // Exit if no object_name query parameter is provided
        if (!event.queryStringParameters || !event.queryStringParameters.object_name) {
            throw new Error("Missing required query parameter 'object_name'");
        }

        // Get the name of the object to be uploaded
        const objectName = event.queryStringParameters.object_name;

        // Set configuration for the upload URL
        const params = {
            Bucket: bucketName,
            Key: objectName,
            Expires: 3600
        };

        // Generate and return the presigned upload URL
        const uploadURL = await s3.getSignedUrlPromise('putObject', params);
        return {
            statusCode: 200,
            body: JSON.stringify({ upload_url: uploadURL })
        };
    } catch (error) {

        // Return error response if an error occurs
        return {
            statusCode: 400,
            body: JSON.stringify({ error: error.message })
        };
    }
};
