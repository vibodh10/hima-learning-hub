import { releaseIdentity } from "@/lib/release-identity";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(releaseIdentity(process.env), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
