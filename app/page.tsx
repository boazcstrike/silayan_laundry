"use client";

/**
 * Main page — the laundry counter.
 *
 * The Tumble Deck "Full Deck" design is now the real counter UI (it replaced
 * the legacy LaundryCounter). Per-item icons, batches of 15 = one wash load,
 * and the full Download / Discord / Reset actions.
 */

import categories from "@/app/assets/data/list";
import TumbleFull from "@/components/designs/tumble-full/TumbleFull";

export default function HomePage() {
  return <TumbleFull categories={categories} />;
}
