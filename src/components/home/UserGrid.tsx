import React from 'react';
import { UserCard } from '@/components/home/UserCard';
import { Id } from '@/convex/_generated/dataModel';
import { Loader2 } from 'lucide-react';

interface User {
  _id: Id<"users">;
  name: string;
  username: string;
  email: string;
  albumCount: number;
  avatar?: string;
}

interface UserGridProps {
  users: User[];
  searchTerm: string;
  isLoading?: boolean;
  currentUserId?: Id<"users">;
}

export const UserGrid = ({ users, searchTerm, isLoading = false, currentUserId }: UserGridProps) => {
  // Enhance users with isCurrentUser flag
  const enhancedUsers = users.map(user => ({
    ...user,
    isCurrentUser: user._id === currentUserId
  }));

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-photo-indigo" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-photo-secondary/60">
          {searchTerm ? `No users found matching "${searchTerm}"` : "No users found"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {enhancedUsers.map(user => (
        <UserCard
          key={user._id}
          user={user}
        />
      ))}
    </div>
  );
};