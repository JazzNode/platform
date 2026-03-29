import { createClient } from '@/utils/supabase/server';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  role: 'member' | 'artist_manager' | 'venue_manager' | 'editor' | 'moderator' | 'marketing' | 'admin' | 'owner';
  social_links: Record<string, string>;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export async function getPublicFollows(userId: string): Promise<{ target_type: string; target_id: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('follows')
    .select('target_type, target_id')
    .eq('user_id', userId);
  return data || [];
}


export interface SearchableProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export async function getSearchableProfiles(): Promise<SearchableProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, bio')
    .eq('is_public', true)
    .not('display_name', 'is', null);
  return (data || []) as SearchableProfile[];
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data as Profile;
}

export interface UserReview {
  id: string;
  venue_id: string;
  text: string | null;
  tags: string[];
  image_url: string | null;
  is_anonymous: boolean;
  created_at: string;
}

/** Fetch all comments by a user. For public profiles, pass publicOnly=true to exclude anonymous comments. */
export async function getUserReviews(userId: string, publicOnly = false): Promise<UserReview[]> {
  const supabase = await createClient();
  let query = supabase
    .from('venue_comments')
    .select('id, venue_id, text, tags, image_url, is_anonymous, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (publicOnly) {
    query = query.eq('is_anonymous', false);
  }

  const { data } = await query;
  return (data || []) as UserReview[];
}

