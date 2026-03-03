'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

export type UserRole = 'PATRIMONIO_ADMIN' | 'SEAME_ADMIN' | 'TECH' | 'UNIT_USER';

export type Profile = {
  user_id: string;
  full_name: string | null;
  role: UserRole;
  unit_id: string | null;
  active: boolean;
  unit_ul_code?: string | null;
  unit_name?: string | null;
};

type ProfileContextType = {
  profile: Profile | null;
  loading: boolean;
  error: 'no_profile' | 'inactive' | null;
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'no_profile' | 'inactive' | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      const { data: p, error: err } = await supabase
        .from('profiles')
        .select('user_id, full_name, role, unit_id, active')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (err) {
        console.warn('[ProfileContext] profiles error:', JSON.stringify(err));
        setProfile(null);
        setError('no_profile');
        setLoading(false);
        return;
      }
      if (!p) {
        setProfile(null);
        setError('no_profile');
        setLoading(false);
        return;
      }

      if (!p.active) {
        setProfile(null);
        setError('inactive');
        setLoading(false);
        return;
      }

      let unit_ul_code: string | null = null;
      let unit_name: string | null = null;

      if (p.unit_id) {
        const { data: unit, error: unitErr } = await supabase
          .from('units')
          .select('ul_code, name')
          .eq('id', p.unit_id)
          .maybeSingle();
        if (unitErr) console.warn('[ProfileContext] units error:', JSON.stringify(unitErr));
        unit_ul_code = unit?.ul_code ?? null;
        unit_name = unit?.name ?? null;
      }

      setProfile({
        user_id: p.user_id,
        full_name: p.full_name,
        role: p.role as UserRole,
        unit_id: p.unit_id,
        active: p.active,
        unit_ul_code,
        unit_name,
      });
      setError(null);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <ProfileContext.Provider value={{ profile, loading, error }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (ctx === undefined) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
