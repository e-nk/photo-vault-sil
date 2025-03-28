import '../globals.css';
import type { Metadata } from 'next';
import { Providers } from '../providers';

export const metadata: Metadata = {
  title: 'PhotoVault - Secure Photo Collection',
  description: 'Secure and organized photo collection system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
        <Providers>{children}</Providers>

  );
}