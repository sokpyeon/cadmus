import { createBrowserClient, createServerClient, type CookieMethodsServer } from '@supabase/ssr';
import { Database } from '@/types/database';

// Browser client (use in client components)
export function getSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Server client — pass cookieStore from cookies() (next/headers)
export function getSupabaseServerClient(cookieStore?: CookieMethodsServer) {
  if (cookieStore) {
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: cookieStore }
    );
  }
  // Service role (no cookie session)
  const { createClient } = require('@supabase/supabase-js');
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
