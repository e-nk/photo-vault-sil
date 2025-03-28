import React from 'react';
import Link from 'next/link';
import Container from './Container';

const Header = () => {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 py-4">
      <Container>
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold gradient-text">PhotoVault</span>
          </Link>

          {/* Login Button - Will be replaced with Clerk auth */}
          <button className="btn-outline">
            Login
          </button>
        </div>
      </Container>
    </header>
  );
};

export default Header;