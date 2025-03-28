import React from 'react';
import Container from './Container';
import Link from 'next/link';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="py-8 mt-auto border-t border-border bg-primary">
      <Container>
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-text-secondary text-sm">
              &copy; {currentYear} PhotoVault. All rights reserved.
            </p>
          </div>
          
          <div className="flex items-center space-x-6">
            <a 
              href="mailto:contact@example.com" 
              className="text-text-secondary text-sm nav-link"
            >
              enocklagatson@gmail.com
            </a>
            
            <div className="text-text-secondary text-sm flex items-center">
              <span className="mr-2">Powered by</span>
              <a 
                href="https://enock-dev.vercel.app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-accent-indigo nav-link"
              >
                Dev Enock
              </a>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;