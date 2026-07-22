"use client";

/**
 * Proposed designs — overview / hub.
 *
 * Two Tumble Deck directions, both built on the same brief: per-item laundry
 * icons (so identity survives on mobile), batches of 15 items = one wash load,
 * and the full Download / Discord / Reset submission actions. Each proposal is
 * a real, fully-wired page under /design/[a|b].
 */

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";

type Proposal = {
  slug: "b";
  href: string;
  name: string;
  tagline: string;
  blurb: string;
  accent: string;
};

const PROPOSALS: Proposal[] = [
  {
    slug: "b",
    href: "/design/b",
    name: "Full Deck",
    tagline: "Washing machine + inline icon strip",
    blurb:
      "A real front-load washing machine whose glass door tumbles the icons of the items you count, plus a live icon strip: a wrap of icon + count chips for every selected item, tappable to adjust. Built mobile-first so you always know what you're adding. Loads (15 = 1 wash), gauge, mascot and Download / Discord / Reset actions included.",
    accent: "var(--chart-2)",
  },
];

export default function DesignOverviewPage() {
  const reduce = useReducedMotion();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <motion.header
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <Sparkles className="size-3.5" /> Proposed designs
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          Tumble Deck — Full Deck
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          A curated icon for every laundry item (so identity survives on small
          screens), batches of{" "}
          <strong className="text-foreground">15 items = one wash load</strong>,
          and the full Download / Send to Discord / Reset actions. The washing
          machine visual is being upgraded — approve the design, then it gets
          animated.
        </p>
      </motion.header>

      <div className="grid gap-4 sm:grid-cols-2">
        {PROPOSALS.map((d, i) => (
          <motion.div
            key={d.slug}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 * (i + 1) }}
          >
            <Link
              href={d.href}
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-5 transition-shadow hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ background: d.accent }}
              />
              <div
                className="grid size-11 place-items-center rounded-xl text-lg font-black text-white"
                style={{ background: d.accent }}
              >
                {d.slug.toUpperCase()}
              </div>
              <h2 className="mt-4 text-lg font-bold">{d.name}</h2>
              <p className="text-xs font-medium text-muted-foreground">
                {d.tagline}
              </p>
              <p className="mt-3 flex-1 text-sm text-muted-foreground">
                {d.blurb}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground/70 transition-transform group-hover:translate-x-0.5">
                Open proposal <ArrowRight className="size-4" />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
