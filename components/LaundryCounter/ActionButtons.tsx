/**
 * ActionButtons component
 * Renders action buttons (Reset, Download, Send to Discord)
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActionButtonsProps } from '@/lib/types/components';

/**
 * Component for action buttons in the laundry counter
 * Provides reset, download, and Discord upload functionality
 */
const ActionButtons: React.FC<ActionButtonsProps> = ({
  onReset,
  onDownload,
  onSendToDiscord,
  isSendingToDiscord,
  isDiscordConfigured,
  isGeneratingImage = false,
  error,
}) => {
  return (
    <div className="mt-8 flex flex-col gap-3" data-testid="action-buttons">
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={onReset}>
          Reset Counts
        </Button>
        <Button
          type="button"
          onClick={onDownload}
          disabled={isGeneratingImage}
        >
          {isGeneratingImage ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Generating...
            </>
          ) : (
            'Download Image'
          )}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onSendToDiscord}
          disabled={isSendingToDiscord || isGeneratingImage || isDiscordConfigured === false}
          title={isDiscordConfigured === false ? 'Discord webhook URL is not configured' : undefined}
        >
          {isSendingToDiscord && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {isSendingToDiscord ? 'Sending...' : 'Send to Discord'}
        </Button>
      </div>

      {isDiscordConfigured === false && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-md text-sm">
          <div className="font-medium">Discord Not Configured</div>
          <div>
            The <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">DISCORD_WEBHOOK_URL</code> environment variable is not set.
            Set it in <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">.env.local</code> to enable Discord uploads.
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          <div className="font-medium">Error</div>
          <div>{error}</div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Tip: Life is good.
      </p>
    </div>
  );
};

export default ActionButtons;
