import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicAuthRedirect } from "@/lib/auth-redirect";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next");
  const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/dashboard";
  // Railway forwards the public request to Next.js on localhost:8080. Never use
  // that internal origin in a browser redirect; authentication links must return
  // to the configured public application URL.
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(publicAuthRedirect(request.url, next));
    console.error("Authentication callback exchange failed", { code: error.code, status: error.status });
  }
  return NextResponse.redirect(publicAuthRedirect(request.url, "/login?error=callback"));
}
