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
  isGeneratingImage = false,
  error,
}) => {
  return (
    <div className="mt-8 flex flex-col gap-3" data-testid="action-buttons">
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={onReset}>
          Reset Counts
        </Button>
        <Button 
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
          variant="secondary"
          onClick={onSendToDiscord}
          disabled={isSendingToDiscord || isGeneratingImage}
        >
          {isSendingToDiscord && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {isSendingToDiscord ? 'Sending...' : 'Send to Discord'}
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          <div className="font-medium">Error</div>
          <div>{error}</div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Tip: Life is good.
      </p>
    </div>
  );
};

export default ActionButtons;