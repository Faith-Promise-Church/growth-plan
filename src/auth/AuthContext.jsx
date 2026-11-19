import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, isConfigured } from '../data/client.js';
import { ensureProfile, getProfile, loginEmailForPhone } from '../data/api.js';

const AuthContext = createContext(null);

// One message for "phone not found" and "wrong password", so the form never reveals which
// phone numbers have accounts.
export const LOGIN_FAILED = 'That phone number and password do not match. Try again, or reset your password.';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileReady, setProfileReady] = useState(false);

  const loadProfile = useCallback(async (u) => {
    if (!u) {
      setProfile(null);
      setProfileReady(true);
      return null;
    }
    try {
      const p = await ensureProfile(u);
      setProfile(p);
      return p;
    } catch {
      setProfile(null);
      return null;
    } finally {
      setProfileReady(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!isConfigured) {
      setLoading(false);
      return undefined;
    }
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        const u = data?.session?.user ?? null;
        setUser(u);
        setLoading(false);
        if (u) loadProfile(u);
      })
      .catch(() => mounted && setLoading(false));

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);
      setLoading(false);
      if (event === 'SIGNED_OUT' || !u) setProfile(null);
      else if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY') loadProfile(u);
    });
    return () => {
      mounted = false;
      data?.subscription?.unsubscribe();
    };
  }, [loadProfile]);

  const signInWithPhone = useCallback(async (phone, password) => {
    let email = null;
    try {
      email = await loginEmailForPhone(phone);
    } catch {
      return { ok: false, error: 'We could not reach the server. Check your connection and try again.' };
    }
    if (!email) {
      // Spend about the same time as a real attempt so timing does not reveal anything.
      await new Promise((r) => setTimeout(r, 400));
      return { ok: false, error: LOGIN_FAILED };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data?.user) {
      if (error && /fetch|network/i.test(error.message ?? '')) {
        return { ok: false, error: 'We could not reach the server. Check your connection and try again.' };
      }
      return { ok: false, error: LOGIN_FAILED };
    }
    setUser(data.user);
    await loadProfile(data.user);
    return { ok: true };
  }, [loadProfile]);

  const signUp = useCallback(async ({ email, password, firstName, lastName, phone }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName, phone },
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/home` : undefined,
      },
    });
    if (error) return { ok: false, error: error.message || 'Your account was not created. Try again.' };
    // The profile row is created by the handle_new_user trigger on the server.
    if (data?.session?.user) {
      setUser(data.session.user);
      await loadProfile(data.session.user);
      return { ok: true, signedIn: true };
    }
    return { ok: true, signedIn: false };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } finally {
      setUser(null);
      setProfile(null);
    }
  }, []);

  const resetPassword = useCallback(async (email) => {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { ok: true };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return null;
    const p = await getProfile(user.id);
    setProfile(p);
    return p;
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      profileReady,
      isAuthenticated: Boolean(user),
      isAdmin: Boolean(profile?.is_admin),
      signInWithPhone,
      signUp,
      signOut,
      resetPassword,
      refreshProfile,
    }),
    [user, profile, loading, profileReady, signInWithPhone, signUp, signOut, resetPassword, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
