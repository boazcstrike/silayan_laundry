"use client";

import * as React from "react";

import { AppSidebar } from "@/components/AppSidebar";
import { PalettePicker } from "@/components/PalettePicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

/**
 * Application shell: collapsible sidebar navigation + a top bar with the
 * sidebar trigger and theme toggle. Wraps every route so the laundry counter
 * and the analytics dashboard share one navigation frame.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger />
          <div className="flex-1" />
          <PalettePicker />
          <ThemeToggle />
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
