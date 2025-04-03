'use client';

import { Logo } from "@/components/common/Logo";
import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function MainNav() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const pathname = usePathname();

  // Define navigation items based on authentication state
  const navItems = isAuthenticated 
    ? [
        { label: "Home", href: "/home" },
        { label: "My Albums", href: "/my-albums" },
        { label: "Explore", href: "/explore" },
      ]
    : [
        { label: "Home", href: "/" },
        { label: "Features", href: "/#features" },
        { label: "About", href: "/#about" },
      ];

  return (
    <div className="flex items-center space-x-4 lg:space-x-6">
      <Link href={isAuthenticated ? "/home" : "/"} className="flex items-center">
        <Logo />
      </Link>
      
      <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 ml-8">
        {!isLoading && navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "text-sm transition-colors hover:text-photo-secondary",
              pathname === item.href
                ? "text-photo-secondary font-medium"
                : "text-photo-secondary/70"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {!isLoading && !isAuthenticated && pathname !== "/sign-in" && pathname !== "/sign-up" && (
        <div className="hidden md:flex ml-auto space-x-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button size="sm" className="bg-photo-indigo hover:bg-photo-indigo/90" asChild>
            <Link href="/sign-up">Sign Up</Link>
          </Button>
        </div>
      )}
    </div>
  );
}