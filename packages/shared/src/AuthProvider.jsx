import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext({
    user: null,
    session: null,
    loading: true,
    error: null,
    signOut: async () => { },
});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session: s }, error: err }) => {
            if (err) {
                setError(err.message);
                setLoading(false);
                return;
            }
            setSession(s);
            setUser(s?.user ?? null);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, s) => {
                if (event === 'SIGNED_OUT') {
                    setSession(null);
                    setUser(null);
                } else {
                    setSession(s);
                    setUser(s?.user ?? null);
                }
                setError(null);
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        const { error: err } = await supabase.auth.signOut();
        if (!err) {
            setUser(null);
            setSession(null);
        }
        return err;
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, error, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
