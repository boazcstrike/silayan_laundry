/**
 * Tests for hooks/usePrefillCounts.ts
 *
 * Covers the mount-only one-shot application of `/?prefill=<token>` counts,
 * including the confirm-before-overwrite guard and the always-strip-URL
 * behavior. See __tests__/hooks/useLaundryItems.test.ts for the renderHook
 * idiom this file follows.
 */

import { renderHook, act } from '@testing-library/react';
import { usePrefillCounts, UsePrefillCountsParams } from '@/hooks/usePrefillCounts';
import { PREFILL_PARAM, encodePrefillParam } from '@/lib/prefill';

const CONFIRM_MESSAGE = 'Replace your current counts with the forecast?';

const setUrl = (search: string) => {
  window.history.pushState({}, '', search ? `/?${search}` : '/');
};

const buildParams = (
  overrides: Partial<UsePrefillCountsParams> = {},
): UsePrefillCountsParams => ({
  knownItemNames: new Set(['T-shirts', 'Towels']),
  setCount: jest.fn(),
  addCustomItem: jest.fn(),
  getCurrentTotal: jest.fn(() => 0),
  ...overrides,
});

describe('usePrefillCounts', () => {
  let replaceStateSpy: jest.SpyInstance;

  beforeAll(() => {
    // jsdom does not implement window.confirm; assign directly like
    // __tests__/hooks/useLaundryItems.test.ts does for the same reason.
    window.confirm = jest.fn();
  });

  beforeEach(() => {
    jest.useFakeTimers();
    replaceStateSpy = jest.spyOn(window.history, 'replaceState');
    (window.confirm as jest.Mock).mockReset();
  });

  afterEach(() => {
    setUrl('');
    replaceStateSpy.mockRestore();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('applies known item counts when no existing counts are present', () => {
    // Arrange
    const token = encodePrefillParam({ 'T-shirts': 3 });
    setUrl(`${PREFILL_PARAM}=${token}`);
    const params = buildParams();

    // Act
    renderHook(() => usePrefillCounts(params));
    act(() => {
      jest.advanceTimersByTime(0);
    });

    // Assert
    expect(params.setCount).toHaveBeenCalledWith('T-shirts', 3);
    expect(params.addCustomItem).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
    expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/');
  });

  test('adds an unknown item as custom then sets its count', () => {
    // Arrange
    const token = encodePrefillParam({ 'Mystery Item': 5 });
    setUrl(`${PREFILL_PARAM}=${token}`);
    const params = buildParams();

    // Act
    renderHook(() => usePrefillCounts(params));
    act(() => {
      jest.advanceTimersByTime(0);
    });

    // Assert
    expect(params.addCustomItem).toHaveBeenCalledWith('Mystery Item');
    expect(params.setCount).toHaveBeenCalledWith('Mystery Item', 5, true);
    // addCustomItem must register the item before setCount assigns its value.
    const addOrder = (params.addCustomItem as jest.Mock).mock.invocationCallOrder[0];
    const setOrder = (params.setCount as jest.Mock).mock.invocationCallOrder[0];
    expect(addOrder).toBeLessThan(setOrder);
  });

  test('does nothing when no prefill param is present', () => {
    // Arrange
    setUrl('');
    const params = buildParams();

    // Act
    renderHook(() => usePrefillCounts(params));
    act(() => {
      jest.advanceTimersByTime(0);
    });

    // Assert
    expect(params.setCount).not.toHaveBeenCalled();
    expect(params.addCustomItem).not.toHaveBeenCalled();
    expect(replaceStateSpy).not.toHaveBeenCalled();
  });

  test('silently strips a malformed prefill token without applying counts', () => {
    // Arrange
    setUrl(`${PREFILL_PARAM}=not-a-valid-token`);
    const params = buildParams();

    // Act
    renderHook(() => usePrefillCounts(params));
    act(() => {
      jest.advanceTimersByTime(0);
    });

    // Assert
    expect(params.setCount).not.toHaveBeenCalled();
    expect(params.addCustomItem).not.toHaveBeenCalled();
    expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/');
  });

  test('aborts without applying counts when an existing total is declined', () => {
    // Arrange
    const token = encodePrefillParam({ 'T-shirts': 2 });
    setUrl(`${PREFILL_PARAM}=${token}`);
    const params = buildParams({ getCurrentTotal: jest.fn(() => 4) });
    (window.confirm as jest.Mock).mockReturnValue(false);

    // Act
    renderHook(() => usePrefillCounts(params));
    act(() => {
      jest.advanceTimersByTime(0);
    });

    // Assert
    expect(window.confirm).toHaveBeenCalledWith(CONFIRM_MESSAGE);
    expect(params.setCount).not.toHaveBeenCalled();
    expect(params.addCustomItem).not.toHaveBeenCalled();
    // Even a declined prefill is one-shot: the URL is still stripped.
    expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/');
  });

  test('applies counts when an existing total is confirmed', () => {
    // Arrange
    const token = encodePrefillParam({ 'T-shirts': 2 });
    setUrl(`${PREFILL_PARAM}=${token}`);
    const params = buildParams({ getCurrentTotal: jest.fn(() => 4) });
    (window.confirm as jest.Mock).mockReturnValue(true);

    // Act
    renderHook(() => usePrefillCounts(params));
    act(() => {
      jest.advanceTimersByTime(0);
    });

    // Assert
    expect(window.confirm).toHaveBeenCalledWith(CONFIRM_MESSAGE);
    expect(params.setCount).toHaveBeenCalledWith('T-shirts', 2);
    expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/');
  });

  test('applies the prefill only once even if the hook re-renders', () => {
    // Arrange
    const token = encodePrefillParam({ 'T-shirts': 3 });
    setUrl(`${PREFILL_PARAM}=${token}`);
    const firstParams = buildParams();

    // Act
    const { rerender } = renderHook(
      (props: UsePrefillCountsParams) => usePrefillCounts(props),
      { initialProps: firstParams },
    );
    act(() => {
      jest.advanceTimersByTime(0);
    });

    const secondParams = buildParams();
    rerender(secondParams);
    act(() => {
      jest.advanceTimersByTime(0);
    });

    // Assert
    expect(firstParams.setCount).toHaveBeenCalledTimes(1);
    expect(secondParams.setCount).not.toHaveBeenCalled();
  });
});
