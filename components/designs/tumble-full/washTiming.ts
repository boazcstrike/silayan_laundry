/**
 * Single source of truth for the full-load wash-ceremony duration.
 *
 * TumbleFull owns the actual timer; any washer chrome that renders a
 * countdown / RPM ramp (WashingMachine, washer drafts) must derive from this
 * same number so their displays can never desync from the real ceremony.
 */
export const WASH_MS = 1900;
