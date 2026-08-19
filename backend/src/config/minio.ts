import { Client } from "minio";

export const MINIO_BUCKET =
  process.env.MINIO_BUCKET || "helpdesk";

export const minioClient = new Client({
  endPoint:
    process.env.MINIO_ENDPOINT || "minio",

  port: Number(
    process.env.MINIO_PORT || 9000
  ),

  useSSL:
    process.env.MINIO_USE_SSL === "true",

  accessKey:
    process.env.MINIO_ACCESS_KEY || "minio",

  secretKey:
    process.env.MINIO_SECRET_KEY || "password",
});

export async function ensureMinioBucket() {
  const exists =
    await minioClient.bucketExists(
      MINIO_BUCKET
    );

  if (!exists) {
    await minioClient.makeBucket(
      MINIO_BUCKET
    );
  }
}