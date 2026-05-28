"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, LayoutDashboard, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/coord", label: "Dashboard", icon: LayoutDashboard },
  { href: "/equipes", label: "Equipes", icon: Users },
  { href: "/export", label: "Exportar", icon: FileText },
];

export function CoordBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-50",
        "border-t border-border bg-background/95 backdrop-blur-sm",
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/coord" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="relative flex min-h-12 min-w-16 flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 transition-colors"
            >
              <Icon
                className={cn(
                  "size-6 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
