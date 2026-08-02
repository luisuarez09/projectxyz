"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const refreshIntervalMs = 3 * 60 * 1000;

const timeFormatter = new Intl.DateTimeFormat("es-VE", {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});

export function TvAutoRefresh({ onRefresh }: { onRefresh: () => void | Promise<void> }) {
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
      setLastUpdatedAt(new Date());
    } finally {
      window.setTimeout(() => setRefreshing(false), 700);
    }
  }, [onRefresh]);

  useEffect(() => {
    setLastUpdatedAt(new Date());
    const intervalId = window.setInterval(refresh, refreshIntervalMs);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refresh]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-emerald-200" aria-live="polite">
      <RefreshCw className={refreshing ? "size-4 animate-spin" : "size-4"} />
      <span>{lastUpdatedAt ? `Actualizado ${timeFormatter.format(lastUpdatedAt)}` : "Preparando actualización…"}</span>
      <span className="text-emerald-300/70">· Refresco automático cada 3 minutos</span>
    </div>
  );
}
