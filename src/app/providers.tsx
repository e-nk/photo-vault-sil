'use client';

import { ClerkProvider, useAuth} from '@clerk/nextjs';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';
import { ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';

// Initialize the Convex client
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        elements: {
          rootBox: "mx-auto w-full max-w-md",
          card: "shadow-none"
        }
      }}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
        <Toaster />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}