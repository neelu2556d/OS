// supabase.js — Supabase client initialization
// Only the public anon/publishable key is used here.
// NEVER include a service-role key in frontend code.
//
// Security is enforced by Supabase Auth + Row Level Security (RLS),
// not by hiding keys. The anon key is designed to be public.

// The Supabase client is created globally on window in index.html
// This file exports getSupabase() for other modules to use.

function getSupabase() {
  return window._sbClient || null;
}

function setSupabaseClient(client) {
  window._sbClient = client;
}

export { getSupabase, setSupabaseClient };