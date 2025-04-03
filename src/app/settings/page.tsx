'use client';

import React, { useState } from 'react';
import Container from '@/components/common/Container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/lib/convex';
import { toast } from 'sonner';
import { Check, Loader2, UserRound } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import AuthCheck from '@/components/auth/AuthCheck';

interface ProfileFormValues {
  name: string;
  username: string;
}

export default function SettingsPage() {
  const { user, isLoading } = useAuth();
  const { updateProfile } = useUserProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormValues>({
    defaultValues: {
      name: user?.name || '',
      username: user?.username || ''
    }
  });

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      await updateProfile({
        name: data.name,
        username: data.username
      });
      
      toast.success('Profile updated', {
        description: 'Your profile has been successfully updated.',
        icon: <Check className="h-4 w-4" />,
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Update failed', {
        description: 'There was an error updating your profile.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-photo-primary">
        <div className="w-16 h-16 rounded-full border-4 border-photo-indigo/30 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthCheck>
      <div className="min-h-screen bg-photo-primary pb-16">
        <div className="py-8 border-b border-photo-border/20">
          <Container>
            <h1 className="text-3xl font-bold text-photo-secondary">Settings</h1>
            <p className="text-photo-secondary/70 mt-2">Manage your account settings and preferences.</p>
          </Container>
        </div>
        
        <Container className="mt-8">
          <div className="grid md:grid-cols-[240px_1fr] gap-8">
            <div className="space-y-4">
              <div className="bg-photo-darkgray/20 border border-photo-border/20 rounded-lg p-4">
                <h2 className="font-medium text-photo-secondary">Profile Settings</h2>
              </div>
              <div className="bg-photo-darkgray/10 border border-photo-border/20 rounded-lg p-4">
                <h2 className="font-medium text-photo-secondary/70">Account Security</h2>
              </div>
              <div className="bg-photo-darkgray/10 border border-photo-border/20 rounded-lg p-4">
                <h2 className="font-medium text-photo-secondary/70">Notifications</h2>
              </div>
            </div>
            
            <div className="bg-photo-darkgray/20 border border-photo-border/20 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-photo-secondary mb-6">Profile Information</h2>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <Avatar className="h-20 w-20 border-2 border-photo-border">
                    <AvatarImage src={user?.avatar || ''} alt={user?.name || ''} />
                    <AvatarFallback className="bg-photo-indigo/20 text-photo-secondary text-xl">
                      <UserRound className="h-10 w-10" />
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <p className="text-photo-secondary mb-2">Profile Photo</p>
                    <p className="text-photo-secondary/60 text-sm mb-4">
                      Your profile photo is managed through your authentication provider.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-photo-secondary">Display Name</Label>
                    <Input
                      id="name"
                      placeholder="Your name"
                      className="bg-photo-darkgray/30 border-photo-border text-photo-secondary"
                      {...register('name', { required: 'Name is required' })}
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm">{errors.name.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-photo-secondary">Username</Label>
                    <Input
                      id="username"
                      placeholder="username"
                      className="bg-photo-darkgray/30 border-photo-border text-photo-secondary"
                      {...register('username', { 
                        required: 'Username is required',
                        pattern: {
                          value: /^[a-zA-Z0-9_]+$/,
                          message: 'Username can only contain letters, numbers, and underscores'
                        }
                      })}
                    />
                    {errors.username && (
                      <p className="text-red-500 text-sm">{errors.username.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-photo-secondary">Email Address</Label>
                    <Input
                      id="email"
                      value={user?.email}
                      className="bg-photo-darkgray/30 border-photo-border text-photo-secondary"
                      disabled
                    />
                    <p className="text-photo-secondary/60 text-xs">
                      Your email is managed through your authentication provider.
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    className="bg-photo-indigo hover:bg-photo-indigo/90"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </Container>
      </div>
    </AuthCheck>
  );
}