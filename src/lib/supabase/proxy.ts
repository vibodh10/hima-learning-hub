import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function refreshSupabaseSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let response = NextResponse.next({ request });

  if (!url || !key) return response;

  const authCookieNames = projectAuthCookieNames(request, url);
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { error } = await supabase.auth.getUser();
  if (error?.code === "refresh_token_not_found") {
    authCookieNames.forEach(name => response.cookies.delete(name));
  }

  return response;
}

function projectAuthCookieNames(request: NextRequest, supabaseUrl: string) {
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const prefix = `sb-${projectRef}-auth-token`;
  return request.cookies.getAll()
    .map(cookie => cookie.name)
    .filter(name => name === prefix || name.startsWith(`${prefix}.`));
}
