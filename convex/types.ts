/**
 * Types for the PhotoVault application
 */

import { Id } from './_generated/dataModel';

// User type
export interface User {
  _id: Id<"users">;
  _creationTime: number;
  clerkId: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  joinedAt: string;
  albumCount: number;
  totalPhotos: number;
  followersCount: number;
  followingCount: number;
  searchText: string;
}

// Album type
export interface Album {
  _id: Id<"albums">;
  _creationTime: number;
  title: string;
  description?: string;
  isPrivate: boolean;
  userId: Id<"users">;
  photoCount: number;
  coverImage?: string;
  dateCreated: string;
  dateUpdated: string;
  searchText: string;
}

// Photo type
export interface Photo {
  _id: Id<"photos">;
  _creationTime: number;
  title: string;
  description?: string;
  url: string;
  thumbnailUrl: string;
  albumId: Id<"albums">;
  userId: Id<"users">;
  dateUploaded: string;
  aspectRatio: number;
  storageId: string;
  likes: number;
  comments: number;
  searchText: string;
}

// Like type
export interface Like {
  _id: Id<"likes">;
  _creationTime: number;
  photoId: Id<"photos">;
  userId: Id<"users">;
  createdAt: string;
}

// Comment type
export interface Comment {
  _id: Id<"comments">;
  _creationTime: number;
  photoId: Id<"photos">;
  userId: Id<"users">;
  content: string;
  createdAt: string;
}

// Bookmark type
export interface Bookmark {
  _id: Id<"bookmarks">;
  _creationTime: number;
  photoId: Id<"photos">;
  userId: Id<"users">;
  createdAt: string;
}

// Follow type
export interface Follow {
  _id: Id<"follows">;
  _creationTime: number;
  followerId: Id<"users">;
  followedId: Id<"users">;
  createdAt: string;
}

// Activity type
export interface Activity {
  _id: Id<"activities">;
  _creationTime: number;
  userId: Id<"users">;
  targetUserId: Id<"users">;
  type: string;
  photoId?: Id<"photos">;
  albumId?: Id<"albums">;
  commentId?: Id<"comments">;
  read: boolean;
  createdAt: string;
}