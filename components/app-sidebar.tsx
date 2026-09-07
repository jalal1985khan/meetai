"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { signOutAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  ListChecksIcon,
  SettingsIcon,
} from "lucide-react"

export function AppSidebar({
  user,
}: {
  user: { name?: string | null; email?: string | null }
}) {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex flex-col gap-0.5 px-2 py-1">
          <p className="text-sm font-medium">Meeting assistant</p>
          <p className="truncate text-xs text-muted-foreground">
            {user.name ?? user.email}
          </p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname.startsWith("/dashboard")}
                  render={<Link href="/dashboard" />}
                >
                  <LayoutDashboardIcon />
                  <span>Meetings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname.startsWith("/onboarding")}
                  render={<Link href="/onboarding" />}
                >
                  <ListChecksIcon />
                  <span>Onboarding</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname.startsWith("/settings")}
                  render={<Link href="/settings" />}
                >
                  <SettingsIcon />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <form action={signOutAction}>
          <Button variant="ghost" size="sm" className="w-full" type="submit">
            Sign out
          </Button>
        </form>
      </SidebarFooter>
    </Sidebar>
  )
}
