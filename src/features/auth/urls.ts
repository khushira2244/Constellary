import { safeInternalReturnPath } from "./model";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function normalizedAppUrl(value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_APP_URL");
  }

  const url = new URL(value.trim());
  const localHttp = url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname);
  if (url.protocol !== "https:" && !localHttp) {
    throw new Error("NEXT_PUBLIC_APP_URL must use HTTPS, except for local development.");
  }
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_APP_URL must be an origin without credentials, query, or hash.");
  }
  return url.origin;
}

export function emailConfirmationRedirectUrl(
  appUrl: string | undefined,
  returnTo?: string | null,
): string {
  const callback = new URL("/auth/callback", normalizedAppUrl(appUrl));
  const destination = safeInternalReturnPath(returnTo);
  if (destination !== "/") callback.searchParams.set("returnTo", destination);
  return callback.toString();
}
