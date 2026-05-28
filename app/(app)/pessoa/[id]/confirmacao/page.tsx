"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";

export default function ConfirmacaoPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.replace("/"), 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 p-6 text-center">
      <CircleCheck className="size-20 text-primary animate-in zoom-in duration-300" />
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold animate-in fade-in slide-in-from-bottom-2 duration-300">
          Registrado!
        </h1>
        <p className="text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-500">
          Voltando ao início...
        </p>
      </div>
    </div>
  );
}
