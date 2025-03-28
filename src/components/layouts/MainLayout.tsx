import React, { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  fullHeight?: boolean;
}

const MainLayout = ({ 
  children, 
  showHeader = true, 
  showFooter = true,
  fullHeight = true
}: LayoutProps) => {
  return (
    <div className={`flex flex-col ${fullHeight ? 'min-h-screen' : ''} bg-background`}>
      {showHeader && <Header />}
      <main className="flex-grow">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
};

export default MainLayout;