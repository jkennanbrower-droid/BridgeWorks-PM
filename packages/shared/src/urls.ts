import { optionalEnv, requireEnv } from "./env";

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export type BaseUrls = {
  publicBaseUrl: string;
  userBaseUrl: string;
  staffBaseUrl: string;
  apiBaseUrl?: string;
};

export function getBaseUrls(): BaseUrls {
  const publicBaseUrl = stripTrailingSlash(requireEnv("PB_PUBLIC_BASE_URL"));
  const userBaseUrl = stripTrailingSlash(requireEnv("PB_USER_BASE_URL"));
  const staffBaseUrl = stripTrailingSlash(requireEnv("PB_STAFF_BASE_URL"));
  const apiBaseUrl = optionalEnv("PB_API_BASE_URL");

  return {
    publicBaseUrl,
    userBaseUrl,
    staffBaseUrl,
    apiBaseUrl: apiBaseUrl ? stripTrailingSlash(apiBaseUrl) : undefined,
  };
}

