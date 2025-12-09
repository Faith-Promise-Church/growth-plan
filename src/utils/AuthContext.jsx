import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user profile from database
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Profile fetch error:', error);
        return null;
      }
      setProfile(data);
      return data;
    } catch (err) {
      console.error('Error fetching profile:', err);
      setProfile(null);
      return null;
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      console.log('AuthContext: Initializing...');
      
      // If Supabase isn't configured, skip auth check
      if (!isSupabaseConfigured) {
        console.warn('Supabase not configured - skipping auth check');
        if (mounted) {
          setError(new Error('Supabase not configured'));
          setLoading(false);
        }
        return;
      }

      try {
        // Get session without timeout wrapper - let Supabase handle it
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('AuthContext: getSession result:', { 
          hasSession: !!session, 
          hasUser: !!session?.user,
          error: sessionError 
        });
        
        if (sessionError) {
          console.error('Session error:', sessionError);
        }
        
        if (session?.user && mounted) {
          setUser(session.user);
          // Try to fetch profile, but don't block on it
          fetchProfile(session.user.id).catch(console.error);
        }
      } catch (err) {
        console.error('Auth init error:', err);
        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          console.log('AuthContext: Init complete, loading = false');
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: Auth state changed:', event);
        
        if (!mounted) return;
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        if (session?.user) {
          setUser(session.user);
          fetchProfile(session.user.id).catch(console.error);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Sign up new user
  const signUp = async ({ email, password, firstName, lastName, phone }) => {
    if (!isSupabaseConfigured) {
      const configError = new Error('Supabase is not configured.');
      setError(configError);
      return { success: false, error: configError };
    }

    try {
      setError(null);
      console.log('SignUp: Creating auth user...');
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone,
          }
        }
      });

      if (authError) {
        console.error('Auth signup error:', authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error('No user returned from signup');
      }

      console.log('SignUp: Auth user created:', authData.user.id);

      // Create profile
      console.log('SignUp: Creating profile with phone:', phone);
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: authData.user.id,
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          email: email,
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't throw - user is created, profile can be fixed later
      } else {
        console.log('SignUp: Profile created successfully');
        await fetchProfile(authData.user.id);
      }

      return { success: true, user: authData.user };
    } catch (err) {
      console.error('Sign up error:', err);
      setError(err);
      return { success: false, error: err };
    }
  };

  // Sign in existing user
  const signIn = async ({ email, password }) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: new Error('Supabase is not configured') };
    }

    try {
      setError(null);
      console.log('SignIn: Attempting login...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('SignIn error:', error);
        throw error;
      }

      console.log('SignIn: Success');
      setUser(data.user);
      await fetchProfile(data.user.id);
      
      return { success: true, user: data.user };
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err);
      return { success: false, error: err };
    }
  };

  // Get email by phone number (for login)
  const getEmailByPhone = async (phone) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      console.log('getEmailByPhone: Looking up:', phone);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('phone', phone)
        .maybeSingle();

      console.log('getEmailByPhone result:', { data, error });

      if (error) {
        console.error('Phone lookup error:', error);
        return { success: false, error: error.message };
      }

      if (!data?.email) {
        return { success: false, error: 'Phone number not found' };
      }

      return { success: true, email: data.email };
    } catch (err) {
      console.error('Get email by phone error:', err);
      return { success: false, error: err.message };
    }
  };

  // Check if phone number exists
  const checkPhoneExists = async (phone) => {
    if (!isSupabaseConfigured) {
      return { exists: false, error: 'Supabase is not configured' };
    }

    try {
      console.log('checkPhoneExists: Checking:', phone);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

      console.log('checkPhoneExists result:', { data, error });

      if (error) {
        console.error('Phone check error:', error);
        return { exists: false, error: error.message };
      }
      
      return { exists: !!data, userId: data?.id };
    } catch (err) {
      console.error('Check phone error:', err);
      return { exists: false, error: err.message };
    }
  };

  // Sign out
  const signOut = async () => {
    console.log('SignOut: Starting...');
    
    try {
      // Clear state first
      setUser(null);
      setProfile(null);
      
      // Then sign out from Supabase
      await supabase.auth.signOut({ scope: 'local' });
      
      // Clear any lingering localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          console.log('SignOut: Removing localStorage key:', key);
          localStorage.removeItem(key);
        }
      });
      
      console.log('SignOut: Complete');
      return { success: true };
    } catch (err) {
      console.error('Sign out error:', err);
      // Still clear state even on error
      setUser(null);
      setProfile(null);
      return { success: false, error: err };
    }
  };

  // Password reset
  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Reset password error:', err);
      return { success: false, error: err };
    }
  };

  const value = {
    user,
    profile,
    loading,
    error,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signOut,
    resetPassword,
    checkPhoneExists,
    getEmailByPhone,
    fetchProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
