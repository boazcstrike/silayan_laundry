"use client";

/**
 * "Smart prefill" card — shows the forecasted next load (per item) and a
 * button that opens the counter with those counts pre-filled via the
 * `?prefill=` URL parameter (see lib/prefill.ts).
 */

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, WashingMachine } from "lucide-react";

import { PREFILL_PARAM, encodePrefillParam } from "@/lib/prefill";
import type { ForecastPayload } from "./types";

interface ForecastPrefillCardProps {
  forecast: ForecastPayload | null;
  /** True while the analytics request is still in flight. */
  isLoading: boolean;
}

const PREVIEW_LIMIT = 6;

function formatForecastDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function ForecastPrefillCard({ forecast, isLoading }: ForecastPrefillCardProps) {
  const router = useRouter();

  const nextPoint = forecast?.enoughData
    ? (forecast.loadForecast?.points?.[0] ?? null)
    : null;

  const predictedItems = useMemo(() => {
    if (!nextPoint) return [];
    return Object.entries(nextPoint.byCategory)
      .map(([name, count]) => ({ name, count: Math.round(count) }))
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [nextPoint]);

  const handlePrefill = () => {
    if (!nextPoint) return;
    router.push(`/?${PREFILL_PARAM}=${encodePrefillParam(nextPoint.byCategory)}`);
  };

  let body: React.ReactNode;
  if (isLoading) {
    body = <p className="text-sm text-muted-foreground">Loading forecast…</p>;
  } else if (!nextPoint || predictedItems.length === 0) {
    body = (
      <p className="text-sm text-muted-foreground">
        Not enough data to forecast your next load yet. Log a few more
        submissions and the prefill will appear here.
      </p>
    );
  } else {
    body = (
      <>
        <p className="text-sm text-muted-foreground">
          Expected next load on{" "}
          <strong className="text-foreground">
            {formatForecastDate(nextPoint.date)}
          </strong>
          {" — "}about{" "}
          <strong className="text-foreground">{Math.round(nextPoint.total)}</strong>{" "}
          items.
        </p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {predictedItems.slice(0, PREVIEW_LIMIT).map((item) => (
            <li
              key={item.name}
              className="rounded-md bg-muted px-2 py-0.5 text-xs text-foreground"
            >
              {item.name}{" "}
              <span className="font-mono font-semibold">×{item.count}</span>
            </li>
          ))}
          {predictedItems.length > PREVIEW_LIMIT ? (
            <li className="px-1 py-0.5 text-xs text-muted-foreground">
              +{predictedItems.length - PREVIEW_LIMIT} more
            </li>
          ) : null}
        </ul>
        <button
          type="button"
          onClick={handlePrefill}
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <WashingMachine size={16} aria-hidden /> Prefill the counter
        </button>
      </>
    );
  }

  return (
    <section
      className="card dashboard-card dashboard-card-analytics"
      aria-labelledby="forecast-prefill-heading"
    >
      <header className="dashboard-card-header">
        <h2 id="forecast-prefill-heading">
          <Sparkles size={18} className="icon-inline" /> Smart Prefill
        </h2>
      </header>
      <div className="dashboard-card-body">{body}</div>
    </section>
  );
}
