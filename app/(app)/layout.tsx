import { SessionProvider } from "@/lib/context/session";
import { AppHeader } from "@/components/ui/app-header";
import { BottomNav } from "@/components/ui/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="flex-1 pb-20">{children}</main>
        <BottomNav />
      </div>
    </SessionProvider>
  );
}
