import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3_CONFIG } from '../config';

const s3 = new S3Client({
  region: S3_CONFIG.region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});


export const uploadToS3 = async (
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> => {
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return `https://${S3_CONFIG.bucket}.s3.${S3_CONFIG.region}.amazonaws.com/${key}`;
};


export const getUploadPresignedUrl = async (
  key: string,
  contentType: string,
  expiresIn = 300 // 5 minutes
): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: S3_CONFIG.bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3, command, { expiresIn });
};


export const deleteFromS3 = async (key: string): Promise<void> => {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: key,
    })
  );
};


export const mockS3Url = (folder: string, filename: string): string =>
  `https://mock-s3.honeygroup.co.za/${folder}/${filename}`;
