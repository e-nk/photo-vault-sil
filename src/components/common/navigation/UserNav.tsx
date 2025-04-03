'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/lib/convex";
import { Bell, LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function UserNav() {
  const { user, isLoading, signOut } = useAuth();
  const { unreadCount } = useNotifications();

  // Show loading state
  if (isLoading) {
    return (
      <div className="animate-pulse flex items-center gap-2">
        <div className="h-9 w-9 rounded-full bg-photo-darkgray/40" />
        <div className="h-9 w-24 bg-photo-darkgray/40 rounded" />
      </div>
    );
  }

  // Handle case when no user is found (shouldn't happen with AuthWrapper)
  if (!user) {
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" asChild>
          <Link href="/sign-in">Sign In</Link>
        </Button>
        <Button size="sm" className="bg-photo-indigo hover:bg-photo-indigo/80" asChild>
          <Link href="/sign-up">Sign Up</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {/* Notifications icon */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount && unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="max-h-80 overflow-y-auto">
            {unreadCount === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-photo-secondary/60">
                No new notifications
              </div>
            ) : (
              <Link href="/notifications">
                <DropdownMenuItem>
                  <Bell className="mr-2 h-4 w-4" />
                  <span>View all notifications</span>
                  <Badge className="ml-auto bg-photo-indigo" variant="default">{unreadCount}</Badge>
                </DropdownMenuItem>
              </Link>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10 border border-photo-border/30">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-photo-indigo/20 text-photo-secondary">
                {user.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs leading-none text-photo-secondary/70">
                @{user.username}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href="/my-albums">
                <User className="mr-2 h-4 w-4" />
                <span>My Albums</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}