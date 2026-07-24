import { redirect } from "next/navigation";

/** Washer drafts moved into the Proposed Designs hub. */
export default function WasherDraftsRedirect() {
  redirect("/proposed-designs");
}
