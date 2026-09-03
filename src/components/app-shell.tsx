"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/auth/actions";

export interface NavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

export function AppShell({
  title,
  navItems,
  children,
  headerExtra,
}: {
  title: string;
  navItems: NavItem[];
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <aside className="lg:w-60 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white">
        <div className="p-4 flex items-center justify-between lg:block">
          <div>
            <p className="text-lg font-bold text-indigo-600">Anveshan</p>
            <p className="text-xs text-slate-500">{title}</p>
          </div>
        </div>
        <nav className="flex lg:flex-col gap-1 px-2 pb-2 lg:pb-4 overflow-x-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition whitespace-nowrap",
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden lg:block px-4 pb-4 mt-auto">
          <form action={signOut}>
            <button className="text-sm text-slate-500 hover:text-red-600 transition">Sign out</button>
          </form>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="lg:hidden flex items-center justify-end border-b border-slate-200 bg-white px-4 py-2">
          {headerExtra}
          <form action={signOut}>
            <button className="text-sm text-slate-500 hover:text-red-600 transition ml-3">Sign out</button>
          </form>
        </header>
        <main className="p-4 lg:p-8 max-w-6xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
