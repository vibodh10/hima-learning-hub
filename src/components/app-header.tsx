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
    { href: "/dashboard", label: "Home" },
    { href: "/curriculum", label: "My learning" },
    { href: "/progress", label: "My progress" },
    { href: "/portfolio", label: "My work" },
    { href: "/help", label: "Help" },
  ],
  teacher: [
    { href: "/dashboard", label: "Home" },
    { href: "/dashboard#groups", label: "My groups" },
    { href: "/help", label: "Help" },
  ],
  administrator: [
    { href: "/dashboard", label: "Groups" },
    { href: "/admin", label: "Administration" },
    { href: "/help", label: "Help" },
  ],
};

export function AppHeader({ name, role }: { name: string; role: Role }) {
  return <header className="site-header">
    <div className="shell flex min-h-20 flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3">
      <Link href="/dashboard" className="flex items-center gap-3 font-bold"><Mark>S</Mark><span className="hidden sm:block">SCCB Digital Learning Hub</span></Link>
      <nav aria-label={`${roleLabels[role]} navigation`} className="site-nav order-3 flex w-full flex-wrap items-center gap-x-5 gap-y-2 border-t pt-3 text-sm font-semibold md:order-none md:w-auto md:border-0 md:pt-0">
        {navigation[role].map(item=><Link href={item.href} key={item.label}>{item.label}</Link>)}
      </nav>
      <div className="flex items-center gap-3">
        <div className="text-right"><p className="text-sm font-semibold">{name}</p><p className="role-chip mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-bold">{roleLabels[role]}</p></div>
        <form action={logout}><button className="button-secondary button-small">Sign out</button></form>
      </div>
    </div>
  </header>;
}
