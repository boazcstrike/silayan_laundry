/**
 * CategorySection component
 * Renders a group of items in a category
 */

import React from 'react';
import ItemControls from './ItemControls';
import { CategorySectionProps } from '@/lib/types/components';

/**
 * Component for rendering a category of laundry items
 * Displays title and all items in the category with controls
 */
const CategorySection: React.FC<CategorySectionProps> = ({
  title,
  items,
  counts,
  onUpdateCount,
  onSetCount,
}) => {
  return (
    <div className="category-section" data-testid={`category-section-${title}`}>
      <h2 className="text-lg font-semibold mb-2 text-right">{title}</h2>
      {items.map((item) => (
        <ItemControls
          key={item.name}
          name={item.name}
          value={counts[item.name] || 0}
          onIncrement={() => onUpdateCount(item.name, 1)}
          onDecrement={() => onUpdateCount(item.name, -1)}
          onChange={(value) => onSetCount(item.name, value)}
        />
      ))}
    </div>
  );
};

export default CategorySection;