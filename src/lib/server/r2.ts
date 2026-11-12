import "server-only";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | null = null;
function s3() {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT,
      forcePathStyle: true,
      credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return client;
}

export const presignPut = (key: string, contentType: string) =>
  getSignedUrl(s3(), new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key, ContentType: contentType }), { expiresIn: 300 });

export const presignGet = (key: string) =>
  getSignedUrl(s3(), new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }), { expiresIn: 3600 });
