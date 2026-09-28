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
    throw error;
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
 * Sign in with Email Magic Link via Supabase.
 * Shows visible error messages on the login page instead of silently failing.
 */
async function signInWithEmail(email) {
  const sb = getSupabase();
  if (!sb) {
    // Show error on login page
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'color: #e0767b; margin: 10px; padding: 10px; background: rgba(224, 42, 59, 0.1); border-radius: 5px; border: 1px solid #e0767b; position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 9999;';
    errorDiv.innerHTML = '<strong>Authentication Error:</strong> Supabase client not initialized';
    document.body.appendChild(errorDiv);
    setTimeout(() => document.body.removeChild(errorDiv), 5000);
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await sb.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname,
      }
    });

    if (error) {
      // Show error on login page
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = 'color: #e0767b; margin: 10px; padding: 10px; background: rgba(224, 42, 59, 0.1); border-radius: 5px; border: 1px solid #e0767b; position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 9999;';
      errorDiv.innerHTML = '<strong>Email Sign-In Error:</strong> ' + error.message + '<br><small>Check your Supabase email authentication settings.</small>';
      document.body.appendChild(errorDiv);
      setTimeout(() => document.body.removeChild(errorDiv), 5000);
      throw error;
    }

    return data;
  } catch (err) {
    // Re-throw for the caller to handle, but error already shown on page
    throw err;
  }
}

/**
 * Sign in with Google OAuth via Supabase.
 * Shows visible error messages on the login page instead of silently failing.
 */
async function signInWithGoogle() {
  const sb = getSupabase();
  if (!sb) {
    // Show error on login page
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'color: #e0767b; margin: 10px; padding: 10px; background: rgba(224, 42, 59, 0.1); border-radius: 5px; border: 1px solid #e0767b; position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 9999;';
    errorDiv.innerHTML = '<strong>Authentication Error:</strong> Supabase client not initialized';
    document.body.appendChild(errorDiv);
    setTimeout(() => document.body.removeChild(errorDiv), 5000);
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname,
      }
    });

    if (error) {
      // Show error on login page
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = 'color: #e0767b; margin: 10px; padding: 10px; background: rgba(224, 42, 59, 0.1); border-radius: 5px; border: 1px solid #e0767b; position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 9999;';
      errorDiv.innerHTML = '<strong>Google Sign-In Error:</strong> ' + error.message + '<br><small>Check your Supabase Google OAuth configuration.</small>';
      document.body.appendChild(errorDiv);
      setTimeout(() => document.body.removeChild(errorDiv), 5000);
      throw error;
    }

    return data;
  } catch (err) {
    // Re-throw for the caller to handle, but error already shown on page
    throw err;
  }
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

// Export all auth functions for use by main module
export {
  initAuth,
  signInWithGoogle,
  signInWithEmail,
  signOut,
  getCurrentUser,
  getUserId,
  onAuthStateChange,
  getSession,
  getAuthHeaders
};
