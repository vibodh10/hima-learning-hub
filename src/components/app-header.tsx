import Link from "next/link";
import { logout } from "@/app/actions/auth";
import type { Role } from "@/lib/auth";
import { Mark } from "./icons";

const roleLabels: Record<Role, string> = {
  student: "Student mode",
  teacher: "Teacher mode",
  administrator: "Administrator mode",
};

const navigation: Record<Role, { href: string; label: string }[]> = {
  student: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/curriculum", label: "My course" },
    { href: "/progress", label: "My progress" },
    { href: "/portfolio", label: "My portfolio" },
  ],
  teacher: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard#classes", label: "My classes" },
    { href: "/curriculum", label: "Course content" },
  ],
  administrator: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/admin", label: "Administration" },
    { href: "/curriculum", label: "Course content" },
  ],
};

export function AppHeader({ name, role }: { name: string; role: Role }) {
  return <header className="border-b border-slate-200 bg-white">
    <div className="shell flex min-h-20 flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3">
      <Link href="/dashboard" className="flex items-center gap-3 font-bold"><Mark>S</Mark><span className="hidden sm:block">SCCB Digital Learning Hub</span></Link>
      <nav aria-label={`${roleLabels[role]} navigation`} className="order-3 flex w-full flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-sm font-semibold md:order-none md:w-auto md:border-0 md:pt-0">
        {navigation[role].map(item=><Link className="text-slate-600 hover:text-teal-800" href={item.href} key={item.href}>{item.label}</Link>)}
      </nav>
      <div className="flex items-center gap-3">
        <div className="text-right"><p className="text-sm font-semibold">{name}</p><p className="mt-1 inline-flex rounded-full bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-900">{roleLabels[role]}</p></div>
        <form action={logout}><button className="button-secondary button-small">Sign out</button></form>
      </div>
    </div>
  </header>;
}
