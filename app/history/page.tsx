"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { History } from "lucide-react";

import { containerVariants, itemVariants } from "@/components/analytics/motion";
import { ForecastPrefillCard } from "@/components/history/ForecastPrefillCard";
import { HistoryList } from "@/components/history/HistoryList";
import type {
  AnalyticsResponse,
  FullSubmission,
  HistoryResponse,
} from "@/components/history/types";

const PAGE_SIZE = 20;

type HistoryStatus = "loading" | "error" | "ready";

export default function HistoryPage() {
  const reduce = useReducedMotion();

  const [submissions, setSubmissions] = useState<FullSubmission[]>([]);
  const [status, setStatus] = useState<HistoryStatus>("loading");
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);

  const fetchPage = useCallback(async (offset: number): Promise<HistoryResponse> => {
    const res = await fetch(
      `/api/submissions?type=history&limit=${PAGE_SIZE}&offset=${offset}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`History request failed (${res.status})`);
    return (await res.json()) as HistoryResponse;
  }, []);

  const loadInitial = useCallback(async () => {
    setStatus("loading");
    try {
      const page = await fetchPage(0);
      setSubmissions(page.submissions);
      setHasMore(page.hasMore);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    setIsLoadingMore(true);
    try {
      const page = await fetchPage(submissions.length);
      setSubmissions((prev) => [...prev, ...page.submissions]);
      setHasMore(page.hasMore);
    } catch {
      // Keep what we have; the button stays available for a retry.
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchPage, submissions.length]);

  const loadAnalytics = useCallback(async () => {
    setIsAnalyticsLoading(true);
    try {
      const res = await fetch("/api/analytics", { cache: "no-store" });
      if (res.ok) {
        setAnalytics((await res.json()) as AnalyticsResponse);
      }
    } catch {
      // Non-fatal: the prefill card falls back to its empty state.
    } finally {
      setIsAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitial();
    loadAnalytics();
  }, [loadInitial, loadAnalytics]);

  const revealContainer = reduce
    ? {}
    : { variants: containerVariants, initial: "hidden", animate: "show" };
  const revealItem = reduce ? {} : { variants: itemVariants };

  return (
    <div className="dashboard-shell">
      <motion.div className="dashboard-content dashboard-stack" {...revealContainer}>
        <motion.header
          className="hero card dashboard-card dashboard-card-hero"
          {...revealItem}
        >
          <p className="dashboard-kicker">Laundry Operations</p>
          <h1>
            <History size={20} className="icon-inline" /> Submission History
          </h1>
          <p className="text-sm text-muted-foreground">
            Every recorded load, newest first — plus a smart prefill from your
            forecast.
          </p>
        </motion.header>

        <motion.div {...revealItem}>
          <ForecastPrefillCard
            forecast={analytics?.forecast ?? null}
            isLoading={isAnalyticsLoading}
          />
        </motion.div>

        <motion.section
          className="card dashboard-card dashboard-card-analytics"
          aria-labelledby="history-list-heading"
          {...revealItem}
        >
          <header className="dashboard-card-header">
            <h2 id="history-list-heading">
              <History size={18} className="icon-inline" /> Past Submissions
            </h2>
          </header>
          <div className="dashboard-card-body">
            {status === "loading" ? (
              <p className="text-sm text-muted-foreground">Loading history…</p>
            ) : status === "error" ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-red-600 dark:text-red-400">
                  Could not load your submission history.
                </p>
                <button
                  type="button"
                  onClick={loadInitial}
                  className="inline-flex min-h-[44px] items-center rounded-xl border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  Retry
                </button>
              </div>
            ) : (
              <HistoryList
                submissions={submissions}
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
                onLoadMore={loadMore}
              />
            )}
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
