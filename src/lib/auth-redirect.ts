import { configuredAppOrigin, resolveAppOrigin, safeInternalPath } from "./app-origin";

export function publicAuthRedirect(
  requestUrl: string,
  path: string,
  configuredOrigin = configuredAppOrigin(),
) {
  const requestOrigin = new URL(requestUrl).origin;
  const publicOrigin = resolveAppOrigin({ configuredOrigin, requestOrigin });
  if (!publicOrigin) throw new Error("The public application URL is not configured.");
  return new URL(safeInternalPath(path), publicOrigin);
}
