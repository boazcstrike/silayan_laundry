/**
 * ItemControls component
 * Renders individual item increment/decrement controls
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { ItemControlsProps } from '@/lib/types/components';

/**
 * Component for controlling individual item counts
 * Provides increment/decrement buttons and direct input
 */
const ItemControls: React.FC<ItemControlsProps> = ({
  name,
  value,
  onIncrement,
  onDecrement,
  onChange,
  isCustom = false,
  onRemove,
}) => {
  return (
    <div
      className="flex items-center gap-1 mb-2 min-h-[48px]"
      data-testid={`item-controls-${name}`}
      data-custom={isCustom}
    >
      <div className="flex-1 min-w-0">
        <span className="block font-normal text-base break-words text-right pr-2">
          {name}
          {isCustom && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="ml-2 text-sm text-red-500 hover:text-red-700"
              aria-label={`Remove ${name}`}
            >
              ✕
            </button>
          )}
        </span>
      </div>
      <Button 
        onClick={onDecrement}
        aria-label={`Decrease ${name} count`}
        size="sm"
      >
        -
      </Button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        className="no-spinner h-9 w-9 rounded-md border bg-background px-2 text-center text-sm"
        value={value}
        onChange={(e) => {
          const next = e.target.value === '' ? 0 : Number(e.target.value);
          onChange(next);
        }}
        aria-label={`${name} count`}
      />
      <Button 
        onClick={onIncrement}
        aria-label={`Increase ${name} count`}
        size="sm"
      >
        +
      </Button>
    </div>
  );
};

export default ItemControls;