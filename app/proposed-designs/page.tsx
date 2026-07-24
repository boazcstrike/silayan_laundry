"use client";

/**
 * Proposed Designs — the permanent home for every design proposal.
 *
 * Ritual: whenever a new design direction is proposed, it gets added to
 * PROPOSALS below as its own tab (never delete old proposals — they stay as
 * reference in case we want to switch back). The sidebar "Proposed Designs"
 * link always points here.
 */

import { useState } from "react";
import { WasherDraftGallery } from "@/components/designs/washer-drafts/WasherDraftGallery";
import { LegacyMachineGallery } from "@/components/designs/legacy/LegacyMachineGallery";

const PROPOSALS = [
  {
    id: "washer-drafts",
    label: "Washer drafts",
    description:
      "Six candidate washing-machine redesigns (July 2026). Draft 6 — the Draft 4 Skeuomorph Glass shell merged with the Draft 3 Smart Onyx inner ring — is now the live machine on the counter.",
    Component: WasherDraftGallery,
  },
  {
    id: "legacy",
    label: "Legacy",
    description:
      "The previous live machine, retired when Draft 6 shipped. Kept here as the record of the design that ran on the counter before.",
    Component: LegacyMachineGallery,
  },
] as const;

export default function ProposedDesignsPage() {
  const [activeId, setActiveId] = useState<string>(PROPOSALS[0].id);
  const active = PROPOSALS.find((p) => p.id === activeId) ?? PROPOSALS[0];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Proposed designs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every design proposal lives here for review — and stays here as
          reference after a decision.
        </p>
      </header>

      {/* Proposal tabs — one per design proposal, newest first. */}
      <div
        className="mb-2 flex flex-wrap gap-1 rounded-full border bg-card p-1"
        role="tablist"
        aria-label="Design proposal"
      >
        {PROPOSALS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeId === id}
            onClick={() => setActiveId(id)}
            className={`min-h-[36px] rounded-full px-4 text-sm font-semibold transition-colors ${
              activeId === id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="mb-6 text-sm text-muted-foreground">{active.description}</p>

      <active.Component />
    </div>
  );
}
