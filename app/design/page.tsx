import { redirect } from "next/navigation";

/**
 * The proposed-designs section is retired — the "Full Deck" design was promoted
 * to the real counter at /. Any old /design link forwards there.
 */
export default function DesignIndexPage() {
  redirect("/");
}
