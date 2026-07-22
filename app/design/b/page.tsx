import { redirect } from "next/navigation";

/**
 * "Full Deck" was promoted to the real counter at /. This route now forwards
 * there so the old proposal URL keeps working.
 */
export default function DesignBPage() {
  redirect("/");
}
