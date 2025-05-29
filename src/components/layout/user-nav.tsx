
"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import { LogOut, User, Settings, CreditCard, Users, Mail } from "lucide-react"
import { signOut } from 'firebase/auth';
import { useToast } from "@/hooks/use-toast"; // Added useToast import

// Mock user data for display
const mockUser = {
  name: "Sofia Davis",
  email: "sofia.davis@example.com",
  avatarUrl: "https://placehold.co/100x100.png",
  // Initials removed, will derive fallback dynamically
}

export function UserNav() {
  // In a real app, you'd get user data from an auth provider (e.g., Firebase auth.currentUser)
  // For this example, we'll continue using mockUser but derive fallback dynamically.
  const user = auth.currentUser || mockUser; // Prefer real user, fallback to mock
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Logout Error",
        description: "Could not log you out. Please try again.",
        variant: "destructive",
      });
    }
  };

  let displayNameFallback = "U";
  const currentUserName = user?.displayName || mockUser.name; // Use Firebase user's displayName if available
  const currentUserEmail = user?.email || mockUser.email;

  if (currentUserName) {
    displayNameFallback = currentUserName.charAt(0).toUpperCase();
  } else if (currentUserEmail) {
    displayNameFallback = currentUserEmail.charAt(0).toUpperCase();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8" data-ai-hint="user avatar">
            <AvatarImage src={user?.photoURL || mockUser.avatarUrl} alt={currentUserName || "User"} />
            <AvatarFallback>{displayNameFallback}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{currentUserName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {currentUserEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href="/settings/account" passHref>
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
          </Link>
          <Link href="/settings/billing" passHref>
            <DropdownMenuItem>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Billing</span>
              <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
            </DropdownMenuItem>
          </Link>
          <Link href="/settings/appearance" passHref>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
          </Link>
           <Link href="/settings/team" passHref>
            <DropdownMenuItem>
              <Users className="mr-2 h-4 w-4" />
              <span>Team Members</span>
              <DropdownMenuShortcut>⌘T</DropdownMenuShortcut>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
