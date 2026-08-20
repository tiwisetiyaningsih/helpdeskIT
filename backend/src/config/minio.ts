import { Client } from "minio";

const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;

if (!MINIO_ACCESS_KEY || !MINIO_SECRET_KEY) {
  throw new Error(
    "MINIO_ACCESS_KEY dan MINIO_SECRET_KEY wajib diset di environment variable."
  );
}

export const MINIO_BUCKET = process.env.MINIO_BUCKET || "helpdesk";

export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || "minio",
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});

export async function ensureMinioBucket() {
  const exists = await minioClient.bucketExists(MINIO_BUCKET);

  if (!exists) {
    await minioClient.makeBucket(MINIO_BUCKET);
  }
}