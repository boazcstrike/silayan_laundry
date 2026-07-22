"use client";

import { AlertTriangle, Download, Loader2, RotateCcw } from "lucide-react";

/** Discord brand glyph (lucide dropped brand icons; inline the official mark). */
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9459 2.4189-2.1568 2.4189Z" />
    </svg>
  );
}

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
            <DiscordIcon className="size-4" />
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
