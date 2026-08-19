import { minioClient } from "./minio";

const bucket = process.env.MINIO_BUCKET!;

export async function initializeMinio() {
  const exists = await minioClient.bucketExists(bucket);

  if (!exists) {
    await minioClient.makeBucket(bucket);
    console.log(`Bucket ${bucket} berhasil dibuat.`);
  } else {
    console.log(`Bucket ${bucket} sudah ada.`);
  }
}