import "dotenv/config";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const out = await s3.send(
  new ListObjectsV2Command({
    Bucket: process.env.R2_BUCKET,
    MaxKeys: 10,
  })
);

console.log("Bucket:", process.env.R2_BUCKET);
console.log("Keys:", (out.Contents ?? []).map((o) => o.Key));
