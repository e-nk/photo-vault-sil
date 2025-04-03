'use client';

import { SignIn } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";
import { redirect } from "next/navigation";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";
import MainLayout from "@/components/layouts/MainLayout";

export default function SignInPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  // Redirect to home if already authenticated
  if (!isLoading && isAuthenticated) {
    redirect('/home');
  }

  return (
    <MainLayout>
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center">
        <div className="w-full max-w-md mx-auto">
          <div className="py-8">
            <HeroGeometric 
              badge="Welcome Back"
              title1="Sign in to your"
              title2="PhotoVault account" 
              size="small"
            />
          </div>
          
          <div className="p-4 bg-photo-darkgray/20 rounded-xl border border-photo-border/40 backdrop-blur-sm shadow-lg">
            <SignIn 
              appearance={{
                elements: {
                  rootBox: "mx-auto w-full",
                  card: "shadow-none bg-transparent",
                  headerTitle: "text-photo-secondary",
                  headerSubtitle: "text-photo-secondary/70",
                  socialButtonsBlockButton: "bg-photo-darkgray/50 hover:bg-photo-darkgray/70 border border-photo-border/40",
                  socialButtonsBlockButtonText: "text-photo-secondary",
                  dividerLine: "bg-photo-border/40",
                  dividerText: "text-photo-secondary/50",
                  formFieldLabel: "text-photo-secondary/80",
                  formFieldInput: "bg-photo-darkgray/30 border-photo-border/60 text-photo-secondary placeholder:text-photo-secondary/50",
                  formButtonPrimary: "bg-photo-indigo hover:bg-photo-indigo/90",
                  footerActionLink: "text-photo-indigo hover:text-photo-indigo/90",
                }
              }}
              redirectUrl="/home"
              signUpUrl="/sign-up"
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}