"use client";

import categories from "@/app/assets/data/list";
import TumbleFull from "@/components/designs/tumble-full/TumbleFull";

export default function DesignBPage() {
  return <TumbleFull categories={categories} />;
}
