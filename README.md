# AWS Lambda for S3 Presigned URL

This README is a guide to generating presigned S3 URLs using a combination of AWS Lambda and Amazon API Gateway.

### Step one: Create the Lambda Function

Open a terminal wherever you normally keep your projects and run the following:

```sh 
mkdir lambda-s3-presigned-url
cd lambda-s3-presigned-url
```

You should have the directory now and have navigated there in your terminal. This project only has one real dependency which is the AWS SDK, so we need to initialise Node and install it.

```sh
npm init -y
npm install --save aws-sdk
```

When the install has finished we can start adding the function code. We're going to create the index file, then open the project in VSCode. If you're using another code editor then adjust these steps to match.

```sh
touch index.mjs
code .
```

The code for the actual Lambda function is pretty very simple and a commented version is below, but in short it takes the name of the object you want to upload and uses the AWS SDK to generate a presigned upload URL for it and returns that to the client.
```js
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
      body: JSON.stringify({
        upload_url: uploadURL
      })
    };
  } catch (error) {

    // Return error response if an error occurs
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};
```

We're not going to upload the function, but we might as well generate the function.zip file we will need later whilst we are in the directory.

```sh
zip -r function.zip index.mjs node_modules
```

### Step Two: Create the S3 Bucket

Log into the AWS console and navigate to S3. Give your bucket a name and ensure that the setting for "Block all public access" is turned **off**.

To allow our Lambda function to access this bucket we will need to create a new role with S3 access and assign that to our function. 

1. First, navigate to IAM in the AWS Console
2. Select `roles` on the left hand nav
3. Click the `create role` button
4. Select `AWS Service` and search for `Lambda` in the use case
5. On the next page search for `AmazonS3FullAccess` and make sure it is checked
6. Name the role `LambdaS3Access` and click `save role`

### Step Three: Upload the Lambda Function

The Lambda function we built in step one can be uploaded now that we have our S3 Bucket. Start by navigating to Lambda in the AWS Console.

1. Click the `create function` button
2. On the next page keep the function from scratch, give it a name, and ensure the following settings:
	* Node 20.x
	* x86_64
	* Open `Change default execution role` and select `Use an existing role`. In the box search for the IAM role you created in step two and select that. 
3. Save the function
4. On the next page click `upload from` and choose `zip file`
5. Upload the `function.zip` file we generated earlier
6. After it has uploaded go to `configuration` and select `environment variables`
7. Set a `BUCKET_NAME` variable to the name of the bucket you created in step two

### Step Four: Create the API Gateway

In the AWS console navigate to `API Gateway`. We will be creating a REST API that has a single endpoint at it's root, and that endpoint will trigger our Lambda function.

1. Click the `create api` button and select `build` next to `REST API`
2. Give your API a name, keep it on regional, and create the API
3. From the next page click `create method` and give it the following settings:
	* Method type GET
	* Integration type Lambda function
	* Click the search box for the Lambda function and select the one you created in step three
	* Open the `URL query string parameters` box and add an entry for `object_name` that isn't required or cached
4. Create your method then click `deploy api` on the next page, you may need to add a stage to deploy to (i recommend naming it dev and then switching to a new prod stage later)

From here you can click your method to get the trigger URL. When you navigate there you should get the error from our Lambda function that we are missing an `object_name` parameter. Add `?object_name=foobar` to the end of the URL and try again, you should receive a presigned URL for your S3 bucket.
