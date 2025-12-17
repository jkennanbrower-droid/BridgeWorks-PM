const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env.local") });

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

async function main() {
  const Bucket = process.env.R2_BUCKET_NAME;
  if (!Bucket) throw new Error("Missing R2_BUCKET_NAME");

  const Key = "test.txt";
  const Body = "Hello R2!";

  await client.send(new PutObjectCommand({ Bucket, Key, Body }));
  console.log("✅ Uploaded:", `${Bucket}/${Key}`);
}

main().catch((e) => {
  console.error("❌ Upload failed:", e?.name || e);
  console.error(e?.message || e);
  process.exit(1);
});
