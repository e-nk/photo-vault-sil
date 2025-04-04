"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';

interface UserSearchProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  resultsCount: number;
  isLoading?: boolean;
}

export const UserSearch = ({ 
  searchTerm, 
  setSearchTerm,
  resultsCount,
  isLoading = false
}: UserSearchProps) => {
  return (
    <div className="mb-8">
      <div className="relative max-w-md mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-photo-secondary/50" size={18} />
        <Input
          placeholder="Search users by name, username or email..."
          className="pl-10 bg-photo-darkgray/30 border-photo-border text-photo-secondary"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Results count */}
      <p className="text-photo-secondary/60 text-sm flex items-center">
        {isLoading ? (
          <>
            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
            Searching users...
          </>
        ) : (
          searchTerm && searchTerm.length > 0 ? 
            `Found ${resultsCount} user${resultsCount !== 1 ? 's' : ''} matching "${searchTerm}"` :
            `Showing ${resultsCount} user${resultsCount !== 1 ? 's' : ''}`
        )}
      </p>
    </div>
  );
};