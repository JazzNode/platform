import { createClient } from '@/utils/supabase/server';

export interface Profile {
  id: string;
  username: string | null;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  role: 'member' | 'artist' | 'venue_owner' | 'admin';
  social_links: Record<string, string>;
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
