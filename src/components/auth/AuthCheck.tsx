'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthCheck({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to home if not signed in
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }

    // If authenticated but no user profile in Convex yet, wait for sync
    if (!isLoading && isAuthenticated && !user) {
      // User is authenticated but profile not in Convex yet
      // This will automatically trigger the sync in the useAuth hook
    }
  }, [isLoading, isAuthenticated, router, user]);

  // Show loading spinner while checking auth or syncing user
  if (isLoading || (isAuthenticated && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-photo-primary">
        <div className="w-16 h-16 rounded-full border-4 border-photo-indigo/30 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  // Show nothing if not signed in (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  // Show children if authenticated and user exists in Convex
  return <>{children}</>;
}