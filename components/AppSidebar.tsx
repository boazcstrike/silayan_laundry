"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, History, PencilRuler, Shirt, WashingMachine } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

// The Tumble Deck "Full Deck" design is now the counter itself (see app/page).
// "Proposed Designs" hosts every design proposal awaiting a decision — new
// proposals land there as tabs and old ones stay for future reference.
const NAV_ITEMS = [
  { href: "/", icon: Shirt, label: "Counter" },
  { href: "/analytics", icon: ChartColumn, label: "Analytics" },
  { href: "/history", icon: History, label: "History" },
  { href: "/proposed-designs", icon: PencilRuler, label: "Proposed Designs" },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Silayan" render={<Link href="/" />}>
              <span className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <WashingMachine className="size-4" />
              </span>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold tracking-wide uppercase">
                  Silayan
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  Laundry
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton
                  isActive={href === "/" ? pathname === "/" : pathname.startsWith(href)}
                  tooltip={label}
                  render={<Link href={href} />}
                >
                  <Icon />
                  <span>{label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
