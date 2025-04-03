'use client';

import { useAuth } from '@/hooks/useAuth';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

// List of paths that don't require authentication
const publicPaths = ['/', '/sign-in', '/sign-up'];

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPath = publicPaths.includes(pathname);

  useEffect(() => {
    if (!isLoading) {
      // If user is not signed in and the route requires authentication
      if (!isAuthenticated && !isPublicPath) {
        router.push('/sign-in');
      }
      
      // If user is signed in and trying to access auth pages
      if (isAuthenticated && (pathname === '/sign-in' || pathname === '/sign-up')) {
        router.push('/home');
      }
    }
  }, [isLoading, isAuthenticated, router, pathname, isPublicPath]);

  // Show loading state while Clerk/Convex is loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-photo-primary">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-photo-indigo"></div>
      </div>
    );
  }

  // If authenticated but waiting for user profile to sync
  if (isAuthenticated && !user && !isPublicPath) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-photo-primary">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-photo-indigo"></div>
        <p className="ml-3 text-photo-secondary">Setting up your profile...</p>
      </div>
    );
  }

  return <>{children}</>;
}