import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import crypto from "node:crypto";

export const runtime = "nodejs";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function getR2Client(): { client: S3Client; bucket: string; publicBaseUrl?: string } {
  const accountId = requireEnv("R2_ACCOUNT_ID");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");
  const bucket = requireEnv("R2_BUCKET");
  const publicBaseUrl = optionalEnv("R2_PUBLIC_BASE_URL")?.replace(/\/+$/, "");

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return { client, bucket, publicBaseUrl };
}

function sanitizeFilename(name: string): string {
  return name
    .replaceAll("\\", "_")
    .replaceAll("/", "_")
    .replaceAll("..", "_")
    .replace(/[^\w.\-()+@ ]/g, "_")
    .trim()
    .slice(0, 120);
}

export async function POST(req: Request): Promise<Response> {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ ok: false, error: "Missing file field 'file'." }, { status: 400 });
    }

    const maxBytes = 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      return Response.json(
        { ok: false, error: `File too large (max ${maxBytes} bytes).` },
        { status: 413 },
      );
    }

    const { client, bucket, publicBaseUrl } = getR2Client();

    const safeName = sanitizeFilename(file.name || "upload.bin");
    const key = `uploads/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;

    const body = Buffer.from(await file.arrayBuffer());
    const result = await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: file.type || "application/octet-stream",
      }),
    );

    const url = publicBaseUrl ? `${publicBaseUrl}/${key}` : undefined;
    return Response.json(
      { ok: true, key, etag: result.ETag, url },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Upload failed." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

