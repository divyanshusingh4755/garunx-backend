import { S3Client } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION?.trim();

const accessKeyId = process.env.AWS_ACCESS_KEY?.trim();

const secretAccessKey = process.env.AWS_SECRET_KEY?.trim();

if (!region) {
  throw new Error("AWS_REGION is not configured");
}

if (!accessKeyId || !secretAccessKey) {
  throw new Error("AWS credentials are not configured");
}

export const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});
