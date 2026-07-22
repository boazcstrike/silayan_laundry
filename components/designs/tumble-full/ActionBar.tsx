"use client";

import { AlertTriangle, Download, Loader2, RotateCcw, Send } from "lucide-react";

interface ActionBarProps {
  onDownload: () => void;
  onDiscord: () => void;
  onReset: () => void;
  isGenerating: boolean;
  isUploading: boolean;
  isConfigured: boolean | null;
  error: string | null;
  onDismissError: () => void;
}

const BTN =
  "inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Submission actions: Download image, Send to Discord, Reset — plus a combined
 * error box and an amber "Discord not configured" notice.
 */
export function ActionBar({
  onDownload,
  onDiscord,
  onReset,
  isGenerating,
  isUploading,
  isConfigured,
  error,
  onDismissError,
}: ActionBarProps) {
  const notConfigured = isConfigured === false;

  return (
    <div className="space-y-3">
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border px-3 py-2 text-sm"
          style={{
            borderColor: "color-mix(in oklch, var(--destructive) 45%, var(--border))",
            background: "color-mix(in oklch, var(--destructive) 12%, var(--card))",
          }}
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span className="flex-1 text-foreground">{error}</span>
          <button
            type="button"
            onClick={onDismissError}
            className="text-xs font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {notConfigured ? (
        <div
          className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium"
          style={{
            borderColor: "color-mix(in oklch, var(--chart-5) 45%, var(--border))",
            background: "color-mix(in oklch, var(--chart-5) 12%, var(--card))",
          }}
        >
          <AlertTriangle className="size-4 shrink-0" style={{ color: "var(--chart-5)" }} />
          <span className="text-foreground">
            Discord is not configured — sending is unavailable.
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onDownload}
          disabled={isGenerating}
          className={BTN}
          style={{
            background: "var(--chart-2)",
            borderColor: "var(--chart-2)",
            color: "#fff",
          }}
        >
          {isGenerating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Download Image
        </button>

        <button
          type="button"
          onClick={onDiscord}
          disabled={isUploading || isGenerating || notConfigured}
          title={notConfigured ? "Discord webhook is not configured" : undefined}
          className={`${BTN} bg-card text-foreground`}
        >
          {isUploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Send to Discord
        </button>

        <button
          type="button"
          onClick={onReset}
          className={`${BTN} bg-card text-foreground sm:max-w-[8rem]`}
        >
          <RotateCcw className="size-4" />
          Reset
        </button>
      </div>
    </div>
  );
}
