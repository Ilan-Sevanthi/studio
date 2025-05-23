import { ThemeToggle } from "@/components/layout/theme-toggle"
import { UserNav } from "@/components/layout/user-nav"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Sparkles } from "lucide-react"

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 hidden md:flex">
           <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block">
              Feedback Flow
            </span>
          </Link>
        </div>

        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search can go here if needed */}
          </div>
          <nav className="flex items-center space-x-2">
            <ThemeToggle />
            <UserNav />
          </nav>
        </div>
      </div>
    </header>
  )
}
