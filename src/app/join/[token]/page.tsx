import Link from "next/link";
import { ClassLinkRegistrationForm } from "@/components/class-link-registration-form";
import { Mark } from "@/components/icons";
import { findOpenClassRegistration, validClassRegistrationToken } from "@/lib/class-registration-links";

export const dynamic = "force-dynamic";

export default async function JoinClassPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const registration = validClassRegistrationToken(token)
    ? await findOpenClassRegistration(token)
    : null;
  return <main className="shell grid min-h-screen place-items-center py-12">
    <div className="w-full max-w-lg">
      <Link href="/" className="mb-8 flex items-center justify-center gap-3 font-bold"><Mark>S</Mark>SCCB Digital Learning Hub</Link>
      <section className="card">
        {registration ? <>
          <p className="eyebrow">Join your SCCB group</p>
          <h1 className="mt-3 text-3xl font-bold">{registration.className}</h1>
          <p className="mt-2 text-slate-600">{registration.courseTitle}</p>
          <div className="mt-5 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-950">
            Your account will be a student account and will join only this group. Your starting-point assessment appears immediately after registration.
          </div>
          <ClassLinkRegistrationForm token={token}/>
        </> : <>
          <p className="eyebrow">Group registration</p>
          <h1 className="mt-3 text-3xl font-bold">This registration link is closed</h1>
          <p className="mt-4 leading-7 text-slate-600">The link may have expired, reached its limit or been closed by the teacher. Ask your teacher for the current link.</p>
          <Link className="button mt-6" href="/login">Return to sign in</Link>
        </>}
      </section>
    </div>
  </main>;
}
