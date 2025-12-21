/**
 * Tests for CustomItems component
 * 
 * Tests custom item management: adding, removing, and updating custom items
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CustomItems from '@/components/LaundryCounter/CustomItems';

// Mock the ItemControls component to simplify testing
jest.mock('@/components/LaundryCounter/ItemControls', () => {
  return function MockItemControls(props: any) {
    return (
      <div data-testid={`mock-item-controls-${props.name}`}>
        <span>{props.name}</span>
        <button onClick={props.onIncrement}>increment</button>
        <button onClick={props.onDecrement}>decrement</button>
        <input 
          value={props.value} 
          onChange={(e) => props.onChange(Number(e.target.value))} 
          aria-label={`${props.name} input`}
        />
        {props.isCustom && props.onRemove && (
          <button onClick={props.onRemove}>remove</button>
        )}
      </div>
    );
  };
});

describe('CustomItems', () => {
  const mockProps = {
    customItems: {
      'Socks': 3,
      'Gloves': 5,
    },
    onAddItem: jest.fn(),
    onUpdateCount: jest.fn(),
    onSetCount: jest.fn(),
    onRemoveItem: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render section title', () => {
      render(<CustomItems {...mockProps} />);
      expect(screen.getByText('Custom Items (this cannot be added in the image)')).toBeInTheDocument();
    });

    it('should render input and add button', () => {
      render(<CustomItems {...mockProps} />);
      expect(screen.getByPlaceholderText('Add custom item')).toBeInTheDocument();
      expect(screen.getByText('Add')).toBeInTheDocument();
    });

    it('should render existing custom items', () => {
      render(<CustomItems {...mockProps} />);
      expect(screen.getByText('Socks')).toBeInTheDocument();
      expect(screen.getByText('Gloves')).toBeInTheDocument();
    });

    it('should render mock ItemControls for each custom item', () => {
      render(<CustomItems {...mockProps} />);
      expect(screen.getByTestId('mock-item-controls-Socks')).toBeInTheDocument();
      expect(screen.getByTestId('mock-item-controls-Gloves')).toBeInTheDocument();
    });

    it('should show empty state when no custom items', () => {
      render(<CustomItems {...mockProps} customItems={{}} />);
      expect(screen.getByText('No custom items added yet')).toBeInTheDocument();
      // Should not show any item controls
      expect(screen.queryByTestId(/mock-item-controls/)).not.toBeInTheDocument();
    });

    it('should not show empty state when there are items', () => {
      render(<CustomItems {...mockProps} />);
      expect(screen.queryByText('No custom items added yet')).not.toBeInTheDocument();
    });
  });

  describe('adding custom items', () => {
    it('should call onAddItem with trimmed name when Add button clicked', () => {
      render(<CustomItems {...mockProps} />);
      const input = screen.getByPlaceholderText('Add custom item');
      const addButton = screen.getByText('Add');

      fireEvent.change(input, { target: { value: '  New Item  ' } });
      fireEvent.click(addButton);

      expect(mockProps.onAddItem).toHaveBeenCalledWith('New Item');
    });

    it('should call onAddItem when Enter key pressed', () => {
      render(<CustomItems {...mockProps} />);
      const input = screen.getByPlaceholderText('Add custom item');

      fireEvent.change(input, { target: { value: 'New Item' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockProps.onAddItem).toHaveBeenCalledWith('New Item');
    });

    it('should clear input after adding item', () => {
      render(<CustomItems {...mockProps} />);
      const input = screen.getByPlaceholderText('Add custom item') as HTMLInputElement;
      const addButton = screen.getByText('Add');

      fireEvent.change(input, { target: { value: 'New Item' } });
      fireEvent.click(addButton);

      expect(input.value).toBe('');
    });

    it('should not call onAddItem when input is empty or whitespace', () => {
      render(<CustomItems {...mockProps} />);
      const input = screen.getByPlaceholderText('Add custom item');
      const addButton = screen.getByText('Add');

      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.click(addButton);

      expect(mockProps.onAddItem).not.toHaveBeenCalled();
    });

    it('should not call onAddItem when Enter key pressed on empty input', () => {
      render(<CustomItems {...mockProps} />);
      const input = screen.getByPlaceholderText('Add custom item');

      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockProps.onAddItem).not.toHaveBeenCalled();
    });

    it('should ignore other keys', () => {
      render(<CustomItems {...mockProps} />);
      const input = screen.getByPlaceholderText('Add custom item');

      fireEvent.change(input, { target: { value: 'New Item' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(mockProps.onAddItem).not.toHaveBeenCalled();
    });
  });

  describe('updating custom items', () => {
    it('should call onUpdateCount with delta when increment clicked', () => {
      render(<CustomItems {...mockProps} />);
      const incrementButtons = screen.getAllByText('increment');
      fireEvent.click(incrementButtons[0]); // First item
      expect(mockProps.onUpdateCount).toHaveBeenCalledWith('Socks', 1);
    });

    it('should call onUpdateCount with delta when decrement clicked', () => {
      render(<CustomItems {...mockProps} />);
      const decrementButtons = screen.getAllByText('decrement');
      fireEvent.click(decrementButtons[0]);
      expect(mockProps.onUpdateCount).toHaveBeenCalledWith('Socks', -1);
    });

    it('should call onSetCount when input value changed', () => {
      render(<CustomItems {...mockProps} />);
      const inputs = screen.getAllByLabelText(/input/);
      fireEvent.change(inputs[0], { target: { value: '10' } });
      expect(mockProps.onSetCount).toHaveBeenCalledWith('Socks', 10);
    });

    it('should call onRemoveItem when remove button clicked', () => {
      render(<CustomItems {...mockProps} />);
      const removeButtons = screen.getAllByText('remove');
      fireEvent.click(removeButtons[0]);
      expect(mockProps.onRemoveItem).toHaveBeenCalledWith('Socks');
    });
  });

  describe('edge cases', () => {
    it('should handle empty customItems object', () => {
      const props = { ...mockProps, customItems: {} };
      render(<CustomItems {...props} />);
      expect(screen.getByText('No custom items added yet')).toBeInTheDocument();
    });

    it('should handle customItems with zero count', () => {
      const props = { ...mockProps, customItems: { 'Hat': 0 } };
      render(<CustomItems {...props} />);
      expect(screen.getByText('Hat')).toBeInTheDocument();
    });

    it('should handle long item names', () => {
      const longName = 'A very long custom item name that might break layout';
      const props = { ...mockProps, customItems: { [longName]: 1 } };
      render(<CustomItems {...props} />);
      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it('should not break when onUpdateCount is not provided (should not happen)', () => {
      // According to props interface, onUpdateCount is required, but we can still test
      // that the component doesn't crash if somehow undefined.
      const props = { ...mockProps, onUpdateCount: undefined as any };
      expect(() => render(<CustomItems {...props} />)).not.toThrow();
    });
  });

  describe('accessibility', () => {
    it('should have aria-label on input', () => {
      render(<CustomItems {...mockProps} />);
      const input = screen.getByLabelText('New custom item name');
      expect(input).toBeInTheDocument();
    });

    it('should have proper labels for buttons', () => {
      render(<CustomItems {...mockProps} />);
      const addButton = screen.getByText('Add');
      expect(addButton).toBeInTheDocument();
    });
  });
});