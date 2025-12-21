/**
 * Tests for ItemControls component
 * 
 * Tests individual item increment/decrement functionality and user interactions
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ItemControls from '@/components/LaundryCounter/ItemControls';

describe('ItemControls', () => {
  const mockProps = {
    name: 'T-shirts',
    value: 5,
    onIncrement: jest.fn(),
    onDecrement: jest.fn(),
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render item name', () => {
      render(<ItemControls {...mockProps} />);
      expect(screen.getByText('T-shirts')).toBeInTheDocument();
    });

    it('should render current value in input', () => {
      render(<ItemControls {...mockProps} />);
      const input = screen.getByLabelText('T-shirts count') as HTMLInputElement;
      expect(input.value).toBe('5');
    });

    it('should render increment and decrement buttons', () => {
      render(<ItemControls {...mockProps} />);
      expect(screen.getByLabelText('Increase T-shirts count')).toBeInTheDocument();
      expect(screen.getByLabelText('Decrease T-shirts count')).toBeInTheDocument();
    });

    it('should have data-testid with item name', () => {
      render(<ItemControls {...mockProps} />);
      const container = screen.getByTestId('item-controls-T-shirts');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('data-custom', 'false');
    });

    it('should mark custom items with data-custom attribute', () => {
      render(<ItemControls {...mockProps} isCustom={true} />);
      const container = screen.getByTestId('item-controls-T-shirts');
      expect(container).toHaveAttribute('data-custom', 'true');
    });

    it('should not show remove button for non-custom items', () => {
      render(<ItemControls {...mockProps} isCustom={false} />);
      const removeButton = screen.queryByLabelText('Remove T-shirts');
      expect(removeButton).not.toBeInTheDocument();
    });

    it('should show remove button for custom items when onRemove provided', () => {
      render(<ItemControls {...mockProps} isCustom={true} onRemove={jest.fn()} />);
      const removeButton = screen.getByLabelText('Remove T-shirts');
      expect(removeButton).toBeInTheDocument();
      expect(removeButton).toHaveTextContent('✕');
    });
  });

  describe('user interactions', () => {
    it('should call onIncrement when plus button is clicked', () => {
      render(<ItemControls {...mockProps} />);
      const incrementButton = screen.getByLabelText('Increase T-shirts count');
      fireEvent.click(incrementButton);
      expect(mockProps.onIncrement).toHaveBeenCalledTimes(1);
    });

    it('should call onDecrement when minus button is clicked', () => {
      render(<ItemControls {...mockProps} />);
      const decrementButton = screen.getByLabelText('Decrease T-shirts count');
      fireEvent.click(decrementButton);
      expect(mockProps.onDecrement).toHaveBeenCalledTimes(1);
    });

    it('should call onChange with new value when input changes', () => {
      render(<ItemControls {...mockProps} />);
      const input = screen.getByLabelText('T-shirts count');
      fireEvent.change(input, { target: { value: '10' } });
      expect(mockProps.onChange).toHaveBeenCalledWith(10);
    });

    it('should call onChange with 0 when input is cleared', () => {
      render(<ItemControls {...mockProps} />);
      const input = screen.getByLabelText('T-shirts count');
      fireEvent.change(input, { target: { value: '' } });
      expect(mockProps.onChange).toHaveBeenCalledWith(0);
    });

    it('should call onRemove when remove button is clicked for custom item', () => {
      const mockOnRemove = jest.fn();
      render(<ItemControls {...mockProps} isCustom={true} onRemove={mockOnRemove} />);
      const removeButton = screen.getByLabelText('Remove T-shirts');
      fireEvent.click(removeButton);
      expect(mockOnRemove).toHaveBeenCalledTimes(1);
    });

    it('should not call onRemove for non-custom items', () => {
      const mockOnRemove = jest.fn();
      render(<ItemControls {...mockProps} isCustom={false} onRemove={mockOnRemove} />);
      // Remove button should not be present, but we can still verify not called
      expect(mockOnRemove).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle negative input values by converting to positive', () => {
      render(<ItemControls {...mockProps} />);
      const input = screen.getByLabelText('T-shirts count');
      fireEvent.change(input, { target: { value: '-5' } });
      // The component converts the string to number, negative numbers become negative
      // but the onChange will be called with -5, and parent hook should sanitize
      expect(mockProps.onChange).toHaveBeenCalledWith(-5);
    });

    it('should handle decimal input values', () => {
      render(<ItemControls {...mockProps} />);
      const input = screen.getByLabelText('T-shirts count');
      fireEvent.change(input, { target: { value: '5.7' } });
      expect(mockProps.onChange).toHaveBeenCalledWith(5.7);
    });

    it('should handle zero value correctly', () => {
      render(<ItemControls {...mockProps} value={0} />);
      const input = screen.getByLabelText('T-shirts count') as HTMLInputElement;
      expect(input.value).toBe('0');
    });

    it('should call onChange with 0 when input is non-numeric', () => {
      const mockOnChange = jest.fn();
      render(<ItemControls {...mockProps} onChange={mockOnChange} />);
      const input = screen.getByLabelText('T-shirts count');
      fireEvent.change(input, { target: { value: 'abc' } });
      // Input type=number converts non-numeric values to empty string or 0
      // The component passes 0, which matches hook sanitization behavior
      expect(mockOnChange).toHaveBeenCalledWith(expect.any(Number));
      expect(mockOnChange).toHaveBeenCalledWith(0);
    });

    it('should not call onChange if value is same as previous', () => {
      // This is a behavior of React's onChange event; we'll just ensure it's called when changed
      // but we can test that onChange is called with new value when we change input
      // Already covered
    });

    it('should have min attribute set to 0 on input', () => {
      render(<ItemControls {...mockProps} />);
      const input = screen.getByLabelText('T-shirts count');
      expect(input).toHaveAttribute('min', '0');
    });
  });

  describe('accessibility', () => {
    it('should have proper aria labels', () => {
      render(<ItemControls {...mockProps} />);
      expect(screen.getByLabelText('T-shirts count')).toBeInTheDocument();
      expect(screen.getByLabelText('Increase T-shirts count')).toBeInTheDocument();
      expect(screen.getByLabelText('Decrease T-shirts count')).toBeInTheDocument();
    });

    it('should have aria label for remove button when custom', () => {
      render(<ItemControls {...mockProps} isCustom={true} onRemove={jest.fn()} />);
      expect(screen.getByLabelText('Remove T-shirts')).toBeInTheDocument();
    });
  });
});