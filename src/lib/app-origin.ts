type AppEnvironment = {
  [key: string]: string | undefined;
  APP_URL?: string;
  NEXT_PUBLIC_APP_URL?: string;
  RAILWAY_PUBLIC_DOMAIN?: string;
  RAILWAY_STATIC_URL?: string;
};

function normaliseOrigin(value: string | undefined) {
  if (!value?.trim()) return null;
  const candidate = /^https?:\/\//i.test(value.trim())
    ? value.trim()
    : `https://${value.trim()}`;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    if (url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function configuredAppOrigin(environment: AppEnvironment = process.env) {
  return normaliseOrigin(environment.APP_URL)
    ?? normaliseOrigin(environment.NEXT_PUBLIC_APP_URL)
    ?? normaliseOrigin(environment.RAILWAY_PUBLIC_DOMAIN)
    ?? normaliseOrigin(environment.RAILWAY_STATIC_URL);
}

export function resolveAppOrigin({
  configuredOrigin,
  requestOrigin,
  production = process.env.NODE_ENV === "production",
}: {
  configuredOrigin?: string | null;
  requestOrigin?: string | null;
  production?: boolean;
}) {
  const configured = normaliseOrigin(configuredOrigin ?? undefined);
  if (configured) return configured;
  if (production) return null;
  return normaliseOrigin(requestOrigin ?? undefined);
}

export function safeInternalPath(value: string | null | undefined, fallback = "/dashboard") {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
