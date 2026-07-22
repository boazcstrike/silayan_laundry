import * as React from "react";

/**
 * Union of every glyph the curated laundry icon set can render.
 * `iconMap.ts` maps real item names onto these keys, and `glyphRegistry`
 * (below) maps each key onto its inline SVG component.
 */
export type GlyphKey =
  | "shirt"
  | "shirtFormal"
  | "tshirt"
  | "tank"
  | "blouse"
  | "coat"
  | "cap"
  | "pants"
  | "shorts"
  | "skirt"
  | "dress"
  | "overalls"
  | "bra"
  | "underwear"
  | "stocking"
  | "socks"
  | "sheet"
  | "blanket"
  | "towel"
  | "pillow"
  | "mat"
  | "bag"
  | "shoe"
  | "generic";

/**
 * Props shared by every glyph. It is the native SVG element prop bag, so the
 * public `LaundryIcon` can forward `className`, `role`, `aria-hidden`, and a
 * `<title>` child straight through to the underlying `<svg>`.
 */
export type GlyphProps = React.SVGProps<SVGSVGElement>;

/**
 * Shared frame: applies the hard style contract (24x24 viewBox, currentColor
 * stroke, no fill, 1.6 stroke width, round caps/joins) so individual glyphs
 * only declare their own paths. Extra props (className, aria, title child)
 * are spread onto the root `<svg>`.
 */
function Frame({ children, ...rest }: GlyphProps): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

// A small solid dot used sparingly for buttons/tufts (minimal fills allowed).
function Dot({ cx, cy }: { cx: number; cy: number }): React.JSX.Element {
  return <circle cx={cx} cy={cy} r={0.55} fill="currentColor" stroke="none" />;
}

export function Shirt({ children, ...rest }: GlyphProps): React.JSX.Element {
  return (
    <Frame {...rest}>
      <path d="M8 4 L4 7 L6 10 L8 9 L8 20 L16 20 L16 9 L18 10 L20 7 L16 4" />
      <path d="M10 4 L12 7 L14 4 M12 7 L12 11" />
      {children}
    </Frame>
  );
}

export function ShirtFormal({ children, ...rest }: GlyphProps): React.JSX.Element {
  return (
    <Frame {...rest}>
      <path d="M8 5 L5 8 L7 10 L8 9.2 L8 20 L16 20 L16 9.2 L17 10 L19 8 L16 5" />
      <path d="M10 5 L12 8 L14 5 M12 8 L12 19" />
      <Dot cx={12} cy={11} />
      <Dot cx={12} cy={14} />
      <Dot cx={12} cy={17} />
      {children}
    </Frame>
  );
}

export function Tshirt({ children, ...rest }: GlyphProps): React.JSX.Element {
  return (
    <Frame {...rest}>
      <path d="M8 4 L4 7 L6 10 L8 9 L8 20 L16 20 L16 9 L18 10 L20 7 L16 4 C15 6.5 9 6.5 8 4 Z" />
      {children}
    </Frame>
  );
}

export function Tank({ children, ...rest }: GlyphProps): React.JSX.Element {
  return (
    <Frame {...rest}>
      <path d="M9 20 L9 7 C9 4 10.5 4 11 6 C11.5 7.5 12.5 7.5 13 6 C13.5 4 15 4 15 7 L15 20 Z" />
      {children}
    </Frame>
  );
}

export function Blouse({ children, ...rest }: GlyphProps): React.JSX.Element {
  return (
    <Frame {...rest}>
      <path d="M9 4 L5 6 L6 9 L9 8 L8 20 L16 20 L15 8 L18 9 L19 6 L15 4" />
      <path d="M11 4 L12 7 L13 4" />
      {children}
    </Frame>
  );
}

export function Coat({ children, ...rest }: GlyphProps): React.JSX.Element {
  return (
    <Frame {...rest}>
      <path d="M8 5 L5 7 L6 20 L18 20 L19 7 L16 5" />
      <path d="M12 9 L9 5 M12 9 L15 5 M12 9 L12 20" />
      <Dot cx={12} cy={12} />
      <Dot cx={12} cy={15} />
      {children}
    </Frame>
  );
}

export function Cap({ children, ...rest }: GlyphProps): React.JSX.Element {
  return (
    <Frame {...rest}>
      <path d="M5 14 C5 8 19 8 19 14" />
      <path d="M5 14 L19 14 M19 14 L22 15 C22 16.2 20 16.2 19 15" />
      <path d="M12 8 L12 6" />
      {children}
    </Frame>
  );
}

export function Pants({ children, ...rest }: GlyphProps): React.JSX.Element {
  return (
    <Frame {...rest}>
      <path d="M7 4 L17 4 L17 20 L13.5 20 L12 10 L10.5 20 L7 20 Z" />
      <path d="M7 4 L17 4" />
      {children}
    </Frame>
  );
}

export function Shorts({ children, ...rest }: GlyphProps): React.JSX.Element {
  return (
    <Frame {...rest}>
      <path d="M7 5 L17 5 L17 14 L13.5 14 L12 9 L10.5 14 L7 14 Z" />
      <path d="M7 5 L17 5" />
      {children}
    </Frame>
  );
}

export function Skirt({ children, ...rest }: GlyphProps): React.JSX.Element {
  return (
    <Frame {...rest}>
      <path d="M9 6 L15 6 L18 19 L6 19 Z" />
      <path d="M12 6 L12 19 M8.5 8 L7 19 M15.5 8 L17 19" />
      {children}
    </Frame>
  );
}

export function Dress({ children, ...rest }: GlyphProps): React.JSX.Element {
  return (
    <Frame {...rest}>
      <path d="M9 5 C10 3 14 3 15 5 L14 11 L17 20 L7 20 L10 11 Z" />
      <path d="M10 11 L14 11" />
      {children}
    </Frame>
  );
}

export function Overalls({ children, ...rest }: GlyphProps): React.JSX.Element {
  return (
    <Frame {...rest}>
      <path d="M8 9 L7 20 L11 20 L12 13 L13 20 L17 20 L16 9" />
      <path d="M9 9 L9 5 L15 5 L15 9" />
      <path d="M9 5 L9 3 M15 5 L15 3" />
      <Dot cx={10} cy={7} />
      <Dot cx={14} cy={7} />
      {children}
    </Frame>
  );
}

export function Bra({ children, ...rest }: GlyphProps): React.JSX.Element {
  return (
    <Frame {...rest}>
      <path d="M5 9 L19 9" />
      <path d="M5 9 C5 13 11 13 11 9 M13 9 C13 13 19 13 19 9" />
      <path d="M11 9 L13 9" />
      <path d="M5 9 L7 6 M19 9 L17 6" />
      {children}
    </Frame>
  );
}

export function Underwear({ children, ...rest }: GlyphProps): React.JSX.Element {
  return (
    <Frame {...rest}>
      <path d="M5 8 L19 8" />
      <path d="M5 8 L9 15 C11 17 13 17 15 15 L19 8" />
      {children}
    </Frame>
  );
}

export function Stocking({ children, ...rest }: GlyphProps): React.JSX.Element {
  return (
    <Frame {...rest}>
      <path d="M9.5 4 L9.5 18 C8.5 21 12.5 22 13.5 20 L14.5 18 L14.5 4" />
      <path d="M9.5 4 L14.5 4 M9.5 6.5 L14.5 6.5" />
      {children}
    </Frame>
  );
}

export function Socks({ children, ...rest }: GlyphProps): React.JSX.Element {
  return (
    <Frame {...rest}>
      <path d="M9 4 L9 13 L6.5 16.5 C5.2 18.5 8.5 20.5 10 19 L13 15.5 L13 4" />
      <path d="M9 4 L13 4 M9 6.5 L13 6.5" />
      {children}
    </Frame>
  );
}

export function Sheet({ children, ...rest }: GlyphProps): React.JSX.Element {
  return (
    <Frame {...rest}>
      <path d="M5 6 L15 6 L19 10 L19 18 L5 18 Z" />
      <path d="M15 6 L15 10 L19 10" />
      {children}
    </Frame>
  );
}

export function Blanket({ children, ...rest }: GlyphProps): React.JSX.Element {
  return (
    <Frame {...rest}>
      <path d="M4 7 L20 7 L20 16 C18 18 16 15 14 17 C12 19 10 15 8 17 C6 19 4 16 4 16 Z" />
      <path d="M4 10 L20 10" />
      {children}
    </Frame>
  );
}

export function Towel({ children, ...rest }: GlyphProps): React.JSX.Element {
  return (
    <Frame {...rest}>
      <path d="M6 4 L18 4 L18 17 L6 17 Z" />
      <path d="M6 14 L18 14" />
      <path d="M7 17 L7 20 M10 17 L10 20 M13 17 L13 20 M16 17 L16 20" />
      {children}
    </Frame>
  );
}

export function Pillow({ children, ...rest }: GlyphProps): React.JSX.Element {
  return (
    <Frame {...rest}>
      <path d="M4 8 C4 6 6 6 8 6 L16 6 C18 6 20 6 20 8 L20 16 C20 18 18 18 16 18 L8 18 C6 18 4 18 4 16 Z" />
      <path d="M7 9 L8 8 M17 9 L16 8" />
      {children}
    </Frame>
  );
}

export function Mat({ children, ...rest }: GlyphProps): React.JSX.Element {
  return (
    <Frame {...rest}>
      <path d="M4 8 L20 8 L20 16 L4 16 Z" />
      <path d="M6.5 10.5 L17.5 10.5 L17.5 13.5 L6.5 13.5 Z" />
      {children}
    </Frame>
  );
}

export function Bag({ children, ...rest }: GlyphProps): React.JSX.Element {
  return (
    <Frame {...rest}>
      <path d="M6 8 L18 8 L17 20 L7 20 Z" />
      <path d="M9 8 C9 4 15 4 15 8" />
      {children}
    </Frame>
  );
}

export function Shoe({ children, ...rest }: GlyphProps): React.JSX.Element {
  return (
    <Frame {...rest}>
      <path d="M3 17 L20 17 C22 17 22 15 20 15 L14 15 L10 11 L7 11 C4 11 3 14 3 17 Z" />
      <path d="M8 12 L10 13.5 M10 11.5 L12 13.5" />
      {children}
    </Frame>
  );
}

export function Generic({ children, ...rest }: GlyphProps): React.JSX.Element {
  return (
    <Frame {...rest}>
      <path d="M12 5 C12 4 13.6 4 13.6 5.5 C13.6 7 12 7 12 8" />
      <path d="M12 8 L4 15 L20 15 Z" />
      {children}
    </Frame>
  );
}

/**
 * Lookup from every {@link GlyphKey} to its glyph component. `LaundryIcon`
 * resolves a name to a key, then reads the component from here.
 */
export const glyphRegistry: Record<GlyphKey, React.FC<GlyphProps>> = {
  shirt: Shirt,
  shirtFormal: ShirtFormal,
  tshirt: Tshirt,
  tank: Tank,
  blouse: Blouse,
  coat: Coat,
  cap: Cap,
  pants: Pants,
  shorts: Shorts,
  skirt: Skirt,
  dress: Dress,
  overalls: Overalls,
  bra: Bra,
  underwear: Underwear,
  stocking: Stocking,
  socks: Socks,
  sheet: Sheet,
  blanket: Blanket,
  towel: Towel,
  pillow: Pillow,
  mat: Mat,
  bag: Bag,
  shoe: Shoe,
  generic: Generic,
};
