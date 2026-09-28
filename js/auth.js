// auth.js — Google OAuth authentication via Supabase
// Handles sign-in, session restoration, sign-out, and profile management.

let _user = null;
let _authListeners = [];

/**
 * Initialize the auth system. Sets up the auth state change listener
 * and returns a promise that resolves with the current session.
 */
async function initAuth() {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase client not initialized');

  // Restore existing session (survives page refresh)
  const { data: { session }, error } = await sb.auth.getSession();
  if (error) {
    console.error('Auth session error:', error);
    _user = null;
  } else {
    _user = session ? session.user : null;
  }

  // Listen for auth state changes (sign-in, sign-out, token refresh)
  const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
    _user = session ? session.user : null;
    _authListeners.forEach(fn => fn(_user, event));
    if (event === 'SIGNED_OUT') {
      _user = null;
    }
  });

  return _user;
}

/**
 * Sign in with Google OAuth via Supabase.
 */
async function signInWithGoogle() {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase client not initialized');

  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + window.location.pathname,
    }
  });

  if (error) throw error;
  return data;
}

/**
 * Sign out the current user. Does NOT delete workout data.
 */
async function signOut() {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase client not initialized');

  const { error } = await sb.auth.signOut();
  if (error) throw error;
  _user = null;
  return true;
}

/**
 * Get the current authenticated user object, or null.
 */
function getCurrentUser() {
  return _user;
}

/**
 * Get the current user's ID (UUID), or null.
 */
function getUserId() {
  return _user ? _user.id : null;
}

/**
 * Register a callback for auth state changes.
 * Returns an unsubscribe function.
 */
function onAuthStateChange(callback) {
  _authListeners.push(callback);
  return () => {
    _authListeners = _authListeners.filter(fn => fn !== callback);
  };
}

/**
 * Get the full session object, or null.
 */
function getSession() {
  return _user ? { user: _user } : null;
}

/**
 * Get auth headers for database operations.
 */
function getAuthHeaders() {
  return { Authorization: `Bearer ${_user?.access_token || ''}` };
}
