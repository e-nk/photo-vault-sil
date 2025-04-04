"use client";

import React, { useState } from 'react';
import Container from '@/components/common/Container';
import { PhotoGrid } from '@/components/shared/PhotoGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuth } from '@/hooks/useAuth';
import AuthCheck from '@/components/auth/AuthCheck';
import { Compass, Fire, Clock, ThumbsUp, Search, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ExplorePage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('recent');

  // Get photos based on active tab
  const recentPhotos = useQuery(api.photos.getExplorePhotos, {
    sortBy: 'newest',
    limit: 30,
    requestingUserId: user ? user._id : undefined
  });

  const popularPhotos = useQuery(api.photos.getExplorePhotos, {
    sortBy: 'most-liked',
    limit: 30,
    requestingUserId: user ? user._id : undefined
  });

  const trendingPhotos = useQuery(api.photos.getExplorePhotos, {
    sortBy: 'trending',
    limit: 30,
    requestingUserId: user ? user._id : undefined
  });

  // Get search results
  const searchResults = useQuery(
    api.photos.searchPhotos,
    searchTerm.length > 2 ? { 
      searchTerm,
      requestingUserId: user ? user._id : undefined,
      limit: 30
    } : "skip"
  );

  // Determine which photos to display
  const getActivePhotos = () => {
    if (searchTerm.length > 2) {
      return searchResults?.photos || [];
    }

    switch (activeTab) {
      case 'recent':
        return recentPhotos?.photos || [];
      case 'popular':
        return popularPhotos?.photos || [];
      case 'trending':
        return trendingPhotos?.photos || [];
      default:
        return recentPhotos?.photos || [];
    }
  };

  const isLoading = !recentPhotos || !popularPhotos || !trendingPhotos || 
    (searchTerm.length > 2 && !searchResults);

  return (
    <AuthCheck>
      <div className="min-h-screen bg-photo-primary pb-16">
        {/* Header */}
        <div className="py-8 border-b border-photo-border/20">
          <Container>
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-photo-secondary mb-2 flex items-center gap-2">
                  <Compass className="h-8 w-8 text-photo-indigo" />
                  Explore
                </h1>
                <p className="text-photo-secondary/70">
                  Discover photos from across the community
                </p>
              </div>

              {/* Search bar */}
              <div className="relative min-w-[280px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-photo-secondary/50 h-4 w-4" />
                <Input
                  placeholder="Search photos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-photo-darkgray/30 border-photo-border text-photo-secondary"
                />
                {searchTerm && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchTerm('')}
                  >
                    ✕
                  </Button>
                )}
              </div>
            </div>
          </Container>
        </div>

        {/* Main content */}
        <Container className="mt-8">
          {searchTerm.length > 2 ? (
            <>
              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-photo-secondary font-medium">
                  {isLoading ? (
                    <span className="flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </span>
                  ) : (
                    `Search results for "${searchTerm}" (${searchResults?.photos?.length || 0} photos)`
                  )}
                </h2>
                <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
                  Clear Search
                </Button>
              </div>
              
              <PhotoGrid 
                photos={getActivePhotos()}
                isLoading={isLoading}
                emptyMessage={`No photos found matching "${searchTerm}"`}
              />
            </>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex justify-between items-center mb-8">
                <TabsList className="bg-photo-darkgray/30">
                  <TabsTrigger value="recent" className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Recent
                  </TabsTrigger>
                  <TabsTrigger value="popular" className="flex items-center gap-1">
                    <ThumbsUp className="h-4 w-4" />
                    Popular
                  </TabsTrigger>
                  <TabsTrigger value="trending" className="flex items-center gap-1">
                    <Fire className="h-4 w-4" />
                    Trending
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="recent">
                <PhotoGrid 
                  photos={recentPhotos?.photos || []}
                  isLoading={!recentPhotos}
                  emptyMessage="No recent photos found"
                />
              </TabsContent>
              
              <TabsContent value="popular">
                <PhotoGrid 
                  photos={popularPhotos?.photos || []}
                  isLoading={!popularPhotos}
                  emptyMessage="No popular photos found"
                />
              </TabsContent>
              
              <TabsContent value="trending">
                <PhotoGrid 
                  photos={trendingPhotos?.photos || []}
                  isLoading={!trendingPhotos}
                  emptyMessage="No trending photos found"
                />
              </TabsContent>
            </Tabs>
          )}
        </Container>
      </div>
    </AuthCheck>
  );
}