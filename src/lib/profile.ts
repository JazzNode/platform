import { createClient } from '@/utils/supabase/server';

export interface Profile {
  id: string;
  username: string | null;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  role: 'member' | 'artist_manager' | 'venue_manager' | 'admin';
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
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export async function getSearchableProfiles(): Promise<SearchableProfile[]> {
  const supabase = await createClient();
  // Fetch profiles that have display_name or username set
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio')
    .eq('is_public', true)
    .or('display_name.not.is.null,username.not.is.null');
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
  rating: number;
  text: string | null;
  is_anonymous: boolean;
  created_at: string;
}

/** Fetch all reviews by a user. For public profiles, pass publicOnly=true to exclude anonymous reviews. */
export async function getUserReviews(userId: string, publicOnly = false): Promise<UserReview[]> {
  const supabase = await createClient();
  let query = supabase
    .from('venue_reviews')
    .select('id, venue_id, rating, text, is_anonymous, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (publicOnly) {
    query = query.eq('is_anonymous', false);
  }

  const { data } = await query;
  return (data || []) as UserReview[];
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !data) return null;
  return data as Profile;
}
