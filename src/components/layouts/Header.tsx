'use client';

import React from 'react';
import Link from 'next/link';
import Container from './Container';
import { SignInButton, UserButton, useAuth } from '@clerk/nextjs';

const Header = () => {
  const { isSignedIn } = useAuth();
  
  return (
    <header className="absolute top-0 left-0 right-0 z-50 py-4">
      <Container>
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold gradient-text">PhotoVault</span>
          </Link>

          {/* Auth Buttons */}
          <div>
            {isSignedIn ? (
              <UserButton afterSignOutUrl="/" />
            ) : (
              <SignInButton mode="modal">
                <button className="btn-outline">
                  Login
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </Container>
    </header>
  );
};

export default Header;