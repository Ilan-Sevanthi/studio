"use client"

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Header } from "@/components/layout/header";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarHeader,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <Sidebar>
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <Sparkles className="h-7 w-7 text-sidebar-primary" />
            <h1 className="text-xl font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              Feedback Flow
            </h1>
          </Link>
        </SidebarHeader>
        <SidebarContent className="flex-1 p-0">
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-sidebar-border group-data-[collapsible=icon]:hidden">
          <p className="text-xs text-sidebar-foreground/70">© 2024 Feedback Flow</p>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
