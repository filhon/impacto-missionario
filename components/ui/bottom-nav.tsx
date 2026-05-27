"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/pessoa/novo", label: "Pessoas", icon: Users },
  { href: "/perfil", label: "Perfil", icon: User },
];

export function BottomNav() {
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
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-4 py-2 text-xs font-medium transition-colors min-h-12 min-w-16 rounded-lg",
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
