import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qnupmjrpkspveyifixgs.supabase.co';

const supabaseAnonKey = 'sb_publishable_r3bSpiaVvkFg412dVGFdsg_i8ZpS-eC';

export function clearSavedSupabaseSession() {
  try {
    Object.keys(localStorage).forEach(key => {
      if (
        key.startsWith('sb-') ||
        key.includes('supabase') ||
        key.includes('auth-token')
      ) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // ignore
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});