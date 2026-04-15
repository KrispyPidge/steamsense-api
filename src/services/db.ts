import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

interface UserRow {
  id: string;
  steam_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  last_login: string;
  is_active: boolean;
}

export async function upsertUser(steamId: string, displayName: string, avatarUrl: string): Promise<UserRow> {
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        steam_id: steamId,
        display_name: displayName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      },
      { onConflict: 'steam_id' }
    )
    .select()
    .single();

  if (error) throw new Error(`DB upsert failed: ${error.message}`);
  return data as UserRow;
}
