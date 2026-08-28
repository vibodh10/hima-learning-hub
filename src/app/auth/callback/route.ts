import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicAuthRedirect } from "@/lib/auth-redirect";
import { finalizeCurrentStudentInvitation } from "@/lib/invitation-finalization";
import { safeInternalPath } from "@/lib/app-origin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeInternalPath(url.searchParams.get("next"));
  // Railway forwards the public request to Next.js on localhost:8080. Never use
  // that internal origin in a browser redirect; authentication links must return
  // to the configured public application URL.
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const metadata = data.user?.user_metadata as Record<string, unknown> | undefined;
      if (metadata?.requested_role === "student" && metadata.invited_class_id) {
        const finalized = await finalizeCurrentStudentInvitation(url.searchParams.get("invitation"));
        if (finalized.kind !== "ready") {
          console.error("Student invitation callback association failed", { outcome: finalized.kind, code: "code" in finalized ? finalized.code : undefined });
          await supabase.auth.signOut();
          return NextResponse.redirect(publicAuthRedirect(request.url, "/login?error=invitation-association"));
        }
      }
      return NextResponse.redirect(publicAuthRedirect(request.url, next));
    }
    console.error("Authentication callback exchange failed", { code: error.code, status: error.status });
  }
  return NextResponse.redirect(publicAuthRedirect(request.url, "/login?error=callback"));
}
