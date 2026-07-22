"use client";

/**
 * PalettePicker component
 * A dropdown in the top bar for switching between the color palettes defined
 * in app/themes.css. Each option previews its load-gauge gradient stops.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, Palette as PaletteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PALETTE_OPTIONS,
  useTheme,
  type Palette,
} from "@/components/ThemeProvider";

export function PalettePicker() {
  const { palette, setPalette } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setIsOpen(false), []);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        close();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, close]);

  const handleSelect = (id: Palette) => {
    setPalette(id);
    close();
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Choose color theme"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="h-9 w-9"
      >
        <PaletteIcon className="h-5 w-5" />
      </Button>

      {isOpen ? (
        <div
          role="menu"
          aria-label="Color themes"
          className="absolute right-0 top-full z-50 mt-2 w-48 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {PALETTE_OPTIONS.map((option) => {
            const isActive = option.id === palette;
            return (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => handleSelect(option.id)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <span className="flex shrink-0 items-center gap-0.5">
                  {option.swatches.map((swatch, index) => (
                    <span
                      key={index}
                      className="size-2.5 rounded-full border border-black/10"
                      style={{ background: swatch }}
                    />
                  ))}
                </span>
                <span className="flex-1 truncate">{option.label}</span>
                {isActive ? <Check className="size-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default PalettePicker;
