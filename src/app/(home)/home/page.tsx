"use client";

import React, { useState } from 'react';
import Container from '@/components/common/Container';
import { HomeHeader } from '@/components/home/HomeHeader';
import { UserSearch } from '@/components/home/UserSearch';
import { UserGrid } from '@/components/home/UserGrid';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuth } from '@/hooks/useAuth';
import AuthCheck from '@/components/auth/AuthCheck';

export default function HomePage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Get all users
  const usersResult = useQuery(api.users.getAllUsers, {
    limit: 20,
    searchTerm: searchTerm.length > 2 ? searchTerm : undefined,
    requestingUserId: user ? user._id : undefined
  });

  return (
    <AuthCheck>
      <div className="min-h-screen bg-photo-primary pb-16">
        {/* Page header */}
        <HomeHeader />

        {/* Users section */}
        <Container className="mt-8">
          {/* Search */}
          <UserSearch 
            searchTerm={searchTerm} 
            setSearchTerm={setSearchTerm} 
            resultsCount={usersResult?.users?.length || 0}
            isLoading={!usersResult}
          />

          {/* User grid */}
          <UserGrid 
            users={usersResult?.users || []}
            searchTerm={searchTerm}
            isLoading={!usersResult}
            currentUserId={user?._id}
          />
        </Container>
      </div>
    </AuthCheck>
  );
}