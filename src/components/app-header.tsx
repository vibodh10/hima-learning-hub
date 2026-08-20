import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { Mark } from "./icons";
export function AppHeader({ name, role }: { name: string; role: string }) {
  return <header className="border-b border-slate-200 bg-white"><div className="shell flex min-h-20 items-center justify-between gap-4">
    <Link href="/dashboard" className="flex items-center gap-3 font-bold"><Mark>S</Mark><span className="hidden sm:block">SCCB Digital Learning Hub</span></Link>
    <div className="flex items-center gap-4"><Link className="link hidden text-sm sm:block" href="/curriculum">Units &amp; topics</Link>{role==="administrator"&&<Link className="link text-sm" href="/admin">Administration</Link>}<div className="text-right"><p className="text-sm font-semibold">{name}</p><p className="text-xs capitalize text-slate-500">{role}</p></div><form action={logout}><button className="button-secondary button-small">Sign out</button></form></div>
  </div></header>;
}
