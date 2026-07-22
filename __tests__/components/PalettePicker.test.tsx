/**
 * Tests for PalettePicker + ThemeProvider palette support
 *
 * Covers opening the theme menu, switching palettes (data-palette attribute +
 * localStorage persistence), and restoring a persisted palette on mount.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { PalettePicker } from '@/components/PalettePicker';
import { PALETTE_OPTIONS, ThemeProvider } from '@/components/ThemeProvider';

function renderPicker() {
  return render(
    <ThemeProvider>
      <PalettePicker />
    </ThemeProvider>
  );
}

// jsdom does not implement matchMedia, which ThemeProvider uses for the
// system dark-mode preference fallback.
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
});

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.palette;
  document.documentElement.classList.remove('dark');
});

describe('PalettePicker', () => {
  it('lists every palette when opened', async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole('button', { name: /choose color theme/i }));

    const options = screen.getAllByRole('menuitemradio');
    expect(options).toHaveLength(PALETTE_OPTIONS.length);
    expect(screen.getByText('Ocean Tide')).toBeInTheDocument();
  });

  it('applies data-palette and persists the choice when a palette is selected', async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole('button', { name: /choose color theme/i }));
    await user.click(screen.getByText('Warm Ember'));

    expect(document.documentElement.dataset.palette).toBe('warm');
    expect(localStorage.getItem('palette')).toBe('warm');
  });

  it('removes data-palette when switching back to the default palette', async () => {
    const user = userEvent.setup();
    localStorage.setItem('palette', 'tech');
    renderPicker();

    await user.click(screen.getByRole('button', { name: /choose color theme/i }));
    await user.click(screen.getByText('Fresh (default)'));

    expect(document.documentElement.dataset.palette).toBeUndefined();
    expect(localStorage.getItem('palette')).toBe('default');
  });

  it('restores a persisted palette on mount', () => {
    localStorage.setItem('palette', 'elegant');
    renderPicker();

    expect(document.documentElement.dataset.palette).toBe('elegant');
  });

  it('ignores an invalid persisted palette', () => {
    localStorage.setItem('palette', 'neon-zebra');
    renderPicker();

    expect(document.documentElement.dataset.palette).toBeUndefined();
  });
});
