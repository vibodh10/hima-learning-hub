import Link from "next/link";
import { confirmEmailToken } from "@/app/actions/auth";

type ConfirmPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ConfirmEmailPage({ searchParams }: ConfirmPageProps) {
  const params = await searchParams;
  const tokenHash = first(params.token_hash);
  const type = first(params.type);
  const requestedNext = first(params.next);
  const validType = type === "recovery" || type === "invite";
  const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/update-password";
  const valid = Boolean(tokenHash && tokenHash.length >= 20 && validType);

  return (
    <main className="shell grid min-h-screen place-items-center py-12">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm" aria-labelledby="confirm-title">
        <Link className="mb-8 flex items-center gap-3 font-bold" href="/">
          <span className="grid size-11 place-items-center rounded-xl bg-teal-700 text-lg text-white" aria-hidden="true">H</span>
          Hima Learning Hub
        </Link>
        <p className="eyebrow">Secure email confirmation</p>
        <h1 className="mt-3 text-3xl font-bold" id="confirm-title">{valid ? "Continue to set your password" : "This email link is incomplete"}</h1>
        <p className="mt-3 text-slate-600">
          {valid
            ? "Press the button once. This prevents email-security previews from using your one-time link before you do."
            : "Request a fresh link from Hima, then open only the newest email."}
        </p>
        {valid ? (
          <form className="mt-7" action={confirmEmailToken}>
            <input name="tokenHash" type="hidden" value={tokenHash} />
            <input name="type" type="hidden" value={type} />
            <input name="next" type="hidden" value={next} />
            <button className="button primary w-full" type="submit">Continue securely</button>
          </form>
        ) : null}
        <Link className="link mt-6 inline-block" href="/forgot-password">Request a fresh password link</Link>
      </section>
    </main>
  );
}
