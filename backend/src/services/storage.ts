import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
  ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true } : {}),
})

const BUCKET = process.env.S3_BUCKET || 'weebrook-assets'

export async function getPresignedUploadUrl(
  filename: string,
  contentType: string
): Promise<{ uploadUrl: string; s3Key: string }> {
  const ext = filename.split('.').pop()
  const s3Key = `uploads/${uuidv4()}.${ext}`
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: s3Key, ContentType: contentType })
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })
  return { uploadUrl, s3Key }
}

export async function getPresignedDownloadUrl(s3Key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key })
  return getSignedUrl(s3, command, { expiresIn: 3600 })
}
