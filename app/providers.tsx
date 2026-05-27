"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { SWRegister } from "@/components/pwa/sw-register";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { startSyncWorker } from "@/lib/sync/worker";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  useEffect(() => {
    startSyncWorker();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SWRegister />
      <OfflineBanner />
      {children}
      <Toaster />
      <InstallPrompt />
    </QueryClientProvider>
  );
}
