import Link from "next/link";
import { Mark } from "@/components/icons";

type AccessChoice = "student" | "staff";

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ for?: string }>;
}) {
  const choice = (await searchParams).for;
  const selected = choice === "student" || choice === "staff" ? choice : undefined;

  return (
    <main className="simple-portal min-h-screen">
      <header className="simple-portal-header">
        <div className="simple-portal-width flex min-h-20 items-center">
          <Link href="/" className="flex min-h-11 items-center gap-3 font-bold text-white">
            <Mark>S</Mark>
            <span>SCCB Digital Learning Hub</span>
          </Link>
        </div>
      </header>

      <section className="simple-portal-width py-12 sm:py-16">
        <Link className="link inline-flex min-h-11 items-center" href={selected ? "/access" : "/"}>
          <span aria-hidden>‹</span>&nbsp;Go back
        </Link>

        {selected ? <AccessInstructions choice={selected} /> : <AccessQuestion />}
      </section>
    </main>
  );
}

function AccessQuestion() {
  return (
    <>
      <p className="mt-5 text-lg text-slate-600">Get access</p>
      <h1 className="mt-2 text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
        Who is the account for?
      </h1>
      <p className="mt-5 text-lg leading-8 text-slate-700">Choose one option.</p>
      <nav className="choice-list mt-9" aria-label="Choose an account type">
        <Link className="choice-link" href="/access?for=student">
          <span className="text-xl font-bold">A student</span>
          <span className="choice-arrow" aria-hidden>›</span>
        </Link>
        <Link className="choice-link" href="/access?for=staff">
          <span className="text-xl font-bold">A teacher or administrator</span>
          <span className="choice-arrow" aria-hidden>›</span>
        </Link>
      </nav>
    </>
  );
}

function AccessInstructions({ choice }: { choice: AccessChoice }) {
  const isStudent = choice === "student";

  return (
    <>
      <p className="mt-5 text-lg text-slate-600">Get access</p>
      <h1 className="mt-2 max-w-2xl text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
        {isStudent ? "Ask your teacher for your class link" : "Ask an SCCB administrator for a setup link"}
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
        {isStudent
          ? "Your teacher will give you a temporary registration link for the correct class. Open that link to create your account."
          : "Staff accounts are approved and created securely by an SCCB administrator. They will send the setup link to your verified SCCB account."}
      </p>
      <div className="mt-9 flex flex-wrap gap-4">
        <Link className="button" href="/login">I already have an account</Link>
        <Link className="button-secondary" href="/">Return to the start</Link>
      </div>
    </>
  );
}
