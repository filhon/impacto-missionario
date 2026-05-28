"use client";

import { useState, useEffect, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { RefreshCw, Wifi, WifiOff, AlertCircle } from "lucide-react";
import { syncOnce } from "@/lib/sync/worker";
import {
  countPending,
  countSynced,
  getFailedItems,
  resetItemRetry,
} from "@/lib/dexie/repos";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SyncPage() {
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [failedExpanded, setFailedExpanded] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const pending = useLiveQuery(() => countPending(), []);
  const synced = useLiveQuery(() => countSynced(), []);
  const failedItems = useLiveQuery(() => getFailedItems(), []);

  const totalPending = pending ? pending.activities + pending.people : 0;
  const totalSynced = synced ? synced.activities + synced.people : 0;
  const totalFailed = failedItems?.length ?? 0;

  const handleSync = useCallback(async () => {
    setSyncing(true);
    const result = await syncOnce();
    setSyncing(false);

    if (result.ok > 0 || result.failed === 0) {
      toast.success(`${result.ok} sincronizados`);
    }
    if (result.failed > 0) {
      toast.error(`${result.failed} falharam`);
    }
  }, []);

  const handleRetry = useCallback(async (clientEventId: string) => {
    await resetItemRetry(clientEventId);
    toast.success("Item reenviado para a fila");
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Sincronização</h1>
        <Badge variant={isOnline ? "default" : "secondary"} className="gap-1.5">
          {isOnline ? (
            <Wifi className="size-3" />
          ) : (
            <WifiOff className="size-3" />
          )}
          {isOnline ? "Online" : "Offline"}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal uppercase tracking-wide">
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {totalPending}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal uppercase tracking-wide">
              Sincronizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{totalSynced}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-normal uppercase tracking-wide">
              Falhas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{totalFailed}</p>
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleSync} disabled={syncing || !isOnline}>
        <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Sincronizando..." : "Sincronizar agora"}
      </Button>

      {totalFailed > 0 && (
        <Card>
          <CardHeader>
            <button
              type="button"
              onClick={() => setFailedExpanded(!failedExpanded)}
              className="flex w-full items-center justify-between"
            >
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <AlertCircle className="size-4 text-destructive" />
                Itens com falha ({totalFailed})
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {failedExpanded ? "Recolher" : "Expandir"}
              </span>
            </button>
          </CardHeader>
          {failedExpanded && (
            <CardContent className="space-y-2">
              {failedItems?.map((item) => (
                <div
                  key={item.client_event_id}
                  className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.type}</p>
                    {item.error && (
                      <p className="mt-1 text-xs text-destructive wrap-break-word">
                        {item.error}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handleRetry(item.client_event_id)}
                  >
                    Tentar de novo
                  </Button>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
