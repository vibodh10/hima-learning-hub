import Link from "next/link";
import { Mark } from "@/components/icons";

const choices = [
  {
    href: "/login",
    title: "Sign in",
    description: "For students, teachers and administrators",
  },
  {
    href: "/access",
    title: "I need an account",
    description: "Find out how students and staff get access",
  },
  {
    href: "/privacy",
    title: "Privacy and your information",
    description: "See what the portal records and who can see it",
  },
] as const;

export default function Home() {
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

      <section className="simple-portal-width py-12 sm:py-16" aria-labelledby="portal-question">
        <p className="text-lg text-slate-600">SCCB Digital Learning Hub</p>
        <h1 id="portal-question" className="mt-2 max-w-2xl text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
          What do you want to do?
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">
          Choose one option. We will take you to the right place.
        </p>

        <nav className="choice-list mt-9" aria-label="Portal choices">
          {choices.map((choice) => (
            <Link className="choice-link" href={choice.href} key={choice.href}>
              <span>
                <span className="block text-xl font-bold">{choice.title}</span>
                <span className="mt-1 block text-base font-normal leading-6">{choice.description}</span>
              </span>
              <span className="choice-arrow" aria-hidden>›</span>
            </Link>
          ))}
        </nav>

        <p className="mt-10 max-w-2xl border-l-4 border-slate-300 pl-4 text-sm leading-6 text-slate-600">
          This portal is for learning, practice and progress. Formal qualification assignments are completed outside the Digital Learning Hub.
        </p>
      </section>

      <footer className="simple-portal-width border-t border-slate-300 py-7 text-sm text-slate-600">
        <Link className="link" href="/privacy">Privacy</Link>
      </footer>
    </main>
  );
}
