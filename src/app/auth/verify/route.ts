import { NextResponse } from "next/server";
import { z } from "zod";
import { publicAuthRedirect } from "@/lib/auth-redirect";
import { finalizeCurrentStudentInvitation } from "@/lib/invitation-finalization";
import { createClient } from "@/lib/supabase/server";

const confirmation = z.object({
  tokenHash: z.string().min(20),
  type: z.enum(["recovery", "invite"]),
  next: z.string().startsWith("/").refine((value) => !value.startsWith("//")),
});

export async function POST(request: Request) {
  const parsed = confirmation.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) {
    return NextResponse.redirect(publicAuthRedirect(request.url, "/login?error=invalid-email-link"), 303);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: parsed.data.tokenHash,
    type: parsed.data.type,
  });
  if (error) {
    console.error("Email token verification failed", { code: error.code, status: error.status });
    return NextResponse.redirect(publicAuthRedirect(request.url, "/login?error=expired-email-link"), 303);
  }

  if (parsed.data.type === "invite") {
    const finalized = await finalizeCurrentStudentInvitation();
    if (finalized.kind !== "ready") {
      console.error("Student invitation association failed", { outcome: finalized.kind, code: "code" in finalized ? finalized.code : undefined });
      await supabase.auth.signOut();
      return NextResponse.redirect(publicAuthRedirect(request.url, "/login?error=invitation-association"), 303);
    }
  }
  return NextResponse.redirect(publicAuthRedirect(request.url, parsed.data.next), 303);
}
