import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

function getErrorCode(error) {
  if (!error || typeof error !== "object") return "UnknownError";
  const code =
    error.code ??
    error.Code ??
    error.name ??
    error.constructor?.name ??
    "UnknownError";
  const status = error.$metadata?.httpStatusCode;
  return status ? `${code} (${status})` : String(code);
}

function isSet(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function resolveR2Endpoint() {
  if (isSet(process.env.R2_ENDPOINT)) {
    return process.env.R2_ENDPOINT.trim().replace(/\/+$/, "");
  }
  if (isSet(process.env.R2_ACCOUNT_ID)) {
    return `https://${process.env.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com`;
  }
  return null;
}

export async function checkDb(pool) {
  const started = performance.now();
  try {
    await pool.query("select 1");
    return {
      state: "healthy",
      latencyMs: Math.round(performance.now() - started),
    };
  } catch (error) {
    return {
      state: "unhealthy",
      latencyMs: Math.round(performance.now() - started),
      message: `DB ${getErrorCode(error)}`,
    };
  }
}

export async function checkAuthClerk() {
  if (!isSet(process.env.CLERK_SECRET_KEY)) {
    return {
      state: "disabled",
      latencyMs: null,
      message: "Clerk not configured",
    };
  }

  const started = performance.now();
  try {
    const res = await fetch("https://api.clerk.com/v1/users?limit=1", {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
    });
    const latencyMs = Math.round(performance.now() - started);
    if (res.ok) {
      return { state: "healthy", latencyMs };
    }
    return {
      state: "unhealthy",
      latencyMs,
      message: `Clerk ${res.status}`,
    };
  } catch (error) {
    return {
      state: "unhealthy",
      latencyMs: Math.round(performance.now() - started),
      message: `Clerk ${getErrorCode(error)}`,
    };
  }
}

export async function checkStorageR2() {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const endpoint = resolveR2Endpoint();

  if (!isSet(accessKeyId) || !isSet(secretAccessKey) || !isSet(bucket) || !endpoint) {
    return {
      state: "disabled",
      latencyMs: null,
      message: "R2 not configured",
    };
  }

  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
    },
  });

  const started = performance.now();
  try {
    await client.send(
      new ListObjectsV2Command({
        Bucket: bucket.trim(),
        MaxKeys: 1,
        Prefix: "health/",
      }),
    );
    return {
      state: "healthy",
      latencyMs: Math.round(performance.now() - started),
    };
  } catch (error) {
    return {
      state: "unhealthy",
      latencyMs: Math.round(performance.now() - started),
      message: `R2 ${getErrorCode(error)}`,
    };
  }
}
