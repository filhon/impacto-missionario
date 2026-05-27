"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/coord", label: "Dashboard", icon: LayoutDashboard },
  { href: "/equipes", label: "Equipes", icon: Users },
];

export function CoordBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around",
        "border-t border-border bg-background",
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === "/coord" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-0.5 text-xs font-medium transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-6" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
