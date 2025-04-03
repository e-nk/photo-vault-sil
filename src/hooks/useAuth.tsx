'use client';

import { useUser } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function useAuth() {
  const { isAuthenticated, isLoading: isConvexLoading } = useConvexAuth();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const router = useRouter();
  
  // Convex queries and mutations
  const syncUserProfile = useMutation(api.auth.syncUserProfile);
  const user = useQuery(api.auth.getMe);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Sync user data with Convex when authenticated
  useEffect(() => {
    const syncUser = async () => {
      if (isAuthenticated && isClerkLoaded && clerkUser && !user) {
        try {
          setIsSyncing(true);
          await syncUserProfile();
        } catch (error) {
          console.error("Error syncing user profile:", error);
          toast.error("Failed to sync user profile");
        } finally {
          setIsSyncing(false);
        }
      }
    };
    
    syncUser();
  }, [isAuthenticated, isClerkLoaded, clerkUser, user, syncUserProfile]);
  
  // Navigate to sign in if not authenticated
  const requireAuth = () => {
    if (!isConvexLoading && !isAuthenticated) {
      router.push('/sign-in');
      return false;
    }
    return true;
  };

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await clerkUser?.signOut();
      router.push('/');
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  return {
    user,
    clerkUser,
    isAuthenticated,
    isLoading: isConvexLoading || !isClerkLoaded || isSyncing,
    requireAuth,
    signOut: handleSignOut
  };
}