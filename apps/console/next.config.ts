import type { NextConfig } from "next";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function loadDotEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (!key || key in process.env) continue;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

// Load shared env files from monorepo root
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, "../..");
loadDotEnvFile(path.join(repoRoot, ".env.local"));
loadDotEnvFile(path.join(repoRoot, ".env"));

function normalizeBasePath(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "/") return undefined;
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const withoutTrailingSlash = withLeadingSlash.replace(/\/+$/, "");
  return withoutTrailingSlash || undefined;
}

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  transpilePackages: ["shared", "db"],
  ...(basePath ? { basePath } : {}),
  experimental: {
    serverSourceMaps: false,
    turbopackSourceMaps: false,
  },
  async rewrites() {
    if (!apiBaseUrl) {
      return [];
    }
    return {
      afterFiles: [
        {
          source: "/api/ops/:path*",
          destination: `${apiBaseUrl}/ops/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
