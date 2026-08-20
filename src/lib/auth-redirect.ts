export function publicAuthRedirect(
  requestUrl: string,
  path: string,
  configuredOrigin = process.env.APP_URL,
) {
  const requestOrigin = new URL(requestUrl).origin;
  const publicOrigin = configuredOrigin?.replace(/\/$/, "") || requestOrigin;
  const safePath = path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard";
  return new URL(safePath, publicOrigin);
}
