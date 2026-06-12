import { supabase } from './supabaseClient';

import { saveOfflineLogin } from './offlineAuth';

export interface OnlineProfile {
  id: string;
  full_name: string;
  username: string;
  role: 'national_admin' | 'province_admin' | 'province_staff';

  province_id: string | null;
  province_name: string;
  province_code: string;

  county_id: string | null;
  county_name: string;
  county_code: string;

  access: string[];
  is_active: boolean;
}

type RelationValue =
  | {
      name?: string;
      code?: string;
    }
  | {
      name?: string;
      code?: string;
    }[]
  | null
  | undefined;

function usernameToEmail(username: string) {
  const clean = username.trim().toLowerCase();

  if (clean.includes('@')) {
    return clean;
  }

  return `${clean}@nafas.ir`;
}

function normalizeAccess(value: any): string[] {
  return Array.isArray(value) ? value : [];
}

function getRelationObject(relation: RelationValue) {
  if (!relation) return {};
  if (Array.isArray(relation)) return relation[0] || {};
  return relation || {};
}

function normalizeProfile(data: any): OnlineProfile {
  const province = getRelationObject(data?.provinces);
  const county = getRelationObject(data?.counties);

  return {
    id: data.id,
    full_name: data.full_name || '',
    username: data.username || '',
    role: data.role,

    province_id: data.province_id || null,
    province_name: province.name || '',
    province_code: province.code || '',

    county_id: data.county_id || null,
    county_name: county.name || '',
    county_code: county.code || '',

    access: normalizeAccess(data.access),
    is_active: Boolean(data.is_active),
  };
}

function saveCurrentProfileToLocalStorage(profile: OnlineProfile) {
  localStorage.setItem('nafas_online_profile', JSON.stringify(profile));

  localStorage.setItem('nafas_current_online_user_id', profile.id);

  localStorage.setItem('nafas_current_province_id', profile.province_id || '');
  localStorage.setItem('nafas_current_province_name', profile.province_name || '');
  localStorage.setItem('nafas_current_province_code', profile.province_code || '');

  localStorage.setItem('nafas_current_county_id', profile.county_id || '');
  localStorage.setItem('nafas_current_county_name', profile.county_name || '');
  localStorage.setItem('nafas_current_county_code', profile.county_code || '');

  localStorage.setItem('nafas_current_online_role', profile.role);
  localStorage.setItem('nafas_current_access', JSON.stringify(profile.access || []));
}

export async function getCurrentOnlineUser(): Promise<OnlineProfile | null> {
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
      id,
      full_name,
      username,
      role,
      province_id,
      county_id,
      access,
      is_active,
      provinces (
        name,
        code
      ),
      counties (
        name,
        code
      )
    `,
    )
    .eq('id', user.id)
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const profile = normalizeProfile(data);

  if (!profile.is_active) {
    await supabase.auth.signOut();
    throw new Error('حساب کاربری شما غیرفعال است.');
  }

  saveCurrentProfileToLocalStorage(profile);

  return profile;
}

export async function signInOnline(username: string, password: string) {
  const email = usernameToEmail(username);

  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  const profile = await getCurrentOnlineUser();

  if (!profile) {
    throw new Error('پروفایل کاربر در جدول profiles پیدا نشد.');
  }

  await saveOfflineLogin(profile as any, profile.username || username, password);

  localStorage.setItem('nafas_auth_mode', 'online');

  return profile;
}

export async function signOutOnline() {
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }

  localStorage.removeItem('nafas_online_profile');
  localStorage.removeItem('nafas_active_user');
  localStorage.removeItem('nafas_current_role');

  localStorage.removeItem('nafas_current_online_user_id');

  localStorage.removeItem('nafas_current_province_id');
  localStorage.removeItem('nafas_current_province_name');
  localStorage.removeItem('nafas_current_province_code');

  localStorage.removeItem('nafas_current_county_id');
  localStorage.removeItem('nafas_current_county_name');
  localStorage.removeItem('nafas_current_county_code');

  localStorage.removeItem('nafas_current_online_role');
  localStorage.removeItem('nafas_current_access');
  localStorage.removeItem('nafas_auth_mode');
}