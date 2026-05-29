import { SessionProvider } from "@/lib/context/session";
import { AppHeader } from "@/components/ui/app-header";
import { CoordBottomNav } from "@/components/ui/coord-bottom-nav";

export default function CoordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="flex-1 pb-20">{children}</main>
        <CoordBottomNav />
      </div>
    </SessionProvider>
  );
}
