import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, Tables } from '../lib/supabase';

interface UserProfile extends Tables<'users'> {}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: {
    name: string;
    phone: string;
    company: string;
    user_type: 'owner' | 'seeker';
  }) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    userData: {
      name: string;
      phone: string;
      company: string;
      user_type: 'owner' | 'seeker';
    }
  ) => {
    try {
      // First, sign up the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        return { error: authError };
      }

      // If sign up successful, create user profile
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: authData.user.email!,
            ...userData,
          });

        if (profileError) {
          console.error('Error creating user profile:', profileError);
          // Note: User is still signed up in auth, but profile creation failed
          return { error: new Error('Failed to create user profile') as AuthError };
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Import dynamically to avoid circular dependencies
      const { signInWithFallback } = await import('../services/demoAuth');
      
      // Try to determine user type from email
      let userType: 'seeker' | 'owner' | 'admin' = 'seeker';
      if (email.includes('owner')) userType = 'owner';
      if (email.includes('admin')) userType = 'admin';
      
      // Sign in with fallback to demo if needed
      const { user, session, profile } = await signInWithFallback(email, password, userType);
      
      if (user) {
        setUser(user);
        setSession(session);
        
        if (profile) {
          // Cast to ensure the profile type is correct
          setProfile(profile as UserProfile);
        } else {
          // If no profile returned, try to load it
          await loadUserProfile(user.id);
        }
      }
      
      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: { message: 'Authentication failed. Please try again.' } as any };
    }
  };

  const signOut = async () => {
    try {
      // Import dynamically to avoid circular dependencies
      const { signOutWithFallback } = await import('../services/demoAuth');
      await signOutWithFallback();
      
      setUser(null);
      setSession(null);
      setProfile(null);
      
      // Force navigation to home page
      window.location.href = '/';
      
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error: { message: 'Sign out failed. Please try again.' } as any };
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      return { error: new Error('No user logged in') };
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        return { error };
      }

      // Reload the profile
      await loadUserProfile(user.id);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
