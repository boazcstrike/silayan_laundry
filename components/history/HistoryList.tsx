"use client";

/**
 * Submission history list — one row per recorded submission with a
 * locale-formatted timestamp, channel badge, success state, and the
 * per-item breakdown. Pagination is offset-based via the Load more button.
 */

import { motion, useReducedMotion } from "motion/react";
import { CheckCircle2, XCircle } from "lucide-react";

import { containerVariants, itemVariants } from "@/components/analytics/motion";
import type { FullSubmission } from "./types";

interface HistoryListProps {
  submissions: FullSubmission[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

const CHANNEL_LABELS: Record<string, string> = {
  download: "Download",
  discord: "Discord",
  whatsapp: "WhatsApp",
  viber: "Viber",
  messenger: "Messenger",
};

/** SQLite stores `YYYY-MM-DD HH:MM:SS` local time; Mongo mirrors it. */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SubmissionRow({ submission }: { submission: FullSubmission }) {
  const channelLabel = CHANNEL_LABELS[submission.channel] ?? submission.channel;
  const isSuccess = Boolean(submission.channel_success);

  return (
    <div className="rounded-xl border bg-card/60 p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-foreground">
          {formatTimestamp(submission.timestamp)}
        </span>
        <span className="rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {channelLabel}
        </span>
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium ${
            isSuccess ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          {isSuccess ? (
            <CheckCircle2 size={13} aria-hidden />
          ) : (
            <XCircle size={13} aria-hidden />
          )}
          {isSuccess ? "Sent" : "Failed"}
        </span>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {submission.total_items.toLocaleString()} item
          {submission.total_items === 1 ? "" : "s"}
        </span>
      </div>

      {submission.items.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {submission.items.map((item) => (
            <li
              key={item.name}
              className="rounded-md bg-muted px-2 py-0.5 text-xs text-foreground"
            >
              {item.name}{" "}
              <span className="font-mono font-semibold">
                ×{item.count.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">No items recorded.</p>
      )}
    </div>
  );
}

export function HistoryList({
  submissions,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: HistoryListProps) {
  const reduce = useReducedMotion();

  if (submissions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No submissions yet. Counts you download or send from the counter will
        show up here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <motion.ul
        className="flex flex-col gap-2"
        variants={reduce ? undefined : containerVariants}
        initial={reduce ? false : "hidden"}
        animate={reduce ? false : "show"}
      >
        {submissions.map((submission) => (
          <motion.li
            key={submission.id}
            variants={reduce ? undefined : itemVariants}
          >
            <SubmissionRow submission={submission} />
          </motion.li>
        ))}
      </motion.ul>

      {hasMore ? (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isLoadingMore}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-40"
        >
          {isLoadingMore ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </div>
  );
}
