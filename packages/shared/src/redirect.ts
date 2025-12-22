import { getBaseUrls } from "./urls";

function joinUrl(baseUrl: string, path: string): string {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${baseUrl}${path}`;
}

export function toLoginUrl(): string {
  return joinUrl(getBaseUrls().publicBaseUrl, "/login");
}

export function toUserUrl(path = "/"): string {
  return joinUrl(getBaseUrls().userBaseUrl, path);
}

export function toStaffUrl(path = "/"): string {
  return joinUrl(getBaseUrls().staffBaseUrl, path);
}

