import * as React from "react";
import { glyphRegistry } from "./glyphs";
import { getIconKey } from "./iconMap";

export interface LaundryIconProps {
  /** Real item name (e.g. "T-shirts", "Bed Sheets", or any custom label). */
  name: string;
  /** Size and color come from the parent via utility classes (width/height, text color). */
  className?: string;
  /**
   * Accessible label. When provided, the icon is exposed as an image with a
   * `<title>`. When omitted, the icon is decorative (`aria-hidden`).
   */
  titleText?: string;
}

/**
 * Public, reusable laundry glyph. Resolves the item name to a curated glyph and
 * renders it as an inline SVG that inherits `currentColor`, so the parent fully
 * controls tint and size.
 */
export function LaundryIcon({
  name,
  className,
  titleText,
}: LaundryIconProps): React.JSX.Element {
  const Glyph = glyphRegistry[getIconKey(name)];

  if (titleText) {
    return (
      <Glyph className={className} role="img">
        <title>{titleText}</title>
      </Glyph>
    );
  }

  return <Glyph className={className} aria-hidden="true" />;
}
