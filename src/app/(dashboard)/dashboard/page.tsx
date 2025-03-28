import React from 'react';
import Layout from '@/components/layouts/MainLayout';
import Container from '@/components/layouts/Container';
import AuthCheck from '@/components/auth/AuthCheck';

export default function Dashboard() {
  return (
    <AuthCheck>
      <Layout>
        <div className="py-20">
          <Container boxed>
            <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
            <p className="text-text-secondary mb-4">
              Welcome to your PhotoVault dashboard. This is where you'll be able to view users and their albums.
            </p>
            
            {/* User list will be implemented here */}
            <div className="mt-8 p-6 bg-secondary rounded-lg">
              <p>User list loading...</p>
            </div>
          </Container>
        </div>
      </Layout>
    </AuthCheck>
  );
}