/**
 * CustomItems component
 * Manages custom (user-added) items
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import ItemControls from './ItemControls';
import { CustomItemsProps } from '@/lib/types/components';

/**
 * Component for managing custom laundry items
 * Allows adding new custom items and controlling their counts
 */
const CustomItems: React.FC<CustomItemsProps> = ({
  customItems,
  onAddItem,
  onUpdateCount,
  onSetCount,
  onRemoveItem,
}) => {
  const [newItemName, setNewItemName] = useState('');

  const handleAddItem = () => {
    if (newItemName.trim()) {
      onAddItem(newItemName.trim());
      setNewItemName('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddItem();
    }
  };

  return (
    <div className="mb-6" data-testid="custom-items-section">
      <h2 className="text-lg font-semibold mb-2">
        Custom Items (this cannot be added in the image)
      </h2>
      <div className="flex gap-2 mb-2">
        <input
          className="border px-2 py-1 flex-1"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add custom item"
          aria-label="New custom item name"
        />
        <Button onClick={handleAddItem}>Add</Button>
      </div>
      {Object.entries(customItems).map(([name, value]) => (
        <ItemControls
          key={name}
          name={name}
          value={value}
          isCustom={true}
          onIncrement={() => onUpdateCount(name, 1)}
          onDecrement={() => onUpdateCount(name, -1)}
          onChange={(value) => onSetCount(name, value)}
          onRemove={() => onRemoveItem(name)}
        />
      ))}
      {Object.keys(customItems).length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No custom items added yet
        </p>
      )}
    </div>
  );
};

export default CustomItems;